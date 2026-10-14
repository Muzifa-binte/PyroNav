"""
Unit tests for BFS pathfinder.
Run: pytest backend/tests/test_bfs.py -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pathfinding.bfs import BFSPathfinder

SIMPLE_GRAPH = {
    "nodes": {
        "A":    {"traversable": True},
        "B":    {"traversable": True},
        "C":    {"traversable": True},
        "D":    {"traversable": True},
        "EXIT": {"traversable": True},
    },
    "edges": {
        "A": [{"edge_id": "e1", "to": "B",    "traversable": True},
              {"edge_id": "e6", "to": "D",    "traversable": True}],   # shortcut (1 hop more)
        "B": [{"edge_id": "e2", "to": "C",    "traversable": True}],
        "C": [{"edge_id": "e4", "to": "EXIT", "traversable": True}],
        "D": [{"edge_id": "e5", "to": "EXIT", "traversable": True}],
    },
}


def test_fewest_hops():
    """A→D→EXIT (2 hops) should beat A→B→C→EXIT (3 hops)."""
    pf = BFSPathfinder(SIMPLE_GRAPH)
    path = pf.find_shortest_path("A", "EXIT")
    assert path == ["A", "D", "EXIT"]
    assert len(path) == 3


def test_blocked_node():
    pf = BFSPathfinder(SIMPLE_GRAPH)
    path = pf.find_shortest_path("A", "EXIT", blocked_nodes={"D"})
    assert path == ["A", "B", "C", "EXIT"]
    assert "D" not in path


def test_no_path():
    pf = BFSPathfinder(SIMPLE_GRAPH)
    path = pf.find_shortest_path("A", "EXIT", blocked_nodes={"C", "D"})
    assert path is None


def test_start_equals_end():
    pf = BFSPathfinder(SIMPLE_GRAPH)
    path = pf.find_shortest_path("A", "A")
    assert path == ["A"]


def test_find_best_exit():
    pf = BFSPathfinder(SIMPLE_GRAPH)
    exit_id, path = pf.find_best_exit("A", ["EXIT"])
    assert exit_id == "EXIT"
    assert path is not None


def test_find_best_exit_empty_list():
    pf = BFSPathfinder(SIMPLE_GRAPH)
    exit_id, path = pf.find_best_exit("A", [])
    assert exit_id is None
    assert path is None
