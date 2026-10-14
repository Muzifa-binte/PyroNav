"""
Cross-service event flow — the Week 4 integration scenario.

Members 1–3's services are stood in for by small handlers that publish exactly
what their real modules publish, so this test pins the integration contract
without depending on their implementations:

  1. Member 1 ingestion (MQTT thread)  → sensor_reading_received
  2. Member 2 decision engine          → room_status_changed, notification_created
  3. Member 3 route monitor            → route_updated
  4. Member 4 broadcaster              → every step reaches the dashboard, in order

Run: pytest tests/test_integration.py -v
"""
import threading

import pytest

from events import event_types as ev
from events.event_bus import Event, event_bus


@pytest.fixture
def simulated_services():
    def decision_engine(event):            # Member 2
        if event.data["values"].get("smoke", 0) > 100:
            room = event.data["room_id"]
            event_bus.publish_sync(Event(ev.ROOM_STATUS_CHANGED, {
                "room_id": room, "hazard_level": "CRITICAL", "previous_level": "NORMAL",
            }))
            event_bus.publish_sync(Event(ev.NOTIFICATION_CREATED, {
                "room_id": room, "severity": "CRITICAL", "message": f"Fire detected in {room}",
            }))

    def route_monitor(event):              # Member 3
        if event.data["hazard_level"] in ("HIGH_RISK", "CRITICAL"):
            event_bus.publish_sync(Event(ev.ROUTE_UPDATED, {
                "status": "ROUTE_FOUND", "node_ids": ["reception", "EXIT-A"],
                "reason": "hazard_change",
            }))

    event_bus.subscribe(ev.SENSOR_READING_RECEIVED, decision_engine)
    event_bus.subscribe(ev.ROOM_STATUS_CHANGED, route_monitor)
    yield
    event_bus.unsubscribe(ev.SENSOR_READING_RECEIVED, decision_engine)
    event_bus.unsubscribe(ev.ROOM_STATUS_CHANGED, route_monitor)


def _ingest_from_mqtt_thread(reading: dict) -> None:
    """Publish the way Member 1's paho-mqtt callback does: from a non-async thread."""
    worker = threading.Thread(
        target=event_bus.publish_sync,
        args=(Event(ev.SENSOR_READING_RECEIVED, reading),),
        name="paho-mqtt",
    )
    worker.start()
    worker.join()


def test_critical_reading_cascades_to_dashboard(client, no_database, simulated_services):
    with client.websocket_connect("/ws/v1/live?client_id=dashboard") as ws:
        ws.receive_json()  # connection_established
        _ingest_from_mqtt_thread({
            "sensor_id": "SMOKE-OT-01", "room_id": "operation_theater",
            "values": {"smoke": 120, "temperature": 70}, "units": {"smoke": "ppm"},
        })
        received = [ws.receive_json() for _ in range(4)]

    assert [m["event_type"] for m in received] == [
        "sensor_reading_updated",
        "room_status_changed",
        "route_updated",
        "notification_created",
    ]
    assert received[1]["data"]["hazard_level"] == "CRITICAL"
    assert received[2]["data"]["reason"] == "hazard_change"


def test_normal_reading_only_updates_sensor_view(client, no_database, simulated_services):
    with client.websocket_connect("/ws/v1/live?client_id=dashboard") as ws:
        ws.receive_json()
        _ingest_from_mqtt_thread({
            "sensor_id": "SMOKE-OT-01", "room_id": "operation_theater",
            "values": {"smoke": 12}, "units": {"smoke": "ppm"},
        })
        event_bus.publish_sync(Event(ev.ROUTE_UPDATED, {"marker": "end"}))
        first, second = ws.receive_json(), ws.receive_json()

    assert first["event_type"] == "sensor_reading_updated"
    assert second["data"] == {"marker": "end"}  # no hazard events in between
