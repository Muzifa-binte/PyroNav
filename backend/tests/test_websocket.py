"""
WebSocket server tests (in-process, no database needed).
Run: pytest tests/test_websocket.py -v

For a manual test against a running server use tests/test_websocket_client.py.
"""
import uuid
from datetime import datetime

from fastapi.testclient import TestClient

from api.config import get_settings
from api.main import app
from events import event_types as ev
from events.event_bus import Event, event_bus

WS_URL = "/ws/v1/live"


def _connect(client, query="client_id=pytest"):
    ws = client.websocket_connect(f"{WS_URL}?{query}")
    return ws


def test_connection_established_message(client, no_database):
    with _connect(client) as ws:
        hello = ws.receive_json()
    assert hello["event_type"] == "connection_established"
    data = hello["data"]
    assert data["client_id"] == "pytest"
    uuid.UUID(data["session_id"])
    assert "route_updated" in data["available_events"]
    assert data["subscriptions"] == ["*"]


def test_ping_pong_and_ack(client, no_database):
    with _connect(client) as ws:
        ws.receive_json()
        ws.send_json({"type": "ping"})
        assert ws.receive_json()["type"] == "pong"
        ws.send_text("ping")  # bare text ping is tolerated
        assert ws.receive_json()["type"] == "pong"
        ws.send_json({"type": "something-else"})
        assert ws.receive_json() == {"type": "ack", "message": "received"}


def test_internal_event_is_broadcast_with_websocket_name(client, no_database):
    """sensor_reading_received (internal) reaches clients as sensor_reading_updated."""
    with _connect(client) as ws:
        ws.receive_json()
        event_bus.publish_sync(Event(ev.SENSOR_READING_RECEIVED, {
            "sensor_id": "SMOKE-OT-01", "room_id": "operation_theater",
            "values": {"smoke": 85}, "units": {"smoke": "ppm"},
        }))
        msg = ws.receive_json()
    assert msg["event_type"] == "sensor_reading_updated"
    assert msg["data"]["values"] == {"smoke": 85}
    assert msg["timestamp"].endswith("+00:00")


def test_payload_with_datetime_and_uuid_does_not_drop_client(client, no_database):
    """Regression: plain json.dumps failed on these types and the client was
    treated as dead and disconnected."""
    event_id = uuid.uuid4()
    with _connect(client) as ws:
        ws.receive_json()
        event_bus.publish_sync(Event(ev.HAZARD_EVENT_CREATED, {
            "event_id": event_id, "detected_at": datetime(2026, 10, 14, 10, 0),
        }))
        msg = ws.receive_json()
        assert msg["data"] == {"event_id": str(event_id), "detected_at": "2026-10-14T10:00:00+00:00"}
        ws.send_json({"type": "ping"})  # still connected
        assert ws.receive_json()["type"] == "pong"


def test_every_client_receives_broadcast(client, no_database):
    with _connect(client, "client_id=a") as ws_a, _connect(client, "client_id=b") as ws_b:
        ws_a.receive_json()
        ws_b.receive_json()
        event_bus.publish_sync(Event(ev.ROOM_STATUS_CHANGED, {"room_id": "icu", "hazard_level": "WARNING"}))
        assert ws_a.receive_json()["data"]["room_id"] == "icu"
        assert ws_b.receive_json()["data"]["room_id"] == "icu"


def test_subscription_filter_from_query_string(client, no_database):
    with _connect(client, "client_id=routes-only&events=route_updated") as ws:
        assert ws.receive_json()["data"]["subscriptions"] == ["route_updated"]
        event_bus.publish_sync(Event(ev.ROOM_STATUS_CHANGED, {"room_id": "icu"}))   # filtered out
        event_bus.publish_sync(Event(ev.ROUTE_UPDATED, {"status": "ROUTE_FOUND"}))
        # Broadcasts are delivered in order, so the first frame must be the route
        assert ws.receive_json()["event_type"] == "route_updated"


def test_subscribe_message_changes_filter(client, no_database):
    with _connect(client) as ws:
        ws.receive_json()
        ws.send_json({"type": "subscribe", "event_types": ["notification_created", "bogus"]})
        assert ws.receive_json() == {"type": "subscribed", "event_types": ["notification_created"]}
        event_bus.publish_sync(Event(ev.ROUTE_UPDATED, {}))
        event_bus.publish_sync(Event(ev.NOTIFICATION_CREATED, {"message": "Fire"}))
        assert ws.receive_json()["event_type"] == "notification_created"
        ws.send_json({"type": "subscribe", "event_types": ["*"]})
        assert ws.receive_json()["event_types"] == ["*"]


def test_stats_endpoint_lists_connected_clients(client, no_database):
    with _connect(client, "client_id=dashboard-1") as ws:
        ws.receive_json()
        stats = client.get("/api/v1/system/websocket/stats").json()
        assert stats["active_connections"] == 1
        assert stats["clients"][0]["client_id"] == "dashboard-1"
    assert client.get("/api/v1/system/websocket/stats").json()["active_connections"] == 0


def test_heartbeat_frames_are_sent(no_database):
    settings = get_settings()
    settings.ws_heartbeat_seconds = 0.1
    try:
        with TestClient(app) as client, _connect(client) as ws:
            ws.receive_json()
            msg = ws.receive_json()
            assert msg["event_type"] == "heartbeat"
            assert msg["data"]["connected_clients"] == 1
    finally:
        settings.ws_heartbeat_seconds = 0


def test_teammate_event_type_reaches_clients_without_code_changes(client, no_database):
    """A teammate registers a brand-new event type; it is broadcast, subscribable
    and accepted by the dev publish endpoint — no change to Member 4's code."""
    from events.event_types import WEBSOCKET_EVENTS, register_event_type

    register_event_type("evacuation_ordered")
    try:
        with _connect(client, "client_id=t&events=evacuation_ordered") as ws:
            hello = ws.receive_json()
            assert "evacuation_ordered" in hello["data"]["available_events"]
            assert hello["data"]["subscriptions"] == ["evacuation_ordered"]

            event_bus.publish_sync(Event("evacuation_ordered", {"floor": 1}))
            msg = ws.receive_json()
            assert msg["event_type"] == "evacuation_ordered"
            assert msg["data"] == {"floor": 1}

            r = client.post("/api/v1/system/events/publish",
                            json={"event_type": "evacuation_ordered", "data": {"floor": 2}})
            assert r.status_code == 200
            assert ws.receive_json()["data"] == {"floor": 2}
    finally:
        WEBSOCKET_EVENTS.pop("evacuation_ordered", None)


def test_unregistered_event_stays_internal(client, no_database):
    with _connect(client) as ws:
        ws.receive_json()
        event_bus.publish_sync(Event("internal_cache_refresh", {"secret": True}))
        event_bus.publish_sync(Event(ev.ROUTE_UPDATED, {"marker": "after"}))
        assert ws.receive_json()["data"] == {"marker": "after"}
