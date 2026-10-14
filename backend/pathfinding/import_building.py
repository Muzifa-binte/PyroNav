"""
import_building.py — Seeds the PostgreSQL pathfinding tables from a building
JSON file (sample-graph.json format).

Usage:
    cd backend
    python -m pathfinding.import_building
    python -m pathfinding.import_building --input ../shared-contracts/mock-data/sample-graph.json

The script is idempotent: it clears existing pathfinding rows before inserting,
so re-running it is safe during development.
"""
import argparse
import json
import os
import sys

# Allow running as: python -m pathfinding.import_building from /backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database.connection import db_manager

# Default path relative to this file's directory
_DEFAULT_JSON = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "shared-contracts", "mock-data", "sample-graph.json",
)


def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_rooms_if_missing(nodes: list, db) -> None:
    """
    Ensure a row exists in the rooms table for every room-type node.
    building_nodes.room_id is a FK to rooms.room_id, so rooms must exist first.
    Uses INSERT … ON CONFLICT DO NOTHING so existing rooms are untouched.
    """
    for node in nodes:
        if node.get("node_type") == "room" and node.get("room_id"):
            room_id = node["room_id"]
            name = room_id.replace("_", " ").title()
            pos = json.dumps(node.get("position", {"x": 0, "y": 0}))
            db.execute_write(
                """
                INSERT INTO rooms (room_id, name, map_position, current_hazard_level)
                VALUES (%s, %s, %s, 'UNKNOWN')
                ON CONFLICT (room_id) DO NOTHING
                """,
                (room_id, name, pos),
            )


def clear_existing(db) -> None:
    """Remove all existing pathfinding data (order matters for FK constraints)."""
    db.execute_write("DELETE FROM route_results")
    db.execute_write("DELETE FROM exits")
    db.execute_write("DELETE FROM building_edges")
    db.execute_write("DELETE FROM building_nodes")
    print("  Cleared existing pathfinding data.")


def insert_nodes(nodes: list, db) -> None:
    for node in nodes:
        db.execute_write(
            """
            INSERT INTO building_nodes (node_id, node_type, room_id, position, traversable)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                node["node_id"],
                node["node_type"],
                node.get("room_id"),
                json.dumps(node.get("position", {"x": 0, "y": 0})),
                node.get("traversable", True),
            ),
        )
    print(f"  Inserted {len(nodes)} nodes.")


def insert_edges(edges: list, db) -> None:
    for edge in edges:
        db.execute_write(
            """
            INSERT INTO building_edges
                (edge_id, from_node_id, to_node_id, cost, bidirectional, traversable)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                edge["edge_id"],
                edge["from_node"],
                edge["to_node"],
                float(edge.get("cost", 1.0)),
                edge.get("bidirectional", True),
                edge.get("traversable", True),
            ),
        )
    print(f"  Inserted {len(edges)} edges.")


def insert_exits(nodes: list, db) -> None:
    """
    Exit nodes carry availability in sample-graph.json via the 'available' field,
    or we default to True. EXIT-C is marked unavailable in sample-building.json.
    """
    exit_availability = {
        "EXIT-A": True,
        "EXIT-B": True,
        "EXIT-C": False,
    }
    count = 0
    for node in nodes:
        if node.get("node_type") == "exit":
            exit_id = node["node_id"]
            name = exit_id.replace("-", " ")
            available = exit_availability.get(exit_id, True)
            db.execute_write(
                """
                INSERT INTO exits (exit_id, node_id, name, position, available)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    exit_id,
                    exit_id,
                    name,
                    json.dumps(node.get("position", {"x": 0, "y": 0})),
                    available,
                ),
            )
            count += 1
    print(f"  Inserted {count} exits.")


def run(path: str) -> None:
    if db_manager is None:
        print("ERROR: Database not connected. Check your .env settings.")
        sys.exit(1)

    print(f"Loading building graph from: {path}")
    data = load_json(path)

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    if not nodes:
        print("ERROR: No nodes found in the JSON file.")
        sys.exit(1)

    print(f"  Found {len(nodes)} nodes, {len(edges)} edges.")

    print("Seeding rooms (rooms table)…")
    seed_rooms_if_missing(nodes, db_manager)

    print("Clearing old pathfinding data…")
    clear_existing(db_manager)

    print("Inserting nodes…")
    insert_nodes(nodes, db_manager)

    print("Inserting edges…")
    insert_edges(edges, db_manager)

    print("Inserting exits…")
    insert_exits(nodes, db_manager)

    print("Done. Building graph seeded successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed building graph into PostgreSQL")
    parser.add_argument(
        "--input",
        default=_DEFAULT_JSON,
        help="Path to the building graph JSON file",
    )
    args = parser.parse_args()
    run(args.input)
