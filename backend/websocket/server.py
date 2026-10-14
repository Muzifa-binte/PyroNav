"""
WebSocket router — mounts at /ws/v1/live.

Connect:
    ws://localhost:8000/ws/v1/live?client_id=heatmap
    ws://localhost:8000/ws/v1/live?client_id=routes&events=route_updated,room_status_changed

Server → client:
    1. {"event_type": "connection_established", "data": {...session info...}, "timestamp": ...}
    2. every domain event: {"event_type": "...", "data": {...}, "timestamp": "..."}
    3. periodic {"event_type": "heartbeat", ...} frames (WS_HEARTBEAT_SECONDS)

Client → server (JSON text frames, all optional):
    {"type": "ping"}                                    → {"type": "pong", ...}
    {"type": "subscribe", "event_types": ["route_updated"]}  → only those events
    {"type": "subscribe", "event_types": ["*"]}         → every event again
    anything else                                       → {"type": "ack", ...}

Full protocol: shared-contracts/websocket-events.json
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from events.event_types import WEBSOCKET_EVENTS
from utils.serialization import utc_now_iso
from websocket.connection_manager import ClientConnection, manager

logger = logging.getLogger(__name__)

router = APIRouter()

AVAILABLE_EVENTS = sorted(set(WEBSOCKET_EVENTS.values()))


def _parse_subscriptions(event_types) -> Optional[set]:
    """None means "all events". Unknown names are ignored."""
    if not event_types:
        return None
    if isinstance(event_types, str):
        event_types = [e.strip() for e in event_types.split(",")]
    wanted = {str(e) for e in event_types if e}
    if "*" in wanted:
        return None
    return wanted & set(AVAILABLE_EVENTS)


def _handle_client_message(client: ClientConnection, raw: str) -> dict:
    try:
        message = json.loads(raw)
    except ValueError:
        message = {"type": raw.strip().lower()}  # tolerate a bare "ping"
    if not isinstance(message, dict):
        message = {}

    msg_type = message.get("type")
    if msg_type == "ping":
        return {"type": "pong", "timestamp": utc_now_iso()}
    if msg_type == "subscribe":
        client.subscriptions = _parse_subscriptions(message.get("event_types"))
        return {
            "type": "subscribed",
            "event_types": sorted(client.subscriptions) if client.subscriptions is not None else ["*"],
        }
    return {"type": "ack", "message": "received"}


@router.websocket("/ws/v1/live")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "anonymous",
                             events: Optional[str] = None):
    """Persistent push channel for real-time system events."""
    client = await manager.connect(websocket, client_id=client_id[:100])
    client.subscriptions = _parse_subscriptions(events)
    try:
        await manager.send_personal_message(
            {
                "event_type": "connection_established",
                "data": {
                    "session_id": client.session_id,
                    "client_id": client.client_id,
                    "server_time": utc_now_iso(),
                    "available_events": AVAILABLE_EVENTS,
                    "subscriptions": sorted(client.subscriptions) if client.subscriptions is not None else ["*"],
                },
                "timestamp": utc_now_iso(),
            },
            websocket,
        )
        while True:
            raw = await websocket.receive_text()
            client.last_activity = datetime.now(timezone.utc)
            await manager.send_personal_message(_handle_client_message(client, raw), websocket)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Unexpected WebSocket error for client %s", client.client_id)
    finally:
        manager.disconnect(websocket)


async def heartbeat_loop(interval_seconds: float) -> None:
    """Send a heartbeat frame to every client. Keeps proxies from closing idle
    connections, lets the UI show "last update", and detects dead clients."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            await manager.broadcast(
                {
                    "event_type": "heartbeat",
                    "data": {"connected_clients": manager.connection_count},
                    "timestamp": utc_now_iso(),
                }
            )
        except Exception:
            logger.exception("Heartbeat broadcast failed")
