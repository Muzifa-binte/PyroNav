"""
Event broadcaster — bridges the internal EventBus to WebSocket clients.

Every event type in events.event_types.WEBSOCKET_EVENTS — the built-in ones plus
any a teammate adds with register_event_type() — is forwarded to the frontend in
the standard envelope {event_type, data, timestamp}. The payload is passed
through unchanged, so a publisher can add fields without touching this file;
the required fields per event are documented in shared-contracts/websocket-events.json.
"""
from events.event_bus import WILDCARD, Event, EventBus, event_bus
from events.event_types import WEBSOCKET_EVENTS
from websocket.connection_manager import ConnectionManager, manager


class EventBroadcaster:
    def __init__(self, bus: EventBus = event_bus, connections: ConnectionManager = manager):
        self.connections = connections
        # Wildcard + lookup at publish time, so event types registered later
        # (by teammates' modules) are forwarded too
        bus.subscribe(WILDCARD, self.forward)

    async def forward(self, event: Event) -> None:
        ws_event_type = WEBSOCKET_EVENTS.get(event.event_type)
        if ws_event_type is None:
            return  # internal-only event: not sent to browsers
        await self.connections.broadcast_event(ws_event_type, event.data, timestamp=event.timestamp)


# Instantiate once at import time; the subscription is registered immediately.
broadcaster = EventBroadcaster()
