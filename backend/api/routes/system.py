"""
System / monitoring endpoints (Member 4's domain).
GET  /api/v1/system/stats              — database, WebSocket, API and event-bus statistics
GET  /api/v1/system/websocket/stats    — connected WebSocket clients
GET  /api/v1/system/logs               — recent system_logs rows
GET  /api/v1/system/audit              — recent api_audit_log rows
GET  /api/v1/system/migrations         — applied / pending migrations
POST /api/v1/system/events/publish     — inject an event (development only)
"""
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.dependencies import require_dev_endpoints
from database.connection import DatabaseUnavailableError, db_manager
from database.migrations.migrate import MigrationRunner
from events.event_bus import Event, event_bus
from events.event_types import ALL_EVENT_TYPES
from monitoring.background_writer import db_writer
from monitoring.metrics import request_metrics
from utils.serialization import to_jsonable, utc_now_iso
from websocket.connection_manager import manager

router = APIRouter()

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

DATABASE_STATS_QUERY = """
    SELECT
        (SELECT COUNT(*) FROM sensors)                                       AS sensors,
        (SELECT COUNT(*) FROM sensors WHERE status = 'active')               AS sensors_active,
        (SELECT COUNT(*) FROM rooms)                                         AS rooms,
        (SELECT COUNT(*) FROM sensor_readings
          WHERE "timestamp" >= (now() AT TIME ZONE 'UTC') - INTERVAL '24 hours')
                                                                             AS readings_24h,
        (SELECT COUNT(*) FROM hazard_events WHERE status = 'ACTIVE')         AS active_hazards,
        (SELECT COUNT(*) FROM rooms
          WHERE current_hazard_level IN ('WARNING', 'HIGH_RISK', 'CRITICAL')) AS rooms_at_risk,
        (SELECT COUNT(*) FROM notifications WHERE status = 'ACTIVE')         AS active_notifications,
        (SELECT COUNT(*) FROM route_results)                                 AS routes_calculated,
        (SELECT COUNT(*) FROM system_logs
          WHERE level IN ('ERROR', 'CRITICAL')
            AND "timestamp" >= (now() AT TIME ZONE 'UTC') - INTERVAL '24 hours')
                                                                             AS errors_24h
"""


@router.get("/system/stats", summary="Overall system statistics")
def system_statistics():
    try:
        database = {"status": "connected", **db_manager.fetch_one(DATABASE_STATS_QUERY)}
    except DatabaseUnavailableError as exc:
        database = {"status": "unavailable", "error": str(exc)}
    database["pool"] = db_manager.pool_status()

    return {
        "database": database,
        "websocket": {
            "connected_clients": manager.connection_count,
            "total_connections": manager.total_connections,
            "messages_broadcast": manager.messages_broadcast,
        },
        "api": request_metrics.snapshot(),
        "event_bus": event_bus.stats(),
        "background_writer": db_writer.stats(),
        "timestamp": utc_now_iso(),
    }


@router.get("/system/websocket/stats", summary="WebSocket connection details")
async def websocket_stats():
    return {
        "active_connections": manager.connection_count,
        "total_connections": manager.total_connections,
        "messages_broadcast": manager.messages_broadcast,
        "clients": manager.get_client_list(),
    }


@router.get("/system/logs", summary="Recent system logs (newest first)")
def recent_logs(
    limit: int = Query(default=100, ge=1, le=500),
    level: Optional[LogLevel] = Query(default=None, description="Exact level to show"),
    component: Optional[str] = Query(default=None, description="Logger name prefix, e.g. 'websocket'"),
    since: Optional[datetime] = None,
):
    clauses, params = [], []
    if level:
        clauses.append("level = %s")
        params.append(level)
    if component:
        clauses.append("component LIKE %s")
        params.append(component.replace("%", r"\%").replace("_", r"\_") + "%")
    if since:
        clauses.append('"timestamp" > %s')
        params.append(since)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = db_manager.fetch_all(
        f'SELECT log_id, "timestamp", level, component, message, metadata '
        f'FROM system_logs {where} ORDER BY "timestamp" DESC, log_id DESC LIMIT %s',
        (*params, limit),
    )
    return {"logs": to_jsonable(rows), "total": len(rows)}


@router.get("/system/audit", summary="API audit trail (newest first)")
def audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    min_status: int = Query(default=0, ge=0, le=599, description="e.g. 400 for errors only"),
    endpoint: Optional[str] = Query(default=None, description="Path prefix, e.g. /api/v1/routes"),
):
    clauses, params = ["status_code >= %s"], [min_status]
    if endpoint:
        clauses.append("endpoint LIKE %s")
        params.append(endpoint.replace("%", r"\%").replace("_", r"\_") + "%")
    rows = db_manager.fetch_all(
        'SELECT audit_id, "timestamp", request_id, method, endpoint, query_string, '
        "status_code, response_time_ms, client_ip, error_message "
        f"FROM api_audit_log WHERE {' AND '.join(clauses)} "
        'ORDER BY "timestamp" DESC, audit_id DESC LIMIT %s',
        (*params, limit),
    )
    return {"entries": to_jsonable(rows), "total": len(rows)}


@router.get("/system/migrations", summary="Database migration status")
def migrations():
    with db_manager.get_connection() as conn:
        status = MigrationRunner(conn).status()
    return {
        "migrations": status,
        "pending": [m["filename"] for m in status if m["state"] == "pending"],
    }


class PublishRequest(BaseModel):
    event_type: str = Field(examples=["room_status_changed"])
    data: dict = Field(default_factory=dict, examples=[{
        "room_id": "operation_theater", "hazard_level": "CRITICAL", "previous_level": "WARNING",
    }])


@router.post(
    "/system/events/publish",
    summary="Inject an event into the event bus (development only)",
    dependencies=[Depends(require_dev_endpoints)],
)
async def publish_event(body: PublishRequest):
    """Publishes the event exactly as a teammate's service would: every subscriber
    runs (e.g. the RouteMonitor on room_status_changed) and the event is broadcast
    to WebSocket clients. Disabled when ENABLE_DEV_ENDPOINTS=false."""
    if body.event_type not in ALL_EVENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown event_type. Allowed: {sorted(ALL_EVENT_TYPES)}",
        )
    await event_bus.publish(Event(body.event_type, body.data))
    return {
        "published": True,
        "event_type": body.event_type,
        "websocket_clients": manager.connection_count,
        "timestamp": utc_now_iso(),
    }
