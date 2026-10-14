"""
Canonical event names for the in-process event bus.

Use these constants instead of string literals so a typo fails at import time
rather than silently never matching a subscriber.

Flow (see docs/ARCHITECTURE.md):
    Member 1 ingestion  ──SENSOR_READING_RECEIVED──▶ Member 2 decision engine
    Member 2            ──ROOM_STATUS_CHANGED─────▶ Member 3 route monitor
    Member 2            ──HAZARD_EVENT_CREATED / NOTIFICATION_CREATED
    Member 3            ──ROUTE_UPDATED
    every event above   ──▶ Member 4 EventBroadcaster ──▶ WebSocket clients
"""

# Member 1 — sensor ingestion
SENSOR_READING_RECEIVED = "sensor_reading_received"
SENSOR_STATUS_CHANGED = "sensor_status_changed"

# Member 2 — decision engine
ROOM_STATUS_CHANGED = "room_status_changed"
HAZARD_EVENT_CREATED = "hazard_event_created"
HAZARD_EVENT_RESOLVED = "hazard_event_resolved"
NOTIFICATION_CREATED = "notification_created"
NOTIFICATION_ACKNOWLEDGED = "notification_acknowledged"

# Member 3 — pathfinding
ROUTE_UPDATED = "route_updated"

# Security / IDS
IDS_EVENT_DETECTED = "ids_event_detected"

# Internal event name → event_type sent to WebSocket clients.
# Every event listed here is forwarded to the frontend. Keys on the left that
# differ from the value are aliases kept for compatibility.
WEBSOCKET_EVENTS = {
    SENSOR_READING_RECEIVED: "sensor_reading_updated",
    "sensor_reading_updated": "sensor_reading_updated",
    SENSOR_STATUS_CHANGED: SENSOR_STATUS_CHANGED,
    ROOM_STATUS_CHANGED: ROOM_STATUS_CHANGED,
    HAZARD_EVENT_CREATED: HAZARD_EVENT_CREATED,
    HAZARD_EVENT_RESOLVED: HAZARD_EVENT_RESOLVED,
    NOTIFICATION_CREATED: NOTIFICATION_CREATED,
    NOTIFICATION_ACKNOWLEDGED: NOTIFICATION_ACKNOWLEDGED,
    ROUTE_UPDATED: ROUTE_UPDATED,
    IDS_EVENT_DETECTED: IDS_EVENT_DETECTED,
}

ALL_EVENT_TYPES = frozenset(WEBSOCKET_EVENTS)
