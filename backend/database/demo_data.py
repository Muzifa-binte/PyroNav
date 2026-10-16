"""
Loader for the demo building in /shared-contracts.

Sources (each owned by the member who maintains it):
  * mock-data/sample-building.json, sample-graph.json — floor plan + routing graph (Member 3)
  * hospital-3d-sensors.json — room + sensor registry of the 3D model (Member 1)
  * mock-data/sample-sensors.json — original sensor list, kept as a fallback

Rooms and sensors are the UNION of these files, so nothing listed in either is
lost. Used by:
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
REGISTRY_FILE = CONTRACTS_DIR / "hospital-3d-sensors.json"

# Sensor details from the registry that have no column of their own → sensors.metadata
SENSOR_DETAILS = ("placement", "baseline", "purpose", "rated_current_a")


@lru_cache(maxsize=None)
def _load(filename: str) -> dict:
    with open(MOCK_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)


def _floors() -> List[dict]:
    return _load("sample-building.json").get("floors", [])


@lru_cache(maxsize=None)
def registry() -> dict:
    """Member 1's 3D-hospital registry, or {} if the file isn't there."""
    if not REGISTRY_FILE.exists():
        return {}
    with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def rooms() -> List[Dict]:
    """Floor-plan rooms (with map position) plus the registry's extra rooms
    (corridors, halls, stairwells); kind/category come from the registry."""
    reg = registry()
    details = {r["room_id"]: r for r in reg.get("rooms", [])}
    out, seen = [], set()
    for floor in _floors():
        for r in floor.get("rooms", []):
            d = details.get(r["room_id"], {})
            out.append({
                "room_id": r["room_id"],
                "name": r["name"],
                "map_position": r.get("map_position"),
                "dimensions": r.get("dimensions"),
                "floor_id": floor.get("floor_id"),
                "kind": d.get("kind"),
                "category": d.get("category"),
            })
            seen.add(r["room_id"])
    for r in reg.get("rooms", []):
        if r["room_id"] not in seen:
            out.append({
                "room_id": r["room_id"],
                "name": r["name"],
                "map_position": None,
                "dimensions": None,
                "floor_id": reg.get("floor_id"),
                "kind": r.get("kind"),
                "category": r.get("category"),
            })
    return out


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
    # Skip comment/section marker entries that lack node_id
    return [dict(n) for n in _load("sample-graph.json")["nodes"] if "node_id" in n]


def graph_edges() -> List[Dict]:
    # Skip comment/section marker entries that lack edge_id
    return [dict(e) for e in _load("sample-graph.json")["edges"] if "edge_id" in e]


def sensors() -> List[Dict]:
    """Registry sensors (with mount + details), plus any sample-sensors.json
    sensor the registry doesn't list."""
    out = [
        {
            "sensor_id": s["sensor_id"],
            "room_id": s["room_id"],
            "sensor_type": s["sensor_type"],
            "unit_config": s.get("unit_config"),
            "mount": s.get("mount"),
            "metadata": {k: s[k] for k in SENSOR_DETAILS if k in s} or None,
        }
        for s in registry().get("sensors", [])
    ]
    known = {s["sensor_id"] for s in out}
    out += [
        {"mount": None, "metadata": None, **s}
        for s in _load("sample-sensors.json")["sensors"]
        if s["sensor_id"] not in known
    ]
    return out


def building_info() -> Dict:
    data = _load("sample-building.json")
    return {"building_id": data.get("building_id"), "name": data.get("name")}
