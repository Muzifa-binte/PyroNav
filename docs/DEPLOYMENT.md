# Deployment Guide

## 1. Local development

See the [README quick start](../README.md#quick-start). In short:

| Step | Command (from `backend/`) |
| --- | --- |
| Database (Docker) | `docker compose up -d db` (from the repository root) |
| Database (native, once) | `psql -U postgres -f database/setup_database.sql` |
| Install | `pip install -r requirements.txt` (in a venv, Python 3.11–3.14) |
| Migrate | `python -m database.migrations.migrate` |
| Demo data | `python -m database.seed --replace` (building = exactly `shared-contracts`) |
| Run | `uvicorn api.main:app --reload --port 8000` |

> **PostgreSQL 15+ permission trap.** If you created the user yourself with `GRANT ALL PRIVILEGES ON DATABASE …`, migrations fail with *permission denied for schema public*. The database must be **owned** by `pyronav_user`, as `setup_database.sql` does: `ALTER DATABASE pyronav_db OWNER TO pyronav_user;`

### Useful commands
In Windows PowerShell, write `.\venv\Scripts\python.exe` instead of `python`.
```bash
python -m database.migrations.migrate --status   # applied / pending migrations
python -m database.seed --replace                # load the demo hospital; removes rooms/graph/sensors not in shared-contracts
python -m database.seed                          # add/update demo rows only, never deletes (safe next to a real building)
python -m database.seed --reset-runtime          # wipe readings/events/routes; rooms back to UNKNOWN (demo reset)
python scripts/simulate_hazard.py icu CRITICAL   # stand-in for the decision engine (API must be running)
python -m database.maintenance --purge 30        # delete operational data older than 30 days
python scripts/export_openapi.py                 # refresh shared-contracts/openapi.json
```

## 2. Docker Compose

```bash
docker compose up -d --build     # PostgreSQL 16 + Mosquitto (MQTT) + API
docker compose logs -f api
docker compose down              # keep data      (docker compose down -v deletes it)
```

The API container waits for PostgreSQL, applies migrations, loads the demo building (`SEED_DEMO_DATA=true` resets the building to `shared-contracts` on **every** start; set it to `false` once a real building has been imported) and starts uvicorn. Docker restarts it if it crashes, and its health check calls `/api/v1/health/live`.

Override values in a `.env` file **at the repository root**, which Docker Compose reads for substitution. This is separate from `backend/.env`:
```env
DB_PASSWORD=change-me
CORS_ORIGINS=http://dashboard.example.org
ENABLE_DEV_ENDPOINTS=false
DEBUG=false
DEMO_FALLBACK=false
RETENTION_DAYS=30
```

## 3. Environment variables

All are optional; the defaults suit local development. Put them in `backend/.env` (see `.env.example`) or the process environment, which takes precedence.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `5432` / `pyronav_db` | Connection |
| `DB_USER` / `DB_PASSWORD` | `pyronav_user` / `secure_password` | Credentials — **change for any shared deployment** |
| `DB_POOL_MIN` | `5` | Connections kept open. Too low means a new connection per concurrent request (see TESTING.md) |
| `DB_POOL_MAX` | `20` | Upper bound on connections |
| `DB_CONNECT_TIMEOUT` | `3` | Seconds before the DB is treated as down |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed browser origins (comma-separated) |
| `AUTO_MIGRATE` | `false` | Apply migrations at API startup (Docker uses its entrypoint instead) |
| `DEMO_FALLBACK` | `true` | Serve demo data instead of 503 when the DB is down |
| `ENABLE_DEV_ENDPOINTS` | `true` | Enables `POST /system/events/publish` |
| `DEBUG` | `true` | Exception messages in 500 responses |
| `LOG_LEVEL` | `INFO` | Console and file log level |
| `LOG_DIR` | `logs` | Relative to `backend/`; empty disables file logging |
| `LOG_TO_DATABASE` | `true` | WARNING+ records go to `system_logs` |
| `AUDIT_LOG_ENABLED` | `true` | Every request goes to `api_audit_log` |
| `WS_HEARTBEAT_SECONDS` | `30` | WebSocket heartbeat interval (`0` = off) |
| `RETENTION_DAYS` | `0` | Purge data older than N days (`0` = off) |
| `RETENTION_INTERVAL_HOURS` | `6` | How often the purge runs |
| `BACKGROUND_SERVICES` | `sensor_ingestion.service` | Modules whose workers run inside the API (see ARCHITECTURE.md §5.3). `sensor_ingestion.service` = live MQTT sensor data, needs a broker. Empty = no MQTT |
| `MQTT_BROKER` / `MQTT_PORT` | `localhost` / `1883` (Docker: `mosquitto`) | MQTT broker the ingestion subscribes to (`backend/mqtt/mosquitto.conf`: 1883 TCP, 9001 WebSocket for the browser) |

## 4. Production checklist

- [ ] Strong `DB_PASSWORD`; keep it out of git (`.env` is git-ignored).
- [ ] `ENABLE_DEV_ENDPOINTS=false`, since anyone could otherwise inject fake hazards.
- [ ] `DEBUG=false`, so error messages don't leak internals.
- [ ] `DEMO_FALLBACK=false`. During a real outage, showing demo data could be mistaken for live building state; clients should see 503.
- [ ] `CORS_ORIGINS` set to the real dashboard URL only.
- [ ] `RETENTION_DAYS` set (e.g. 30) so `sensor_readings` doesn't grow without bound.
- [ ] **One** API process (no `--workers N`). See ARCHITECTURE.md §3.
- [ ] TLS terminated by a reverse proxy (nginx/Caddy). Proxy `/ws/` with WebSocket upgrade headers, and set a read timeout above `WS_HEARTBEAT_SECONDS`.
- [ ] The API has **no authentication** (academic prototype). Do not expose it to the internet without adding it.

Example nginx location for the WebSocket:
```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 120s;
}
```

## 5. Backups

```bash
# Backup (Docker)
docker compose exec db pg_dump -U pyronav_user -Fc pyronav_db > pyronav_$(date +%F).dump
# Restore into an empty database
docker compose exec -T db pg_restore -U pyronav_user -d pyronav_db --clean < pyronav_2026-10-14.dump
```
Native install: run the same `pg_dump` / `pg_restore` commands without `docker compose exec db`.
