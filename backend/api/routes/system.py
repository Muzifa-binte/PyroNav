"""
System / monitoring endpoints (Member 4's domain).
GET /api/v1/system/stats
GET /api/v1/system/logs
GET /api/v1/system/websocket/stats
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Query

router = APIRouter()

# Track startup time for uptime calculation
_startup_time = datetime.now(timezone.utc)


@router.get("/system/stats", summary="Overall system statistics")
async def system_statistics():
    from websocket.connection_manager import manager  # avoid circular at module level

    uptime_seconds = (datetime.now(timezone.utc) - _startup_time).total_seconds()

    return {
        "websocket": {
            "connected_clients": manager.connection_count,
        },
        "api": {
            "uptime_seconds": round(uptime_seconds),
            "started_at":     _startup_time.isoformat(),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/system/websocket/stats", summary="WebSocket connection details")
async def websocket_stats():
    from websocket.connection_manager import manager

    return {
        "active_connections": manager.connection_count,
        "clients": manager.get_client_list(),
    }


@router.get("/system/logs", summary="Recent system logs")
async def recent_logs(
    limit: int = Query(default=100, ge=1, le=500),
    level: str = Query(default=None),
):
    # TODO: query system_logs table with optional level filter
    return {
        "logs": [],
        "total": 0,
        "note": "Connect to PostgreSQL to see real log entries.",
    }
