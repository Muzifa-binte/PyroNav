"""
Loads the building graph from the database (building_nodes + building_edges)
into the in-memory dict format expected by Dijkstra/BFS pathfinders.
"""
from typing import Dict, Optional


class GraphLoader:
    def __init__(self, db_manager):
        self.db = db_manager

    def load_graph(self) -> Dict:
        """
        Returns:
        {
            'nodes': {node_id: {'node_type', 'room_id', 'position', 'traversable'}},
            'edges': {from_node_id: [{'edge_id', 'to', 'cost', 'traversable'}]}
        }
        """
        nodes = self._load_nodes()
        edges = self._load_edges()
        return {"nodes": nodes, "edges": edges}

    def _load_nodes(self) -> Dict:
        rows = self.db.execute_query(
            "SELECT node_id, node_type, room_id, position, traversable FROM building_nodes"
        )
        return {
            row[0]: {
                "node_type":  row[1],
                "room_id":    row[2],
                "position":   row[3],
                "traversable": row[4],
            }
            for row in rows
        }

    def _load_edges(self) -> Dict:
        rows = self.db.execute_query(
            "SELECT edge_id, from_node_id, to_node_id, cost, bidirectional, traversable "
            "FROM building_edges"
        )
        edges: Dict = {}
        for edge_id, from_node, to_node, cost, bidirectional, traversable in rows:
            edges.setdefault(from_node, []).append(
                {"edge_id": edge_id, "to": to_node, "cost": cost, "traversable": traversable}
            )
            if bidirectional:
                edges.setdefault(to_node, []).append(
                    {"edge_id": edge_id + "_rev", "to": from_node, "cost": cost, "traversable": traversable}
                )
        return edges

    def load_graph_from_json(self, building_json: Dict) -> Dict:
        """
        Convert Member 1's building-config.json format to the pathfinding graph.
        building_json should have 'nodes' and 'edges' lists.
        """
        nodes = {
            n["node_id"]: {
                "node_type":  n.get("node_type", "room"),
                "room_id":    n.get("room_id"),
                "position":   n.get("position", {"x": 0, "y": 0}),
                "traversable": n.get("traversable", True),
            }
            for n in building_json.get("nodes", [])
        }

        edges: Dict = {}
        for e in building_json.get("edges", []):
            from_node = e["from_node"]
            to_node   = e["to_node"]
            cost      = e.get("cost", 1.0)
            traversable = e.get("traversable", True)
            bidirectional = e.get("bidirectional", True)

            edges.setdefault(from_node, []).append(
                {"edge_id": e["edge_id"], "to": to_node, "cost": cost, "traversable": traversable}
            )
            if bidirectional:
                edges.setdefault(to_node, []).append(
                    {"edge_id": e["edge_id"] + "_rev", "to": from_node, "cost": cost, "traversable": traversable}
                )

        return {"nodes": nodes, "edges": edges}
