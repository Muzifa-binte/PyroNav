"""
Health-check endpoints.
GET /api/v1/health          — overall status of every component
GET /api/v1/health/db       — database statistics, pool and migration state
GET /api/v1/health/live     — liveness probe (process is up)
GET /api/v1/health/ready    — readiness probe (503 until the database is reachable)
"""
import psycopg2.errors
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from api.config import get_settings
from database.connection import DatabaseUnavailableError, db_manager
from events.event_bus import event_bus
from monitoring.health import is_healthy, run_health_checks
from utils.serialization import utc_now_iso
from websocket.connection_manager import manager

router = APIRouter()

# Row counts reported by /health/db
STAT_TABLES = (
    "sensors", "sensor_readings", "rooms", "hazard_events", "notifications",
    "building_nodes", "building_edges", "exits", "route_results",
)


def _database_component() -> dict:
    try:
        return {"status": "connected", "latency_ms": db_manager.ping()}
    except DatabaseUnavailableError as exc:
        return {"status": "unavailable", "error": str(exc)}


@router.get("/health", summary="Overall system health check")
def health_check():
    components = {
        "api": {"status": "running"},
        "database": _database_component(),
        "websocket": {"status": "running", "connected_clients": manager.connection_count},
        "event_bus": {
            "status": "running",
            "total_published": event_bus.stats()["total_published"],
        },
        # Components registered by teammates' services (e.g. Member 1's "mqtt")
        **run_health_checks(),
    }
    healthy = all(is_healthy(c) for c in components.values())
    return {
        "status": "healthy" if healthy else "degraded",
        "timestamp": utc_now_iso(),
        "components": components,
        "demo_fallback_active": (
            components["database"]["status"] != "connected" and get_settings().demo_fallback
        ),
        "version": get_settings().api_version,
    }


@router.get("/health/db", summary="Detailed database statistics")
def database_health():
    try:
        latency = db_manager.ping()
        counts = db_manager.fetch_one(
            "SELECT " + ", ".join(f"(SELECT COUNT(*) FROM {t}) AS {t}" for t in STAT_TABLES)
        )
        migrations = db_manager.fetch_all(
            "SELECT filename, applied_at FROM schema_migrations ORDER BY migration_id"
        )
    except DatabaseUnavailableError as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "error": str(exc), "pool": db_manager.pool_status()},
        )
    except psycopg2.errors.UndefinedTable:
        return {
            "status": "connected",
            "database": db_manager.database_name,
            "schema": "not_initialised",
            "hint": "Run: python -m database.migrations.migrate",
            "pool": db_manager.pool_status(),
        }
    return {
        "status": "connected",
        "database": db_manager.database_name,
        "latency_ms": latency,
        "statistics": counts,
        "pool": db_manager.pool_status(),
        "migrations_applied": [m["filename"] for m in migrations],
    }


@router.get("/health/live", summary="Liveness probe")
async def liveness():
    return {"status": "alive", "timestamp": utc_now_iso()}


@router.get("/health/ready", summary="Readiness probe (database reachable)")
def readiness():
    db = _database_component()
    ready = db["status"] == "connected"
    return JSONResponse(
        status_code=200 if ready else 503,
        content={"status": "ready" if ready else "not_ready", "database": db},
    )
