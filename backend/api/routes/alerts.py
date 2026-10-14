"""
Alert endpoints — a dashboard-friendly view combining hazard events with their
most recent notification (used by the Overview and Alerts pages).
GET /api/v1/alerts
GET /api/v1/alerts/{event_id}
GET /api/v1/security/events      — IDS / security events (Network Security page)
"""
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Query

from api.dependencies import not_found, with_fallback
from database.connection import db_manager
from utils.serialization import to_jsonable

router = APIRouter()

HazardLevel = Literal["NORMAL", "WARNING", "HIGH_RISK", "CRITICAL", "UNKNOWN"]

# One row per hazard event, joined with the room name and its latest notification.
# "severity"/"message"/"created_at" fall back to event values when no notification exists.
ALERT_QUERY = """
    SELECT he.event_id,
           he.room_id,
           r.name                                   AS room_name,
           he.hazard_level,
           COALESCE(n.severity, he.hazard_level)    AS severity,
           COALESCE(n.message,
                    he.hazard_level || ' hazard detected in ' || COALESCE(r.name, he.room_id))
                                                    AS message,
           he.reason_codes,
           he.source_sensor_ids,
           he.detected_at,
           he.resolved_at,
           he.status,
           n.notification_id,
           n.status                                 AS notification_status,
           COALESCE(n.created_at, he.detected_at)   AS created_at
    FROM hazard_events he
    LEFT JOIN rooms r ON r.room_id = he.room_id
    LEFT JOIN LATERAL (
        SELECT notification_id, severity, message, status, created_at
        FROM notifications
        WHERE event_id = he.event_id
        ORDER BY created_at DESC
        LIMIT 1
    ) n ON TRUE
"""

SEVERITY_ORDER = (
    "CASE he.hazard_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH_RISK' THEN 2 "
    "WHEN 'WARNING' THEN 3 ELSE 4 END"
)


@router.get("/alerts", summary="Hazard alerts (most severe, then newest, first)")
def get_alerts(
    status: Literal["ACTIVE", "RESOLVED", "ALL"] = Query(default="ACTIVE"),
    severity: Optional[HazardLevel] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    def query():
        clauses, params = [], []
        if status != "ALL":
            clauses.append("he.status = %s")
            params.append(status)
        if severity:
            clauses.append("he.hazard_level = %s")
            params.append(severity)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = db_manager.fetch_all(
            f"{ALERT_QUERY} {where} ORDER BY {SEVERITY_ORDER}, he.detected_at DESC LIMIT %s",
            (*params, limit),
        )
        return {"alerts": to_jsonable(rows), "total": len(rows), "demo_data": False}

    return with_fallback(query, lambda: {"alerts": [], "total": 0, "demo_data": True})


@router.get("/alerts/{event_id}", summary="Single alert detail")
def get_alert(event_id: UUID):
    row = db_manager.fetch_one(f"{ALERT_QUERY} WHERE he.event_id = %s", (str(event_id),))
    if row is None:
        raise not_found("Alert", event_id)
    return to_jsonable(row)


@router.get("/security/events", summary="IDS / security events (newest first)")
def get_security_events(limit: int = Query(default=50, ge=1, le=200)):
    def query():
        rows = db_manager.fetch_all(
            "SELECT event_id, category, source, severity, description, metadata, "
            "detected_at AS timestamp FROM security_events "
            "ORDER BY detected_at DESC LIMIT %s",
            (limit,),
        )
        return {"events": to_jsonable(rows), "total": len(rows), "demo_data": False}

    return with_fallback(query, lambda: {"events": [], "total": 0, "demo_data": True})
