"""
Validation of MQTT sensor messages against shared-contracts/sensor-message-schema.json.

    result = validate_message(topic, payload, registry=sensors_by_id)
    result.status   → "valid" | "invalid" | "stale" | "rejected"
    result.reading  → normalised reading (None when the payload could not be parsed)
    result.errors   → human-readable reasons

* rejected — not storable: not JSON, schema violation, or a sensor that is not
  registered (sensor_readings.sensor_id has a foreign key to sensors)
* invalid  — storable for auditing, never forwarded: topic/payload mismatch,
  wrong room or type for the sensor, missing or implausible values
* stale    — storable, never forwarded: timestamp too old or in the future
* valid    — stored and forwarded to the Decision Engine

No MQTT or database imports here, so it is unit-testable on its own.
"""
import json
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Mapping, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

TOPIC_RE = re.compile(r"^pyronav/v1/sensors/(?P<room_id>[^/]+)/(?P<sensor_id>[^/]+)/reading$")

# Measurement names per sensor_type (hazard-levels.json → sensor_type)
SENSOR_FIELDS = {
    "smoke_heat": ("smoke", "temperature"),
    "co": ("co",),
    "current": ("current",),
}
DEFAULT_UNITS = {"smoke": "ppm", "temperature": "degC", "co": "ppm", "current": "A"}
# Physically plausible ranges; outside → sensor fault, not a fire
PLAUSIBLE_RANGES = {
    "smoke": (0.0, 10000.0),
    "temperature": (-40.0, 1200.0),
    "co": (0.0, 10000.0),
    "current": (0.0, 2000.0),
}
FUTURE_TOLERANCE = timedelta(seconds=60)

VALID, INVALID, STALE, REJECTED = "valid", "invalid", "stale", "rejected"
UNKNOWN_SENSOR = "UNKNOWN_SENSOR"


class SensorReadingMessage(BaseModel):
    """Wire format. Extra fields (building_id, floor_id, schema_version, …) are kept."""

    model_config = ConfigDict(extra="allow", str_strip_whitespace=True)

    message_id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    sensor_id: str = Field(min_length=1, max_length=50)
    room_id: str = Field(min_length=1, max_length=50)
    sensor_type: Literal["smoke_heat", "co", "current"]
    timestamp: datetime
    values: Dict[str, float] = Field(min_length=1)
    units: Dict[str, str] = Field(default_factory=dict)
    source: Optional[str] = Field(default=None, max_length=100)
    trigger: Optional[str] = Field(default=None, max_length=50)

    @field_validator("values", mode="before")
    @classmethod
    def _numbers_only(cls, values: Any) -> Any:
        if isinstance(values, dict):
            for name, value in values.items():
                if isinstance(value, bool) or not isinstance(value, (int, float)):
                    raise ValueError(f"values.{name} must be a number, got {value!r}")
                if not math.isfinite(value):
                    raise ValueError(f"values.{name} must be finite")
        return values


@dataclass(frozen=True)
class RegisteredSensor:
    sensor_id: str
    room_id: str
    sensor_type: str


@dataclass
class ValidationResult:
    status: str
    reading: Optional[Dict[str, Any]] = None
    errors: List[str] = field(default_factory=list)
    code: Optional[str] = None

    @property
    def storable(self) -> bool:
        return self.reading is not None and self.status != REJECTED


def _as_utc(ts: datetime) -> datetime:
    return ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts.astimezone(timezone.utc)


def _parse(payload: Union[bytes, str, dict]) -> dict:
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, bytes):
        payload = payload.decode("utf-8")
    data = json.loads(payload)
    if not isinstance(data, dict):
        raise ValueError("payload must be a JSON object")
    return data


def validate_message(
    topic: Optional[str],
    payload: Union[bytes, str, dict],
    registry: Optional[Mapping[str, RegisteredSensor]] = None,
    now: Optional[datetime] = None,
    max_age_seconds: int = 300,
) -> ValidationResult:
    # 1. JSON + schema ---------------------------------------------------------
    try:
        message = SensorReadingMessage.model_validate(_parse(payload))
    except (ValueError, UnicodeDecodeError) as exc:  # json / decode errors
        if isinstance(exc, ValidationError):
            errors = [f"{'.'.join(str(p) for p in e['loc']) or 'payload'}: {e['msg']}" for e in exc.errors()]
            return ValidationResult(REJECTED, errors=errors, code="SCHEMA")
        return ValidationResult(REJECTED, errors=[f"not a JSON object: {exc}"], code="NOT_JSON")

    ts = _as_utc(message.timestamp)
    extra = dict(message.model_extra or {})
    reading = {
        "message_id": message.message_id or f"{message.sensor_id}-{ts.isoformat()}"[:100],
        "sensor_id": message.sensor_id,
        "room_id": message.room_id,
        "sensor_type": message.sensor_type,
        "timestamp": ts,
        "values": dict(message.values),
        "units": {**{k: DEFAULT_UNITS[k] for k in message.values if k in DEFAULT_UNITS}, **message.units},
        "source": message.source,
        "trigger": message.trigger,
        "extra": extra,
    }

    # 2. Registry: the sensor must exist (FK) and belong to this room ---------
    errors: List[str] = []
    if registry is not None:
        registered = registry.get(message.sensor_id)
        if registered is None:
            return ValidationResult(
                REJECTED, reading,
                [f"sensor '{message.sensor_id}' is not registered "
                 "(run: python -m sensor_ingestion.registry)"],
                code=UNKNOWN_SENSOR,
            )
        if registered.room_id != message.room_id:
            errors.append(f"sensor '{message.sensor_id}' belongs to room '{registered.room_id}', "
                          f"not '{message.room_id}'")
        if registered.sensor_type != message.sensor_type:
            errors.append(f"sensor '{message.sensor_id}' is a {registered.sensor_type} sensor, "
                          f"message says {message.sensor_type}")

    # 3. Topic must match the payload -----------------------------------------
    match = TOPIC_RE.match(topic or "")
    if topic and match:
        if match["room_id"] != message.room_id or match["sensor_id"] != message.sensor_id:
            errors.append(f"topic {topic} does not match room_id/sensor_id in the payload")
    elif topic:
        errors.append(f"unexpected topic {topic}")

    # 4. Measurements ----------------------------------------------------------
    expected = SENSOR_FIELDS[message.sensor_type]
    if not any(name in message.values for name in expected):
        errors.append(f"{message.sensor_type} reading needs at least one of {', '.join(expected)}")
    for name, value in message.values.items():
        low, high = PLAUSIBLE_RANGES.get(name, (-math.inf, math.inf))
        if not low <= value <= high:
            errors.append(f"values.{name}={value} outside plausible range [{low:g}, {high:g}]")

    if errors:
        return ValidationResult(INVALID, reading, errors, code="SEMANTIC")

    # 5. Freshness --------------------------------------------------------------
    now = now or datetime.now(timezone.utc)
    if ts > now + FUTURE_TOLERANCE:
        return ValidationResult(STALE, reading, [f"timestamp {ts.isoformat()} is in the future"], code="CLOCK")
    if now - ts > timedelta(seconds=max_age_seconds):
        return ValidationResult(STALE, reading, [f"timestamp {ts.isoformat()} older than {max_age_seconds}s"],
                                code="STALE")

    return ValidationResult(VALID, reading)
