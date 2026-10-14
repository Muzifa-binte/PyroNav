"""
Health-check endpoints.
GET /api/v1/health         — overall system status
GET /api/v1/health/db      — detailed database statistics
"""
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Overall system health check")
async def health_check():
    from database.connection import db_manager  # local import to avoid circular

    try:
        if db_manager is None:
            raise RuntimeError("db_manager not initialised")
        db_manager.execute_query("SELECT 1")
        db_status = "connected"
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "api": "running",
            "database": db_status,
        },
        "version": "1.0.0",
    }


@router.get("/health/db", summary="Detailed database statistics")
async def database_health():
    from database.connection import db_manager

    if db_manager is None:
        return {"status": "error", "error": "Database not configured"}

    try:
        sensors_count  = db_manager.execute_query("SELECT COUNT(*) FROM sensors")[0][0]
        readings_count = db_manager.execute_query("SELECT COUNT(*) FROM sensor_readings")[0][0]
        rooms_count    = db_manager.execute_query("SELECT COUNT(*) FROM rooms")[0][0]
        return {
            "status": "connected",
            "statistics": {
                "sensors":  sensors_count,
                "readings": readings_count,
                "rooms":    rooms_count,
            },
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc)}
