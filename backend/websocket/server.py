"""
WebSocket router — mounts at /ws/v1/live.
Clients connect here to receive real-time events from the system.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from websocket.connection_manager import manager

router = APIRouter()


@router.websocket("/ws/v1/live")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "anonymous"):
    """
    Persistent WebSocket connection.

    Connect: ws://localhost:8000/ws/v1/live?client_id=frontend-1

    Incoming messages from the client are acknowledged but otherwise ignored
    for now — this endpoint is primarily a server→client push channel.
    """
    await manager.connect(websocket, client_id=client_id)
    try:
        while True:
            # Keep the connection alive; handle any client-sent messages.
            data = await websocket.receive_text()
            await manager.send_personal_message(
                {"type": "ack", "message": "received"}, websocket
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        print(f"[WS] Unexpected error: {exc}")
        manager.disconnect(websocket)
