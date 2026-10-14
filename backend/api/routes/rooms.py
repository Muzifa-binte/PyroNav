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

_now = datetime.now(timezone.utc).isoformat

def _room(room_id, name, hazard="UNKNOWN", quality="NO_DATA", pos=None):
    return {
        "room_id": room_id,
        "name": name,
        "current_hazard_level": hazard,
        "data_quality_status": quality,
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
        "map_position": pos or {"x": 0, "y": 0},
    }

MOCK_ROOMS = [
    _room("icu",               "ICU (4 Beds)",              "UNKNOWN", "NO_DATA"),
    _room("isolation_room",    "Isolation Room",             "UNKNOWN", "NO_DATA"),
    _room("patient_room",      "Patient Room (2 Beds)",      "UNKNOWN", "NO_DATA"),
    _room("operation_theater", "Operating Theatre (OT)",     "NORMAL",  "FRESH"),
    _room("radiology",         "Radiology (X-Ray)",          "UNKNOWN", "NO_DATA"),
    _room("lab",               "Lab",                        "UNKNOWN", "NO_DATA"),
    _room("pharmacy",          "Pharmacy",                   "NORMAL",  "FRESH"),
    _room("waiting_area",      "Waiting Area",               "NORMAL",  "FRESH"),
    _room("administration",    "Administration",             "UNKNOWN", "NO_DATA"),
    _room("records",           "Records",                    "UNKNOWN", "NO_DATA"),
    _room("general_ward",      "General Ward (6 Beds)",      "UNKNOWN", "NO_DATA"),
    _room("maternity_ward",    "Maternity Ward (4 Beds)",    "UNKNOWN", "NO_DATA"),
    _room("cafeteria",         "Cafeteria",                  "NORMAL",  "FRESH"),
    _room("main_lobby",        "Main Lobby & Reception",     "NORMAL",  "FRESH"),
    _room("emergency_dept",    "Emergency Department",       "UNKNOWN", "NO_DATA"),
    _room("blood_bank",        "Blood Bank",                 "UNKNOWN", "NO_DATA"),
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
