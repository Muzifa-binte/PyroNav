"""
Alerts & IDS endpoints.
GET /api/v1/alerts
GET /api/v1/alerts/{event_id}
GET /api/v1/security/events
"""
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


@router.get("/alerts", summary="All hazard events / alerts")
async def get_alerts(
    status: str = Query(default="ACTIVE"),
    severity: str = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    # TODO: query hazard_events + notifications tables
    return {"alerts": [], "total": 0, "demo_data": True}


@router.get("/alerts/{event_id}", summary="Single alert detail")
async def get_alert(event_id: str):
    # TODO: query by event_id
    raise HTTPException(status_code=404, detail="Alert not found (DB not connected)")


@router.get("/security/events", summary="IDS / security events")
async def get_security_events(
    limit: int = Query(default=50, ge=1, le=200),
):
    # TODO: query IDS events table when Member 4's IDS integration is complete
    return {"events": [], "total": 0, "demo_data": True}
