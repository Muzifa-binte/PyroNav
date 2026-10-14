"""
Evacuation / pathfinding endpoints (Member 3's domain).

GET  /api/v1/building          — full building graph (nodes + edges + exits)
POST /api/v1/routes/calculate  — calculate a route
GET  /api/v1/routes/current    — most recent route result
GET  /api/v1/routes/{route_id} — specific route by ID
GET  /api/v1/exits             — all exits with availability

When the database is available the live RouteCalculator is used.
When the database is unavailable the endpoints fall back to the sample-graph.json
mock data so the frontend remains functional during development.
"""
import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# Load the static mock/fallback graph from shared-contracts
# ---------------------------------------------------------------------------

_SAMPLE_GRAPH_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..", "shared-contracts", "mock-data", "sample-graph.json",
)


def _load_mock_graph() -> dict:
    try:
        with open(_SAMPLE_GRAPH_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        # Absolute minimum fallback if the file is also missing
        return {
            "nodes": [],
            "edges": [],
            "exits": [],
            "_note": "sample-graph.json not found — no building data available.",
        }


_MOCK_GRAPH: dict = _load_mock_graph()

# Holds the most recently calculated route in memory (used by GET /routes/current)
_current_route: Optional[dict] = None


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class RouteRequest(BaseModel):
    origin_room_id: str
    algorithm: str = "dijkstra"
    target_exit_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers — resolve DB or mock graph
# ---------------------------------------------------------------------------

def _get_db():
    """Return the db_manager singleton, or None if unavailable."""
    try:
        from database.connection import db_manager
        return db_manager
    except Exception:
        return None


def _building_from_db(db) -> dict:
    """Load graph nodes, edges, and exits from the database."""
    nodes_rows = db.execute_query(
        "SELECT node_id, node_type, room_id, position, traversable FROM building_nodes"
    )
    edges_rows = db.execute_query(
        "SELECT edge_id, from_node_id, to_node_id, cost, bidirectional, traversable "
        "FROM building_edges"
    )
    exits_rows = db.execute_query(
        "SELECT exit_id, node_id, name, position, available FROM exits"
    )

    nodes = [
        {
            "node_id": r[0],
            "node_type": r[1],
            "room_id": r[2],
            "position": r[3],
            "traversable": r[4],
        }
        for r in nodes_rows
    ]
    edges = [
        {
            "edge_id": r[0],
            "from_node": r[1],
            "to_node": r[2],
            "cost": r[3],
            "bidirectional": r[4],
            "traversable": r[5],
        }
        for r in edges_rows
    ]
    exits = [
        {
            "exit_id": r[0],
            "node_id": r[1],
            "name": r[2],
            "position": r[3],
            "available": r[4],
        }
        for r in exits_rows
    ]
    return {"nodes": nodes, "edges": edges, "exits": exits}


def _get_building_data() -> tuple[dict, bool]:
    """
    Returns (building_dict, is_live_data).
    Tries DB first; falls back to sample-graph.json.
    The sample-graph has a different key for exits (they're inside 'nodes'),
    so we normalise it into the standard {nodes, edges, exits} shape.
    """
    db = _get_db()
    if db is not None:
        try:
            data = _building_from_db(db)
            if data["nodes"]:
                return data, True
        except Exception:
            pass

    # Fallback: normalise sample-graph.json
    # sample-graph has exit nodes inside 'nodes'; build 'exits' list from them
    raw = _MOCK_GRAPH
    exit_nodes = [n for n in raw.get("nodes", []) if n.get("node_type") == "exit"]
    exits = [
        {
            "exit_id": n["node_id"],
            "node_id": n["node_id"],
            "name": n["node_id"].replace("-", " "),
            "position": n.get("position", {}),
            "available": n.get("available", True),
        }
        for n in exit_nodes
    ]
    # EXIT-C is unavailable in the demo scenario
    for e in exits:
        if e["exit_id"] == "EXIT-C":
            e["available"] = False

    return {"nodes": raw.get("nodes", []), "edges": raw.get("edges", []), "exits": exits}, False


# ---------------------------------------------------------------------------
# GET /building
# ---------------------------------------------------------------------------

@router.get("/building", summary="Full building graph (nodes, edges, exits)")
async def get_building():
    data, is_live = _get_building_data()
    return {**data, "demo_data": not is_live}


# ---------------------------------------------------------------------------
# POST /routes/calculate
# ---------------------------------------------------------------------------

@router.post("/routes/calculate", summary="Calculate evacuation route")
async def calculate_route(req: RouteRequest):
    global _current_route

    db = _get_db()

    # --- Live path: DB available, use RouteCalculator ---
    if db is not None:
        try:
            from pathfinding.route_calculator import RouteCalculator
            calculator = RouteCalculator(db)
            result = calculator.calculate_route(
                req.origin_room_id,
                req.algorithm,
                req.target_exit_id,
            )
            _current_route = result
            return result
        except Exception as exc:
            # Fall through to mock path if the calculator fails
            print(f"[evacuation] RouteCalculator failed ({exc}), using mock fallback")

    # --- Fallback path: compute a mock route from sample-graph.json ---
    building, _ = _get_building_data()

    # Use the in-process Dijkstra/BFS on the JSON graph
    try:
        from pathfinding.graph_loader import GraphLoader
        from pathfinding.dijkstra import DijkstraPathfinder
        from pathfinding.bfs import BFSPathfinder
        import uuid
        from datetime import datetime, timezone

        loader = GraphLoader(db_manager=None)
        graph = loader.load_graph_from_json(building)

        # Available exits from the building data
        available_exits = [
            e["node_id"] for e in building.get("exits", []) if e.get("available", True)
        ]

        if not available_exits:
            result = _make_mock_result(req.origin_room_id, None, status="NO_AVAILABLE_EXIT")
        else:
            origin_node = req.origin_room_id  # node_ids == room_ids in demo graph

            if req.algorithm == "bfs":
                finder = BFSPathfinder(graph)
                exit_id, path = finder.find_best_exit(origin_node, available_exits)
                cost = float(len(path) - 1) if path else None
            else:
                finder = DijkstraPathfinder(graph)
                exit_id, path, cost = finder.find_best_exit(origin_node, available_exits)

            if path is None:
                result = _make_mock_result(req.origin_room_id, None, status="NO_VALID_ROUTE")
            else:
                # Extract edge IDs from path
                edge_ids = []
                for i in range(len(path) - 1):
                    from_node, to_node = path[i], path[i + 1]
                    for edge in graph["edges"].get(from_node, []):
                        if edge["to"] == to_node:
                            edge_ids.append(edge["edge_id"])
                            break

                result = _make_mock_result(
                    req.origin_room_id,
                    exit_id,
                    node_ids=path,
                    edge_ids=edge_ids,
                    cost=cost,
                    algorithm=req.algorithm,
                    status="ROUTE_FOUND",
                )
    except Exception as exc:
        print(f"[evacuation] Fallback calculation failed ({exc})")
        result = _make_mock_result(req.origin_room_id, None, status="NO_VALID_ROUTE")

    _current_route = result
    return result


def _make_mock_result(
    origin: str,
    exit_id: Optional[str],
    *,
    node_ids=None,
    edge_ids=None,
    cost=None,
    algorithm: str = "dijkstra",
    status: str = "ROUTE_FOUND",
) -> dict:
    return {
        "route_id": __import__("uuid").uuid4().__str__(),
        "origin_node_id": origin,
        "exit_id": exit_id,
        "node_ids": node_ids,
        "edge_ids": edge_ids,
        "total_cost": cost,
        "algorithm": algorithm,
        "status": status,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "hazard_state_snapshot": [],
        "demo_data": True,
    }


# ---------------------------------------------------------------------------
# GET /routes/current
# ---------------------------------------------------------------------------

@router.get("/routes/current", summary="Most recent route result")
async def get_current_route():
    if _current_route is not None:
        return _current_route

    db = _get_db()
    if db is not None:
        try:
            rows = db.execute_query(
                """
                SELECT route_id, origin_node_id, exit_id, node_ids, edge_ids,
                       total_cost, algorithm, status, calculated_at
                FROM route_results
                ORDER BY calculated_at DESC
                LIMIT 1
                """
            )
            if rows:
                r = rows[0]
                return {
                    "route_id":       str(r[0]),
                    "origin_node_id": r[1],
                    "exit_id":        r[2],
                    "node_ids":       list(r[3]) if r[3] else None,
                    "edge_ids":       list(r[4]) if r[4] else None,
                    "total_cost":     r[5],
                    "algorithm":      r[6],
                    "status":         r[7],
                    "calculated_at":  r[8].isoformat() if r[8] else None,
                }
        except Exception:
            pass

    return {
        "status": "NO_ROUTE_CALCULATED",
        "message": "No route has been calculated yet.",
    }


# ---------------------------------------------------------------------------
# GET /routes/{route_id}
# ---------------------------------------------------------------------------

@router.get("/routes/{route_id}", summary="Specific route by ID")
async def get_route(route_id: str):
    db = _get_db()
    if db is not None:
        try:
            rows = db.execute_query(
                """
                SELECT route_id, origin_node_id, exit_id, node_ids, edge_ids,
                       total_cost, algorithm, status, calculated_at
                FROM route_results
                WHERE route_id = %s
                """,
                (route_id,),
            )
            if rows:
                r = rows[0]
                return {
                    "route_id":       str(r[0]),
                    "origin_node_id": r[1],
                    "exit_id":        r[2],
                    "node_ids":       list(r[3]) if r[3] else None,
                    "edge_ids":       list(r[4]) if r[4] else None,
                    "total_cost":     r[5],
                    "algorithm":      r[6],
                    "status":         r[7],
                    "calculated_at":  r[8].isoformat() if r[8] else None,
                }
        except Exception:
            pass

    raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found")


# ---------------------------------------------------------------------------
# GET /exits
# ---------------------------------------------------------------------------

@router.get("/exits", summary="All exits with availability")
async def get_exits():
    _, _ = _get_building_data()  # warm cache
    building, is_live = _get_building_data()
    return {"exits": building.get("exits", []), "demo_data": not is_live}
