"""
Room / decision-engine endpoints (Member 2's domain — room state is written by
the decision engine).
GET /api/v1/rooms
GET /api/v1/rooms/{room_id}
GET /api/v1/rooms/{room_id}/hazard
GET /api/v1/rooms/{room_id}/data-quality
"""
from typing import Dict, List

from fastapi import APIRouter

from api.dependencies import not_found, with_fallback
from database import demo_data
from database.connection import db_manager
from utils.serialization import to_jsonable

router = APIRouter()

# SELECT * on purpose: a column the owning member adds in a later migration
# shows up in the API without touching this file.
ROOM_COLUMNS = "*"


def _demo_rooms() -> List[Dict]:
    return [
        {
            **r,  # room_id, name, map_position, dimensions, floor_id, kind, category
            "current_hazard_level": "UNKNOWN",
            "data_quality_status": "NO_DATA",
            "last_updated_at": None,
            "demo_data": True,
        }
        for r in demo_data.rooms()
    ]


def _demo_room(room_id: str) -> Dict:
    room = next((r for r in _demo_rooms() if r["room_id"] == room_id), None)
    if room is None:
        raise not_found("Room", room_id)
    return room


def _room_or_404(room_id: str) -> Dict:
    room = db_manager.fetch_one(f"SELECT {ROOM_COLUMNS} FROM rooms WHERE room_id = %s", (room_id,))
    if room is None:
        raise not_found("Room", room_id)
    return room


def _latest_readings_by_measurement(rows: List[Dict]) -> Dict:
    """Flatten each sensor's latest reading into {measurement: {value, unit,
    timestamp, sensor_id}}. When several sensors measure the same thing (ICU has
    two smoke detectors) the HIGHEST value wins, as in the decision engine, so a
    room in alarm never shows a reassuring value from its other sensor."""
    result: Dict[str, Dict] = {}
    for row in sorted(rows, key=lambda r: r["timestamp"]):
        units = row.get("units") or {}
        for measurement, value in (row.get("values") or {}).items():
            current = result.get(measurement)
            if current is not None and isinstance(value, (int, float)) and value < current["value"]:
                continue
            result[measurement] = {
                "value": value,
                "unit": units.get(measurement),
                "timestamp": row["timestamp"],
                "sensor_id": row["sensor_id"],
                "validation_status": row["validation_status"],
            }
    return result


@router.get("/rooms", summary="List all rooms with current hazard state")
def get_rooms():
    def query():
        rows = db_manager.fetch_all(f"SELECT {ROOM_COLUMNS} FROM rooms ORDER BY name")
        return {"rooms": to_jsonable(rows), "total": len(rows), "demo_data": False}

    def fallback():
        rooms = _demo_rooms()
        return {"rooms": rooms, "total": len(rooms), "demo_data": True}

    return with_fallback(query, fallback)


@router.get("/rooms/{room_id}", summary="Room state with latest readings and active events")
def get_room(room_id: str):
    def query():
        room = _room_or_404(room_id)
        readings = db_manager.fetch_all(
            'SELECT sensor_id, "timestamp", "values", units, validation_status '
            "FROM latest_sensor_readings WHERE room_id = %s",
            (room_id,),
        )
        events = db_manager.fetch_all(
            "SELECT event_id, hazard_level, reason_codes, source_sensor_ids, detected_at "
            "FROM hazard_events WHERE room_id = %s AND status = 'ACTIVE' "
            "ORDER BY detected_at DESC",
            (room_id,),
        )
        room["latest_readings"] = _latest_readings_by_measurement(readings)
        room["active_events"] = events
        return {**to_jsonable(room), "demo_data": False}

    def fallback():
        return {**_demo_room(room_id), "latest_readings": {}, "active_events": []}

    return with_fallback(query, fallback)


@router.get("/rooms/{room_id}/hazard", summary="Current hazard detail for a room")
def get_room_hazard(room_id: str):
    def query():
        room = _room_or_404(room_id)
        event = db_manager.fetch_one(
            "SELECT event_id, reason_codes, source_sensor_ids, detected_at "
            "FROM hazard_events WHERE room_id = %s AND status = 'ACTIVE' "
            "ORDER BY detected_at DESC LIMIT 1",
            (room_id,),
        ) or {}
        return to_jsonable({
            "room_id": room_id,
            "hazard_level": room["current_hazard_level"],
            "event_id": event.get("event_id"),
            "reason_codes": event.get("reason_codes") or [],
            "source_sensor_ids": event.get("source_sensor_ids") or [],
            "detected_at": event.get("detected_at"),
            "last_updated_at": room["last_updated_at"],
            "demo_data": False,
        })

    def fallback():
        room = _demo_room(room_id)
        return {
            "room_id": room_id, "hazard_level": room["current_hazard_level"],
            "event_id": None, "reason_codes": [], "source_sensor_ids": [],
            "detected_at": None, "last_updated_at": None, "demo_data": True,
        }

    return with_fallback(query, fallback)


@router.get("/rooms/{room_id}/data-quality", summary="Sensor freshness for a room")
def get_room_data_quality(room_id: str):
    """A sensor counts as fresh if it reported in the last 60 seconds.
    ``status`` is the value maintained by the decision engine."""
    def query():
        row = db_manager.fetch_one(
            "SELECT * FROM room_sensor_freshness WHERE room_id = %s", (room_id,)
        )
        if row is None:
            raise not_found("Room", room_id)
        row["status"] = row.pop("data_quality_status")
        return {**to_jsonable(row), "demo_data": False}

    def fallback():
        _demo_room(room_id)
        count = sum(1 for s in demo_data.sensors() if s["room_id"] == room_id)
        return {
            "room_id": room_id, "status": "NO_DATA", "sensor_count": count,
            "fresh_sensors": 0, "stale_sensors": 0, "never_reported": count,
            "last_update": None, "demo_data": True,
        }

    return with_fallback(query, fallback)
