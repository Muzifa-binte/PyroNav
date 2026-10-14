"""
Main route calculation service.
Orchestrates: graph load → safety constraints → pathfinding → result storage.
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from psycopg2.extras import Json

from pathfinding.dijkstra import DijkstraPathfinder
from pathfinding.bfs import BFSPathfinder
from pathfinding.graph_loader import GraphLoader
from pathfinding.safety_constraints import SafetyConstraintApplier


class RouteCalculator:
    def __init__(self, db_manager, safety_policy: str = "BLOCK_HIGH_AND_ABOVE"):
        self.db = db_manager
        self.safety_policy = safety_policy
        self.graph_loader = GraphLoader(db_manager)
        self.safety_applier = SafetyConstraintApplier(db_manager)

        # Simple in-memory graph cache; invalidated on demand
        self._cached_graph: Optional[Dict] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate_route(
        self,
        origin_room_id: str,
        algorithm: str = "dijkstra",
        target_exit_id: Optional[str] = None,
    ) -> Dict:
        # 1. Load graph (from cache or DB)
        graph = self._get_graph()

        # 2. Apply safety constraints (modifies traversability in place)
        blocked_rooms = self.safety_applier.apply_safety_policy(graph, self.safety_policy)

        # 3. Get available exits
        available_exits = self._get_available_exits()
        if not available_exits:
            return self._make_result(origin_room_id, None, status="NO_AVAILABLE_EXIT")

        # 4. Map room_id → node_id (they may differ)
        origin_node = self._room_to_node(origin_room_id, graph)
        if origin_node is None:
            return self._make_result(origin_room_id, None, status="INVALID_ORIGIN")

        # 5. Filter to target exit if specified
        exits_to_try = [target_exit_id] if target_exit_id else available_exits

        # 6. Run pathfinding
        blocked_nodes = self.safety_applier.get_blocked_nodes(graph)
        if algorithm == "dijkstra":
            finder = DijkstraPathfinder(graph)
            exit_id, path, cost = finder.find_best_exit(origin_node, exits_to_try, blocked_nodes)
        elif algorithm == "bfs":
            finder = BFSPathfinder(graph)
            exit_id, path = finder.find_best_exit(origin_node, exits_to_try, blocked_nodes)
            cost = float(len(path) - 1) if path else float("inf")
        else:
            return self._make_result(origin_room_id, None, status="INVALID_ORIGIN",
                                     notes=f"Unknown algorithm: {algorithm}")

        # 7. No route found
        if path is None:
            return self._make_result(origin_room_id, None, status="NO_VALID_ROUTE",
                                     blocked_rooms=list(blocked_rooms))

        # 8. Extract edge IDs
        edge_ids = self._path_to_edge_ids(path, graph)

        # 9. Build result
        result = self._make_result(
            origin_room_id,
            exit_id,
            node_ids=path,
            edge_ids=edge_ids,
            cost=cost,
            algorithm=algorithm,
            status="ROUTE_FOUND",
            blocked_rooms=list(blocked_rooms),
        )

        # 10. Persist
        self._save_route_result(result)
        return result

    def invalidate_graph_cache(self):
        self._cached_graph = None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_graph(self) -> Dict:
        if self._cached_graph is None:
            self._cached_graph = self.graph_loader.load_graph()
        # Return a deep-enough copy so safety mutations don't corrupt the cache
        import copy
        return copy.deepcopy(self._cached_graph)

    def _get_available_exits(self) -> List[str]:
        rows = self.db.execute_query(
            "SELECT node_id FROM exits WHERE available = TRUE"
        )
        return [row[0] for row in rows]

    def _room_to_node(self, room_id: str, graph: Dict) -> Optional[str]:
        for node_id, data in graph["nodes"].items():
            if data.get("room_id") == room_id or node_id == room_id:
                return node_id
        return None

    def _path_to_edge_ids(self, path: List[str], graph: Dict) -> List[str]:
        edge_ids = []
        for i in range(len(path) - 1):
            from_node, to_node = path[i], path[i + 1]
            for edge in graph["edges"].get(from_node, []):
                if edge["to"] == to_node:
                    edge_ids.append(edge["edge_id"])
                    break
        return edge_ids

    def _make_result(
        self,
        origin: str,
        exit_id: Optional[str],
        *,
        node_ids: Optional[List[str]] = None,
        edge_ids: Optional[List[str]] = None,
        cost: Optional[float] = None,
        algorithm: str = "dijkstra",
        status: str = "ROUTE_FOUND",
        blocked_rooms: Optional[List[str]] = None,
        notes: Optional[str] = None,
    ) -> Dict:
        return {
            "route_id":              str(uuid.uuid4()),
            "origin_node_id":        origin,
            "exit_id":               exit_id,
            "node_ids":              node_ids,
            "edge_ids":              edge_ids,
            "total_cost":            cost,
            "algorithm":             algorithm,
            "status":                status,
            "calculated_at":         datetime.now(timezone.utc).isoformat(),
            "hazard_state_snapshot": blocked_rooms or [],
            "notes":                 notes,
        }

    def _save_route_result(self, result: Dict):
        try:
            self.db.execute_write(
                """
                INSERT INTO route_results
                    (route_id, origin_node_id, exit_id, node_ids, edge_ids,
                     total_cost, algorithm, status, calculated_at, hazard_state_snapshot)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    result["route_id"],
                    result["origin_node_id"],
                    result["exit_id"],
                    result["node_ids"],
                    result["edge_ids"],
                    result["total_cost"],
                    result["algorithm"],
                    result["status"],
                    result["calculated_at"],
                    # Json(): str(list) gives Python repr like "['icu']", which is not valid JSON
                    Json(result["hazard_state_snapshot"]),
                ),
            )
        except Exception as exc:
            print(f"[RouteCalculator] Failed to persist route result: {exc}")
