"""
End-to-end tests against a real PostgreSQL (isolated "pyronav_test" schema),
seeded with the fixed layout in tests/fixture_building.py.
Skipped automatically when the database configured in backend/.env is unreachable.

Run: pytest tests/test_database_integration.py -v
"""
import logging
import os
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2
import pytest

from database.connection import DatabaseUnavailableError
from database.maintenance import purge_old_data
from database.migrations.migrate import MIGRATIONS_DIR, MigrationRunner
from events import event_types as ev
from events.event_bus import Event, event_bus
from monitoring.background_writer import db_writer
from tests.fixture_building import TEST_BUILDING

pytestmark = pytest.mark.database

API = "/api/v1"


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _insert_reading(db, sensor_id, room_id, values, units, at=None):
    at = at or _utcnow()
    db.execute_write(
        'INSERT INTO sensor_readings (message_id, sensor_id, room_id, "timestamp", "values", units) '
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (str(uuid.uuid4()), sensor_id, room_id, at, values, units),
    )
    db.execute_write("UPDATE sensors SET last_seen_at = %s WHERE sensor_id = %s", (at, sensor_id))


def _insert_hazard(db, room_id, level, message):
    """What Member 2's decision engine writes when a room escalates."""
    event = db.fetch_one(
        "INSERT INTO hazard_events (room_id, hazard_level, reason_codes, source_sensor_ids) "
        "VALUES (%s, %s, %s, %s) RETURNING event_id",
        (room_id, level, ["SMOKE_THRESHOLD_EXCEEDED"], ["SMOKE-OT-01"]),
    )
    note = db.fetch_one(
        "INSERT INTO notifications (event_id, room_id, severity, message) "
        "VALUES (%s, %s, %s, %s) RETURNING notification_id",
        (event["event_id"], room_id, level, message),
    )
    db.execute_write("UPDATE rooms SET current_hazard_level = %s WHERE room_id = %s", (level, room_id))
    return str(event["event_id"]), str(note["notification_id"])


# ---------------------------------------------------------------------------
# Schema, migrations, health
# ---------------------------------------------------------------------------

def test_migrations_are_idempotent(database):
    with database.get_connection() as conn:
        runner = MigrationRunner(conn)
        assert runner.run() == []
        assert {m["state"] for m in runner.status()} == {"applied"}


def test_health_is_healthy_with_real_data(client, database):
    health = client.get(f"{API}/health").json()
    assert health["status"] == "healthy"
    assert health["components"]["database"]["status"] == "connected"

    db = client.get(f"{API}/health/db").json()
    assert db["statistics"]["rooms"] == len(TEST_BUILDING["rooms"])
    assert db["statistics"]["sensors"] == len(TEST_BUILDING["sensors"])
    # Every migration file on disk — teammates' own migrations included
    assert db["migrations_applied"] == sorted(
        f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql"))
    assert client.get(f"{API}/health/ready").status_code == 200
    assert client.get(f"{API}/system/migrations").json()["pending"] == []


# ---------------------------------------------------------------------------
# Member 1 — sensors
# ---------------------------------------------------------------------------

def test_sensor_registration(client, database):
    created = client.post(f"{API}/sensors", json={
        "sensor_id": "CO-PH-01", "room_id": "pharmacy", "sensor_type": "co",
        "unit_config": {"co": "ppm"},
    })
    assert created.status_code == 201
    assert created.json()["status"] == "active"
    try:
        dup = client.post(f"{API}/sensors", json={
            "sensor_id": "CO-PH-01", "room_id": "pharmacy", "sensor_type": "co"})
        assert dup.status_code == 409
        orphan = client.post(f"{API}/sensors", json={
            "sensor_id": "CO-XX-01", "room_id": "no_such_room", "sensor_type": "co"})
        assert orphan.status_code == 422
        bad_type = client.post(f"{API}/sensors", json={
            "sensor_id": "X-01", "room_id": "pharmacy", "sensor_type": "laser"})
        assert bad_type.status_code == 422
    finally:
        database.execute_write("DELETE FROM sensors WHERE sensor_id = 'CO-PH-01'")


def test_sensor_readings_newest_first_with_time_filter(client, database):
    now = _utcnow()
    for minutes_ago, smoke in [(30, 10), (20, 20), (10, 30)]:
        _insert_reading(database, "SMOKE-OT-01", "operation_theater",
                        {"smoke": smoke}, {"smoke": "ppm"}, at=now - timedelta(minutes=minutes_ago))

    body = client.get(f"{API}/sensors/SMOKE-OT-01/readings", params={"limit": 2}).json()
    assert [r["values"]["smoke"] for r in body["readings"]] == [30, 20]
    assert body["demo_data"] is False

    since = (now - timedelta(minutes=25)).replace(tzinfo=timezone.utc).isoformat()
    filtered = client.get(f"{API}/sensors/SMOKE-OT-01/readings", params={"from_time": since}).json()
    assert filtered["count"] == 2

    sensor = client.get(f"{API}/sensors/SMOKE-OT-01").json()
    assert sensor["latest_reading"]["values"] == {"smoke": 30}
    listed = client.get(f"{API}/sensors", params={"room_id": "operation_theater"}).json()["sensors"]
    by_id = {s["sensor_id"]: s for s in listed}
    assert by_id["SMOKE-OT-01"]["latest_reading"]["values"] == {"smoke": 30}
    assert client.get(f"{API}/sensors/NOPE/readings").status_code == 404


# ---------------------------------------------------------------------------
# Member 2 — rooms, events, notifications, alerts
# ---------------------------------------------------------------------------

def test_room_detail_merges_latest_readings_by_measurement(client, database):
    _insert_reading(database, "SMOKE-OT-01", "operation_theater",
                    {"smoke": 85, "temperature": 55}, {"smoke": "ppm", "temperature": "degC"})
    _insert_reading(database, "CUR-OT-01", "operation_theater", {"current": 4.2}, {"current": "A"})

    room = client.get(f"{API}/rooms/operation_theater").json()
    readings = room["latest_readings"]
    assert readings["smoke"]["value"] == 85 and readings["smoke"]["unit"] == "ppm"
    assert readings["temperature"]["unit"] == "degC"
    assert readings["current"]["sensor_id"] == "CUR-OT-01"
    assert room["active_events"] == []

    quality = client.get(f"{API}/rooms/operation_theater/data-quality").json()
    assert quality["sensor_count"] == 2
    assert quality["fresh_sensors"] == 2
    assert quality["status"] == "FRESH"


def test_hazard_alert_and_notification_acknowledgement(client, database):
    event_id, notification_id = _insert_hazard(
        database, "operation_theater", "CRITICAL", "Fire detected in Operation Theater")

    alerts = client.get(f"{API}/alerts").json()["alerts"]
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["event_id"] == event_id
    assert alert["severity"] == "CRITICAL"
    assert alert["message"] == "Fire detected in Operation Theater"
    assert alert["room_name"] == "Operation Theater"

    assert client.get(f"{API}/alerts", params={"severity": "WARNING"}).json()["total"] == 0
    assert client.get(f"{API}/events", params={"room_id": "operation_theater"}).json()["total"] == 1
    detail = client.get(f"{API}/events/{event_id}").json()
    assert detail["notifications"][0]["notification_id"] == notification_id
    assert client.get(f"{API}/rooms/operation_theater/hazard").json()["hazard_level"] == "CRITICAL"

    with client.websocket_connect("/ws/v1/live?events=notification_acknowledged") as ws:
        ws.receive_json()
        ack = client.post(f"{API}/notifications/{notification_id}/acknowledge").json()
        assert ack["status"] == "ACKNOWLEDGED" and ack["already_acknowledged"] is False
        assert ws.receive_json()["data"]["notification_id"] == notification_id

    again = client.post(f"{API}/notifications/{notification_id}/acknowledge").json()
    assert again["already_acknowledged"] is True
    assert client.get(f"{API}/notifications").json()["total"] == 0
    assert client.get(f"{API}/notifications", params={"status": "ALL"}).json()["total"] == 1
    assert client.post(f"{API}/notifications/{uuid.uuid4()}/acknowledge").status_code == 404
    assert client.post(f"{API}/notifications/not-a-uuid/acknowledge").status_code == 422


# ---------------------------------------------------------------------------
# Member 3 — routes, end-to-end with the hazard → recalculation → WebSocket path
# ---------------------------------------------------------------------------

def test_route_recalculated_and_broadcast_when_hazard_blocks_path(client, database):
    route = client.post(f"{API}/routes/calculate", json={"origin_room_id": "emergency_ward"}).json()
    assert route["status"] == "ROUTE_FOUND"
    assert route["node_ids"] == ["emergency_ward", "corridor_1", "reception", "EXIT-A"]
    assert route["demo_data"] is False
    assert client.get(f"{API}/routes/{route['route_id']}").json()["node_ids"] == route["node_ids"]

    with client.websocket_connect("/ws/v1/live?events=route_updated") as ws:
        ws.receive_json()
        # Member 2 escalates the corridor and publishes the change
        database.execute_write(
            "UPDATE rooms SET current_hazard_level = 'CRITICAL' WHERE room_id = 'corridor_1'")
        event_bus.publish_sync(Event(ev.ROOM_STATUS_CHANGED, {
            "room_id": "corridor_1", "hazard_level": "CRITICAL", "previous_level": "NORMAL"}))
        update = ws.receive_json()["data"]

    assert update["reason"] == "hazard_change"
    # EXIT-C is unavailable in the demo building, so the ward is cut off
    assert update["status"] == "NO_VALID_ROUTE"
    current = client.get(f"{API}/routes/current").json()
    assert current["status"] == "NO_VALID_ROUTE"
    assert current["hazard_state_snapshot"] == ["corridor_1"]


def test_hazard_snapshot_is_stored_as_json(client, database):
    """Regression: the snapshot was saved with str(list) — invalid JSON — so
    routes calculated while any room was blocked were silently not persisted."""
    database.execute_write("UPDATE rooms SET current_hazard_level = 'CRITICAL' WHERE room_id = 'icu'")
    route = client.post(f"{API}/routes/calculate", json={"origin_room_id": "reception"}).json()
    assert route["status"] == "ROUTE_FOUND"
    stored = client.get(f"{API}/routes/{route['route_id']}")
    assert stored.status_code == 200
    assert stored.json()["hazard_state_snapshot"] == ["icu"]


def test_route_edge_ids_match_building_edges(client, database):
    """Regression: edges walked against their stored direction came back as
    'EDGE-03_rev', which the 2D map could not match to any edge in /building."""
    building_edges = {e["edge_id"] for e in client.get(f"{API}/building").json()["edges"]}
    route = client.post(f"{API}/routes/calculate", json={"origin_room_id": "emergency_ward"}).json()
    assert route["edge_ids"] == ["EDGE-03", "EDGE-01", "EDGE-06"]
    assert set(route["edge_ids"]) <= building_edges


def test_building_graph_from_database(client, database):
    building = client.get(f"{API}/building").json()
    assert building["demo_data"] is False
    assert len(building["nodes"]) == len(TEST_BUILDING["nodes"])
    assert len(building["edges"]) == len(TEST_BUILDING["edges"])
    exits = client.get(f"{API}/exits").json()["exits"]
    assert {e["exit_id"]: e["available"] for e in exits} == {
        "EXIT-A": True, "EXIT-B": True, "EXIT-C": False}


# ---------------------------------------------------------------------------
# Member 4 — monitoring, audit, retention, resilience
# ---------------------------------------------------------------------------

def test_requests_are_audited(client, database):
    client.get(f"{API}/rooms", headers={"X-Request-ID": "audit-me"})
    client.get(f"{API}/rooms/nowhere")
    db_writer.flush()
    entries = client.get(f"{API}/system/audit", params={"endpoint": "/api/v1/rooms"}).json()["entries"]
    assert any(e["request_id"] == "audit-me" and e["status_code"] == 200 for e in entries)
    errors = client.get(f"{API}/system/audit", params={"min_status": 400}).json()["entries"]
    assert any(e["endpoint"] == "/api/v1/rooms/nowhere" and e["status_code"] == 404 for e in errors)


def test_warnings_are_persisted_to_system_logs(client, database):
    logging.getLogger("tests.integration").warning(
        "Stale sensor detected", extra={"metadata": {"sensor_id": "CO-ICU-01"}})
    db_writer.flush()
    logs = client.get(f"{API}/system/logs",
                      params={"level": "WARNING", "component": "tests"}).json()["logs"]
    assert logs[0]["message"] == "Stale sensor detected"
    assert logs[0]["metadata"]["sensor_id"] == "CO-ICU-01"


def test_websocket_sessions_are_recorded(client, database):
    with client.websocket_connect("/ws/v1/live?client_id=session-test") as ws:
        ws.receive_json()
    db_writer.flush()
    row = database.fetch_one(
        "SELECT client_id, disconnected_at, messages_sent FROM websocket_sessions "
        "WHERE client_id = 'session-test'")
    assert row["disconnected_at"] is not None
    assert row["messages_sent"] >= 1


def test_system_stats_with_database(client, database):
    _insert_reading(database, "SMOKE-ICU-01", "icu", {"smoke": 5}, {"smoke": "ppm"})
    stats = client.get(f"{API}/system/stats").json()["database"]
    assert stats["status"] == "connected"
    assert stats["readings_24h"] == 1
    assert stats["sensors"] == len(TEST_BUILDING["sensors"])


def test_retention_purges_only_old_rows(database):
    _insert_reading(database, "SMOKE-ICU-01", "icu", {"smoke": 1}, {"smoke": "ppm"},
                    at=_utcnow() - timedelta(days=40))
    _insert_reading(database, "SMOKE-ICU-01", "icu", {"smoke": 2}, {"smoke": "ppm"})
    deleted = purge_old_data(30, db=database)
    assert deleted["sensor_readings"] == 1
    assert database.fetch_value("SELECT COUNT(*) FROM sensor_readings") == 1
    with pytest.raises(psycopg2.Error):
        database.fetch_all("SELECT * FROM purge_old_data(0)")


def test_burst_waits_for_free_connection_instead_of_failing(database):
    """psycopg2's pool raises immediately when exhausted; callers must queue."""
    database.configure(minconn=1, maxconn=2)  # restored by the fixture
    results, errors = [], []

    def worker():
        try:
            results.append(database.fetch_value("SELECT 1 FROM pg_sleep(0.2)"))
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=worker) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
    assert results == [1] * 6


def test_pool_recovers_after_connection_loss(database):
    """A DB restart kills pooled connections; the pool must discard them and
    reconnect instead of failing forever."""
    pid = database.fetch_value("SELECT pg_backend_pid()")
    cfg = database.current_config()
    admin = psycopg2.connect(host=cfg["host"], port=cfg["port"], dbname=cfg["database"],
                             user=cfg["user"], password=cfg["password"])
    admin.autocommit = True
    try:
        with admin.cursor() as cur:
            cur.execute("SELECT pg_terminate_backend(%s)", (pid,))
            for _ in range(50):  # wait until the backend is really gone
                cur.execute("SELECT 1 FROM pg_stat_activity WHERE pid = %s", (pid,))
                if cur.fetchone() is None:
                    break
                time.sleep(0.05)
    finally:
        admin.close()

    with pytest.raises(DatabaseUnavailableError):
        database.fetch_value("SELECT 1")           # the dead connection is detected…
    assert database.fetch_value("SELECT 1") == 1   # …and a fresh pool takes over
