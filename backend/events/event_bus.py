"""
Lightweight in-process event bus.

Usage
-----
Publishing (sync or async):
    from events.event_bus import event_bus, Event

    event_bus.publish_sync(Event("sensor_reading_received", {...}))
    await event_bus.publish(Event("room_status_changed", {...}))

Subscribing:
    def handle(event: Event): ...
    event_bus.subscribe("sensor_reading_received", handle)
"""
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Dict, List


@dataclass
class Event:
    event_type: str
    data: Dict
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, handler: Callable) -> None:
        """Register a handler for an event type."""
        self._subscribers.setdefault(event_type, []).append(handler)

    def unsubscribe(self, event_type: str, handler: Callable) -> None:
        handlers = self._subscribers.get(event_type, [])
        if handler in handlers:
            handlers.remove(handler)

    async def publish(self, event: Event) -> None:
        """Async publish — awaits coroutine handlers."""
        for handler in self._subscribers.get(event.event_type, []):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as exc:
                print(f"[EventBus] Error in handler for {event.event_type}: {exc}")

    def publish_sync(self, event: Event) -> None:
        """Synchronous publish for non-async contexts."""
        for handler in self._subscribers.get(event.event_type, []):
            try:
                handler(event)
            except Exception as exc:
                print(f"[EventBus] Error in handler for {event.event_type}: {exc}")


# Global singleton
event_bus = EventBus()
