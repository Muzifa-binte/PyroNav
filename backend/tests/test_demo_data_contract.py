"""
Consistency checks for the demo data in /shared-contracts/mock-data.

Teammates own these files and will keep changing them (rooms from the 3D editor,
the routing graph, the sensor list). These tests don't care WHAT the building
looks like, only that the files agree with each other and load into PostgreSQL,
so a broken reference is caught here instead of during the demo.

Run: pytest tests/test_demo_data_contract.py -v
"""
import json
from collections import Counter

import pytest

from database import demo_data
from database.connection import DatabaseUnavailableError, db_manager
from database.migrations.migrate import MigrationRunner
from database.seed import demo_building, seed_building
from pathfinding.dijkstra import DijkstraPathfinder
from pathfinding.graph_loader import GraphLoader

ENUMS = json.loads((demo_data.CONTRACTS_DIR / "hazard-levels.json").read_text(encoding="utf-8"))


def _duplicates(values):
    return sorted(v for v, n in Counter(values).items() if n > 1)


@pytest.fixture(scope="module")
def building():
    return demo_building()


def test_ids_are_unique(building):
    for kind, key in (("rooms", "room_id"), ("nodes", "node_id"), ("edges", "edge_id"),
                      ("exits", "exit_id"), ("sensors", "sensor_id")):
        assert _duplicates(item[key] for item in building[kind]) == [], f"duplicate {key}s"


def test_graph_references_exist(building):
    rooms = {r["room_id"] for r in building["rooms"]}
    nodes = {n["node_id"]: n for n in building["nodes"]}
    for n in building["nodes"]:
        assert n["node_type"] in ENUMS["node_type"]["values"], n
        if n.get("room_id"):
            assert n["room_id"] in rooms, f"node {n['node_id']}: unknown room {n['room_id']}"
    for e in building["edges"]:
        assert e["from_node"] in nodes, f"{e['edge_id']}: unknown node {e['from_node']}"
        assert e["to_node"] in nodes, f"{e['edge_id']}: unknown node {e['to_node']}"
        assert e["cost"] >= 0, f"{e['edge_id']}: negative cost breaks Dijkstra"
    for x in building["exits"]:
        assert x["node_id"] in nodes, f"exit {x['exit_id']}: unknown node {x['node_id']}"
        assert nodes[x["node_id"]]["node_type"] == "exit", f"exit {x['exit_id']} is not an exit node"


def test_sensors_reference_rooms(building):
    rooms = {r["room_id"] for r in building["rooms"]}
    for s in building["sensors"]:
        assert s["room_id"] in rooms, f"sensor {s['sensor_id']}: unknown room {s['room_id']}"
        assert s["sensor_type"] in ENUMS["sensor_type"]["values"], s


def test_every_room_can_reach_an_exit(building):
    """With no hazards, every room node must have an evacuation route."""
    graph = GraphLoader(None).load_graph_from_json(
        {"nodes": building["nodes"], "edges": building["edges"]})
    exits = [x["node_id"] for x in building["exits"] if x.get("available", True)]
    stranded = [
        n["node_id"] for n in building["nodes"]
        if n["node_type"] != "exit"
        and DijkstraPathfinder(graph).find_best_exit(n["node_id"], exits)[1] is None
    ]
    assert stranded == [], f"no route to any available exit from: {stranded}"


# ---------------------------------------------------------------------------
# The demo hospital loads into a real database (separate throw-away schema)
# ---------------------------------------------------------------------------

DEMO_SCHEMA = "pyronav_test_demo"


@pytest.mark.database
def test_demo_building_seeds_into_postgresql(building):
    saved = db_manager.current_config()
    db_manager.configure(search_path=DEMO_SCHEMA)
    try:
        try:
            db_manager.execute_write(f"DROP SCHEMA IF EXISTS {DEMO_SCHEMA} CASCADE")
        except DatabaseUnavailableError as exc:
            pytest.skip(f"PostgreSQL not reachable ({exc})")
        db_manager.execute_write(f"CREATE SCHEMA {DEMO_SCHEMA}")
        with db_manager.get_connection() as conn:
            MigrationRunner(conn).run()

        result = seed_building(building, replace=True)
        counts = db_manager.fetch_one(
            "SELECT (SELECT COUNT(*) FROM rooms) AS rooms, (SELECT COUNT(*) FROM sensors) AS sensors, "
            "(SELECT COUNT(*) FROM building_nodes) AS nodes, (SELECT COUNT(*) FROM building_edges) AS edges, "
            "(SELECT COUNT(*) FROM exits) AS exits")
        # --replace leaves exactly the demo building, whatever migrations seeded before
        assert counts == {k: len(building[k]) for k in ("rooms", "sensors", "nodes", "edges", "exits")}
        assert result["upserted"]["rooms"] == len(building["rooms"])

        # Re-seeding is safe and changes nothing
        assert seed_building(building, replace=True)["removed"] == {}
    finally:
        db_manager.configure(**{**saved, "search_path": DEMO_SCHEMA})
        try:
            db_manager.execute_write(f"DROP SCHEMA IF EXISTS {DEMO_SCHEMA} CASCADE")
        except DatabaseUnavailableError:
            pass
        db_manager.configure(**saved)
