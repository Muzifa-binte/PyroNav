"""
Sensor endpoints (Member 1's domain).
GET /api/v1/sensors
GET /api/v1/sensors/{sensor_id}
GET /api/v1/sensors/{sensor_id}/readings
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

# ---------------------------------------------------------------------------
# Mock data — replace with real DB queries once PostgreSQL is running.
# ---------------------------------------------------------------------------
MOCK_SENSORS = [
    {
        "sensor_id":   "SMOKE-OT-01",
        "room_id":     "operation_theater",
        "sensor_type": "smoke_heat",
        "status":      "active",
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "sensor_id":   "SMOKE-REC-01",
        "room_id":     "reception",
        "sensor_type": "smoke_heat",
        "status":      "active",
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "sensor_id":   "CO-CORR-01",
        "room_id":     "corridor_1",
        "sensor_type": "co",
        "status":      "active",
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    },
]


@router.get(
    "/sensors",
    summary="List all sensors",
    description="Returns all registered sensors with their current status.",
)
async def get_all_sensors():
    # TODO: replace with db_manager.execute_query(...)
    return {"sensors": MOCK_SENSORS, "total": len(MOCK_SENSORS)}


@router.get(
    "/sensors/{sensor_id}",
    summary="Get a single sensor",
)
async def get_sensor(sensor_id: str):
    sensor = next((s for s in MOCK_SENSORS if s["sensor_id"] == sensor_id), None)
    if sensor is None:
        raise HTTPException(status_code=404, detail=f"Sensor '{sensor_id}' not found")
    return sensor


@router.get(
    "/sensors/{sensor_id}/readings",
    summary="Recent readings for a sensor",
)
async def get_sensor_readings(
    sensor_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    from_time: Optional[str] = None,
):
    # TODO: query sensor_readings table filtered by sensor_id / from_time / limit
    return {
        "sensor_id": sensor_id,
        "readings": [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "values":    {"smoke": 45, "temperature": 22},
                "units":     {"smoke": "ppm", "temperature": "degC"},
                "validation_status": "valid",
            }
        ],
        "demo_data": True,
    }
