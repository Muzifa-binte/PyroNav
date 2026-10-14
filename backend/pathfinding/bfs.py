"""
Breadth-First Search pathfinder.

BFS finds the path with the fewest edges (hops), ignoring edge weights.
Useful for comparing minimum-hop vs minimum-cost routes.
"""
from collections import deque
from typing import Dict, List, Optional, Set, Tuple


class BFSPathfinder:
    """Same graph format as DijkstraPathfinder."""

    def __init__(self, graph: Dict):
        self.graph = graph

    def find_shortest_path(
        self,
        start_node: str,
        end_node: str,
        blocked_nodes: Optional[Set[str]] = None,
    ) -> Optional[List[str]]:
        """
        Returns path (list of node_ids) or None if unreachable.
        Path has minimum number of edges, not minimum cost.
        """
        if blocked_nodes is None:
            blocked_nodes = set()

        if start_node not in self.graph["nodes"]:
            return None
        if end_node not in self.graph["nodes"]:
            return None

        queue: deque[Tuple[str, List[str]]] = deque([(start_node, [start_node])])
        visited: Set[str] = {start_node}

        while queue:
            current_node, path = queue.popleft()

            if current_node == end_node:
                return path

            for edge in self.graph["edges"].get(current_node, []):
                neighbor = edge["to"]

                if (
                    neighbor in visited
                    or neighbor in blocked_nodes
                    or not edge.get("traversable", True)
                    or not self.graph["nodes"].get(neighbor, {}).get("traversable", True)
                ):
                    continue

                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

        return None  # no path found

    def find_best_exit(
        self,
        start_node: str,
        available_exits: List[str],
        blocked_nodes: Optional[Set[str]] = None,
    ) -> Tuple[Optional[str], Optional[List[str]]]:
        """
        Find the exit reachable in the fewest hops.
        Returns (exit_id, path) or (None, None).
        """
        best_exit: Optional[str] = None
        best_path: Optional[List[str]] = None

        for exit_node in available_exits:
            path = self.find_shortest_path(start_node, exit_node, blocked_nodes)
            if path is not None:
                if best_path is None or len(path) < len(best_path):
                    best_exit = exit_node
                    best_path = path

        return best_exit, best_path
