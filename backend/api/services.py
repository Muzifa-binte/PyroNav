"""
Background service registry — runs teammates' long-running workers (MQTT
ingestion, decision-engine loop, …) INSIDE the API process.

Why: the event bus is in-process. An event published by a separate process
(e.g. ``python sensor_ingestion/main.py``) never reaches the WebSocket
broadcaster, so the dashboard would not update. Registering the worker here
puts it on the same bus.

Example — Member 1, in backend/sensor_ingestion/service.py:

    from api.services import background_service

    @background_service("mqtt_ingestion")
    def start():
        subscriber = MqttSubscriber(...)
        subscriber.start()            # must not block: start your own thread
        return subscriber.stop        # optional: called at API shutdown

Then enable the module in backend/.env:

    BACKGROUND_SERVICES=sensor_ingestion.service,decision_engine.service

Each service appears in GET /api/v1/health as "service:<name>". A service that
fails to start is logged and reported there; the API itself keeps running.
"""
import importlib
import logging
from typing import Callable, Dict, List, Optional

from monitoring.health import register_health_check, unregister_health_check

logger = logging.getLogger(__name__)

StartFn = Callable[[], Optional[Callable[[], None]]]

_registry: Dict[str, StartFn] = {}
_status: Dict[str, dict] = {}
_stop_callbacks: List[tuple] = []


def background_service(name: str):
    """Decorator registering a start function under ``name``."""
    def decorator(start: StartFn) -> StartFn:
        register_background_service(name, start)
        return start
    return decorator


def register_background_service(name: str, start: StartFn) -> None:
    _registry[name] = start


def unregister_background_service(name: str) -> None:
    _registry.pop(name, None)
    _status.pop(name, None)
    unregister_health_check(f"service:{name}")


def import_service_modules(module_paths: List[str]) -> None:
    """Import modules listed in BACKGROUND_SERVICES so their decorators run."""
    for path in module_paths:
        try:
            importlib.import_module(path)
        except Exception as exc:
            logger.error("Could not import background service module '%s': %s", path, exc)
            _status[path] = {"status": "failed", "error": f"import failed: {exc}"}
            register_health_check(f"service:{path}", lambda p=path: _status[p])


def start_all() -> None:
    """Start every registered service (blocking; call via asyncio.to_thread)."""
    for name, start in list(_registry.items()):
        if _status.get(name, {}).get("status") == "running":
            continue
        try:
            stop = start()
            if callable(stop):
                _stop_callbacks.append((name, stop))
            _status[name] = {"status": "running"}
            logger.info("Background service '%s' started", name)
        except Exception as exc:
            _status[name] = {"status": "failed", "error": str(exc)}
            logger.exception("Background service '%s' failed to start", name)
        register_health_check(f"service:{name}", lambda n=name: _status[n])


def stop_all() -> None:
    while _stop_callbacks:
        name, stop = _stop_callbacks.pop()
        try:
            stop()
            _status[name] = {"status": "stopped"}
            logger.info("Background service '%s' stopped", name)
        except Exception:
            logger.exception("Background service '%s' failed to stop cleanly", name)
