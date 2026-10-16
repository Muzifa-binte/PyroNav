# PyroNav — Emergency Evacuation System

PyroNav monitors a building's fire sensors, classifies the hazard level of every room, and computes safe evacuation routes that avoid dangerous areas. Dashboards update live over a WebSocket.

> Academic prototype. The demo hospital in `shared-contracts/mock-data` is illustrative data, not a real building.

## Quick start

### Prerequisites
- Python **3.11 – 3.14**
- PostgreSQL **13+** (or Docker)
- Node.js 18+ (frontend)

### Option A — Docker (database + API in one command)
```bash
docker compose up -d --build
```
The API runs at http://localhost:8000/docs. Migrations and the demo building load automatically.

### Option B — Local development (Windows PowerShell)

These commands run no `.ps1` scripts, so they work under PowerShell's default *Restricted* script policy. Windows PowerShell 5.1 also has no `&&`: run one command per line.

```powershell
# 1. Database: either Docker…
docker compose up -d db
#    …or a native PostgreSQL (once, as a superuser):
psql -U postgres -f backend\database\setup_database.sql

# 2. Backend (one-time setup)
cd backend
py -3.14 -m venv venv                              # any Python 3.11-3.14
.\venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env                             # optional; defaults match the setup above
.\venv\Scripts\python.exe -m database.migrations.migrate
.\venv\Scripts\python.exe -m database.seed --replace   # demo hospital from shared-contracts

# 3. Frontend (one-time setup)
cd ..\frontend
npm.cmd install
```

**Every day** (two terminals):
```powershell
cd C:\Projects\PyroNav\backend
.\venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000
```
```powershell
cd C:\Projects\PyroNav\frontend
npm.cmd run dev                                    # http://localhost:3000
```

macOS/Linux: `source venv/bin/activate`, then the same commands with `python`, `npm` and `/` paths.

The API also starts **without** a database. Reads are then served from `shared-contracts/mock-data` and marked `demo_data: true`, so frontend work is never blocked.

### Check it works
| URL | What you should see |
| --- | --- |
| http://localhost:8000/api/v1/health | `"status": "healthy"` |
| http://localhost:8000/docs | Swagger UI with every endpoint |
| `.\venv\Scripts\python.exe tests\test_websocket_client.py` (in `backend\`) | Live events, e.g. after `POST /api/v1/routes/calculate` |

> **Windows tip:** wherever the docs say `python` or `pytest`, use `.\venv\Scripts\python.exe` or `.\venv\Scripts\python.exe -m pytest` from `backend\`. Use `npm.cmd` for `npm`.

### Live sensor data (MQTT → dashboard)

```
3D app (browser) --MQTT/WebSocket :9001--> Mosquitto --MQTT :1883--> sensor ingestion (inside the API)
      --> event bus --> ws://localhost:8000/ws/v1/live --> dashboard + 3D app
```
With Docker Compose this is all on by default. For local development:

1. **Start an MQTT broker**: `docker compose up -d mosquitto`.
   *Windows without Docker:* install Mosquitto (`winget install EclipseFoundation.Mosquitto`), then in an **administrator** PowerShell copy `backend\mqtt\mosquitto.windows.conf` over `C:\Program Files\mosquitto\mosquitto.conf` and run `Restart-Service mosquitto`. That config listens on 1883 and 9001 for **this computer only**, so the anonymous broker is not reachable from the network.
2. **Install the MQTT client** (it is in `requirements.txt`): `.\venv\Scripts\python.exe -m pip install -r requirements.txt`.
3. **Turn the ingestion on** in `backend/.env`: `BACKGROUND_SERVICES=sensor_ingestion.service`, then restart the API.
4. **Check**: `GET /api/v1/health` shows `"service:mqtt_ingestion": running` and `"mqtt": connected`. Moving a sensor slider in the 3D app (`hospital-3d`, `npm.cmd run dev`) now sends `sensor_reading_updated` events on `/ws/v1/live`.

## Repository layout

```
backend/
  api/               FastAPI app: main.py, config, middleware, errors, routes/
  database/          connection pool, migrations/, seed.py, maintenance.py
  events/            in-process event bus + canonical event names
  websocket/         /ws/v1/live server, connection manager, broadcaster
  monitoring/        logging (file + DB), metrics, health registry, background writer
  pathfinding/       Dijkstra / BFS, hazard-aware route calculation (Member 3)
  utils/             JSON serialisation, retry with backoff
  tests/             pytest suite, Locust load test, manual WebSocket client
frontend/            React + Vite dashboard
shared-contracts/    API + WebSocket contracts, enums, OpenAPI spec, mock data
docs/                architecture, deployment, testing, demo, git workflow, task plans
```

## Documentation

| Document | Contents |
| --- | --- |
| [shared-contracts/api-endpoints.md](shared-contracts/api-endpoints.md) | REST API reference with examples |
| [shared-contracts/websocket-events.json](shared-contracts/websocket-events.json) | WebSocket events and client protocol |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, data/event flow, schema, **integration guide for teammates** |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environment variables, Docker, production checklist, backups |
| [docs/TESTING.md](docs/TESTING.md) | Running tests, integration scenarios, load-test procedure and results |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Step-by-step demo for the final presentation |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Branching strategy and PR rules |
| [backend/database/migrations/README.md](backend/database/migrations/README.md) | How to add a schema change |

## Team

| Member | Frontend | Backend |
| --- | --- | --- |
| Member 1 | 3D building model | MQTT sensor ingestion, simulator |
| Member 2 | 2D heatmap | Decision engine (hazard classification) |
| Member 3 | 2D evacuation routes | Pathfinding engine |
| Member 4 | — | Database, API framework, WebSocket, integration |

Task plans: [docs/](docs/) (`MEMBER-1-TASKS.md` … `MEMBER-4-TASKS.md`).
