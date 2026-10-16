# Sensor ingestion — MQTT → PostgreSQL → Decision Engine (Member 1)

Subscribes to `pyronav/v1/sensors/+/+/reading` and, for every message:

1. **validates** it against [`sensor-message-schema.json`](../../shared-contracts/sensor-message-schema.json) (`message_validator.py`)
2. **stores** it in `sensor_readings` and updates `sensors.last_seen_at` / `status` (`database_writer.py`, one transaction)
3. **forwards** valid readings on the in-process event bus as `sensor_reading_received` (`pipeline.py`). This is the event Member 2's Decision Engine subscribes to. Member 4's broadcaster also sends it to browsers as `sensor_reading_updated`.

It runs **inside the API process** through the existing hook (`docs/ARCHITECTURE.md` §5.3), so it shares the event bus with the Decision Engine and the WebSocket.

```ini
# backend/.env
BACKGROUND_SERVICES=sensor_ingestion.service
```
```bash
pip install -r sensor_ingestion/requirements.txt     # paho-mqtt 2.1.0
python -m uvicorn api.main:app --reload --port 8000
```

## For the Decision Engine (Member 2)

```python
from events.event_bus import event_bus
from events import event_types as ev

def on_reading(event):
    r = event.data
    # r["room_id"], r["sensor_id"], r["sensor_type"], r["values"] e.g. {"smoke": 120, "temperature": 64.5}
    # r["units"], r["timestamp"], r["message_id"], r["persisted"], r["source"], r["trigger"]
    ...

event_bus.subscribe(ev.SENSOR_READING_RECEIVED, on_reading)
```
* Only **valid** readings are forwarded. Invalid, stale and duplicate messages never reach the engine.
* The row is in `sensor_readings` **before** the event fires, so `latest_sensor_readings` is already up to date.
* If PostgreSQL is down, valid readings are still forwarded in real time with `persisted: false`.
* The handler runs in the ingestion worker thread (like the paho callback in `tests/test_integration.py`). `publish_sync` from there is safe.

## Validation

| Result | When | Stored | Forwarded |
| --- | --- | --- | --- |
| `valid` | Schema OK, registered sensor in that room with that type, plausible values, fresh timestamp | ✓ | ✓ |
| `invalid` | Topic ≠ payload ids, sensor belongs to another room or type, no expected field, implausible value | ✓ (audit; `INGESTION_STORE_INVALID`) | ✗ |
| `stale` | Timestamp older than `INGESTION_MAX_AGE_SECONDS` (300 s) or more than 60 s in the future | ✓ | ✗ |
| `rejected` | Not JSON, schema violation, or unregistered sensor (foreign key) | ✗ | ✗ |
| duplicate | `message_id` already stored (QoS 1 redelivery) | — | ✗ |

Warnings are rate-limited (once per 30 s per sensor and reason), because WARNING logs also go to `system_logs`.

## Sensor registry

[`shared-contracts/hospital-3d-sensors.json`](../../shared-contracts/hospital-3d-sensors.json) lists the 26 rooms and 57 sensors of the 3D hospital. It is a superset of the demo data: all 20 demo sensors keep their ids, rooms and types.

```bash
python -m sensor_ingestion.registry --check   # what is missing in the DB (changes nothing)
python -m sensor_ingestion.registry           # insert missing rooms, upsert sensors
```
* Rooms: `INSERT … ON CONFLICT DO NOTHING`. Existing rows in Member 2's `rooms` table are never changed.
* Sensors: upserted exactly like `database/seed.py`.
* With `INGESTION_AUTO_REGISTER=true` (default), the service does this at startup. It also re-registers once if a 3D sensor disappears (for example after `database.seed --replace`).

## Settings (`backend/.env`)

| Key | Default | |
| --- | --- | --- |
| `MQTT_BROKER` / `MQTT_PORT` | `localhost` / `1883` | Already in `.env.example` |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | — | When the broker requires authentication |
| `MQTT_TOPIC_READINGS` | `pyronav/v1/sensors/+/+/reading` | |
| `MQTT_QOS` / `MQTT_KEEPALIVE` | `1` / `30` | |
| `MQTT_CLIENT_ID` | `pyronav-ingestion-<host>-<pid>` | Must be unique on the broker |
| `INGESTION_AUTO_REGISTER` | `true` | Register 3D rooms and sensors at startup |
| `INGESTION_REGISTRY_FILE` | `shared-contracts/hospital-3d-sensors.json` | |
| `INGESTION_MAX_AGE_SECONDS` | `300` | |
| `INGESTION_STORE_INVALID` | `true` | |
| `INGESTION_QUEUE_SIZE` | `10000` | Hand-off queue between the MQTT thread and the DB worker |

## Health

`GET /api/v1/health` shows:
* `service:mqtt_ingestion`: `running`, or `failed` with the reason (for example, paho-mqtt not installed)
* `mqtt`: `connected` / `disconnected`, broker, topic, `received`, `stored`, `forwarded`, `duplicates`, `invalid`, `stale`, `rejected`, `unknown_sensor`, `db_errors`, `last_message_at`, `queue_depth`

The broker is reconnected automatically (backoff 1 → 30 s) and the subscription is renewed after every reconnect.

## Tests

```bash
pytest tests/test_sensor_ingestion.py -v
```
26 tests: registry consistency with the demo data, validation rules, store-then-forward, duplicate suppression, the DB-down path, sensor status changes, and the real event bus to the WebSocket. One more test runs against PostgreSQL in its own throw-away schema, so the shared test schema's counts stay untouched; it is skipped when PostgreSQL is not reachable.
