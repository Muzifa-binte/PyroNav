"""
Lightweight in-process event bus — the integration backbone between the
sensor pipeline (Member 1), decision engine (Member 2), pathfinding (Member 3)
and the WebSocket broadcaster (Member 4).

Usage
-----
Publishing:
    from events.event_bus import event_bus, Event
    from events import event_types as ev

    event_bus.publish_sync(Event(ev.SENSOR_READING_RECEIVED, {...}))   # sync code, any thread
    await event_bus.publish(Event(ev.ROOM_STATUS_CHANGED, {...}))      # async code

Subscribing (sync or async handlers both work):
    def handle(event: Event): ...
    event_bus.subscribe(ev.SENSOR_READING_RECEIVED, handle)
    event_bus.subscribe("*", log_everything)        # wildcard: every event

Threading rules
---------------
* ``publish_sync`` is safe to call from any thread (e.g. the paho-mqtt network
  thread). Sync handlers run immediately in the caller's thread; coroutine
  handlers are scheduled on the application's event loop and run shortly after.
* ``publish`` awaits every handler in order, sync or async.
* A failing handler is logged and never stops the other handlers.
"""
import asyncio
import inspect
import logging
import threading
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

WILDCARD = "*"


@dataclass
class Event:
    event_type: str
    data: Dict
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._lock = threading.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._pending: Set[Any] = set()  # strong refs so scheduled tasks aren't GC'd
        self._published: Counter = Counter()
        self._handler_errors = 0
        self._last_event_at: Optional[datetime] = None

    # ------------------------------------------------------------------
    # Event loop binding (done by the API at startup)
    # ------------------------------------------------------------------

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Register the loop that coroutine handlers run on when an event is
        published from a thread that has no running loop."""
        self._loop = loop

    def unbind_loop(self) -> None:
        self._loop = None

    # ------------------------------------------------------------------
    # Subscriptions
    # ------------------------------------------------------------------

    def subscribe(self, event_type: str, handler: Callable) -> None:
        """Register a handler for an event type ("*" = every event)."""
        with self._lock:
            handlers = self._subscribers.setdefault(event_type, [])
            if handler not in handlers:
                handlers.append(handler)

    def unsubscribe(self, event_type: str, handler: Callable) -> None:
        with self._lock:
            handlers = self._subscribers.get(event_type, [])
            if handler in handlers:
                handlers.remove(handler)

    def _handlers_for(self, event_type: str) -> List[Callable]:
        with self._lock:
            return list(self._subscribers.get(event_type, ())) + list(
                self._subscribers.get(WILDCARD, ())
            )

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    def _record(self, event: Event) -> None:
        self._published[event.event_type] += 1
        self._last_event_at = event.timestamp

    def _log_handler_error(self, event_type: str, handler: Callable) -> None:
        self._handler_errors += 1
        logger.exception(
            "Event handler %s failed for %s",
            getattr(handler, "__qualname__", repr(handler)), event_type,
        )

    async def publish(self, event: Event) -> None:
        """Async publish — runs every handler in order, awaiting coroutines."""
        self._record(event)
        for handler in self._handlers_for(event.event_type):
            try:
                result = handler(event)
                if inspect.isawaitable(result):
                    await result
            except Exception:
                self._log_handler_error(event.event_type, handler)

    def publish_sync(self, event: Event) -> None:
        """Publish from synchronous code, from any thread. Does not wait for
        coroutine handlers to finish."""
        self._record(event)
        for handler in self._handlers_for(event.event_type):
            try:
                result = handler(event)
                if inspect.isawaitable(result):
                    self._schedule(result, event.event_type, handler)
            except Exception:
                self._log_handler_error(event.event_type, handler)

    def _schedule(self, awaitable, event_type: str, handler: Callable) -> None:
        async def guarded():
            try:
                await awaitable
            except Exception:
                self._log_handler_error(event_type, handler)

        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None

        if running is not None:
            # Called from inside the loop thread (e.g. a sync handler chain)
            task = running.create_task(guarded())
        elif self._loop is not None:
            if self._loop.is_closed() or not self._loop.is_running():
                if inspect.iscoroutine(awaitable):
                    awaitable.close()  # avoid "coroutine was never awaited"
                logger.warning("Event loop not running - dropped async handler for %s", event_type)
                return
            # Called from a worker thread — hand over to the app's loop
            task = asyncio.run_coroutine_threadsafe(guarded(), self._loop)
        else:
            # Standalone script with no API running: just run it to completion
            asyncio.run(guarded())
            return

        self._pending.add(task)
        task.add_done_callback(self._pending.discard)

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            subscribers = {k: len(v) for k, v in self._subscribers.items() if v}
        return {
            "subscribers": subscribers,
            "published": dict(self._published),
            "total_published": sum(self._published.values()),
            "handler_errors": self._handler_errors,
            "last_event_at": self._last_event_at.isoformat() if self._last_event_at else None,
            "loop_bound": self._loop is not None,
        }


# Global singleton
event_bus = EventBus()
