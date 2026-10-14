# Demo Script — Backend Infrastructure (Member 4)

About 8 minutes. Every command runs from `backend/` unless noted.

## Before the demo (10 min early)

PostgreSQL runs as a Windows service and is already up. Check it with `Get-Service postgresql-x64-16`; with Docker, use `docker compose up -d db` instead. In PowerShell:

```powershell
cd C:\Projects\PyroNav\backend
.\venv\Scripts\python.exe -m database.migrations.migrate
.\venv\Scripts\python.exe -m database.seed --reset-runtime      # clean demo state
.\venv\Scripts\python.exe -m uvicorn api.main:app --port 8000
```
Open these:
1. **Browser tab A**: http://localhost:8000/docs
2. **Browser tab B**: http://localhost:3000 (dashboard: `npm.cmd run dev` in `frontend\`)
3. **Terminal 1** and **Terminal 2**: `.\venv\Scripts\python.exe tests\test_websocket_client.py --client-id viewer-1` (use `viewer-2` in the second)

Copy the `curl` commands below into a text file. On Windows, run them in Git Bash.

## 1. System status (1 min)

```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/health/db
curl http://localhost:8000/api/v1/system/websocket/stats
```
Points to make:
- Every component reports its health.
- The DB response shows table counts, pool usage and applied migrations.
- The WebSocket stats show both terminals connected.

## 2. Data flow (3 min)

Rooms and routes below are for the current demo hospital in `shared-contracts`. If a teammate changes the layout, pick an origin room next to the room you set on fire.

**a. Calculate a route.** On the **Evacuation** page, choose origin **Isolation Room** and click *Calculate Route*.
The route is Isolation Room → ICU → EXIT-NW (13 m). Both terminals receive `route_updated` (`reason: manual_request`).

**b. Fire in the ICU.** With Members 1–2's services running, start the simulator's fire scenario. Without them, `scripts/simulate_hazard.py` plays the decision engine's part. It updates the room, opens an alert and publishes the events:
```powershell
.\venv\Scripts\python.exe scripts\simulate_hazard.py icu CRITICAL
```
Both terminals receive `room_status_changed`, `hazard_event_created` and `notification_created`. Then, with no further action, Member 3's route monitor recalculates and `route_updated` arrives (`reason: hazard_change`). The Evacuation page **redraws by itself** to Isolation Room → Patient Room → OT → EXIT-NE (21 m), with no refresh needed.

*Cut-off variant:* calculate from **Records**, then run `simulate_hazard.py administration CRITICAL`. Records can only be left through Administration, so the result is `NO_VALID_ROUTE`.

Afterwards, run `.\venv\Scripts\python.exe scripts\simulate_hazard.py --reset` to set every room back to NORMAL.

**c. Show it on the dashboard**: Live Map (the ICU turns red live), Overview (active alert).

## 3. Resilience (2 min)

```bash
docker compose stop db
curl http://localhost:8000/api/v1/health              # "degraded", database "unavailable"
curl http://localhost:8000/api/v1/rooms               # still answers: demo_data true
curl -X POST http://localhost:8000/api/v1/sensors -H "Content-Type: application/json" -d '{"sensor_id":"X","room_id":"icu","sensor_type":"co"}'   # 503 + Retry-After
docker compose start db
curl http://localhost:8000/api/v1/health              # "healthy" again, no API restart
```
Point to make: the dashboard never goes blank, and the pool reconnects by itself.

**Native PostgreSQL (no Docker):** instead of `docker compose stop db` / `start db`, run these in a PowerShell opened with *Run as administrator*:
```powershell
Stop-Service postgresql-x64-16
Start-Service postgresql-x64-16
```

## 4. Performance (1 min)

```bash
locust -f tests/locustfile.py --host=http://localhost:8000 --headless -u 50 -r 10 -t 30s --only-summary
curl http://localhost:8000/api/v1/system/stats         # requests_per_minute, latency p95
```
Points to make:
- 0 failures, p95 around 22 ms.
- The pool-size finding from [TESTING.md](TESTING.md): a load test led to a 15× latency improvement.
- Meanwhile both WebSocket terminals keep receiving heartbeats.

## 5. Monitoring (1 min)

```bash
curl "http://localhost:8000/api/v1/system/audit?limit=5"            # every request, with request IDs
curl "http://localhost:8000/api/v1/system/audit?min_status=500"      # the 503s from step 3
curl "http://localhost:8000/api/v1/system/logs?level=WARNING"        # persisted warnings
curl http://localhost:8000/api/v1/system/stats
```

## Reset between rehearsals
```bash
python -m database.seed --reset-runtime
```
