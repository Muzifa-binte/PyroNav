"""
Hazard event endpoints (Member 2's domain — events are created by the decision engine).
GET /api/v1/events
GET /api/v1/events/{event_id}
"""
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Query

from api.dependencies import not_found, with_fallback
from database.connection import db_manager
from utils.serialization import to_jsonable

router = APIRouter()

# SELECT * on purpose: a column the owning member adds in a later migration
# shows up in the API without touching this file.
EVENT_COLUMNS = "he.*, r.name AS room_name"


@router.get("/events", summary="Hazard events (newest first)")
def get_events(
    status: Literal["ACTIVE", "RESOLVED", "ALL"] = "ACTIVE",
    room_id: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    def query():
        clauses, params = [], []
        if status != "ALL":
            clauses.append("he.status = %s")
            params.append(status)
        if room_id:
            clauses.append("he.room_id = %s")
            params.append(room_id)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = db_manager.fetch_all(
            f"SELECT {EVENT_COLUMNS} FROM hazard_events he "
            f"LEFT JOIN rooms r ON r.room_id = he.room_id {where} "
            "ORDER BY he.detected_at DESC LIMIT %s",
            (*params, limit),
        )
        return {"events": to_jsonable(rows), "total": len(rows), "demo_data": False}

    return with_fallback(query, lambda: {"events": [], "total": 0, "demo_data": True})


@router.get("/events/{event_id}", summary="One hazard event with its notifications")
def get_event(event_id: UUID):
    event = db_manager.fetch_one(
        f"SELECT {EVENT_COLUMNS} FROM hazard_events he "
        "LEFT JOIN rooms r ON r.room_id = he.room_id WHERE he.event_id = %s",
        (str(event_id),),
    )
    if event is None:
        raise not_found("Event", event_id)
    event["notifications"] = db_manager.fetch_all(
        "SELECT notification_id, severity, message, created_at, acknowledged_at, status "
        "FROM notifications WHERE event_id = %s ORDER BY created_at DESC",
        (str(event_id),),
    )
    return to_jsonable(event)
