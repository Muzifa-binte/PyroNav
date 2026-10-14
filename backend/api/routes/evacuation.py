"""
Evacuation / pathfinding endpoints (Member 3's domain).
GET  /api/v1/building          — full graph (nodes + edges + exits)
POST /api/v1/routes/calculate  — calculate a route
GET  /api/v1/routes/current    — most recent route result
GET  /api/v1/routes/{route_id} — specific route by ID
GET  /api/v1/exits             — all exits with availability
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class RouteRequest(BaseModel):
    origin_room_id: str
    algorithm: str = "dijkstra"
    target_exit_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Mock building data
# ---------------------------------------------------------------------------

MOCK_BUILDING = {
    "nodes": [
        {"node_id": "reception",          "node_type": "room",     "room_id": "reception",          "position": {"x": 0,   "y": 0},   "traversable": True},
        {"node_id": "corridor_1",         "node_type": "junction", "room_id": "corridor_1",         "position": {"x": 50,  "y": 0},   "traversable": True},
        {"node_id": "operation_theater",  "node_type": "room",     "room_id": "operation_theater",  "position": {"x": 100, "y": 0},   "traversable": True},
        {"node_id": "emergency_ward",     "node_type": "room",     "room_id": "emergency_ward",     "position": {"x": 100, "y": 100}, "traversable": True},
        {"node_id": "EXIT-A",             "node_type": "exit",     "room_id": None,                 "position": {"x": 0,   "y": 100}, "traversable": True},
        {"node_id": "EXIT-B",             "node_type": "exit",     "room_id": None,                 "position": {"x": 150, "y": 0},   "traversable": True},
    ],
    "edges": [
        {"edge_id": "EDGE-01", "from_node": "reception",         "to_node": "corridor_1",        "cost": 10.0, "bidirectional": True, "traversable": True},
        {"edge_id": "EDGE-02", "from_node": "corridor_1",        "to_node": "operation_theater", "cost": 10.0, "bidirectional": True, "traversable": True},
        {"edge_id": "EDGE-03", "from_node": "operation_theater", "to_node": "emergency_ward",    "cost": 14.1, "bidirectional": True, "traversable": True},
        {"edge_id": "EDGE-04", "from_node": "reception",         "to_node": "EXIT-A",            "cost": 10.0, "bidirectional": False, "traversable": True},
        {"edge_id": "EDGE-05", "from_node": "operation_theater", "to_node": "EXIT-B",            "cost": 5.0,  "bidirectional": False, "traversable": True},
    ],
    "exits": [
        {"exit_id": "EXIT-A", "node_id": "EXIT-A", "name": "EXIT A — Main Entrance", "available": True},
        {"exit_id": "EXIT-B", "node_id": "EXIT-B", "name": "EXIT B — Side Door",     "available": True},
    ],
}

# Holds the most recently calculated route (in-memory for now)
_current_route: Optional[dict] = None


@router.get("/building", summary="Full building graph (nodes, edges, exits)")
async def get_building():
    # TODO: load from building_nodes / building_edges / exits tables
    return {**MOCK_BUILDING, "demo_data": True}


@router.post("/routes/calculate", summary="Calculate evacuation route")
async def calculate_route(req: RouteRequest):
    """
    Calls the pathfinding engine (Member 3's RouteCalculator).
    For now returns a mock result so the frontend can be developed in parallel.
    """
    global _current_route

    # TODO: replace with:
    #   from pathfinding.route_calculator import RouteCalculator
    #   calculator = RouteCalculator(db_connection)
    #   result = calculator.calculate_route(req.origin_room_id, req.algorithm, req.target_exit_id)

    # Mock response
    result = {
        "route_id":       str(uuid.uuid4()),
        "origin_node_id": req.origin_room_id,
        "exit_id":        "EXIT-A",
        "node_ids":       [req.origin_room_id, "corridor_1", "EXIT-A"],
        "edge_ids":       ["EDGE-01", "EDGE-04"],
        "total_cost":     20.0,
        "algorithm":      req.algorithm,
        "status":         "ROUTE_FOUND",
        "calculated_at":  datetime.now(timezone.utc).isoformat(),
        "hazard_state_snapshot": [],
        "demo_data": True,
    }

    _current_route = result
    return result


@router.get("/routes/current", summary="Most recent route result")
async def get_current_route():
    if _current_route is None:
        return {
            "status":  "NO_ROUTE_CALCULATED",
            "message": "No route has been calculated yet.",
        }
    return _current_route


@router.get("/routes/{route_id}", summary="Specific route by ID")
async def get_route(route_id: str):
    # TODO: query route_results table
    raise HTTPException(status_code=404, detail="Route history not implemented yet")


@router.get("/exits", summary="All exits with availability")
async def get_exits():
    # TODO: query exits table
    return {"exits": MOCK_BUILDING["exits"], "demo_data": True}
