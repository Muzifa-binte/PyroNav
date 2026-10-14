"""
Loader for the demo building in /shared-contracts/mock-data/.

Single source of truth for demo data, used by:
  * database/seed.py         — inserts the demo building into PostgreSQL
  * the API fallback mode    — serves it (demo_data: true) while the DB is down

Override the location with the PYRONAV_CONTRACTS_DIR environment variable.
"""
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, List

CONTRACTS_DIR = Path(
    os.getenv("PYRONAV_CONTRACTS_DIR")
    or Path(__file__).resolve().parents[2] / "shared-contracts"
)
MOCK_DIR = CONTRACTS_DIR / "mock-data"


@lru_cache(maxsize=None)
def _load(filename: str) -> dict:
    with open(MOCK_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def _floors() -> List[dict]:
    return _load("sample-building.json").get("floors", [])


def rooms() -> List[Dict]:
    return [
        {
            "room_id": r["room_id"],
            "name": r["name"],
            "map_position": r.get("map_position"),
            "dimensions": r.get("dimensions"),
            "floor_id": floor.get("floor_id"),
        }
        for floor in _floors()
        for r in floor.get("rooms", [])
    ]


def exits() -> List[Dict]:
    # In the demo graph every exit is also a node with the same id
    return [
        {
            "exit_id": e["exit_id"],
            "node_id": e.get("node_id", e["exit_id"]),
            "name": e["name"],
            "position": e.get("position"),
            "available": e.get("available", True),
            "capacity": e.get("capacity"),
        }
        for floor in _floors()
        for e in floor.get("exits", [])
    ]


def graph_nodes() -> List[Dict]:
    return [dict(n) for n in _load("sample-graph.json")["nodes"]]


def graph_edges() -> List[Dict]:
    return [dict(e) for e in _load("sample-graph.json")["edges"]]


def sensors() -> List[Dict]:
    return [dict(s) for s in _load("sample-sensors.json")["sensors"]]


def building_info() -> Dict:
    data = _load("sample-building.json")
    return {"building_id": data.get("building_id"), "name": data.get("name")}
