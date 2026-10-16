"""
Load a building (rooms, graph, exits, sensors) into the database.

Usage (from the backend/ directory, after running migrations):
    python -m database.seed --replace          # make the DB match the demo hospital exactly
    python -m database.seed                    # add / update demo rows, never delete anything
    python -m database.seed --reset-runtime    # ALSO wipe readings, events, notifications and
                                               # routes, and set every room back to UNKNOWN

The demo hospital is whatever /shared-contracts defines right now: the floor
plan and graph (mock-data/sample-building.json, sample-graph.json — Member 3)
plus every room and sensor of the 3D-model registry (hospital-3d-sensors.json —
Member 1). When a teammate changes those files, running the seed again picks
the change up. Needs migration 004 (floor/kind/category, sensor mount/metadata).

--replace also REMOVES rooms, graph rows and sensors that are not in the demo
files (with their readings and events). Use it to switch to a new demo layout;
do not use it once a real building has been imported, e.g. with
pathfinding/import_building.py.
"""
import argparse
import os
import sys
from typing import Dict, List

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import demo_data  # noqa: E402
from database.connection import DatabaseUnavailableError, db_manager  # noqa: E402

RUNTIME_TABLES = ("notifications", "hazard_events", "sensor_readings", "route_results")


def demo_building() -> Dict[str, List[dict]]:
    """The demo hospital from /shared-contracts, in the shape seed_building() takes."""
    return {
        "rooms": demo_data.rooms(),
        "nodes": demo_data.graph_nodes(),
        "edges": demo_data.graph_edges(),
        "exits": demo_data.exits(),
        "sensors": demo_data.sensors(),
    }


def seed_building(building: Dict[str, List[dict]], db=db_manager, replace: bool = False) -> dict:
    """Upsert a building in one transaction. With replace=True, also delete
    everything that is not part of it. Returns {"upserted": {...}, "removed": {...}}."""
    rooms, nodes, edges = building["rooms"], building["nodes"], building["edges"]
    exits, sensors = building["exits"], building["sensors"]
    removed: Dict[str, int] = {}

    with db.get_connection() as conn:  # one transaction: all or nothing
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO rooms (room_id, name, map_position, dimensions, floor_id, kind, category)
                VALUES (%(room_id)s, %(name)s, %(map_position)s, %(dimensions)s,
                        %(floor_id)s, %(kind)s, %(category)s)
                ON CONFLICT (room_id) DO UPDATE SET
                    name         = EXCLUDED.name,
                    map_position = EXCLUDED.map_position,
                    dimensions   = EXCLUDED.dimensions,
                    floor_id     = EXCLUDED.floor_id,
                    kind         = EXCLUDED.kind,
                    category     = EXCLUDED.category
                """,
                [{"map_position": None, "dimensions": None, "floor_id": None,
                  "kind": None, "category": None, **r} for r in rooms],
            )
            cur.executemany(
                """
                INSERT INTO building_nodes (node_id, node_type, room_id, position, traversable)
                VALUES (%(node_id)s, %(node_type)s, %(room_id)s, %(position)s, %(traversable)s)
                ON CONFLICT (node_id) DO UPDATE SET
                    node_type   = EXCLUDED.node_type,
                    room_id     = EXCLUDED.room_id,
                    position    = EXCLUDED.position,
                    traversable = EXCLUDED.traversable
                """,
                [{"traversable": True, "room_id": None, **n} for n in nodes],
            )
            cur.executemany(
                """
                INSERT INTO building_edges
                    (edge_id, from_node_id, to_node_id, cost, bidirectional, traversable)
                VALUES (%(edge_id)s, %(from_node)s, %(to_node)s, %(cost)s,
                        %(bidirectional)s, %(traversable)s)
                ON CONFLICT (edge_id) DO UPDATE SET
                    from_node_id  = EXCLUDED.from_node_id,
                    to_node_id    = EXCLUDED.to_node_id,
                    cost          = EXCLUDED.cost,
                    bidirectional = EXCLUDED.bidirectional,
                    traversable   = EXCLUDED.traversable
                """,
                [{"bidirectional": True, "traversable": True, **e} for e in edges],
            )
            cur.executemany(
                """
                INSERT INTO exits (exit_id, node_id, name, position, available, capacity)
                VALUES (%(exit_id)s, %(node_id)s, %(name)s, %(position)s,
                        %(available)s, %(capacity)s)
                ON CONFLICT (exit_id) DO UPDATE SET
                    node_id   = EXCLUDED.node_id,
                    name      = EXCLUDED.name,
                    position  = EXCLUDED.position,
                    available = EXCLUDED.available,
                    capacity  = EXCLUDED.capacity
                """,
                [{"position": None, "available": True, "capacity": None, **x} for x in exits],
            )
            cur.executemany(
                """
                INSERT INTO sensors (sensor_id, room_id, sensor_type, unit_config, mount, metadata)
                VALUES (%(sensor_id)s, %(room_id)s, %(sensor_type)s, %(unit_config)s,
                        %(mount)s, %(metadata)s)
                ON CONFLICT (sensor_id) DO UPDATE SET
                    room_id     = EXCLUDED.room_id,
                    sensor_type = EXCLUDED.sensor_type,
                    unit_config = EXCLUDED.unit_config,
                    mount       = EXCLUDED.mount,
                    metadata    = EXCLUDED.metadata
                """,
                [{"unit_config": None, "mount": None, "metadata": None, **s} for s in sensors],
            )

            if replace:
                edge_ids = [e["edge_id"] for e in edges]
                exit_ids = [x["exit_id"] for x in exits]
                node_ids = [n["node_id"] for n in nodes]
                sensor_ids = [s["sensor_id"] for s in sensors]
                room_ids = [r["room_id"] for r in rooms]
                prune = [  # children before parents (foreign keys)
                    ("building_edges",
                     "DELETE FROM building_edges WHERE NOT (edge_id = ANY(%s::text[]))", (edge_ids,)),
                    ("exits",
                     "DELETE FROM exits WHERE NOT (exit_id = ANY(%s::text[]))", (exit_ids,)),
                    ("building_nodes",
                     "DELETE FROM building_nodes WHERE NOT (node_id = ANY(%s::text[]))", (node_ids,)),
                    ("sensor_readings",
                     "DELETE FROM sensor_readings WHERE NOT (sensor_id = ANY(%s::text[])) "
                     "OR NOT (room_id = ANY(%s::text[]))", (sensor_ids, room_ids)),
                    ("sensors",
                     "DELETE FROM sensors WHERE NOT (sensor_id = ANY(%s::text[]))", (sensor_ids,)),
                    ("notifications",
                     "DELETE FROM notifications WHERE NOT (room_id = ANY(%s::text[])) OR event_id IN "
                     "(SELECT event_id FROM hazard_events WHERE NOT (room_id = ANY(%s::text[])))",
                     (room_ids, room_ids)),
                    ("hazard_events",
                     "DELETE FROM hazard_events WHERE NOT (room_id = ANY(%s::text[]))", (room_ids,)),
                    ("rooms",
                     "DELETE FROM rooms WHERE NOT (room_id = ANY(%s::text[]))", (room_ids,)),
                ]
                for table, sql, params in prune:
                    cur.execute(sql, params)
                    if cur.rowcount:
                        removed[table] = cur.rowcount

    return {
        "upserted": {"rooms": len(rooms), "building_nodes": len(nodes),
                     "building_edges": len(edges), "exits": len(exits), "sensors": len(sensors)},
        "removed": removed,
    }


def seed_demo_building(db=db_manager, replace: bool = False) -> dict:
    return seed_building(demo_building(), db=db, replace=replace)


def reset_runtime_state(db=db_manager) -> None:
    """Delete live data and return every room / sensor to its initial state."""
    with db.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"TRUNCATE {', '.join(RUNTIME_TABLES)}")
            cur.execute(
                "UPDATE rooms SET current_hazard_level = 'UNKNOWN', "
                "data_quality_status = 'NO_DATA', last_updated_at = CURRENT_TIMESTAMP"
            )
            cur.execute("UPDATE sensors SET status = 'active', last_seen_at = NULL")
            cur.execute("UPDATE building_nodes SET traversable = TRUE")
            cur.execute("UPDATE building_edges SET traversable = TRUE")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Load the PyroNav demo hospital")
    parser.add_argument(
        "--replace", action="store_true",
        help="also delete rooms / graph / sensors that are not in shared-contracts",
    )
    parser.add_argument(
        "--reset-runtime", action="store_true",
        help=f"also TRUNCATE {', '.join(RUNTIME_TABLES)} and reset room states",
    )
    args = parser.parse_args(argv)

    try:
        result = seed_demo_building(replace=args.replace)
        for table, n in result["upserted"].items():
            print(f"  {table:<15} {n} row(s) upserted")
        for table, n in result["removed"].items():
            print(f"  {table:<15} {n} row(s) removed (not in the demo building)")
        if args.reset_runtime:
            reset_runtime_state()
            print(f"  runtime state reset ({', '.join(RUNTIME_TABLES)} truncated)")
    except DatabaseUnavailableError as exc:
        print(f"Database unavailable: {exc}")
        return 2
    finally:
        db_manager.close()
    print("Seed complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
