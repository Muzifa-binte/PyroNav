"""
Seed the database with the demo hospital from /shared-contracts/mock-data/.

Usage (from the backend/ directory, after running migrations):
    python -m database.seed                  # insert / refresh the demo building
    python -m database.seed --reset-runtime  # ALSO wipe readings, events,
                                             # notifications and routes, and set
                                             # every room back to UNKNOWN

Safe to run repeatedly: static configuration (names, positions, graph, sensor
registry) is upserted; live state such as current_hazard_level is never touched
unless --reset-runtime is given.
"""
import argparse
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import demo_data  # noqa: E402
from database.connection import DatabaseUnavailableError, db_manager  # noqa: E402

RUNTIME_TABLES = ("notifications", "hazard_events", "sensor_readings", "route_results")


def seed_demo_building(db=db_manager) -> dict:
    """Upsert rooms, graph, exits and sensors. Returns row counts per table."""
    rooms = demo_data.rooms()
    nodes = demo_data.graph_nodes()
    edges = demo_data.graph_edges()
    exits = demo_data.exits()
    sensors = demo_data.sensors()

    with db.get_connection() as conn:  # one transaction: all or nothing
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO rooms (room_id, name, map_position, dimensions)
                VALUES (%(room_id)s, %(name)s, %(map_position)s, %(dimensions)s)
                ON CONFLICT (room_id) DO UPDATE SET
                    name         = EXCLUDED.name,
                    map_position = EXCLUDED.map_position,
                    dimensions   = EXCLUDED.dimensions
                """,
                rooms,
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
                [{"traversable": True, **n} for n in nodes],
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
                exits,
            )
            cur.executemany(
                """
                INSERT INTO sensors (sensor_id, room_id, sensor_type, unit_config)
                VALUES (%(sensor_id)s, %(room_id)s, %(sensor_type)s, %(unit_config)s)
                ON CONFLICT (sensor_id) DO UPDATE SET
                    room_id     = EXCLUDED.room_id,
                    sensor_type = EXCLUDED.sensor_type,
                    unit_config = EXCLUDED.unit_config
                """,
                [{"unit_config": None, **s} for s in sensors],
            )

    return {
        "rooms": len(rooms),
        "building_nodes": len(nodes),
        "building_edges": len(edges),
        "exits": len(exits),
        "sensors": len(sensors),
    }


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
    parser = argparse.ArgumentParser(description="Seed PyroNav demo data")
    parser.add_argument(
        "--reset-runtime", action="store_true",
        help=f"also TRUNCATE {', '.join(RUNTIME_TABLES)} and reset room states",
    )
    args = parser.parse_args(argv)

    try:
        counts = seed_demo_building()
        for table, n in counts.items():
            print(f"  {table:<15} {n} row(s) upserted")
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
