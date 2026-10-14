"""
WebSocket connection manager.

Tracks every connected client and fans messages out to them:
  * broadcasts are sent to all clients concurrently, each with a timeout, so one
    slow or frozen browser tab cannot delay updates for everyone else;
  * clients that fail to receive are dropped (they reconnect on their own);
  * clients may subscribe to a subset of event types;
  * sessions are recorded in the websocket_sessions table when a writer is attached.
"""
import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from fastapi import WebSocket

from utils.serialization import iso_utc, to_jsonable

logger = logging.getLogger(__name__)


@dataclass
class ClientConnection:
    websocket: WebSocket
    client_id: str
    client_ip: Optional[str]
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    messages_sent: int = 0
    subscriptions: Optional[Set[str]] = None  # None = every event type

    def wants(self, event_type: Optional[str]) -> bool:
        # System frames (event_type None, e.g. heartbeat) go to everyone
        return event_type is None or self.subscriptions is None or event_type in self.subscriptions


class ConnectionManager:
    SEND_TIMEOUT_SECONDS = 5.0

    def __init__(self):
        self._clients: Dict[int, ClientConnection] = {}  # keyed by id(websocket)
        self._session_writer = None
        self._order_lock: Optional[asyncio.Lock] = None
        self._order_lock_loop = None
        self.total_connections = 0
        self.messages_broadcast = 0

    def _ordering_lock(self) -> asyncio.Lock:
        # asyncio.Lock is FIFO-fair, so broadcasts go out in the order they were
        # scheduled: a client never sees route_updated before the
        # room_status_changed that caused it. One lock per event loop.
        loop = asyncio.get_running_loop()
        if self._order_lock_loop is not loop:
            self._order_lock, self._order_lock_loop = asyncio.Lock(), loop
        return self._order_lock

    def attach_session_writer(self, writer) -> None:
        """Persist sessions to websocket_sessions via a BackgroundDbWriter."""
        self._session_writer = writer

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, websocket: WebSocket, client_id: str = "anonymous") -> ClientConnection:
        await websocket.accept()
        client = ClientConnection(
            websocket=websocket,
            client_id=client_id or "anonymous",
            client_ip=websocket.client.host if websocket.client else None,
        )
        self._clients[id(websocket)] = client
        self.total_connections += 1
        if self._session_writer:
            self._session_writer.submit(
                "INSERT INTO websocket_sessions "
                "(session_id, client_id, client_ip, connected_at, last_activity) "
                "VALUES (%s, %s, %s, %s, %s)",
                (client.session_id, client.client_id, client.client_ip,
                 client.connected_at, client.connected_at),
            )
        logger.info("WebSocket client connected: %s (%s). Total: %d",
                    client.client_id, client.session_id, self.connection_count)
        return client

    def disconnect(self, websocket: WebSocket) -> None:
        client = self._clients.pop(id(websocket), None)
        if client is None:
            return
        if self._session_writer:
            self._session_writer.submit(
                "UPDATE websocket_sessions SET disconnected_at = %s, last_activity = %s, "
                "messages_sent = %s WHERE session_id = %s",
                (datetime.now(timezone.utc), client.last_activity,
                 client.messages_sent, client.session_id),
            )
        logger.info("WebSocket client disconnected: %s. Total: %d",
                    client.client_id, self.connection_count)

    def get(self, websocket: WebSocket) -> Optional[ClientConnection]:
        return self._clients.get(id(websocket))

    # ------------------------------------------------------------------
    # Sending
    # ------------------------------------------------------------------

    async def send_personal_message(self, message: dict, websocket: WebSocket) -> None:
        await websocket.send_json(to_jsonable(message))
        client = self.get(websocket)
        if client:
            client.messages_sent += 1

    async def _send(self, client: ClientConnection, message: dict) -> bool:
        try:
            await asyncio.wait_for(client.websocket.send_json(message), self.SEND_TIMEOUT_SECONDS)
            client.messages_sent += 1
            return True
        except Exception as exc:
            logger.info("Dropping WebSocket client %s: %s", client.client_id, exc or type(exc).__name__)
            return False

    async def broadcast(self, message: dict, event_type: Optional[str] = None) -> int:
        """Send to every interested client, in publish order. Returns how many received it."""
        payload = to_jsonable(message)  # serialise once, not per client
        async with self._ordering_lock():
            targets = [c for c in list(self._clients.values()) if c.wants(event_type)]
            if not targets:
                return 0
            results = await asyncio.gather(*(self._send(c, payload) for c in targets))
        for client, ok in zip(targets, results):
            if not ok:
                self.disconnect(client.websocket)
                try:
                    await client.websocket.close()
                except Exception:
                    pass
        self.messages_broadcast += 1
        return sum(results)

    async def broadcast_event(self, event_type: str, data: dict,
                              timestamp: Optional[datetime] = None) -> int:
        """Wrap data in the standard PyroNav WebSocket envelope and broadcast it."""
        return await self.broadcast(
            {
                "event_type": event_type,
                "data": data,
                "timestamp": iso_utc(timestamp or datetime.now(timezone.utc)),
            },
            event_type=event_type,
        )

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    @property
    def active_connections(self) -> List[WebSocket]:
        return [c.websocket for c in self._clients.values()]

    @property
    def connection_count(self) -> int:
        return len(self._clients)

    def get_client_list(self) -> list:
        return [
            {
                "client_id": c.client_id,
                "session_id": c.session_id,
                "client_ip": c.client_ip,
                "connected_at": iso_utc(c.connected_at),
                "last_activity": iso_utc(c.last_activity),
                "messages_sent": c.messages_sent,
                "subscriptions": sorted(c.subscriptions) if c.subscriptions is not None else "all",
            }
            for c in self._clients.values()
        ]


# Global singleton used by the WebSocket router and the broadcaster
manager = ConnectionManager()
