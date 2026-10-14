"""
Notification endpoints (Member 2's domain — notifications are created by the
decision engine).
GET  /api/v1/notifications
POST /api/v1/notifications/{notification_id}/acknowledge
"""
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Query

from api.dependencies import not_found, with_fallback
from database.connection import db_manager
from events import event_types as ev
from events.event_bus import Event, event_bus
from utils.serialization import to_jsonable

router = APIRouter()

# SELECT * on purpose: a column the owning member adds in a later migration
# shows up in the API without touching this file.
NOTIFICATION_COLUMNS = "n.*, r.name AS room_name"


@router.get("/notifications", summary="Notifications (newest first)")
def get_notifications(
    status: Literal["ACTIVE", "ACKNOWLEDGED", "DISMISSED", "ALL"] = "ACTIVE",
    since: Optional[datetime] = Query(default=None, description="Only notifications created after this ISO-8601 time"),
    limit: int = Query(default=100, ge=1, le=500),
):
    def query():
        clauses, params = [], []
        if status != "ALL":
            clauses.append("n.status = %s")
            params.append(status)
        if since is not None:
            clauses.append("n.created_at > %s")
            params.append(since)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = db_manager.fetch_all(
            f"SELECT {NOTIFICATION_COLUMNS} FROM notifications n "
            f"LEFT JOIN rooms r ON r.room_id = n.room_id {where} "
            "ORDER BY n.created_at DESC LIMIT %s",
            (*params, limit),
        )
        return {"notifications": to_jsonable(rows), "total": len(rows), "demo_data": False}

    return with_fallback(query, lambda: {"notifications": [], "total": 0, "demo_data": True})


@router.post("/notifications/{notification_id}/acknowledge", summary="Acknowledge a notification")
def acknowledge_notification(notification_id: UUID):
    """Idempotent: acknowledging twice returns the notification unchanged
    with ``already_acknowledged: true``."""
    updated = db_manager.fetch_one(
        "UPDATE notifications SET status = 'ACKNOWLEDGED', "
        "acknowledged_at = (now() AT TIME ZONE 'UTC') "
        "WHERE notification_id = %s AND status = 'ACTIVE' "
        "RETURNING *",
        (str(notification_id),),
    )
    if updated is None:
        existing = db_manager.fetch_one(
            "SELECT * FROM notifications WHERE notification_id = %s",
            (str(notification_id),),
        )
        if existing is None:
            raise not_found("Notification", notification_id)
        return {**to_jsonable(existing), "already_acknowledged": True}

    payload = to_jsonable(updated)
    event_bus.publish_sync(Event(ev.NOTIFICATION_ACKNOWLEDGED, payload))
    return {**payload, "already_acknowledged": False}
