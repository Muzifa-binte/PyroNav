"""
Load test for PyroNav API.
Install: pip install locust
Run:     locust -f backend/tests/locustfile.py --host=http://localhost:8000
Then open http://localhost:8089 and configure users/spawn rate.
"""
from locust import HttpUser, task, between


class PyroNavUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def get_rooms(self):
        self.client.get("/api/v1/rooms")

    @task(3)
    def get_sensors(self):
        self.client.get("/api/v1/sensors")

    @task(2)
    def get_alerts(self):
        self.client.get("/api/v1/alerts")

    @task(2)
    def health_check(self):
        self.client.get("/api/v1/health")

    @task(1)
    def calculate_route(self):
        self.client.post(
            "/api/v1/routes/calculate",
            json={"origin_room_id": "reception", "algorithm": "dijkstra"},
        )

    @task(1)
    def get_building(self):
        self.client.get("/api/v1/building")
