"""
Room / decision-engine endpoints (Member 2's domain).
GET /api/v1/rooms
GET /api/v1/rooms/{room_id}
GET /api/v1/rooms/{room_id}/hazard
GET /api/v1/notifications
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

router = APIRouter()

MOCK_ROOMS = [
    {
        "room_id": "reception",
        "name": "Reception",
        "current_hazard_level": "NORMAL",
        "data_quality_status": "FRESH",
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
        "map_position": {"x": 0, "y": 0},
    },
    {
        "room_id": "operation_theater",
        "name": "Operation Theater",
        "current_hazard_level": "NORMAL",
        "data_quality_status": "FRESH",
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
        "map_position": {"x": 100, "y": 0},
    },
    {
        "room_id": "corridor_1",
        "name": "Corridor 1",
        "current_hazard_level": "NORMAL",
        "data_quality_status": "FRESH",
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
        "map_position": {"x": 50, "y": 0},
    },
    {
        "room_id": "emergency_ward",
        "name": "Emergency Ward",
        "current_hazard_level": "UNKNOWN",
        "data_quality_status": "NO_DATA",
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
        "map_position": {"x": 100, "y": 100},
    },
]


@router.get("/rooms", summary="List all rooms with current hazard state")
async def get_rooms():
    # TODO: replace with real DB query
    return {"rooms": MOCK_ROOMS, "total": len(MOCK_ROOMS)}


@router.get("/rooms/{room_id}", summary="Get a single room's state")
async def get_room(room_id: str):
    room = next((r for r in MOCK_ROOMS if r["room_id"] == room_id), None)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' not found")
    return room


@router.get("/rooms/{room_id}/hazard", summary="Hazard detail for a room")
async def get_room_hazard(room_id: str):
    room = next((r for r in MOCK_ROOMS if r["room_id"] == room_id), None)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_id}' not found")
    return {
        "room_id": room_id,
        "hazard_level": room["current_hazard_level"],
        "reason_codes": [],
        "source_sensor_ids": [],
        "detected_at": None,
        "demo_data": True,
    }


@router.get("/notifications", summary="Active notifications")
async def get_notifications(status: str = "ACTIVE"):
    # TODO: query notifications table
    return {"notifications": [], "total": 0, "demo_data": True}
