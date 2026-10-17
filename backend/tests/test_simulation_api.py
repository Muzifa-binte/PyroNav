"""
GET /thresholds (the decision engine's rules, for dashboards) and
POST /system/simulate/reading (the Simulation page; the MQTT publish is mocked).

Run: pytest tests/test_simulation_api.py -v
"""
import json

import pytest

from api.routes import system

API = "/api/v1"


def test_thresholds_are_the_decision_engine_rules(client):
    body = client.get(f"{API}/thresholds").json()
    rules = {r["rule_id"]: r for r in body["rules"]}
    assert {"SMOKE_CRITICAL", "CO_HIGH_RISK", "CURRENT_ABNORMAL"} <= set(rules)
    assert rules["CO_HIGH_RISK"]["field"] == "co"
    assert rules["CURRENT_ABNORMAL"]["threshold_ratio_of_rated"] == 0.8
    assert body["stale_data_policy"]["fresh_window_seconds"] == 60


@pytest.mark.database
def test_simulated_reading_uses_the_contract_format(client, database, monkeypatch):
    sent = []
    monkeypatch.setattr(system, "_publish_mqtt",
                        lambda topic, payload: sent.append((topic, json.loads(payload))))

    ok = client.post(f"{API}/system/simulate/reading",
                     json={"sensor_id": "SMOKE-OT-01", "values": {"smoke": 120}})
    assert ok.status_code == 200
    topic, message = sent[0]
    assert topic == "pyronav/v1/sensors/operation_theater/SMOKE-OT-01/reading"
    assert message["message_id"] == ok.json()["message_id"]
    assert message["sensor_type"] == "smoke_heat" and message["values"]["smoke"] == 120
    assert message["units"] == {"smoke": "ppm", "temperature": "degC"}

    bad = client.post(f"{API}/system/simulate/reading",
                      json={"sensor_id": "SMOKE-OT-01", "invalid": True})
    assert bad.json()["invalid"] is True
    assert set(sent[1][1]["values"].values()) == {"not-a-number"}

    assert client.post(f"{API}/system/simulate/reading", json={"sensor_id": "NOPE"}).status_code == 404
