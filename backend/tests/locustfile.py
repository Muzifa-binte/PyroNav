"""
Load test for the PyroNav API.

Run (from backend/, with the API running):
    locust -f tests/locustfile.py --host=http://localhost:8000
Then open http://localhost:8089 and set users / spawn rate. Headless example:
    locust -f tests/locustfile.py --host=http://localhost:8000 --headless -u 50 -r 10 -t 1m

While it runs, watch:
    GET /api/v1/system/stats   — requests_per_minute, latency p95, DB pool in_use
    GET /api/v1/health/db      — connection pool usage
Procedure and targets: docs/TESTING.md
"""
import random

from locust import HttpUser, between, task

ROOMS = ["reception", "corridor_1", "operation_theater", "emergency_ward", "pharmacy", "icu"]
SENSORS = ["SMOKE-REC-01", "CO-CORR-01", "SMOKE-OT-01", "SMOKE-ICU-01"]


class DashboardUser(HttpUser):
    """A dashboard tab: mostly reads, the occasional route request."""
    wait_time = between(1, 3)

    @task(4)
    def rooms(self):
        self.client.get("/api/v1/rooms")

    @task(3)
    def sensors(self):
        self.client.get("/api/v1/sensors")

    @task(2)
    def alerts(self):
        self.client.get("/api/v1/alerts")

    @task(2)
    def current_route(self):
        self.client.get("/api/v1/routes/current")

    @task(2)
    def notifications(self):
        self.client.get("/api/v1/notifications")

    @task(1)
    def room_detail(self):
        self.client.get(f"/api/v1/rooms/{random.choice(ROOMS)}", name="/api/v1/rooms/[room_id]")

    @task(1)
    def sensor_readings(self):
        self.client.get(f"/api/v1/sensors/{random.choice(SENSORS)}/readings?limit=50",
                        name="/api/v1/sensors/[sensor_id]/readings")

    @task(1)
    def building(self):
        self.client.get("/api/v1/building")

    @task(1)
    def calculate_route(self):
        self.client.post(
            "/api/v1/routes/calculate",
            json={"origin_room_id": random.choice(ROOMS),
                  "algorithm": random.choice(["dijkstra", "bfs"])},
        )

    @task(1)
    def health(self):
        self.client.get("/api/v1/health")
