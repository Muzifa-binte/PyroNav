"""
Evacuation / pathfinding endpoints (Member 3's domain).
GET  /api/v1/building          — full graph (nodes + edges + exits)
POST /api/v1/routes/calculate  — calculate a route
GET  /api/v1/routes/current    — most recent route result
GET  /api/v1/routes/{route_id} — specific route by ID
GET  /api/v1/exits             — all exits with availability

Integration (Member 4): calculations go through Member 3's RouteCalculator, the
result is registered with the RouteMonitor (which recalculates automatically when
Member 2 reports a hazard on the path) and broadcast to every dashboard as a
``route_updated`` event.
"""
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, Literal, Optional
from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, Field

from api.dependencies import not_found, with_fallback
from database import demo_data
from database.connection import db_manager
from events import event_types as ev
from events.event_bus import Event, event_bus
from pathfinding.bfs import BFSPathfinder
from pathfinding.dijkstra import DijkstraPathfinder
from pathfinding.graph_loader import GraphLoader
from utils.serialization import to_jsonable

router = APIRouter()


class RouteRequest(BaseModel):
    origin_room_id: str = Field(min_length=1, max_length=50, examples=["reception"])
    algorithm: Literal["dijkstra", "bfs"] = "dijkstra"
    target_exit_id: Optional[str] = Field(default=None, examples=[None])


# ---------------------------------------------------------------------------
# Shared pathfinding service (one instance → one graph cache)
# ---------------------------------------------------------------------------

_monitor = None
_monitor_lock = threading.Lock()
_fallback_route: Optional[Dict] = None  # last demo-mode route (DB down)


def get_route_monitor():
    """Lazily create Member 3's RouteMonitor. It subscribes to room_status_changed
    on creation, so it is created once per process."""
    global _monitor
    if _monitor is None:
        with _monitor_lock:
            if _monitor is None:
                from pathfinding.route_monitor import RouteMonitor
                _monitor = RouteMonitor(db_manager)
    return _monitor


def _latest_in_memory_route() -> Optional[Dict]:
    """Newest route calculated by this process: the monitor's (DB mode, including
    automatic recalculations) or the demo-mode one, whichever is more recent."""
    candidates = []
    if _monitor is not None and _monitor.current_route:
        candidates.append({**to_jsonable(_monitor.current_route), "demo_data": False})
    if _fallback_route is not None:
        candidates.append(_fallback_route)
    # calculated_at values are ISO-8601 UTC strings, so they sort chronologically
    return max(candidates, key=lambda r: r["calculated_at"], default=None)


# ---------------------------------------------------------------------------
# Demo-mode helpers (database unavailable)
# ---------------------------------------------------------------------------

def _demo_building() -> Dict:
    return {
        **demo_data.building_info(),
        "nodes": demo_data.graph_nodes(),
        "edges": [
            {**e, "from_node_id": e["from_node"], "to_node_id": e["to_node"]}
            for e in demo_data.graph_edges()
        ],
        "exits": demo_data.exits(),
        "demo_data": True,
    }


def _demo_route(req: RouteRequest) -> Dict:
    """Run the real algorithms on the demo graph (no hazard data available)."""
    global _fallback_route
    graph = GraphLoader(None).load_graph_from_json(
        {"nodes": demo_data.graph_nodes(), "edges": demo_data.graph_edges()}
    )
    exits = [e["node_id"] for e in demo_data.exits() if e["available"]]
    if req.target_exit_id:
        exits = [e for e in exits if e == req.target_exit_id]

    result = {
        "route_id": str(uuid.uuid4()),
        "origin_node_id": req.origin_room_id,
        "exit_id": None, "node_ids": None, "edge_ids": None, "total_cost": None,
        "algorithm": req.algorithm,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "hazard_state_snapshot": [],
        "demo_data": True,
    }
    if req.origin_room_id not in graph["nodes"]:
        result["status"] = "INVALID_ORIGIN"
    elif not exits:
        result["status"] = "NO_AVAILABLE_EXIT"
    else:
        if req.algorithm == "bfs":
            exit_id, path = BFSPathfinder(graph).find_best_exit(req.origin_room_id, exits)
            cost = float(len(path) - 1) if path else None
        else:
            exit_id, path, cost = DijkstraPathfinder(graph).find_best_exit(req.origin_room_id, exits)
        if path is None:
            result["status"] = "NO_VALID_ROUTE"
        else:
            edge_ids = []
            for a, b in zip(path, path[1:]):
                edge = next(e for e in graph["edges"].get(a, []) if e["to"] == b)
                edge_ids.append(edge["edge_id"])
            result.update(status="ROUTE_FOUND", exit_id=exit_id, node_ids=path,
                          edge_ids=edge_ids, total_cost=cost)
    _fallback_route = result
    return result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/building", summary="Full building graph (nodes, edges, exits)")
def get_building():
    def query():
        nodes = db_manager.fetch_all(
            "SELECT * FROM building_nodes ORDER BY node_id"
        )
        edges = db_manager.fetch_all(
            "SELECT *, from_node_id AS from_node, to_node_id AS to_node "
            "FROM building_edges ORDER BY edge_id"
        )
        exits = db_manager.fetch_all(
            "SELECT * FROM exits ORDER BY exit_id"
        )
        return to_jsonable({"nodes": nodes, "edges": edges, "exits": exits, "demo_data": False})

    return with_fallback(query, _demo_building)


@router.post("/routes/calculate", summary="Calculate evacuation route")
def calculate_route(req: RouteRequest):
    """Hazard-aware: rooms at HIGH_RISK or CRITICAL are avoided. Statuses:
    ROUTE_FOUND, NO_VALID_ROUTE, NO_AVAILABLE_EXIT, INVALID_ORIGIN."""
    def query():
        monitor = get_route_monitor()
        result = monitor.calculator.calculate_route(
            req.origin_room_id, req.algorithm, req.target_exit_id
        )
        monitor.set_route(result)
        return {**to_jsonable(result), "demo_data": False}

    result = with_fallback(query, lambda: _demo_route(req))
    # Keep every dashboard on the same route
    event_bus.publish_sync(Event(ev.ROUTE_UPDATED, {**result, "reason": "manual_request"}))
    return result


@router.get("/routes/current", summary="Most recent route result")
def get_current_route():
    """The latest calculation, including failures such as NO_VALID_ROUTE, so the
    dashboard never keeps showing a route that has since become unsafe."""
    latest = _latest_in_memory_route()

    def query():
        if latest is not None:
            return latest
        row = db_manager.fetch_one(
            "SELECT route_id, origin_node_id, exit_id, node_ids, edge_ids, total_cost, "
            "algorithm, status, calculated_at, hazard_state_snapshot "
            "FROM route_results ORDER BY calculated_at DESC LIMIT 1"
        )
        if row is None:
            return {"status": "NO_ROUTE_CALCULATED", "message": "No route has been calculated yet."}
        return {**to_jsonable(row), "demo_data": False}

    def fallback():
        if latest is None:
            return {"status": "NO_ROUTE_CALCULATED", "message": "No route has been calculated yet.",
                    "demo_data": True}
        return latest

    return with_fallback(query, fallback)


@router.get("/routes/{route_id}", summary="Specific route by ID")
def get_route(route_id: UUID):
    row = db_manager.fetch_one(
        "SELECT route_id, origin_node_id, exit_id, node_ids, edge_ids, total_cost, "
        "algorithm, status, calculated_at, hazard_state_snapshot "
        "FROM route_results WHERE route_id = %s",
        (str(route_id),),
    )
    if row is None:
        raise not_found("Route", route_id)
    return to_jsonable(row)


@router.get("/exits", summary="All exits with availability")
def get_exits():
    def query():
        rows = db_manager.fetch_all(
            "SELECT * FROM exits ORDER BY exit_id"
        )
        return {"exits": to_jsonable(rows), "demo_data": False}

    return with_fallback(query, lambda: {"exits": demo_data.exits(), "demo_data": True})
