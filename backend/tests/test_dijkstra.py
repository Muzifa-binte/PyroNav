"""
Unit tests for Dijkstra pathfinder.
Run: pytest backend/tests/test_dijkstra.py -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pathfinding.dijkstra import DijkstraPathfinder

# ---------------------------------------------------------------------------
# Shared fixture graph
# ---------------------------------------------------------------------------
SIMPLE_GRAPH = {
    "nodes": {
        "A": {"traversable": True},
        "B": {"traversable": True},
        "C": {"traversable": True},
        "D": {"traversable": True},
        "EXIT": {"traversable": True},
    },
    "edges": {
        "A":    [{"edge_id": "e1", "to": "B",    "cost": 5,  "traversable": True}],
        "B":    [{"edge_id": "e2", "to": "C",    "cost": 3,  "traversable": True},
                 {"edge_id": "e3", "to": "D",    "cost": 10, "traversable": True}],
        "C":    [{"edge_id": "e4", "to": "EXIT", "cost": 2,  "traversable": True}],
        "D":    [{"edge_id": "e5", "to": "EXIT", "cost": 1,  "traversable": True}],
    },
}


def test_simple_path():
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    path, cost = pf.find_shortest_path("A", "EXIT")
    assert path == ["A", "B", "C", "EXIT"]
    assert cost == 10.0


def test_shortest_over_longer_hop():
    """A→B→C→EXIT (cost 10) should beat A→B→D→EXIT (cost 16)."""
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    path, cost = pf.find_shortest_path("A", "EXIT")
    assert cost < 16


def test_blocked_node_uses_alternate():
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    path, cost = pf.find_shortest_path("A", "EXIT", blocked_nodes={"C"})
    # C is blocked → must go A→B→D→EXIT
    assert "C" not in path
    assert path == ["A", "B", "D", "EXIT"]


def test_no_path_returns_none():
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    path, cost = pf.find_shortest_path("A", "EXIT", blocked_nodes={"C", "D"})
    assert path is None
    assert cost == float("inf")


def test_start_equals_end():
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    path, cost = pf.find_shortest_path("A", "A")
    assert path == ["A"]
    assert cost == 0.0


def test_unknown_node():
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    path, cost = pf.find_shortest_path("A", "NOWHERE")
    assert path is None
    assert cost == float("inf")


def test_find_best_exit():
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    exit_id, path, cost = pf.find_best_exit("A", ["EXIT"])
    assert exit_id == "EXIT"
    assert path is not None
    assert cost == 10.0


def test_find_best_exit_no_available():
    pf = DijkstraPathfinder(SIMPLE_GRAPH)
    exit_id, path, cost = pf.find_best_exit("A", [], blocked_nodes=set())
    assert exit_id is None
    assert path is None
