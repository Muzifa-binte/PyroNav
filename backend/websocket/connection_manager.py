"""
WebSocket connection manager.
Tracks all active clients and exposes broadcast helpers.
"""
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.client_metadata: Dict[int, Dict] = {}  # keyed by id(websocket)

    async def connect(self, websocket: WebSocket, client_id: str = "anonymous"):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_metadata[id(websocket)] = {
            "client_id": client_id,
            "connected_at": datetime.now(timezone.utc),
        }
        print(
            f"[WS] Client connected: {client_id}. "
            f"Total: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.client_metadata.pop(id(websocket), None)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """Send to all connected clients; silently drop dead connections."""
        dead: List[WebSocket] = []
        for ws in list(self.active_connections):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def broadcast_event(self, event_type: str, data: dict):
        """Wrap data in the standard PyroNav WebSocket envelope."""
        await self.broadcast(
            {
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

    def get_client_list(self) -> list:
        return [
            {
                "client_id": meta.get("client_id", "unknown"),
                "connected_at": meta["connected_at"].isoformat(),
            }
            for meta in self.client_metadata.values()
        ]


# Global singleton used by the WebSocket router and the broadcaster
manager = ConnectionManager()
