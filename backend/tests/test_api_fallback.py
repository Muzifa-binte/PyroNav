"""
API behaviour while PostgreSQL is unreachable — the resilience scenario.
Run: pytest tests/test_api_fallback.py -v

With DEMO_FALLBACK=true reads are served from /shared-contracts (demo_data: true);
writes, and every request when DEMO_FALLBACK=false, get HTTP 503.
"""
import pytest

API = "/api/v1"

pytestmark = pytest.mark.usefixtures("no_database")


def test_health_reports_degraded(client):
    body = client.get(f"{API}/health").json()
    assert body["status"] == "degraded"
    assert body["components"]["database"]["status"] == "unavailable"
    assert body["components"]["api"]["status"] == "running"
    assert body["demo_fallback_active"] is True


def test_probes(client):
    assert client.get(f"{API}/health/live").status_code == 200
    assert client.get(f"{API}/health/ready").status_code == 503
    assert client.get(f"{API}/health/db").status_code == 503


def test_rooms_served_from_demo_data(client):
    body = client.get(f"{API}/rooms").json()
    assert body["demo_data"] is True
    assert body["total"] == 6
    assert {"room_id", "name", "current_hazard_level", "map_position"} <= set(body["rooms"][0])


def test_unknown_room_is_still_404(client):
    assert client.get(f"{API}/rooms/nowhere").status_code == 404


def test_sensor_filters_apply_to_demo_data(client):
    body = client.get(f"{API}/sensors", params={"room_id": "icu"}).json()
    assert body["demo_data"] is True
    assert {s["sensor_id"] for s in body["sensors"]} == {"SMOKE-ICU-01", "CO-ICU-01"}


def test_building_graph_uses_db_column_names(client):
    body = client.get(f"{API}/building").json()
    assert body["demo_data"] is True
    edge = body["edges"][0]
    assert {"edge_id", "from_node_id", "to_node_id", "cost"} <= set(edge)
    assert len(body["exits"]) == 3


def test_route_calculated_on_demo_graph(client):
    body = client.post(f"{API}/routes/calculate", json={"origin_room_id": "icu"}).json()
    assert body["demo_data"] is True
    assert body["status"] == "ROUTE_FOUND"
    assert body["node_ids"] == ["icu", "EXIT-B"]
    assert body["edge_ids"] == ["EDGE-07"]
    assert body["total_cost"] == 5.0
    assert client.get(f"{API}/routes/current").json()["route_id"] == body["route_id"]


def test_demo_route_edge_ids_match_building_edges(client):
    building_edges = {e["edge_id"] for e in client.get(f"{API}/building").json()["edges"]}
    route = client.post(f"{API}/routes/calculate", json={"origin_room_id": "pharmacy"}).json()
    assert route["status"] == "ROUTE_FOUND"
    assert set(route["edge_ids"]) <= building_edges


def test_bfs_and_invalid_origin_on_demo_graph(client):
    bfs = client.post(f"{API}/routes/calculate",
                      json={"origin_room_id": "pharmacy", "algorithm": "bfs"}).json()
    assert bfs["status"] == "ROUTE_FOUND" and bfs["node_ids"][-1].startswith("EXIT-")
    bad = client.post(f"{API}/routes/calculate", json={"origin_room_id": "nowhere"}).json()
    assert bad["status"] == "INVALID_ORIGIN"


def test_unknown_algorithm_is_rejected(client):
    r = client.post(f"{API}/routes/calculate",
                    json={"origin_room_id": "icu", "algorithm": "astar"})
    assert r.status_code == 422


def test_writes_return_503(client):
    r = client.post(f"{API}/sensors", json={
        "sensor_id": "NEW-01", "room_id": "icu", "sensor_type": "co"})
    assert r.status_code == 503
    assert r.headers["Retry-After"] == "5"
    body = r.json()
    assert body["error"] == "Database unavailable"
    assert body["request_id"] == r.headers["X-Request-ID"]


def test_reads_return_503_when_fallback_disabled(client, fallback_disabled):
    assert client.get(f"{API}/rooms").status_code == 503
    assert client.get(f"{API}/building").status_code == 503


def test_request_id_and_timing_headers(client):
    r = client.get(f"{API}/rooms", headers={"X-Request-ID": "trace-abc"})
    assert r.headers["X-Request-ID"] == "trace-abc"
    assert float(r.headers["X-Process-Time-Ms"]) >= 0
    assert client.get(f"{API}/rooms").headers["X-Request-ID"]  # generated when absent


def test_system_stats_without_database(client):
    body = client.get(f"{API}/system/stats").json()
    assert body["database"]["status"] == "unavailable"
    assert body["api"]["total_requests"] >= 0
    assert "event_bus" in body and "websocket" in body


def test_dev_publish_endpoint(client):
    ok = client.post(f"{API}/system/events/publish",
                     json={"event_type": "room_status_changed",
                           "data": {"room_id": "icu", "hazard_level": "WARNING"}})
    assert ok.status_code == 200 and ok.json()["published"] is True
    bad = client.post(f"{API}/system/events/publish", json={"event_type": "nonsense", "data": {}})
    assert bad.status_code == 422


def test_dev_publish_endpoint_can_be_disabled(client):
    from api.config import get_settings
    settings = get_settings()
    settings.enable_dev_endpoints = False
    try:
        r = client.post(f"{API}/system/events/publish",
                        json={"event_type": "route_updated", "data": {}})
        assert r.status_code == 404
    finally:
        settings.enable_dev_endpoints = True


def test_cors_allows_frontend_origin(client):
    r = client.options(f"{API}/rooms", headers={
        "Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
