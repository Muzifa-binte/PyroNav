"""
MQTT sensor ingestion (Member 1) and the 3D hospital registry.

* the registry in shared-contracts/hospital-3d-sensors.json is consistent and
  keeps every sensor/room of the demo data unchanged
* message validation follows shared-contracts/sensor-message-schema.json
* a valid reading is stored, then forwarded as sensor_reading_received — the
  event Member 2's Decision Engine subscribes to — and reaches the WebSocket
* registration of the 3D rooms/sensors in PostgreSQL (own throw-away schema)

No MQTT broker needed: the pipeline is driven directly, from a non-async thread
exactly like the paho-mqtt callback thread.

Run: pytest tests/test_sensor_ingestion.py -v
"""
import json
import threading
from collections import Counter
from datetime import datetime, timedelta, timezone

import pytest

from database import demo_data
from database.connection import DatabaseUnavailableError, db_manager
from database.migrations.migrate import MigrationRunner
from database.seed import seed_building
from events import event_types as ev
from events.event_bus import Event, event_bus
from sensor_ingestion import registry as reg
from sensor_ingestion.config import IngestionSettings
from sensor_ingestion.database_writer import StoreResult
from sensor_ingestion.message_validator import (
    INVALID, REJECTED, STALE, UNKNOWN_SENSOR, VALID, RegisteredSensor, validate_message,
)
from sensor_ingestion.pipeline import IngestionPipeline
from tests.fixture_building import TEST_BUILDING

REGISTRY = reg.load_registry()
ENUMS = json.loads((demo_data.CONTRACTS_DIR / "hazard-levels.json").read_text(encoding="utf-8"))
NOW = datetime(2026, 10, 15, 10, 30, tzinfo=timezone.utc)
SENSORS = {"SMOKE-OT-01": RegisteredSensor("SMOKE-OT-01", "operation_theater", "smoke_heat"),
           "CO-ICU-01": RegisteredSensor("CO-ICU-01", "icu", "co")}
TOPIC = "pyronav/v1/sensors/operation_theater/SMOKE-OT-01/reading"


def _message(**overrides):
    msg = {
        "message_id": "h3d-test-1", "sensor_id": "SMOKE-OT-01", "room_id": "operation_theater",
        "sensor_type": "smoke_heat", "timestamp": "2026-10-15T10:29:58.120Z",
        "values": {"smoke": 120, "temperature": 64.5}, "units": {"smoke": "ppm", "temperature": "degC"},
        "source": "hospital-3d", "trigger": "slider", "building_id": "HOSPITAL-DEMO-01",
    }
    msg.update(overrides)
    return msg


# ---------------------------------------------------------------------------
# Registry contract
# ---------------------------------------------------------------------------

def test_registry_ids_are_unique_and_linked():
    rooms = [r["room_id"] for r in REGISTRY["rooms"]]
    sensors = [s["sensor_id"] for s in REGISTRY["sensors"]]
    assert [i for i, n in Counter(rooms).items() if n > 1] == []
    assert [i for i, n in Counter(sensors).items() if n > 1] == []
    for s in REGISTRY["sensors"]:
        assert s["room_id"] in rooms, f"{s['sensor_id']}: unknown room {s['room_id']}"
        assert s["sensor_type"] in ENUMS["sensor_type"]["values"], s["sensor_id"]
        fields = REGISTRY["sensor_types"][s["sensor_type"]]["fields"]
        assert s["unit_config"] == fields, f"{s['sensor_id']}: units differ from its type"
        assert len(s["sensor_id"]) <= 50 and len(s["room_id"]) <= 50
    assert all(any(s["room_id"] == r for s in REGISTRY["sensors"]) for r in rooms), "room without sensor"


def test_registry_keeps_the_demo_rooms_and_sensors_unchanged():
    rooms = {r["room_id"] for r in REGISTRY["rooms"]}
    assert {r["room_id"] for r in demo_data.rooms()} <= rooms
    by_id = {s["sensor_id"]: s for s in REGISTRY["sensors"]}
    for demo in demo_data.sensors():
        mine = by_id.get(demo["sensor_id"])
        assert mine is not None, f"{demo['sensor_id']} missing from the 3D registry"
        assert (mine["room_id"], mine["sensor_type"], mine["unit_config"]) == \
               (demo["room_id"], demo["sensor_type"], demo["unit_config"])


def test_registry_placements_are_inside_their_room():
    for s in REGISTRY["sensors"]:
        p = s["placement"]
        assert 0 <= p["u"] <= 1, s["sensor_id"]
        if s["mount"] == "ceiling":
            assert 0 <= p["v"] <= 1, s["sensor_id"]
        else:
            assert p["wall"] in "nesw" and 0 < p["h"] < 3, s["sensor_id"]


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def test_valid_message():
    result = validate_message(TOPIC, json.dumps(_message()).encode(), SENSORS, NOW)
    assert result.status == VALID, result.errors
    assert result.reading["message_id"] == "h3d-test-1"
    assert result.reading["timestamp"] == datetime(2026, 10, 15, 10, 29, 58, 120000, tzinfo=timezone.utc)
    assert result.reading["values"] == {"smoke": 120, "temperature": 64.5}
    assert result.reading["extra"] == {"building_id": "HOSPITAL-DEMO-01"}


def test_missing_message_id_and_units_are_derived():
    msg = _message(units={})
    del msg["message_id"]
    result = validate_message(TOPIC, msg, SENSORS, NOW)
    assert result.status == VALID
    assert result.reading["message_id"].startswith("SMOKE-OT-01-2026-10-15T10:29:58")
    assert result.reading["units"] == {"smoke": "ppm", "temperature": "degC"}


@pytest.mark.parametrize("payload, code", [
    (b"not json", "NOT_JSON"),
    (b"[1, 2]", "NOT_JSON"),
    (_message(sensor_type="humidity"), "SCHEMA"),
    (_message(values={}), "SCHEMA"),
    (_message(values={"smoke": "high"}), "SCHEMA"),
    (_message(values={"smoke": True}), "SCHEMA"),
    ({k: v for k, v in _message().items() if k != "room_id"}, "SCHEMA"),
    (_message(sensor_id="SMOKE-XX-99"), UNKNOWN_SENSOR),
])
def test_rejected_messages(payload, code):
    result = validate_message(TOPIC, payload, SENSORS, NOW)
    assert (result.status, result.code) == (REJECTED, code), result.errors


@pytest.mark.parametrize("topic, overrides, fragment", [
    ("pyronav/v1/sensors/icu/SMOKE-OT-01/reading", {}, "does not match"),
    (TOPIC, {"room_id": "icu"}, "belongs to room 'operation_theater'"),
    (TOPIC, {"sensor_type": "co", "values": {"co": 5}}, "is a smoke_heat sensor"),
    (TOPIC, {"values": {"humidity": 40}}, "needs at least one of smoke, temperature"),
    (TOPIC, {"values": {"smoke": -5, "temperature": 20}}, "outside plausible range"),
])
def test_invalid_messages(topic, overrides, fragment):
    result = validate_message(topic, _message(**overrides), SENSORS, NOW)
    assert result.status == INVALID
    assert any(fragment in e for e in result.errors), result.errors


@pytest.mark.parametrize("timestamp", ["2026-10-15T10:00:00Z", "2026-10-15T10:45:00+00:00"])
def test_stale_or_future_timestamps(timestamp):
    assert validate_message(TOPIC, _message(timestamp=timestamp), SENSORS, NOW).status == STALE


# ---------------------------------------------------------------------------
# Pipeline: store → forward (no broker, fake database)
# ---------------------------------------------------------------------------

class FakeWriter:
    def __init__(self, fail=False, previous_status="active"):
        self.rows, self.fail, self.previous_status = {}, fail, previous_status

    def store(self, reading, status):
        if self.fail:
            raise DatabaseUnavailableError("down")
        if reading["message_id"] in self.rows:
            return StoreResult(stored=False, duplicate=True)
        self.rows[reading["message_id"]] = status
        return StoreResult(stored=True, received_at=NOW, previous_status=self.previous_status)


class FakeDB:
    def fetch_all(self, query, params=None):
        return [{"sensor_id": s.sensor_id, "room_id": s.room_id, "sensor_type": s.sensor_type}
                for s in SENSORS.values()]


def _pipeline(writer, published):
    settings = IngestionSettings(ingestion_auto_register=False)
    return IngestionPipeline(writer=writer, settings=settings, publish=published.append,
                             db=FakeDB(), clock=lambda: NOW)


def test_valid_reading_is_stored_then_forwarded_once():
    writer, published = FakeWriter(), []
    pipeline = _pipeline(writer, published)
    payload = json.dumps(_message()).encode()

    assert pipeline.process(TOPIC, payload) == VALID
    assert pipeline.process(TOPIC, payload) == "duplicate"  # QoS 1 redelivery

    assert writer.rows == {"h3d-test-1": "valid"}
    assert [e.event_type for e in published] == [ev.SENSOR_READING_RECEIVED]
    data = published[0].data
    assert {k: data[k] for k in ("message_id", "sensor_id", "room_id", "sensor_type", "values",
                                 "validation_status", "persisted", "source", "trigger")} == {
        "message_id": "h3d-test-1", "sensor_id": "SMOKE-OT-01", "room_id": "operation_theater",
        "sensor_type": "smoke_heat", "values": {"smoke": 120, "temperature": 64.5},
        "validation_status": "valid", "persisted": True, "source": "hospital-3d", "trigger": "slider",
    }
    assert data["timestamp"] == "2026-10-15T10:29:58.120000+00:00"
    assert pipeline.snapshot()["forwarded"] == 1 and pipeline.snapshot()["duplicates"] == 1


def test_invalid_reading_is_stored_for_audit_but_not_forwarded():
    writer, published = FakeWriter(), []
    outcome = _pipeline(writer, published).process(TOPIC, json.dumps(_message(room_id="icu")))
    assert outcome == INVALID
    assert writer.rows == {"h3d-test-1": "invalid"}
    assert published == []


def test_reading_is_forwarded_in_real_time_when_the_database_is_down():
    published = []
    assert _pipeline(FakeWriter(fail=True), published).process(TOPIC, json.dumps(_message())) == VALID
    assert published[0].data["persisted"] is False


def test_stale_sensor_coming_back_reports_status_change():
    published = []
    _pipeline(FakeWriter(previous_status="stale"), published).process(TOPIC, json.dumps(_message()))
    assert [e.event_type for e in published] == [ev.SENSOR_READING_RECEIVED, ev.SENSOR_STATUS_CHANGED]
    assert published[1].data == {"sensor_id": "SMOKE-OT-01", "room_id": "operation_theater",
                                 "status": "active", "previous_status": "stale"}


def test_reading_reaches_decision_engine_and_websocket(client, no_database):
    """Real event bus: a stand-in for Member 2's engine subscribes exactly like
    docs/ARCHITECTURE.md §5.2, and the dashboard WebSocket receives the reading."""
    received = []

    def decision_engine(event: Event):
        received.append(event.data)

    pipeline = IngestionPipeline(writer=FakeWriter(), settings=IngestionSettings(ingestion_auto_register=False),
                                 db=FakeDB())  # default publish = event_bus.publish_sync
    payload = json.dumps(_message(timestamp=datetime.now(timezone.utc).isoformat())).encode()
    event_bus.subscribe(ev.SENSOR_READING_RECEIVED, decision_engine)
    try:
        with client.websocket_connect("/ws/v1/live?client_id=hospital-3d-test") as ws:
            ws.receive_json()  # connection_established
            mqtt_thread = threading.Thread(target=pipeline.process, args=(TOPIC, payload), name="paho-mqtt")
            mqtt_thread.start()
            mqtt_thread.join()
            frame = ws.receive_json()
    finally:
        event_bus.unsubscribe(ev.SENSOR_READING_RECEIVED, decision_engine)

    assert received and received[0]["sensor_id"] == "SMOKE-OT-01" and received[0]["room_id"] == "operation_theater"
    assert frame["event_type"] == "sensor_reading_updated"
    assert frame["data"]["message_id"] == "h3d-test-1"
    assert frame["data"]["values"] == {"smoke": 120, "temperature": 64.5}


# ---------------------------------------------------------------------------
# PostgreSQL (own schema, so the shared test schema's counts stay untouched)
# ---------------------------------------------------------------------------

@pytest.fixture
def ingestion_schema():
    schema = "pyronav_test_ingestion"
    saved = db_manager.current_config()
    db_manager.configure(search_path=schema)
    try:
        db_manager.execute_write(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
    except DatabaseUnavailableError as exc:
        db_manager.configure(**saved)
        pytest.skip(f"PostgreSQL not reachable ({exc}) - database tests skipped")
    db_manager.execute_write(f"CREATE SCHEMA {schema}")
    try:
        with db_manager.get_connection() as conn:
            MigrationRunner(conn).run()
        seed_building({**TEST_BUILDING, "sensors": []}, replace=True)
        yield db_manager
    finally:
        db_manager.execute_write(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
        db_manager.configure(**saved)


@pytest.mark.database
def test_register_then_ingest_into_postgres(ingestion_schema):
    db = ingestion_schema
    before = reg.check(db)
    assert "corridor_north" in before["missing_rooms"] and "SMOKE-CRN-01" in before["missing_sensors"]
    name_before = db.fetch_value("SELECT name FROM rooms WHERE room_id = 'icu'")

    result = reg.register(db)
    assert "corridor_north" in result["rooms_added"] and "icu" not in result["rooms_added"]
    assert reg.check(db) == {"missing_rooms": [], "missing_sensors": [], "mismatched_sensors": []}
    assert db.fetch_value("SELECT name FROM rooms WHERE room_id = 'icu'") == name_before  # untouched
    assert reg.register(db)["rooms_added"] == []  # idempotent

    published = []
    pipeline = IngestionPipeline(settings=IngestionSettings(ingestion_auto_register=False),
                                 publish=published.append, db=db)
    msg = _message(sensor_id="SMOKE-CRN-01", room_id="corridor_north",
                   timestamp=datetime.now(timezone.utc).isoformat())
    topic = "pyronav/v1/sensors/corridor_north/SMOKE-CRN-01/reading"
    assert pipeline.process(topic, json.dumps(msg)) == VALID
    assert pipeline.process(topic, json.dumps(msg)) == "duplicate"

    row = db.fetch_one("SELECT sensor_id, room_id, values, validation_status::text AS status "
                       "FROM sensor_readings WHERE message_id = 'h3d-test-1'")
    assert row == {"sensor_id": "SMOKE-CRN-01", "room_id": "corridor_north",
                   "values": {"smoke": 120, "temperature": 64.5}, "status": "valid"}
    assert db.fetch_value("SELECT last_seen_at FROM sensors WHERE sensor_id = 'SMOKE-CRN-01'") is not None
    assert len(published) == 1 and published[0].data["persisted"] is True

    stale = _message(message_id="h3d-old", sensor_id="SMOKE-CRN-01", room_id="corridor_north",
                     timestamp=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat())
    assert pipeline.process(topic, json.dumps(stale)) == STALE
    assert db.fetch_value("SELECT validation_status::text FROM sensor_readings "
                          "WHERE message_id = 'h3d-old'") == "stale"
    assert len(published) == 1
