"""
Component health registry.

Lets each subsystem report its status on GET /api/v1/health without the health
route having to import every module. Example for Member 1's MQTT subscriber:

    from monitoring.health import register_health_check

    register_health_check("mqtt", lambda: {
        "status": "connected" if client.is_connected() else "disconnected",
        "last_message_at": last_message_at,
    })

A check returns a dict with at least a "status" key. Statuses in HEALTHY_STATUSES
count as healthy; anything else marks the overall system as "degraded".
"""
import logging
import threading
from typing import Callable, Dict

logger = logging.getLogger(__name__)

HEALTHY_STATUSES = {"ok", "healthy", "connected", "running"}

_checks: Dict[str, Callable[[], dict]] = {}
_lock = threading.Lock()


def register_health_check(name: str, check: Callable[[], dict]) -> None:
    with _lock:
        _checks[name] = check


def unregister_health_check(name: str) -> None:
    with _lock:
        _checks.pop(name, None)


def run_health_checks() -> Dict[str, dict]:
    with _lock:
        checks = dict(_checks)
    results = {}
    for name, check in checks.items():
        try:
            result = check()
            results[name] = result if isinstance(result, dict) else {"status": str(result)}
        except Exception as exc:
            logger.warning("Health check '%s' raised: %s", name, exc)
            results[name] = {"status": "error", "error": str(exc)}
    return results


def is_healthy(component: dict) -> bool:
    return str(component.get("status", "")).lower() in HEALTHY_STATUSES
