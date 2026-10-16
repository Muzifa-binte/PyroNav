"""
Publish test readings in the agreed format (shared-contracts/sensor-message-schema.json).
room_id, sensor_type and units are looked up in shared-contracts/hospital-3d-sensors.json.

From backend/:
    python mqtt/test_publisher.py --list
    python mqtt/test_publisher.py --sensor SMOKE-OT-01 --value smoke=120 --value temperature=70
    python mqtt/test_publisher.py --sensor CO-CAF-01 --value co=150 --repeat 5 --interval 2
    python mqtt/test_publisher.py --sensor SMOKE-ICU-01 --broker 192.168.1.20 --port 1883

Needs: pip install paho-mqtt   (or: pip install -r sensor_ingestion/requirements.txt)
"""
import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt

REGISTRY = Path(__file__).resolve().parents[2] / "shared-contracts" / "hospital-3d-sensors.json"
TOPIC = "pyronav/v1/sensors/{room_id}/{sensor_id}/reading"


def load_sensors() -> dict:
    with open(REGISTRY, encoding="utf-8") as f:
        data = json.load(f)
    return {s["sensor_id"]: s for s in data["sensors"]}, data


def parse_values(pairs) -> dict:
    values = {}
    for pair in pairs:
        name, _, raw = pair.partition("=")
        if not raw:
            raise SystemExit(f"--value expects name=number, got {pair!r}")
        values[name.strip()] = float(raw)
    return values


def main() -> int:
    parser = argparse.ArgumentParser(description="Publish PyroNav test sensor readings over MQTT")
    parser.add_argument("--sensor", help="sensor_id, e.g. SMOKE-OT-01")
    parser.add_argument("--value", action="append", default=[], help="name=number, repeatable")
    parser.add_argument("--broker", default=os.getenv("MQTT_BROKER", "localhost"))
    parser.add_argument("--port", type=int, default=int(os.getenv("MQTT_PORT", "1883")))
    parser.add_argument("--username", default=os.getenv("MQTT_USERNAME"))
    parser.add_argument("--password", default=os.getenv("MQTT_PASSWORD"))
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--interval", type=float, default=2.0, help="seconds between repeats")
    parser.add_argument("--list", action="store_true", help="list registered sensors and exit")
    args = parser.parse_args()

    sensors, registry = load_sensors()
    if args.list:
        for s in sensors.values():
            print(f"{s['sensor_id']:<15} {s['room_id']:<18} {s['sensor_type']:<11} {s.get('purpose', '')}")
        return 0
    if not args.sensor:
        parser.error("--sensor is required (use --list to see them)")
    sensor = sensors.get(args.sensor)
    if sensor is None:
        parser.error(f"unknown sensor {args.sensor!r} (use --list)")

    values = {**sensor.get("baseline", {}), **parse_values(args.value)}
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                         client_id=f"pyronav-test-publisher-{uuid.uuid4().hex[:6]}")
    if args.username:
        client.username_pw_set(args.username, args.password)
    client.connect(args.broker, args.port, keepalive=30)
    client.loop_start()

    topic = TOPIC.format(room_id=sensor["room_id"], sensor_id=sensor["sensor_id"])
    try:
        for i in range(args.repeat):
            message = {
                "message_id": f"cli-{uuid.uuid4()}",
                "sensor_id": sensor["sensor_id"],
                "room_id": sensor["room_id"],
                "sensor_type": sensor["sensor_type"],
                "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                "values": values,
                "units": sensor["unit_config"],
                "source": "test_publisher",
                "trigger": "test",
                "schema_version": "1.0",
                "building_id": registry["building_id"],
                "floor_id": registry["floor_id"],
            }
            info = client.publish(topic, json.dumps(message), qos=1)
            info.wait_for_publish(timeout=5)
            print(f"[{i + 1}/{args.repeat}] {topic}  acked={info.is_published()}\n  {json.dumps(message)}")
            if i + 1 < args.repeat:
                time.sleep(args.interval)
    finally:
        client.loop_stop()
        client.disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(main())
