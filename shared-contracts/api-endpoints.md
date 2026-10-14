# PyroNav REST API Reference

Base URL: `http://localhost:8000/api/v1` · Owner: Member 4 · Version 1.0.0

Machine-readable spec: [`openapi.json`](openapi.json). Regenerate it with `python scripts/export_openapi.py` from `backend/`. Interactive docs are at `http://localhost:8000/docs` (Swagger UI) and `/redoc`.
Real-time events use the WebSocket contract in [`websocket-events.json`](websocket-events.json). Enum values are listed in [`hazard-levels.json`](hazard-levels.json).

---

## Conventions

| Topic | Rule |
| --- | --- |
| **Field names** | Response fields use the database column names (`current_hazard_level`, `data_quality_status`, `last_updated_at`, `from_node_id`, …). |
| **Timestamps** | ISO-8601, always UTC with an explicit offset: `2026-10-14T15:23:32+00:00`. Query parameters accept any ISO-8601 value; a value without an offset is treated as UTC. |
| **`demo_data`** | `false` means the data came from PostgreSQL. `true` means the database is unreachable and the response comes from `shared-contracts/mock-data` (only when `DEMO_FALLBACK=true`). |
| **Request ID** | Every response carries `X-Request-ID`, and the same ID appears in error bodies and the audit log. Send your own `X-Request-ID` header to trace a request. |
| **Timing** | Every response carries `X-Process-Time-Ms`. |
| **CORS** | Origins come from `CORS_ORIGINS` (default `http://localhost:3000,http://localhost:5173`). |

### Errors

| Status | When | Body |
| --- | --- | --- |
| `404` | Unknown id | `{"detail": "Room 'xyz' not found"}` |
| `409` | Duplicate create | `{"detail": "Sensor 'X' already exists"}` |
| `422` | Invalid parameter or body (bad enum, malformed UUID, …) | FastAPI validation `{"detail": [...]}` |
| `503` | Database unreachable: writes always; reads only when `DEMO_FALLBACK=false` | `{"error": "Database unavailable", "detail": "...", "timestamp": "...", "request_id": "..."}`, plus a `Retry-After: 5` header |
| `500` | Unexpected server error | `{"error": "Internal server error", "message": "..." (only when DEBUG), "timestamp", "request_id"}` |

The frontend's `services/api.js` already reads `detail || error`.

---

## Endpoint summary

| Method | Path | Domain | Notes |
| --- | --- | --- | --- |
| GET | `/health` | System | Status of every component |
| GET | `/health/db` | System | Row counts, pool, migrations |
| GET | `/health/live` | System | Liveness probe |
| GET | `/health/ready` | System | Readiness probe: 503 until the DB is reachable |
| GET | `/sensors` | Member 1 | Filters: `room_id`, `sensor_type`, `status` |
| GET | `/sensors/{sensor_id}` | Member 1 | Includes `latest_reading` |
| GET | `/sensors/{sensor_id}/readings` | Member 1 | `limit` (1–1000, default 100), `from_time`, `to_time` |
| POST | `/sensors` | Member 1 | Register a sensor |
| GET | `/rooms` | Member 2 | All rooms with hazard state |
| GET | `/rooms/{room_id}` | Member 2 | Includes `latest_readings` and `active_events` |
| GET | `/rooms/{room_id}/hazard` | Member 2 | Current hazard detail |
| GET | `/rooms/{room_id}/data-quality` | Member 2 | Sensor freshness counts |
| GET | `/events` | Member 2 | `status` (ACTIVE/RESOLVED/ALL), `room_id`, `limit` |
| GET | `/events/{event_id}` | Member 2 | Includes `notifications` |
| GET | `/notifications` | Member 2 | `status` (ACTIVE/ACKNOWLEDGED/DISMISSED/ALL), `since`, `limit` |
| POST | `/notifications/{id}/acknowledge` | Member 2 | Idempotent |
| GET | `/building` | Member 3 | Graph: nodes, edges, exits |
| POST | `/routes/calculate` | Member 3 | Hazard-aware route |
| GET | `/routes/current` | Member 3 | Latest result, including failures |
| GET | `/routes/{route_id}` | Member 3 | Stored route |
| GET | `/exits` | Member 3 | Exit availability |
| GET | `/alerts` | Dashboard | Events + latest notification; `status`, `severity`, `limit` |
| GET | `/alerts/{event_id}` | Dashboard | |
| GET | `/security/events` | Dashboard | IDS events, `limit` |
| GET | `/system/stats` | Member 4 | DB, WebSocket, API, event-bus statistics |
| GET | `/system/websocket/stats` | Member 4 | Connected clients |
| GET | `/system/logs` | Member 4 | `level`, `component` (prefix), `since`, `limit` |
| GET | `/system/audit` | Member 4 | `min_status`, `endpoint` (prefix), `limit` |
| GET | `/system/migrations` | Member 4 | Applied and pending migrations |
| POST | `/system/events/publish` | Member 4 | **Dev only.** Inject an event |
| WS | `/ws/v1/live` | Member 4 | See `websocket-events.json` |

---

## Health

### `GET /health`
```json
{
  "status": "healthy",
  "timestamp": "2026-10-14T15:23:32.098572+00:00",
  "components": {
    "api":       {"status": "running"},
    "database":  {"status": "connected", "latency_ms": 0.52},
    "websocket": {"status": "running", "connected_clients": 2},
    "event_bus": {"status": "running", "total_published": 41}
  },
  "demo_fallback_active": false,
  "version": "1.0.0"
}
```
`status` is `degraded` when any component is not healthy. For example, if the database is down, `database` becomes `{"status": "unavailable", "error": "..."}`. Other services can add their own component with `monitoring.health.register_health_check("mqtt", fn)`.

### `GET /health/db`
```json
{
  "status": "connected", "database": "pyronav_db", "latency_ms": 0.47,
  "statistics": {"sensors": 8, "sensor_readings": 0, "rooms": 6, "hazard_events": 0,
                 "notifications": 0, "building_nodes": 9, "building_edges": 8,
                 "exits": 3, "route_results": 0},
  "pool": {"initialised": true, "min_connections": 5, "max_connections": 20,
           "last_error": null, "in_use": 0, "idle": 5},
  "migrations_applied": ["001_initial_schema.sql", "002_performance_and_operations.sql"]
}
```
Returns 503 if the database is unreachable. If the database is reachable but not migrated, the response contains `"schema": "not_initialised"`.

---

## Sensors (Member 1)

### `GET /sensors?room_id=icu`
```json
{
  "sensors": [
    {"sensor_id": "CO-ICU-01", "room_id": "icu", "sensor_type": "co", "status": "active",
     "unit_config": {"co": "ppm"}, "last_seen_at": null,
     "created_at": "2026-10-14T15:14:48.153343+00:00"}
  ],
  "total": 1, "demo_data": false
}
```

### `GET /sensors/{sensor_id}`
Returns the sensor fields plus `"latest_reading": {"timestamp", "values", "units", "validation_status"}`, or `null` if the sensor has no readings yet.

### `GET /sensors/{sensor_id}/readings?limit=2&from_time=2026-10-14T10:00:00Z`
```json
{
  "sensor_id": "SMOKE-OT-01",
  "readings": [
    {"message_id": "…", "timestamp": "2026-10-14T10:20:00+00:00", "values": {"smoke": 30},
     "units": {"smoke": "ppm"}, "validation_status": "valid",
     "received_at": "2026-10-14T10:20:00.4+00:00"}
  ],
  "count": 1, "demo_data": false
}
```
Results are newest first. `from_time` is inclusive and `to_time` is exclusive.

### `POST /sensors`
```json
{"sensor_id": "SMOKE-OT-02", "room_id": "operation_theater", "sensor_type": "smoke_heat",
 "unit_config": {"smoke": "ppm", "temperature": "degC"}}
```
Returns `201` with the created sensor. Errors: `409` for a duplicate, `422` for an unknown room or invalid `sensor_type`.

---

## Rooms, events, notifications (Member 2)

### `GET /rooms`
```json
{
  "rooms": [
    {"room_id": "operation_theater", "name": "Operation Theater",
     "map_position": {"x": 400, "y": 150}, "dimensions": {"w": 120, "h": 100},
     "current_hazard_level": "CRITICAL", "data_quality_status": "FRESH",
     "last_updated_at": "2026-10-14T10:30:00+00:00"}
  ],
  "total": 6, "demo_data": false
}
```

### `GET /rooms/{room_id}`
This returns the room fields plus:
```json
{
  "latest_readings": {
    "smoke":       {"value": 85, "unit": "ppm",  "timestamp": "…", "sensor_id": "SMOKE-OT-01", "validation_status": "valid"},
    "temperature": {"value": 55, "unit": "degC", "timestamp": "…", "sensor_id": "SMOKE-OT-01", "validation_status": "valid"}
  },
  "active_events": [{"event_id": "…", "hazard_level": "CRITICAL", "reason_codes": ["SMOKE_THRESHOLD_EXCEEDED"],
                     "source_sensor_ids": ["SMOKE-OT-01"], "detected_at": "…"}]
}
```
`latest_readings` merges the newest value for each measurement across all of the room's sensors.

### `GET /rooms/{room_id}/hazard`
```json
{"room_id": "operation_theater", "hazard_level": "CRITICAL", "event_id": "…",
 "reason_codes": ["SMOKE_THRESHOLD_EXCEEDED"], "source_sensor_ids": ["SMOKE-OT-01"],
 "detected_at": "…", "last_updated_at": "…", "demo_data": false}
```

### `GET /rooms/{room_id}/data-quality`
```json
{"room_id": "operation_theater", "status": "FRESH", "sensor_count": 2,
 "fresh_sensors": 2, "stale_sensors": 0, "never_reported": 0,
 "last_update": "…", "demo_data": false}
```
A sensor counts as fresh if it reported in the last 60 s. `status` is the value the decision engine maintains.

### `GET /events?status=ACTIVE&room_id=…&limit=100`
Returns `{"events": [{event_id, room_id, room_name, hazard_level, reason_codes, source_sensor_ids, detected_at, resolved_at, status}], "total", "demo_data"}`.

### `GET /events/{event_id}`
Returns the event plus a `notifications` array.

### `GET /notifications?status=ACTIVE&since=…`
Returns `{"notifications": [{notification_id, event_id, room_id, room_name, severity, message, created_at, acknowledged_at, status}], "total", "demo_data"}`.

### `POST /notifications/{notification_id}/acknowledge`
Sets `status=ACKNOWLEDGED` and `acknowledged_at`, then broadcasts `notification_acknowledged` over the WebSocket. Repeating the call returns the notification with `"already_acknowledged": true`. An unknown ID returns `404`.

---

## Evacuation (Member 3)

### `GET /building`
```json
{
  "nodes": [{"node_id": "reception", "node_type": "room", "room_id": "reception",
             "position": {"x": 100, "y": 240}, "traversable": true, "metadata": null}],
  "edges": [{"edge_id": "EDGE-01", "from_node_id": "reception", "to_node_id": "corridor_1",
             "cost": 10.0, "bidirectional": true, "traversable": true, "metadata": null}],
  "exits": [{"exit_id": "EXIT-A", "node_id": "EXIT-A", "name": "EXIT A — Main Entrance",
             "position": {"x": 0, "y": 200}, "available": true, "capacity": null}],
  "demo_data": false
}
```

### `POST /routes/calculate`
```json
{"origin_room_id": "emergency_ward", "algorithm": "dijkstra", "target_exit_id": null}
```
`algorithm` is `dijkstra` (minimum cost) or `bfs` (fewest hops). Rooms at `HIGH_RISK` or `CRITICAL` are avoided. `edge_ids` are the IDs from `GET /building` (a bidirectional edge keeps its ID in either direction), so the map can highlight them directly.
```json
{
  "route_id": "6ef34bf2-…", "origin_node_id": "emergency_ward", "exit_id": "EXIT-A",
  "node_ids": ["emergency_ward", "corridor_1", "reception", "EXIT-A"],
  "edge_ids": ["EDGE-03", "EDGE-01", "EDGE-06"],
  "total_cost": 32.0, "algorithm": "dijkstra", "status": "ROUTE_FOUND",
  "calculated_at": "2026-10-14T15:23:50+00:00", "hazard_state_snapshot": [],
  "notes": null, "demo_data": false
}
```
`status` is one of `ROUTE_FOUND`, `NO_VALID_ROUTE`, `NO_AVAILABLE_EXIT` or `INVALID_ORIGIN`. Every calculation is broadcast as `route_updated` with `reason: "manual_request"`. If a room on the route later becomes HIGH_RISK or CRITICAL, the route monitor recalculates automatically and broadcasts `route_updated` with `reason: "hazard_change"`.

### `GET /routes/current`
Returns the latest result, **including failures**: a dashboard should show `NO_VALID_ROUTE` rather than a route that has become unsafe. Before any calculation it returns `{"status": "NO_ROUTE_CALCULATED", "message": "…"}`.

### `GET /routes/{route_id}`
Returns a stored route (`ROUTE_FOUND` results are persisted). An unknown ID returns `404`; a malformed UUID returns `422`.

### `GET /exits`
Returns `{"exits": [...], "demo_data": false}`.

---

## Alerts & security (dashboard)

### `GET /alerts?status=ACTIVE&severity=CRITICAL&limit=50`
Each alert is a hazard event joined with its room and latest notification. Results are sorted by severity, then newest first.
```json
{
  "alerts": [{
    "event_id": "…", "room_id": "operation_theater", "room_name": "Operation Theater",
    "hazard_level": "CRITICAL", "severity": "CRITICAL",
    "message": "Fire detected in Operation Theater",
    "reason_codes": ["SMOKE_THRESHOLD_EXCEEDED"], "source_sensor_ids": ["SMOKE-OT-01"],
    "detected_at": "…", "resolved_at": null, "status": "ACTIVE",
    "notification_id": "…", "notification_status": "ACTIVE", "created_at": "…"
  }],
  "total": 1, "demo_data": false
}
```
If an event has no notification, `message` is generated as `"<LEVEL> hazard detected in <room>"`.

### `GET /security/events?limit=50`
Returns `{"events": [{event_id, category, source, severity, description, metadata, timestamp}], "total", "demo_data"}`.

---

## System (Member 4)

### `GET /system/stats`
```json
{
  "database": {"status": "connected", "sensors": 8, "sensors_active": 8, "rooms": 6,
               "readings_24h": 1520, "active_hazards": 1, "rooms_at_risk": 1,
               "active_notifications": 1, "routes_calculated": 12, "errors_24h": 0,
               "pool": {"in_use": 0, "idle": 5, "...": "..."}},
  "websocket": {"connected_clients": 3, "total_connections": 7, "messages_broadcast": 210},
  "api": {"started_at": "…", "uptime_seconds": 3600, "total_requests": 923,
          "requests_per_minute": 41.0, "client_errors": 2, "server_errors": 0,
          "latency_ms": {"avg": 10.8, "p95": 24.1, "max": 61.9, "samples": 923}},
  "event_bus": {"subscribers": {"…": 1}, "published": {"route_updated": 2}, "total_published": 3,
                "handler_errors": 0, "last_event_at": "…", "loop_bound": true},
  "background_writer": {"queued": 0, "written": 869, "dropped": 0, "failed_batches": 0},
  "timestamp": "…"
}
```
API metrics are per process: with several workers, each one reports its own numbers.

### `GET /system/logs?level=ERROR&component=websocket&since=…&limit=100`
Returns rows from `system_logs` (WARNING and above are persisted) as `{log_id, timestamp, level, component, message, metadata}`. `metadata` includes the traceback for exceptions.

### `GET /system/audit?min_status=400&endpoint=/api/v1/routes&limit=100`
Returns rows from `api_audit_log` as `{audit_id, timestamp, request_id, method, endpoint, query_string, status_code, response_time_ms, client_ip, error_message}`. Health probes and docs pages are not audited.

### `GET /system/migrations`
Returns `{"migrations": [{"filename", "state": "applied|pending|modified-after-apply", "applied_at"}], "pending": []}`.

### `POST /system/events/publish` (development only)
```json
{"event_type": "room_status_changed",
 "data": {"room_id": "corridor_1", "hazard_level": "CRITICAL", "previous_level": "NORMAL"}}
```
This publishes the event exactly as a teammate's service would: every subscriber runs (for example, the route monitor recalculates) and WebSocket clients receive it. Unknown event types return `422`. When `ENABLE_DEV_ENDPOINTS=false` the endpoint returns `404`, and it **must** be disabled in production.
