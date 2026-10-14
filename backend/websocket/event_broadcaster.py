"""
Event broadcaster — bridges the internal EventBus to WebSocket clients.

Every event listed in events.event_types.WEBSOCKET_EVENTS is forwarded to the
frontend in the standard envelope {event_type, data, timestamp}. The payload is
passed through unchanged, so a publisher can add fields without touching this
file; the required fields per event are documented in
shared-contracts/websocket-events.json.
"""
from events.event_bus import Event, EventBus, event_bus
from events.event_types import WEBSOCKET_EVENTS
from websocket.connection_manager import ConnectionManager, manager


class EventBroadcaster:
    def __init__(self, bus: EventBus = event_bus, connections: ConnectionManager = manager):
        self.connections = connections
        for internal_type in WEBSOCKET_EVENTS:
            bus.subscribe(internal_type, self.forward)

    async def forward(self, event: Event) -> None:
        ws_event_type = WEBSOCKET_EVENTS.get(event.event_type, event.event_type)
        await self.connections.broadcast_event(ws_event_type, event.data, timestamp=event.timestamp)


# Instantiate once at import time; subscriptions are registered immediately.
broadcaster = EventBroadcaster()
