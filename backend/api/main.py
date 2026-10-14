"""
PyroNav — FastAPI application entry point.

Start with:
    cd backend
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

Run ONE process (no --workers N): the event bus and WebSocket clients live in
memory, so an event raised in one worker would never reach clients connected to
another. See docs/ARCHITECTURE.md ("Process model").

Interactive docs:
    http://localhost:8000/docs      (Swagger UI)
    http://localhost:8000/redoc     (ReDoc)
"""
import asyncio
import logging
import sys
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import services
from api.config import get_settings
from api.errors import register_exception_handlers
from api.middleware import RequestContextMiddleware
from api.routes import alerts, evacuation, events, health, notifications, rooms, sensors, system
from database.connection import DatabaseUnavailableError, db_manager
from events.event_bus import event_bus
from monitoring.background_writer import db_writer
from monitoring.logger import setup_logging
from monitoring.metrics import request_metrics
from websocket.connection_manager import manager
from websocket.event_broadcaster import broadcaster  # noqa: F401 — registers subscriptions
from websocket.server import heartbeat_loop, router as ws_router

settings = get_settings()
logger = logging.getLogger("api")


# ---------------------------------------------------------------------------
# Background jobs
# ---------------------------------------------------------------------------

async def retention_loop(days: int, interval_hours: float) -> None:
    from database.maintenance import purge_old_data
    while True:
        try:
            await asyncio.to_thread(purge_old_data, days)
        except DatabaseUnavailableError:
            logger.warning("Retention purge skipped: database unavailable")
        except Exception:
            logger.exception("Retention purge failed")
        await asyncio.sleep(interval_hours * 3600)


def _auto_migrate() -> None:
    from database.migrations.migrate import run_migrations
    try:
        applied = run_migrations()
        if applied:
            logger.info("Applied migrations: %s", ", ".join(applied))
    except Exception as exc:  # the API still starts; /health shows the problem
        logger.error("Automatic migration failed: %s", exc)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

def _make_console_output_safe() -> None:
    """A print() of a character the console encoding lacks (e.g. "→" on a
    Windows cp1252 console or a redirected log file) raises UnicodeEncodeError —
    inside an event handler that aborts the handler. Replace such characters
    instead of raising, for every module's print()."""
    for stream in (sys.stdout, sys.stderr):
        with suppress(AttributeError, ValueError):
            stream.reconfigure(errors="backslashreplace")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _make_console_output_safe()
    setup_logging(
        level=settings.log_level,
        log_dir=settings.log_path,
        db_writer=db_writer if settings.log_to_database else None,
    )
    # Lets teammates' worker threads (MQTT, decision engine) publish events whose
    # async handlers — the WebSocket broadcaster — run on this loop.
    event_bus.bind_loop(asyncio.get_running_loop())
    db_writer.start()
    manager.attach_session_writer(db_writer)

    if settings.auto_migrate:
        await asyncio.to_thread(_auto_migrate)

    # Teammates' workers (MQTT ingestion, decision engine, …) share this process's
    # event bus — see api/services.py
    services.import_service_modules(settings.background_service_modules)
    await asyncio.to_thread(services.start_all)

    tasks = []
    if settings.ws_heartbeat_seconds > 0:
        tasks.append(asyncio.create_task(heartbeat_loop(settings.ws_heartbeat_seconds)))
    if settings.retention_days > 0:
        tasks.append(asyncio.create_task(
            retention_loop(settings.retention_days, settings.retention_interval_hours)
        ))

    db_ok = await asyncio.to_thread(db_manager.is_available)
    logger.info("PyroNav API ready - database %s%s",
                "connected" if db_ok else "UNAVAILABLE",
                "" if db_ok or not settings.demo_fallback else " (serving demo data)")
    logger.info("Swagger UI: /docs   WebSocket: /ws/v1/live")

    yield

    for task in tasks:
        task.cancel()
    for task in tasks:
        with suppress(asyncio.CancelledError):
            await task
    await asyncio.to_thread(services.stop_all)
    event_bus.unbind_loop()
    db_writer.stop()
    db_manager.close()
    logger.info("PyroNav API shut down cleanly.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=(
        "PyroNav — Emergency Evacuation & Predictive Fire Safety System.\n\n"
        "**Note:** This is an academic prototype. Responses with `demo_data: true` come "
        "from `/shared-contracts/mock-data` because the database is unreachable.\n\n"
        "Real-time events: WebSocket at `/ws/v1/live` "
        "(see `shared-contracts/websocket-events.json`)."
    ),
    lifespan=lifespan,
)

register_exception_handlers(app, debug=settings.debug)

# Last added = outermost: CORS answers preflight requests before anything else
app.add_middleware(
    RequestContextMiddleware,
    metrics=request_metrics,
    audit_writer=db_writer if settings.audit_log_enabled else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-Ms"],
)

PREFIX = "/api/v1"

app.include_router(health.router,        prefix=PREFIX, tags=["Health"])
app.include_router(sensors.router,       prefix=PREFIX, tags=["Sensors"])
app.include_router(rooms.router,         prefix=PREFIX, tags=["Rooms & Hazards"])
app.include_router(events.router,        prefix=PREFIX, tags=["Rooms & Hazards"])
app.include_router(notifications.router, prefix=PREFIX, tags=["Rooms & Hazards"])
app.include_router(evacuation.router,    prefix=PREFIX, tags=["Evacuation & Routes"])
app.include_router(alerts.router,        prefix=PREFIX, tags=["Alerts & Security"])
app.include_router(system.router,        prefix=PREFIX, tags=["System"])
app.include_router(ws_router)  # WebSocket — no prefix, mounts at /ws/v1/live


# ---------------------------------------------------------------------------
# Run directly (dev only — prefer the uvicorn CLI)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
