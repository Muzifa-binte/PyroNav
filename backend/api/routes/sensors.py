"""
Sensor endpoints (Member 1's domain — data written by the MQTT ingestion service).
GET  /api/v1/sensors
GET  /api/v1/sensors/readings              — recent readings across sensors (filter by room)
GET  /api/v1/sensors/{sensor_id}
GET  /api/v1/sensors/{sensor_id}/readings
POST /api/v1/sensors                       — register a sensor
"""
from datetime import datetime
from typing import Literal, Optional

import psycopg2.errors
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from api.dependencies import not_found, with_fallback
from database import demo_data
from database.connection import db_manager
from utils.serialization import to_jsonable

router = APIRouter()

SensorType = Literal["current", "smoke_heat", "co"]
SensorStatus = Literal["active", "inactive", "error", "stale"]

# SELECT * on purpose: a column the owning member adds in a later migration
# shows up in the API without touching this file.
SENSOR_COLUMNS = "*"


class SensorCreate(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=50, examples=["SMOKE-OT-02"])
    room_id: str = Field(min_length=1, max_length=50, examples=["operation_theater"])
    sensor_type: SensorType
    unit_config: Optional[dict] = Field(default=None, examples=[{"smoke": "ppm", "temperature": "degC"}])


def _demo_sensors():
    return [
        {"status": "active", "last_seen_at": None, "created_at": None, **s}
        for s in demo_data.sensors()
    ]


@router.get(
    "/sensors",
    summary="List all sensors",
    description="All registered sensors with their current status and `latest_reading` "
                "(null if none yet). Optional filters narrow the list.",
)
def get_all_sensors(
    room_id: Optional[str] = None,
    sensor_type: Optional[SensorType] = None,
    status: Optional[SensorStatus] = None,
):
    filters = {"room_id": room_id, "sensor_type": sensor_type, "status": status}

    def query():
        clauses = [f"{col} = %s" for col, val in filters.items() if val is not None]
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = db_manager.fetch_all(
            f"SELECT {SENSOR_COLUMNS} FROM sensors {where} ORDER BY room_id, sensor_id",
            tuple(v for v in filters.values() if v is not None),
        )
        # Same shape as GET /sensors/{id}, so a table can show values right after load
        latest = {
            r.pop("sensor_id"): r
            for r in db_manager.fetch_all(
                'SELECT sensor_id, "timestamp", "values", units, validation_status '
                "FROM latest_sensor_readings"
            )
        }
        for row in rows:
            row["latest_reading"] = latest.get(row["sensor_id"])
        return {"sensors": to_jsonable(rows), "total": len(rows), "demo_data": False}

    def fallback():
        rows = [{**s, "latest_reading": None} for s in _demo_sensors()
                if all(val is None or s.get(col) == val for col, val in filters.items())]
        return {"sensors": rows, "total": len(rows), "demo_data": True}

    return with_fallback(query, fallback)


# Declared before /sensors/{sensor_id}, which would otherwise match "readings"
@router.get("/sensors/readings", summary="Recent readings across sensors (newest first)")
def get_recent_readings(
    room_id: Optional[str] = None,
    sensor_id: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=1000),
    from_time: Optional[datetime] = Query(default=None, description="ISO-8601, inclusive"),
):
    def query():
        clauses, params = [], []
        for column, value in (("room_id", room_id), ("sensor_id", sensor_id)):
            if value is not None:
                clauses.append(f"{column} = %s")
                params.append(value)
        if from_time is not None:
            clauses.append('"timestamp" >= %s')
            params.append(from_time)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = db_manager.fetch_all(
            f'SELECT * FROM sensor_readings {where} ORDER BY "timestamp" DESC LIMIT %s',
            (*params, limit),
        )
        return {"room_id": room_id, "sensor_id": sensor_id, "readings": to_jsonable(rows),
                "count": len(rows), "demo_data": False}

    def fallback():
        return {"room_id": room_id, "sensor_id": sensor_id, "readings": [], "count": 0,
                "demo_data": True}

    return with_fallback(query, fallback)


@router.get("/sensors/{sensor_id}", summary="Get a single sensor with its latest reading")
def get_sensor(sensor_id: str):
    def query():
        sensor = db_manager.fetch_one(
            f"SELECT {SENSOR_COLUMNS} FROM sensors WHERE sensor_id = %s", (sensor_id,)
        )
        if sensor is None:
            raise not_found("Sensor", sensor_id)
        sensor["latest_reading"] = db_manager.fetch_one(
            'SELECT "timestamp", "values", units, validation_status '
            "FROM latest_sensor_readings WHERE sensor_id = %s",
            (sensor_id,),
        )
        return {**to_jsonable(sensor), "demo_data": False}

    def fallback():
        sensor = next((s for s in _demo_sensors() if s["sensor_id"] == sensor_id), None)
        if sensor is None:
            raise not_found("Sensor", sensor_id)
        return {**sensor, "latest_reading": None, "demo_data": True}

    return with_fallback(query, fallback)


@router.get("/sensors/{sensor_id}/readings", summary="Recent readings for a sensor (newest first)")
def get_sensor_readings(
    sensor_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    from_time: Optional[datetime] = Query(default=None, description="ISO-8601, inclusive"),
    to_time: Optional[datetime] = Query(default=None, description="ISO-8601, exclusive"),
):
    def query():
        if not db_manager.fetch_one("SELECT 1 AS ok FROM sensors WHERE sensor_id = %s", (sensor_id,)):
            raise not_found("Sensor", sensor_id)
        clauses, params = ["sensor_id = %s"], [sensor_id]
        if from_time is not None:
            clauses.append('"timestamp" >= %s')
            params.append(from_time)
        if to_time is not None:
            clauses.append('"timestamp" < %s')
            params.append(to_time)
        rows = db_manager.fetch_all(
            "SELECT * "
            f"FROM sensor_readings WHERE {' AND '.join(clauses)} "
            'ORDER BY "timestamp" DESC LIMIT %s',
            (*params, limit),
        )
        return {"sensor_id": sensor_id, "readings": to_jsonable(rows),
                "count": len(rows), "demo_data": False}

    def fallback():
        if not any(s["sensor_id"] == sensor_id for s in demo_data.sensors()):
            raise not_found("Sensor", sensor_id)
        return {"sensor_id": sensor_id, "readings": [], "count": 0, "demo_data": True}

    return with_fallback(query, fallback)


@router.post("/sensors", status_code=status.HTTP_201_CREATED, summary="Register a sensor")
def register_sensor(sensor: SensorCreate):
    try:
        row = db_manager.fetch_one(
            f"INSERT INTO sensors (sensor_id, room_id, sensor_type, unit_config) "
            f"VALUES (%s, %s, %s, %s) RETURNING {SENSOR_COLUMNS}",
            (sensor.sensor_id, sensor.room_id, sensor.sensor_type, sensor.unit_config),
        )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail=f"Sensor '{sensor.sensor_id}' already exists")
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(status_code=422, detail=f"Room '{sensor.room_id}' does not exist")
    return to_jsonable(row)
