# Testing Guide

## 1. Running the tests

From `backend/`, with the virtualenv active. In Windows PowerShell, no activation is needed: write `.\venv\Scripts\python.exe -m pytest` for `pytest`, and `.\venv\Scripts\python.exe` for `python`.

```bash
pytest                                  # everything
pytest tests/test_websocket.py -v       # one file
pytest -m "not database"                # skip the PostgreSQL tests
pytest --durations=10                   # slowest tests
```

**Database tests** (`-m database`) run against the PostgreSQL configured in `backend/.env`, in a throw-away schema called `pyronav_test`, seeded with the fixed layout in `tests/fixture_building.py`. They never use the demo hospital that teammates edit, so changing `shared-contracts` cannot break them. It is created, migrated and seeded at the start and dropped at the end, so the real tables are never touched and no extra privileges are needed. When PostgreSQL is unreachable these tests are **skipped**, not failed. Check the `-ra` summary for `SKIPPED … PostgreSQL not reachable`.

## 2. What is covered

| File | Scope | Needs DB |
| --- | --- | --- |
| `test_event_bus.py` | Sync/async handlers, wildcard, error isolation, cross-thread publishing (the MQTT-thread case), stats | no |
| `test_websocket.py` | Handshake, ping/pong, broadcast to many clients, subscriptions, heartbeat, datetime/UUID payloads | no |
| `test_integration.py` | **Week 4 scenario:** sensor reading → decision → route → dashboard, in order, published from a worker thread | no |
| `test_api_fallback.py` | **Resilience:** DB down → degraded health, demo data, real routes on the demo graph, 503s, headers, CORS, dev endpoint guard | no |
| `test_services.py` | Background-service registry: start/stop, health reporting, failure isolation | no |
| `test_utils.py` | UTC serialisation, retry with backoff | no |
| `test_demo_data_contract.py` | **Teammates' demo data** (`shared-contracts/mock-data`): unique ids, valid references, non-negative costs, every room can reach an exit, and the building loads into PostgreSQL. Independent of the layout | partly |
| `test_database_integration.py` | Migrations, every domain endpoint on real data, notification acknowledgement over WebSocket, **hazard → automatic route recalculation → broadcast**, audit log, DB logging, sessions, retention, **pool recovery after a killed connection** | yes |
| `test_dijkstra.py`, `test_bfs.py` | Member 3's algorithms | no |

Last full run: **86 passed** with PostgreSQL 16; **68 passed, 18 skipped** without a database (Windows 11, Python 3.14).

### Regression tests for integration bugs fixed in Week 4
| Test | Bug |
| --- | --- |
| `test_publish_sync_inside_loop_schedules_coroutine_handlers` | `publish_sync` never awaited async handlers, so no WebSocket broadcast happened for `route_updated` and other events published from sync code |
| `test_payload_with_datetime_and_uuid_does_not_drop_client` | `json.dumps` failed on DB types, so the client was treated as dead and disconnected |
| `test_hazard_snapshot_is_stored_as_json` | Routes calculated while a room was blocked were never saved (`str(list)` is not valid JSON) |
| `test_route_edge_ids_match_building_edges` | Edges walked in reverse came back as `EDGE-03_rev`, so the map could not highlight them |
| `test_pool_recovers_after_connection_loss` | After a DB restart, dead pooled connections kept failing requests |
| `test_burst_waits_for_free_connection_instead_of_failing` | More concurrent requests than `DB_POOL_MAX` failed instantly (psycopg2 pools do not wait) |

## 3. Manual checks

**Watch live events**, in one or more terminals:
```bash
python tests/test_websocket_client.py
python tests/test_websocket_client.py --events route_updated,room_status_changed
```

**Trigger events** (dev endpoint):
```bash
curl -X POST http://localhost:8000/api/v1/system/events/publish -H "Content-Type: application/json" -d "{\"event_type\":\"room_status_changed\",\"data\":{\"room_id\":\"icu\",\"hazard_level\":\"WARNING\",\"previous_level\":\"NORMAL\"}}"
```

**Resilience by hand:** stop PostgreSQL (`docker compose stop db`), then check that `GET /api/v1/health` reports `degraded` and `GET /api/v1/rooms` returns `demo_data: true`. Start it again (`docker compose start db`). The next request reports `healthy` with real data, and the API needs no restart.

## 4. Load testing

```bash
locust -f tests/locustfile.py --host=http://localhost:8000                    # web UI at :8089
locust -f tests/locustfile.py --host=http://localhost:8000 --headless -u 50 -r 10 -t 40s --only-summary
```
The `DashboardUser` mix is mostly reads (rooms, sensors, alerts, current route, notifications) plus route calculations. While it runs, watch `GET /api/v1/system/stats` (`api.latency_ms`, `requests_per_minute`, `database.pool`).

### Results (2026-10-14)
Setup: 50 users, spawn rate 10/s, 40 s, 1–3 s think time. API (one process), PostgreSQL 16 and Locust all ran on the same Windows 11 laptop. Locust's think time, not the server, limits throughput to about 24 req/s. Each row is a single run.

| `DB_POOL_MIN` | Requests | Failures | Median | p95 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- |
| 1 (old default) | 901 | 0 | 37 ms | 330 ms | 390 ms | 551 ms |
| 10 | 936 | 0 | 17 ms | 45 ms | 82 ms | 90 ms |
| **5 (new default)** | 959 | 0 | **6 ms** | **22 ms** | 250 ms | 279 ms |

**Finding → fix.** psycopg2's pool *closes* every connection above `minconn` when it is returned. With `DB_POOL_MIN=1`, any concurrent request opened a fresh PostgreSQL connection, which is expensive, especially on Windows where each one starts a new server process. Raising the default to 5 cut p95 latency about 15×. Unloaded requests take 3–6 ms.

### Targets
| Metric | Target | Status |
| --- | --- | --- |
| Error rate under 50 users | 0 % | met |
| p95 latency | < 200 ms | met (22 ms) |
| WebSocket broadcast | every connected client, in publish order | met (tests) |
