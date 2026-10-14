"""
API behaviour while PostgreSQL is unreachable — the resilience scenario.
Run: pytest tests/test_api_fallback.py -v

With DEMO_FALLBACK=true reads are served from /shared-contracts (demo_data: true);
writes, and every request when DEMO_FALLBACK=false, get HTTP 503.
"""
import pytest

from database import demo_data

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


def _assert_valid_route(route: dict, building: dict, origin: str) -> None:
    """Layout-independent route check: works for any building teammates design."""
    assert route["status"] == "ROUTE_FOUND", route
    nodes, edge_ids = route["node_ids"], route["edge_ids"]
    available_exits = {e["node_id"] for e in building["exits"] if e.get("available", True)}
    assert nodes[0] == origin
    assert nodes[-1] in available_exits
    assert len(edge_ids) == len(nodes) - 1
    edges = {e["edge_id"]: e for e in building["edges"]}
    for (a, b), edge_id in zip(zip(nodes, nodes[1:]), edge_ids):
        edge = edges[edge_id]  # every reported edge exists in GET /building
        forward = (edge["from_node_id"], edge["to_node_id"]) == (a, b)
        backward = edge.get("bidirectional", True) and (edge["to_node_id"], edge["from_node_id"]) == (a, b)
        assert forward or backward, f"{edge_id} does not connect {a} -> {b}"
    if route["algorithm"] == "dijkstra":
        assert route["total_cost"] == pytest.approx(sum(edges[e]["cost"] for e in edge_ids))


def test_rooms_served_from_demo_data(client):
    body = client.get(f"{API}/rooms").json()
    assert body["demo_data"] is True
    assert body["total"] == len(demo_data.rooms())
    assert {"room_id", "name", "current_hazard_level", "map_position"} <= set(body["rooms"][0])


def test_unknown_room_is_still_404(client):
    assert client.get(f"{API}/rooms/nowhere").status_code == 404


def test_sensor_filters_apply_to_demo_data(client):
    room_id = demo_data.sensors()[0]["room_id"]
    expected = {s["sensor_id"] for s in demo_data.sensors() if s["room_id"] == room_id}
    body = client.get(f"{API}/sensors", params={"room_id": room_id}).json()
    assert body["demo_data"] is True
    assert {s["sensor_id"] for s in body["sensors"]} == expected


def test_building_graph_has_both_edge_key_styles(client):
    body = client.get(f"{API}/building").json()
    assert body["demo_data"] is True
    edge = body["edges"][0]
    assert {"edge_id", "from_node_id", "to_node_id", "from_node", "to_node", "cost"} <= set(edge)
    assert len(body["exits"]) == len(demo_data.exits())


def test_every_demo_room_gets_a_valid_route(client):
    """Real Dijkstra on the demo graph, checked structurally for every room
    that has a path to an available exit."""
    building = client.get(f"{API}/building").json()
    rooms = [n["node_id"] for n in building["nodes"] if n["node_type"] != "exit"]
    found = 0
    for origin in rooms:
        route = client.post(f"{API}/routes/calculate", json={"origin_room_id": origin}).json()
        assert route["demo_data"] is True
        if route["status"] == "ROUTE_FOUND":
            _assert_valid_route(route, building, origin)
            found += 1
        else:
            assert route["status"] == "NO_VALID_ROUTE"
    assert found > 0
    assert client.get(f"{API}/routes/current").json()["route_id"] == route["route_id"]


def test_bfs_and_invalid_origin_on_demo_graph(client):
    building = client.get(f"{API}/building").json()
    origin = next(n["node_id"] for n in building["nodes"] if n["node_type"] == "room")
    bfs = client.post(f"{API}/routes/calculate",
                      json={"origin_room_id": origin, "algorithm": "bfs"}).json()
    if bfs["status"] == "ROUTE_FOUND":
        _assert_valid_route(bfs, building, origin)
    bad = client.post(f"{API}/routes/calculate", json={"origin_room_id": "nowhere"}).json()
    assert bad["status"] == "INVALID_ORIGIN"


def test_unknown_algorithm_is_rejected(client):
    r = client.post(f"{API}/routes/calculate",
                    json={"origin_room_id": demo_data.rooms()[0]["room_id"], "algorithm": "astar"})
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
