"""
Route monitor — listens for room hazard changes and recalculates the route
when an affected room appears on the current path.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional

from events.event_bus import event_bus, Event


class RouteMonitor:
    def __init__(self, db_manager):
        from pathfinding.route_calculator import RouteCalculator
        self.calculator = RouteCalculator(db_manager)
        self.current_route: Optional[Dict] = None
        # Subscribe to hazard change events published by Member 2
        event_bus.subscribe("room_status_changed", self.on_room_hazard_changed)

    def on_room_hazard_changed(self, event: Event):
        room_id = event.data.get("room_id")
        hazard_level = event.data.get("hazard_level")

        if not self.current_route:
            return

        if self._route_affected(room_id, hazard_level):
            print(f"[RouteMonitor] Hazard in '{room_id}' ({hazard_level}) affects route - recalculating.")
            self._recalculate()

    def set_route(self, route: Dict):
        """Called after an initial route is calculated."""
        self.current_route = route

    def _route_affected(self, room_id: str, hazard_level: str) -> bool:
        if hazard_level not in ("HIGH_RISK", "CRITICAL"):
            return False
        node_ids: List[str] = self.current_route.get("node_ids") or []
        return room_id in node_ids

    def _recalculate(self):
        origin = self.current_route.get("origin_node_id")
        if not origin:
            return
        new_route = self.calculator.calculate_route(origin)
        self.current_route = new_route

        event_bus.publish_sync(
            Event(
                event_type="route_updated",
                data={**new_route, "reason": "hazard_change"},
            )
        )
        print(f"[RouteMonitor] Route recalculated -> status: {new_route['status']}")
