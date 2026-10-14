"""
Dijkstra's shortest-path algorithm.

Finds the minimum-cost path through the building graph, respecting
blocked nodes (hazardous rooms) and non-traversable edges (blocked corridors).
"""
import heapq
from typing import Dict, List, Optional, Set, Tuple


class DijkstraPathfinder:
    """
    graph format:
    {
        'nodes': {node_id: {'traversable': bool, 'room_id': str|None, ...}},
        'edges': {
            from_node_id: [
                {'edge_id': str, 'to': str, 'cost': float, 'traversable': bool},
                ...
            ]
        }
    }
    """

    def __init__(self, graph: Dict):
        self.graph = graph

    def find_shortest_path(
        self,
        start_node: str,
        end_node: str,
        blocked_nodes: Optional[Set[str]] = None,
    ) -> Tuple[Optional[List[str]], float]:
        """
        Returns (path, total_cost) or (None, inf) when no path exists.
        path includes both start_node and end_node.
        """
        if blocked_nodes is None:
            blocked_nodes = set()

        if start_node not in self.graph["nodes"]:
            return None, float("inf")
        if end_node not in self.graph["nodes"]:
            return None, float("inf")

        # (cost, node_id, path_so_far)
        heap: List[Tuple[float, str, List[str]]] = [(0.0, start_node, [start_node])]
        visited: Set[str] = set()
        best_cost: Dict[str, float] = {start_node: 0.0}

        while heap:
            current_cost, current_node, path = heapq.heappop(heap)

            if current_node in visited:
                continue
            visited.add(current_node)

            if current_node == end_node:
                return path, current_cost

            for edge in self.graph["edges"].get(current_node, []):
                neighbor = edge["to"]
                edge_cost = edge["cost"]

                if (
                    neighbor in blocked_nodes
                    or not edge.get("traversable", True)
                    or not self.graph["nodes"].get(neighbor, {}).get("traversable", True)
                ):
                    continue

                new_cost = current_cost + edge_cost
                if new_cost < best_cost.get(neighbor, float("inf")):
                    best_cost[neighbor] = new_cost
                    heapq.heappush(heap, (new_cost, neighbor, path + [neighbor]))

        return None, float("inf")

    def find_best_exit(
        self,
        start_node: str,
        available_exits: List[str],
        blocked_nodes: Optional[Set[str]] = None,
    ) -> Tuple[Optional[str], Optional[List[str]], float]:
        """
        Find the nearest available exit from start_node.
        Returns (exit_id, path, cost) or (None, None, inf).
        """
        best_exit: Optional[str] = None
        best_path: Optional[List[str]] = None
        best_cost: float = float("inf")

        for exit_node in available_exits:
            path, cost = self.find_shortest_path(start_node, exit_node, blocked_nodes)
            if path is not None and cost < best_cost:
                best_exit = exit_node
                best_path = path
                best_cost = cost

        return best_exit, best_path, best_cost
