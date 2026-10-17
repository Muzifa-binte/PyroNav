"""
Member 2's decision engine as wired into the API by Member 4:
threshold evaluation (unit) and the room-state / hazard-event lifecycle
against the isolated test schema (database).

Run: pytest tests/test_decision_engine.py -v
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from decision_engine.evaluator import ThresholdEvaluator
from decision_engine.processor import DecisionEngineProcessor
from decision_engine.room_state_manager import RoomStateManager
from events import event_types as ev
from events.event_bus import event_bus


def _reading(sensor_type, values, rated=None):
    return {"sensor_id": "S-1", "room_id": "r", "sensor_type": sensor_type,
            "timestamp": datetime.now(timezone.utc), "values": values, "units": {},
            "rated_current_a": rated}


@pytest.fixture(scope="module")
def evaluator():
    return ThresholdEvaluator()


@pytest.mark.parametrize("current, rated, expected", [
    (18, 32, "NORMAL"),      # ICU life-support circuit at its baseline
    (26, 32, "WARNING"),     # >= 80 % of the rating
    (32, 32, "HIGH_RISK"),   # at the rating: overload
    (35, 63, "NORMAL"),      # X-ray generator feed at its baseline
    (16, None, "WARNING"),   # no rating: fixed 15 A fallback
])
def test_current_thresholds_scale_with_rated_current(evaluator, current, rated, expected):
    level, _, _ = evaluator.determine_room_hazard_level(
        [_reading("current", {"current": current}, rated)])
    assert level == expected


def test_co_rules_read_the_contract_field_name(evaluator):
    level, codes, _ = evaluator.determine_room_hazard_level([_reading("co", {"co": 150})])
    assert level == "HIGH_RISK"
    assert codes == ["CO_WARNING", "CO_HIGH_RISK"]


def test_naive_database_timestamps_are_treated_as_utc(evaluator):
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # as psycopg2 returns TIMESTAMP
    assert evaluator.is_reading_stale(now) is False
    assert evaluator.is_reading_stale(now - timedelta(minutes=5)) is True


# ---------------------------------------------------------------------------
# Against the database
# ---------------------------------------------------------------------------

def _insert(db, sensor_id, room_id, values, age_seconds=0):
    at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=age_seconds)
    db.execute_write(
        'INSERT INTO sensor_readings (message_id, sensor_id, room_id, "timestamp", "values", units) '
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (str(uuid.uuid4()), sensor_id, room_id, at, values, {}),
    )


def _active_levels(db, room_id):
    rows = db.fetch_all(
        "SELECT hazard_level FROM hazard_events WHERE room_id = %s AND status = 'ACTIVE'", (room_id,))
    return [r["hazard_level"] for r in rows]


@pytest.mark.database
def test_escalation_supersedes_events_and_recovery_resolves_them(database):
    manager = RoomStateManager()

    _insert(database, "SMOKE-ICU-01", "icu", {"smoke": 60, "temperature": 22})
    warning = manager.update_room_state("icu")
    assert (warning["old_hazard_level"], warning["new_hazard_level"]) == ("NORMAL", "WARNING")
    assert warning["event_created"] is True

    _insert(database, "SMOKE-ICU-01", "icu", {"smoke": 120, "temperature": 80})
    critical = manager.update_room_state("icu")
    assert critical["new_hazard_level"] == "CRITICAL" and critical["event_created"] is True
    assert [str(e["event_id"]) for e in critical["resolved_events"]] == [warning["event_id"]]
    assert _active_levels(database, "icu") == ["CRITICAL"]
    assert database.fetch_value("SELECT count(*) FROM notifications WHERE room_id = 'icu'") == 2

    _insert(database, "SMOKE-ICU-01", "icu", {"smoke": 3, "temperature": 22})
    normal = manager.update_room_state("icu")
    assert normal["new_hazard_level"] == "NORMAL"
    assert [str(e["event_id"]) for e in normal["resolved_events"]] == [critical["event_id"]]
    assert _active_levels(database, "icu") == []
    assert database.fetch_value(
        "SELECT current_hazard_level FROM rooms WHERE room_id = 'icu'") == "NORMAL"


@pytest.mark.database
def test_processor_publishes_contract_events(database):
    received = []

    def handler(event):
        received.append((event.event_type, event.data))

    names = (ev.ROOM_STATUS_CHANGED, ev.HAZARD_EVENT_CREATED, ev.NOTIFICATION_CREATED)
    for name in names:
        event_bus.subscribe(name, handler)
    try:
        processor = DecisionEngineProcessor(poll_interval=0.1)
        processor.last_processed_timestamp = datetime.now(timezone.utc) - timedelta(seconds=5)
        _insert(database, "SMOKE-OT-01", "operation_theater", {"smoke": 120, "temperature": 30})
        assert processor._process_new_readings() == {"operation_theater"}
    finally:
        for name in names:
            event_bus.unsubscribe(name, handler)

    assert [kind for kind, _ in received] == list(names)
    room, hazard, notification = (data for _, data in received)
    assert (room["room_id"], room["hazard_level"], room["previous_level"]) == (
        "operation_theater", "CRITICAL", "NORMAL")
    assert hazard["hazard_level"] == "CRITICAL" and hazard["detected_at"] is not None
    assert notification["event_id"] == hazard["event_id"]
    assert "elevated smoke" in notification["message"]


@pytest.mark.database
def test_room_without_recent_readings_becomes_unknown(database):
    _insert(database, "SMOKE-PH-01", "pharmacy", {"smoke": 3, "temperature": 22}, age_seconds=600)
    result = RoomStateManager().update_room_state("pharmacy")
    assert (result["old_hazard_level"], result["new_hazard_level"]) == ("NORMAL", "UNKNOWN")


@pytest.mark.database
def test_silent_sensors_never_lower_an_active_hazard(database):
    manager = RoomStateManager()
    _insert(database, "SMOKE-ER-01", "emergency_ward", {"smoke": 120, "temperature": 80})
    assert manager.update_room_state("emergency_ward")["new_hazard_level"] == "CRITICAL"

    # The detector goes quiet: its last (critical) reading is now 10 minutes old
    database.execute_write(
        'UPDATE sensor_readings SET "timestamp" = "timestamp" - interval \'10 minutes\' '
        "WHERE sensor_id = 'SMOKE-ER-01'")
    latched = manager.update_room_state("emergency_ward")
    assert latched["new_hazard_level"] == "CRITICAL" and latched["changed"] is False
    assert _active_levels(database, "emergency_ward") == ["CRITICAL"]
