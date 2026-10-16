"""
Watch sensor readings on the broker and check each one against the contract —
the quickest way to see exactly what the Decision Engine will receive.

From backend/:
    python mqtt/test_subscriber.py                    # every reading
    python mqtt/test_subscriber.py --room icu         # one room
    python mqtt/test_subscriber.py --sensor CO-ICU-01 # one sensor
    python mqtt/test_subscriber.py --raw              # print the JSON payloads

Validation uses sensor_ingestion/message_validator.py (same rules as ingestion)
and the sensor registry in shared-contracts/hospital-3d-sensors.json.
Needs: pip install paho-mqtt pydantic
"""
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import paho.mqtt.client as mqtt

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sensor_ingestion.message_validator import RegisteredSensor, validate_message  # noqa: E402

REGISTRY = BACKEND_DIR.parent / "shared-contracts" / "hospital-3d-sensors.json"
COLOURS = {"valid": "\033[32m", "invalid": "\033[33m", "stale": "\033[33m", "rejected": "\033[31m"}
RESET = "\033[0m"


def main() -> int:
    parser = argparse.ArgumentParser(description="Watch PyroNav sensor readings")
    parser.add_argument("--broker", default=os.getenv("MQTT_BROKER", "localhost"))
    parser.add_argument("--port", type=int, default=int(os.getenv("MQTT_PORT", "1883")))
    parser.add_argument("--username", default=os.getenv("MQTT_USERNAME"))
    parser.add_argument("--password", default=os.getenv("MQTT_PASSWORD"))
    parser.add_argument("--room", default="+")
    parser.add_argument("--sensor", default="+")
    parser.add_argument("--raw", action="store_true")
    args = parser.parse_args()

    with open(REGISTRY, encoding="utf-8") as f:
        registry = {s["sensor_id"]: RegisteredSensor(s["sensor_id"], s["room_id"], s["sensor_type"])
                    for s in json.load(f)["sensors"]}
    topic = f"pyronav/v1/sensors/{args.room}/{args.sensor}/reading"
    colour = sys.stdout.isatty()

    def on_connect(client, userdata, flags, reason_code, properties):
        print(f"Connected to {args.broker}:{args.port} — subscribed to {topic}\n")
        client.subscribe(topic, qos=1)

    def on_message(client, userdata, msg):
        result = validate_message(msg.topic, msg.payload, registry)
        reading = result.reading or {}
        tag = result.status.upper()
        if colour:
            tag = f"{COLOURS.get(result.status, '')}{tag}{RESET}"
        values = ", ".join(f"{k}={v:g}{reading.get('units', {}).get(k, '')}"
                           for k, v in reading.get("values", {}).items())
        print(f"{datetime.now():%H:%M:%S}  {tag:<8} {reading.get('room_id', '?'):<18} "
              f"{reading.get('sensor_id', '?'):<15} {values}  [{reading.get('source') or '-'}"
              f"/{reading.get('trigger') or '-'}]")
        for err in result.errors:
            print(f"           ↳ {err}")
        if args.raw:
            print(f"           {msg.payload.decode('utf-8', 'replace')}")

    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    if args.username:
        client.username_pw_set(args.username, args.password)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(args.broker, args.port, keepalive=30)
    try:
        client.loop_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
