"""
Safety constraint applier.
Queries Member 2's rooms table and marks hazardous room nodes as non-traversable.
"""
from typing import Dict, List, Set


HAZARD_SEVERITY_ORDER = ["NORMAL", "WARNING", "HIGH_RISK", "CRITICAL", "UNKNOWN"]

POLICY_THRESHOLDS = {
    "BLOCK_CRITICAL":      {"CRITICAL"},
    "BLOCK_HIGH_AND_ABOVE": {"HIGH_RISK", "CRITICAL"},
    "BLOCK_WARNING_AND_ABOVE": {"WARNING", "HIGH_RISK", "CRITICAL"},
}


class SafetyConstraintApplier:
    def __init__(self, db_manager):
        self.db = db_manager

    def get_rooms_by_level(self, levels: List[str]) -> Set[str]:
        if not levels:
            return set()
        placeholders = ",".join(["%s"] * len(levels))
        rows = self.db.execute_query(
            f"SELECT room_id FROM rooms WHERE current_hazard_level IN ({placeholders})",
            tuple(levels),
        )
        return {row[0] for row in rows}

    def apply_safety_policy(self, graph: Dict, policy: str = "BLOCK_HIGH_AND_ABOVE") -> Set[str]:
        """
        Mutates graph['nodes'] traversability based on hazard state.
        Returns the set of room_ids that were blocked.
        """
        blocked_levels = POLICY_THRESHOLDS.get(policy, set())
        blocked_rooms = self.get_rooms_by_level(list(blocked_levels))

        for node_data in graph["nodes"].values():
            if node_data.get("room_id") in blocked_rooms:
                node_data["traversable"] = False

        return blocked_rooms

    def get_blocked_nodes(self, graph: Dict) -> Set[str]:
        """Return IDs of nodes currently marked non-traversable."""
        return {
            node_id
            for node_id, data in graph["nodes"].items()
            if not data.get("traversable", True)
        }
