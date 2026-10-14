"""
Fixed building used by the database integration tests.

Deliberately independent of /shared-contracts/mock-data: teammates own the demo
hospital there and will keep changing it, so integration tests that depend on
specific rooms, routes or counts use this small layout instead.
(The demo data itself is checked by test_demo_data_contract.py.)

          EXIT-A ◄── reception ── corridor_1 ── operation_theater ── icu ──► EXIT-B
                                  │       │
                            pharmacy     emergency_ward ──► EXIT-C (unavailable)
"""


def _room(room_id, name, x, y):
    return {"room_id": room_id, "name": name, "map_position": {"x": x, "y": y},
            "dimensions": {"w": 100, "h": 80}}


def _node(node_id, node_type, x, y, room=True):
    return {"node_id": node_id, "node_type": node_type,
            "room_id": node_id if room else None, "position": {"x": x, "y": y}}


def _edge(edge_id, a, b, cost, bidirectional=True):
    return {"edge_id": edge_id, "from_node": a, "to_node": b, "cost": cost,
            "bidirectional": bidirectional}


def _sensor(sensor_id, room_id, sensor_type):
    units = {"smoke_heat": {"smoke": "ppm", "temperature": "degC"},
             "co": {"co": "ppm"}, "current": {"current": "A"}}[sensor_type]
    return {"sensor_id": sensor_id, "room_id": room_id, "sensor_type": sensor_type,
            "unit_config": units}


TEST_BUILDING = {
    "rooms": [
        _room("reception", "Reception", 50, 200),
        _room("corridor_1", "Main Corridor", 200, 200),
        _room("operation_theater", "Operation Theater", 400, 150),
        _room("emergency_ward", "Emergency Ward", 400, 300),
        _room("pharmacy", "Pharmacy", 200, 320),
        _room("icu", "ICU", 580, 150),
    ],
    "nodes": [
        _node("reception", "room", 100, 240),
        _node("corridor_1", "junction", 275, 220),
        _node("operation_theater", "room", 460, 200),
        _node("emergency_ward", "room", 460, 350),
        _node("pharmacy", "room", 250, 360),
        _node("icu", "room", 630, 190),
        _node("EXIT-A", "exit", 0, 240, room=False),
        _node("EXIT-B", "exit", 730, 190, room=False),
        _node("EXIT-C", "exit", 730, 350, room=False),
    ],
    "edges": [
        _edge("EDGE-01", "reception", "corridor_1", 10.0),
        _edge("EDGE-02", "corridor_1", "operation_theater", 10.0),
        _edge("EDGE-03", "corridor_1", "emergency_ward", 12.0),
        _edge("EDGE-04", "corridor_1", "pharmacy", 8.0),
        _edge("EDGE-05", "operation_theater", "icu", 10.0),
        _edge("EDGE-06", "reception", "EXIT-A", 10.0, bidirectional=False),
        _edge("EDGE-07", "icu", "EXIT-B", 5.0, bidirectional=False),
        _edge("EDGE-08", "emergency_ward", "EXIT-C", 5.0, bidirectional=False),
    ],
    "exits": [
        {"exit_id": "EXIT-A", "node_id": "EXIT-A", "name": "EXIT A", "available": True},
        {"exit_id": "EXIT-B", "node_id": "EXIT-B", "name": "EXIT B", "available": True},
        {"exit_id": "EXIT-C", "node_id": "EXIT-C", "name": "EXIT C", "available": False},
    ],
    "sensors": [
        _sensor("SMOKE-REC-01", "reception", "smoke_heat"),
        _sensor("CO-CORR-01", "corridor_1", "co"),
        _sensor("SMOKE-OT-01", "operation_theater", "smoke_heat"),
        _sensor("CUR-OT-01", "operation_theater", "current"),
        _sensor("SMOKE-ER-01", "emergency_ward", "smoke_heat"),
        _sensor("SMOKE-PH-01", "pharmacy", "smoke_heat"),
        _sensor("SMOKE-ICU-01", "icu", "smoke_heat"),
        _sensor("CO-ICU-01", "icu", "co"),
    ],
}
