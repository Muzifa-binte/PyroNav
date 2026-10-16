"""
Room + sensor registry of the 3D hospital (shared-contracts/hospital-3d-sensors.json).

Registers what the 3D model needs in PostgreSQL, idempotently:
  * rooms   — INSERT only the missing ones (corridors, halls, stairwells).
              Existing rooms (Member 2's table) are never modified.
  * sensors — upsert, exactly like database/seed.py does for sample-sensors.json.

Usage (from backend/, after migrations and `python -m database.seed`):
    python -m sensor_ingestion.registry           # register
    python -m sensor_ingestion.registry --check   # report only, change nothing

Run it again after `python -m database.seed --replace`: --replace deletes rooms
and sensors that are not in sample-building.json / sample-sensors.json. The
ingestion service also runs it on startup (INGESTION_AUTO_REGISTER=true).
"""
import argparse
import json
import sys
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database.demo_data import CONTRACTS_DIR  # noqa: E402  (honours PYRONAV_CONTRACTS_DIR)
from database.connection import DatabaseUnavailableError, db_manager  # noqa: E402
from sensor_ingestion.message_validator import RegisteredSensor  # noqa: E402

REGISTRY_FILENAME = "hospital-3d-sensors.json"


def registry_path(override: str = "") -> Path:
    return Path(override) if override else CONTRACTS_DIR / REGISTRY_FILENAME


@lru_cache(maxsize=4)
def load_registry(path: str = "") -> dict:
    with open(registry_path(path), "r", encoding="utf-8") as f:
        return json.load(f)


def registry_sensors(path: str = "") -> Dict[str, RegisteredSensor]:
    """The registry as {sensor_id: RegisteredSensor} — used when the DB is unreachable."""
    return {
        s["sensor_id"]: RegisteredSensor(s["sensor_id"], s["room_id"], s["sensor_type"])
        for s in load_registry(path)["sensors"]
    }


def database_sensors(db=db_manager) -> Dict[str, RegisteredSensor]:
    rows = db.fetch_all("SELECT sensor_id, room_id, sensor_type::text AS sensor_type FROM sensors")
    return {r["sensor_id"]: RegisteredSensor(r["sensor_id"], r["room_id"], r["sensor_type"]) for r in rows}


def check(db=db_manager, path: str = "") -> dict:
    """What `register` would change, without changing anything."""
    reg = load_registry(path)
    rooms = {r["room_id"] for r in db.fetch_all("SELECT room_id FROM rooms")}
    sensors = database_sensors(db)
    missing_rooms = [r["room_id"] for r in reg["rooms"] if r["room_id"] not in rooms]
    missing_sensors, mismatched = [], []
    for s in reg["sensors"]:
        current = sensors.get(s["sensor_id"])
        if current is None:
            missing_sensors.append(s["sensor_id"])
        elif (current.room_id, current.sensor_type) != (s["room_id"], s["sensor_type"]):
            mismatched.append(f"{s['sensor_id']}: db={current.room_id}/{current.sensor_type} "
                              f"registry={s['room_id']}/{s['sensor_type']}")
    return {"missing_rooms": missing_rooms, "missing_sensors": missing_sensors, "mismatched_sensors": mismatched}


def register(db=db_manager, path: str = "") -> dict:
    """Insert missing rooms and upsert every registry sensor in one transaction."""
    reg = load_registry(path)
    rooms: List[dict] = reg["rooms"]
    sensors: List[dict] = reg["sensors"]
    with db.get_connection() as conn:
        with conn.cursor() as cur:
            added_rooms = []
            for room in rooms:
                cur.execute(
                    "INSERT INTO rooms (room_id, name) VALUES (%s, %s) "
                    "ON CONFLICT (room_id) DO NOTHING RETURNING room_id",
                    (room["room_id"], room["name"]),
                )
                if cur.fetchone():
                    added_rooms.append(room["room_id"])
            cur.executemany(
                """
                INSERT INTO sensors (sensor_id, room_id, sensor_type, unit_config)
                VALUES (%(sensor_id)s, %(room_id)s, %(sensor_type)s, %(unit_config)s)
                ON CONFLICT (sensor_id) DO UPDATE SET
                    room_id     = EXCLUDED.room_id,
                    sensor_type = EXCLUDED.sensor_type,
                    unit_config = EXCLUDED.unit_config
                """,
                [{"sensor_id": s["sensor_id"], "room_id": s["room_id"],
                  "sensor_type": s["sensor_type"], "unit_config": s.get("unit_config")} for s in sensors],
            )
    return {"rooms_added": added_rooms, "rooms_total": len(rooms), "sensors_upserted": len(sensors)}


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description="Register the 3D hospital rooms and sensors")
    parser.add_argument("--check", action="store_true", help="report differences, change nothing")
    parser.add_argument("--file", default="", help=f"registry JSON (default: shared-contracts/{REGISTRY_FILENAME})")
    args = parser.parse_args(argv)
    try:
        if args.check:
            report = check(path=args.file)
            for key, items in report.items():
                print(f"  {key:<20} {len(items)}" + (f"  {', '.join(items)}" if items else ""))
            return 1 if any(report.values()) else 0
        result = register(path=args.file)
        added = result["rooms_added"]
        print(f"  rooms     {len(added)} added" + (f" ({', '.join(added)})" if added else "")
              + f", {result['rooms_total'] - len(added)} already present")
        print(f"  sensors   {result['sensors_upserted']} upserted")
        print("Registry loaded.")
        return 0
    except DatabaseUnavailableError as exc:
        print(f"Database unavailable: {exc}")
        return 2
    finally:
        db_manager.close()


if __name__ == "__main__":
    sys.exit(main())
