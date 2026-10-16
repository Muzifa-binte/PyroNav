# MQTT broker (Mosquitto) — Member 1

One Eclipse Mosquitto 2.x broker serves the whole project:

| Listener | Protocol | Used by |
| --- | --- | --- |
| `1883` | MQTT over TCP | `sensor_ingestion` (inside the API), the simulator, `test_publisher.py` / `test_subscriber.py`, `mosquitto_pub/sub`, MQTT Explorer |
| `9001` | MQTT over WebSockets | Browsers: the 3D hospital app (`hospital-3d/`) uses mqtt.js. Browsers cannot open raw TCP sockets |

Topic and payload: [`shared-contracts/sensor-message-schema.json`](../../shared-contracts/sensor-message-schema.json)
```
pyronav/v1/sensors/{room_id}/{sensor_id}/reading        QoS 1, not retained
```

## Start the broker

**Native** (from the repository root):
```bash
mosquitto -c backend/mqtt/mosquitto.conf -v
```
* Windows: install from https://mosquitto.org/download/, then `"C:\Program Files\mosquitto\mosquitto.exe" -c backend\mqtt\mosquitto.conf -v`. Stop the *Mosquitto Broker* Windows service first if it already holds port 1883.
* Ubuntu/Debian: `sudo apt install mosquitto mosquitto-clients` (run `sudo systemctl stop mosquitto` if the system service holds 1883).
* macOS: `brew install mosquitto`.

**Docker:**
```bash
docker compose -f backend/mqtt/docker-compose.yml up -d
docker compose -f backend/mqtt/docker-compose.yml logs -f
```

You should see `Opening ipv4 listen socket on port 1883` and `Opening websockets listen socket on port 9001`.

## Check it

```bash
# terminal A — watch everything
mosquitto_sub -h localhost -t 'pyronav/v1/sensors/#' -v

# terminal B — publish one reading (room/type/units come from the registry)
cd backend
python mqtt/test_publisher.py --list
python mqtt/test_publisher.py --sensor SMOKE-OT-01 --value smoke=120 --value temperature=70
python mqtt/test_publisher.py --sensor CO-CAF-01 --value co=150 --repeat 5 --interval 2

# validate every message against the contract (same rules as ingestion)
python mqtt/test_subscriber.py              # or --room icu / --sensor CO-ICU-01 / --raw
```
Both scripts need `paho-mqtt` (`pip install -r sensor_ingestion/requirements.txt`) and accept `--broker/--port/--username/--password` (or `MQTT_BROKER`, `MQTT_PORT`, … from the environment).

## Security (beyond local development)

`allow_anonymous true` lets anyone on the network publish fake sensor data. For a shared machine or a demo network:
```bash
mosquitto_passwd -c backend/mqtt/passwords pyronav_ingestion
mosquitto_passwd    backend/mqtt/passwords hospital3d
```
Then in `mosquitto.conf` set `allow_anonymous false` and enable `password_file`. Give the clients their credentials: `MQTT_USERNAME/MQTT_PASSWORD` in `backend/.env` and `VITE_MQTT_USERNAME/VITE_MQTT_PASSWORD` in `hospital-3d/.env`. Do not commit the password file.
