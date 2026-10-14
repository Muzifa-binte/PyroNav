"""
Tests for serialisation and retry helpers.
Run: pytest tests/test_utils.py -v
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from utils.retry import retry
from utils.serialization import to_jsonable


def test_naive_datetime_is_serialised_as_utc():
    # DB TIMESTAMP columns hold UTC but come back naive; JS must not read them as local time
    assert to_jsonable(datetime(2026, 10, 14, 10, 0)) == "2026-10-14T10:00:00+00:00"


def test_aware_datetime_keeps_its_offset():
    assert to_jsonable(datetime(2026, 1, 1, tzinfo=timezone.utc)).endswith("+00:00")


def test_nested_values_are_converted():
    uid = uuid.uuid4()
    result = to_jsonable({"id": uid, "cost": Decimal("2.5"), "tags": ("a", "b"), "n": None})
    assert result == {"id": str(uid), "cost": 2.5, "tags": ["a", "b"], "n": None}


def test_infinite_cost_becomes_null():
    assert to_jsonable({"total_cost": float("inf")}) == {"total_cost": None}


def test_retry_succeeds_after_transient_failures():
    calls = []

    @retry(attempts=3, base_delay=0, exceptions=(ConnectionError,))
    def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise ConnectionError("down")
        return "ok"

    assert flaky() == "ok"
    assert len(calls) == 3


def test_retry_reraises_after_last_attempt():
    @retry(attempts=2, base_delay=0, exceptions=(ConnectionError,))
    def always_down():
        raise ConnectionError("down")

    with pytest.raises(ConnectionError):
        always_down()


def test_retry_does_not_catch_other_exceptions():
    calls = []

    @retry(attempts=3, base_delay=0, exceptions=(ConnectionError,))
    def bug():
        calls.append(1)
        raise ValueError("not transient")

    with pytest.raises(ValueError):
        bug()
    assert len(calls) == 1


async def test_retry_supports_async_functions():
    calls = []

    @retry(attempts=2, base_delay=0, exceptions=(ConnectionError,))
    async def flaky():
        calls.append(1)
        if len(calls) == 1:
            raise ConnectionError("down")
        return 42

    assert await flaky() == 42
