"""
JSON serialisation helpers shared by the REST API and the WebSocket server.

Why not plain json.dumps / FastAPI's encoder?
  * Database rows contain datetime, UUID and Decimal values that json.dumps rejects.
  * Every TIMESTAMP column holds UTC, but psycopg2 returns it as a *naive* datetime.
    Serialised without an offset, JavaScript's ``new Date("2026-10-14T10:00:00")``
    would read it as *local* time. We always emit an explicit +00:00 offset.
"""
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID


def iso_utc(value: datetime) -> str:
    """ISO-8601 string with an explicit offset; naive datetimes are treated as UTC."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_jsonable(value: Any) -> Any:
    """Recursively convert a value into JSON-safe primitives."""
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        # inf/nan are not valid JSON (e.g. an unreachable route cost)
        return value if value == value and value not in (float("inf"), float("-inf")) else None
    if isinstance(value, datetime):
        return iso_utc(value)
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, Enum):
        return to_jsonable(value.value)
    if isinstance(value, dict):
        return {str(k): to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [to_jsonable(v) for v in value]
    return str(value)
