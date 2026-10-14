"""
Stand-in for Member 2's decision engine — for demos and integration testing
until the real engine is plugged in.

Does exactly what the engine will do when a room changes state: updates the
room in the database, opens (or resolves) a hazard event with a notification,
and publishes the matching events through the running API, so WebSocket
clients and Member 3's route monitor react for real.

Run from backend/ while the API is running (ENABLE_DEV_ENDPOINTS=true):
    python scripts/simulate_hazard.py icu CRITICAL      # fire in the ICU
    python scripts/simulate_hazard.py icu NORMAL        # all clear
    python scripts/simulate_hazard.py --reset           # every room NORMAL, alerts resolved
"""
import argparse
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("LOG_DIR", "")

import httpx  # noqa: E402

from database.connection import DatabaseUnavailableError, db_manager  # noqa: E402
from utils.serialization import to_jsonable  # noqa: E402

LEVELS = ["NORMAL", "WARNING", "HIGH_RISK", "CRITICAL", "UNKNOWN"]
HAZARDOUS = {"WARNING", "HIGH_RISK", "CRITICAL"}


def publish(api: str, event_type: str, data: dict) -> None:
    r = httpx.post(f"{api}/api/v1/system/events/publish",
                   json={"event_type": event_type, "data": to_jsonable(data)}, timeout=10)
    if r.status_code == 404:
        sys.exit("The API's dev endpoints are disabled (ENABLE_DEV_ENDPOINTS=false).")
    r.raise_for_status()
    print(f"  -> published {event_type} ({r.json()['websocket_clients']} WebSocket client(s))")


def set_level(api: str, room_id: str, level: str) -> None:
    room = db_manager.fetch_one(
        "SELECT name, current_hazard_level FROM rooms WHERE room_id = %s", (room_id,))
    if room is None:
        rooms = [r["room_id"] for r in db_manager.fetch_all("SELECT room_id FROM rooms ORDER BY 1")]
        sys.exit(f"Unknown room '{room_id}'. Rooms: {', '.join(rooms)}")
    previous = room["current_hazard_level"]
    if previous == level:
        print(f"{room['name']} is already {level} - nothing to do.")
        return

    db_manager.execute_write(
        "UPDATE rooms SET current_hazard_level = %s, last_updated_at = (now() AT TIME ZONE 'UTC') "
        "WHERE room_id = %s", (level, room_id))
    print(f"{room['name']}: {previous} -> {level}")

    # Close any open event for this room; open a new one if still hazardous
    resolved = db_manager.fetch_all(
        "UPDATE hazard_events SET status = 'RESOLVED', resolved_at = (now() AT TIME ZONE 'UTC') "
        "WHERE room_id = %s AND status = 'ACTIVE' RETURNING event_id, room_id, resolved_at",
        (room_id,))
    db_manager.execute_write(
        "UPDATE notifications SET status = 'DISMISSED' WHERE room_id = %s AND status = 'ACTIVE'",
        (room_id,))

    publish(api, "room_status_changed",
            {"room_id": room_id, "hazard_level": level, "previous_level": previous})
    for event in resolved:
        publish(api, "hazard_event_resolved", event)

    if level in HAZARDOUS:
        event = db_manager.fetch_one(
            "INSERT INTO hazard_events (room_id, hazard_level, reason_codes, source_sensor_ids) "
            "VALUES (%s, %s, %s, %s) RETURNING event_id, room_id, hazard_level, reason_codes, detected_at",
            (room_id, level, ["SIMULATED"], []))
        note = db_manager.fetch_one(
            "INSERT INTO notifications (event_id, room_id, severity, message) VALUES (%s, %s, %s, %s) "
            "RETURNING notification_id, event_id, room_id, severity, message",
            (event["event_id"], room_id, level, f"{level.replace('_', ' ').title()} hazard in {room['name']}"))
        publish(api, "hazard_event_created", event)
        publish(api, "notification_created", note)


def reset(api: str) -> None:
    for room in db_manager.fetch_all(
            "SELECT room_id FROM rooms WHERE current_hazard_level <> 'NORMAL' ORDER BY room_id"):
        set_level(api, room["room_id"], "NORMAL")
    print("All rooms NORMAL.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulate a decision-engine hazard change")
    parser.add_argument("room_id", nargs="?", help="e.g. icu, administration, main_lobby")
    parser.add_argument("level", nargs="?", type=str.upper, choices=LEVELS)
    parser.add_argument("--reset", action="store_true", help="set every room back to NORMAL")
    parser.add_argument("--api", default="http://localhost:8000", help="running API base URL")
    args = parser.parse_args()
    if not args.reset and not (args.room_id and args.level):
        parser.error("give ROOM_ID and LEVEL, or --reset")

    try:
        reset(args.api) if args.reset else set_level(args.api, args.room_id, args.level)
    except DatabaseUnavailableError as exc:
        sys.exit(f"Database unavailable: {exc}")
    except httpx.ConnectError:
        sys.exit(f"Cannot reach the API at {args.api} - start it first (uvicorn api.main:app).")
    finally:
        db_manager.close()


if __name__ == "__main__":
    main()
