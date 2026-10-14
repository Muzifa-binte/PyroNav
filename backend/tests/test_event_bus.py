"""
Event bus unit tests — no database or server needed.
Run: pytest tests/test_event_bus.py -v
"""
import asyncio
import threading

from events.event_bus import Event, EventBus


def test_sync_handler_receives_event():
    bus, received = EventBus(), []
    bus.subscribe("room_status_changed", received.append)
    bus.publish_sync(Event("room_status_changed", {"room_id": "icu"}))
    assert [e.data["room_id"] for e in received] == ["icu"]


def test_handlers_only_receive_their_event_type():
    bus, received = EventBus(), []
    bus.subscribe("route_updated", received.append)
    bus.publish_sync(Event("room_status_changed", {}))
    assert received == []


def test_wildcard_receives_every_event():
    bus, received = EventBus(), []
    bus.subscribe("*", lambda e: received.append(e.event_type))
    bus.publish_sync(Event("a", {}))
    bus.publish_sync(Event("b", {}))
    assert received == ["a", "b"]


def test_duplicate_subscription_is_ignored():
    bus, received = EventBus(), []
    bus.subscribe("x", received.append)
    bus.subscribe("x", received.append)
    bus.publish_sync(Event("x", {}))
    assert len(received) == 1


def test_failing_handler_does_not_stop_others():
    bus, received = EventBus(), []

    def broken(_):
        raise RuntimeError("boom")

    bus.subscribe("x", broken)
    bus.subscribe("x", received.append)
    bus.publish_sync(Event("x", {}))
    assert len(received) == 1
    assert bus.stats()["handler_errors"] == 1


async def test_async_publish_awaits_coroutine_handlers():
    bus, received = EventBus(), []

    async def handler(event):
        await asyncio.sleep(0)
        received.append(event.event_type)

    bus.subscribe("x", handler)
    await bus.publish(Event("x", {}))
    assert received == ["x"]


async def test_publish_sync_inside_loop_schedules_coroutine_handlers():
    """Regression: publish_sync used to call async handlers without awaiting
    them, so WebSocket broadcasts triggered from sync code never happened."""
    bus, done = EventBus(), asyncio.Event()

    async def handler(_):
        done.set()

    bus.subscribe("route_updated", handler)
    bus.publish_sync(Event("route_updated", {}))
    await asyncio.wait_for(done.wait(), timeout=2)


async def test_publish_sync_from_worker_thread_runs_on_bound_loop():
    """Simulates Member 1's MQTT thread publishing while the API loop runs."""
    bus, done = EventBus(), asyncio.Event()
    loop = asyncio.get_running_loop()
    handler_thread = []

    async def handler(_):
        handler_thread.append(threading.current_thread().name)
        done.set()

    bus.bind_loop(loop)
    bus.subscribe("sensor_reading_received", handler)
    worker = threading.Thread(
        target=bus.publish_sync, args=(Event("sensor_reading_received", {}),), name="mqtt-thread"
    )
    worker.start()
    await asyncio.wait_for(done.wait(), timeout=2)
    worker.join()
    assert handler_thread == [threading.current_thread().name]  # ran on the loop's thread


def test_publish_sync_without_any_loop_runs_coroutine_to_completion():
    """Standalone scripts (no API running) still get their async handlers run."""
    bus, received = EventBus(), []

    async def handler(event):
        received.append(event.event_type)

    bus.subscribe("x", handler)
    bus.publish_sync(Event("x", {}))
    assert received == ["x"]


def test_stats_count_published_events():
    bus = EventBus()
    bus.subscribe("x", lambda e: None)
    bus.publish_sync(Event("x", {}))
    bus.publish_sync(Event("x", {}))
    stats = bus.stats()
    assert stats["published"] == {"x": 2}
    assert stats["total_published"] == 2
    assert stats["subscribers"] == {"x": 1}
