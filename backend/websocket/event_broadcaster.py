"""
Event broadcaster — bridges the internal EventBus to WebSocket clients.
Subscribes to domain events and fans them out over WebSocket.
"""
from events.event_bus import event_bus, Event
from websocket.connection_manager import manager


class EventBroadcaster:
    def __init__(self):
        event_bus.subscribe("sensor_reading_updated",  self.on_sensor_reading)
        event_bus.subscribe("room_status_changed",     self.on_room_status_changed)
        event_bus.subscribe("hazard_event_created",    self.on_hazard_event)
        event_bus.subscribe("notification_created",    self.on_notification)
        event_bus.subscribe("route_updated",           self.on_route_updated)
        event_bus.subscribe("ids_event_detected",      self.on_ids_event)

    async def on_sensor_reading(self, event: Event):
        await manager.broadcast_event("sensor_reading_updated", event.data)

    async def on_room_status_changed(self, event: Event):
        await manager.broadcast_event(
            "room_status_changed",
            {
                "room_id":        event.data["room_id"],
                "hazard_level":   event.data["hazard_level"],
                "previous_level": event.data.get("previous_level"),
            },
        )

    async def on_hazard_event(self, event: Event):
        await manager.broadcast_event("hazard_event_created", event.data)

    async def on_notification(self, event: Event):
        await manager.broadcast_event("notification_created", event.data)

    async def on_route_updated(self, event: Event):
        await manager.broadcast_event("route_updated", event.data)

    async def on_ids_event(self, event: Event):
        await manager.broadcast_event("ids_event_detected", event.data)


# Instantiate once at import time; subscriptions are registered immediately.
broadcaster = EventBroadcaster()
