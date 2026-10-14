"""
Background service registry: teammates' workers run inside the API process,
publish on the shared event bus, and show up in /health.
Run: pytest tests/test_services.py -v
"""
import threading

from fastapi.testclient import TestClient

from api import services
from api.main import app
from events import event_types as ev
from events.event_bus import Event, event_bus


def test_service_lifecycle_health_and_event_publishing(no_database):
    calls = []
    stop_flag = threading.Event()

    def start():
        # A real worker (e.g. MQTT subscriber) runs in its own thread and
        # publishes on the shared bus
        def run():
            event_bus.publish_sync(Event(ev.SENSOR_READING_RECEIVED, {"sensor_id": "FAKE-01"}))
            stop_flag.wait()
        threading.Thread(target=run, daemon=True).start()
        calls.append("start")
        return lambda: (calls.append("stop"), stop_flag.set())

    services.register_background_service("fake_ingestion", start)
    try:
        with TestClient(app) as client:
            assert calls == ["start"]
            health = client.get("/api/v1/health").json()
            assert health["components"]["service:fake_ingestion"] == {"status": "running"}
            with client.websocket_connect("/ws/v1/live") as ws:
                ws.receive_json()
                event_bus.publish_sync(Event(ev.SENSOR_READING_RECEIVED, {"sensor_id": "FAKE-02"}))
                assert ws.receive_json()["data"]["sensor_id"] == "FAKE-02"
        assert calls == ["start", "stop"]
    finally:
        services.unregister_background_service("fake_ingestion")


def test_failing_service_is_reported_but_api_starts(no_database):
    def start():
        raise RuntimeError("broker unreachable")

    services.register_background_service("broken", start)
    try:
        with TestClient(app) as client:
            component = client.get("/api/v1/health").json()["components"]["service:broken"]
            assert component["status"] == "failed"
            assert "broker unreachable" in component["error"]
            assert client.get("/api/v1/health/live").status_code == 200
    finally:
        services.unregister_background_service("broken")


def test_unknown_service_module_is_reported():
    services.import_service_modules(["no_such_package.service"])
    try:
        from monitoring.health import run_health_checks
        result = run_health_checks()["service:no_such_package.service"]
        assert result["status"] == "failed"
    finally:
        services.unregister_background_service("no_such_package.service")
