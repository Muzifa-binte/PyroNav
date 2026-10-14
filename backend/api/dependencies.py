"""
Shared helpers for route handlers.

DB-backed endpoints are plain ``def`` functions: psycopg2 is blocking, and
FastAPI runs ``def`` endpoints in its thread pool so the event loop (and with it
every WebSocket client) is never blocked by a query.
"""
from typing import Callable, TypeVar

from fastapi import HTTPException

from api.config import get_settings
from database.connection import DatabaseUnavailableError

T = TypeVar("T")


def with_fallback(query: Callable[[], T], fallback: Callable[[], T]) -> T:
    """Run a database query; if PostgreSQL is unreachable and DEMO_FALLBACK is on,
    return ``fallback()`` instead — demo data from /shared-contracts, marked with
    ``demo_data: true`` — so the frontend keeps working.

    With DEMO_FALLBACK off the error propagates and the client gets HTTP 503.
    """
    try:
        return query()
    except DatabaseUnavailableError:
        if get_settings().demo_fallback:
            return fallback()
        raise


def require_dev_endpoints() -> None:
    """Dependency: hide development-only endpoints unless ENABLE_DEV_ENDPOINTS=true."""
    if not get_settings().enable_dev_endpoints:
        raise HTTPException(status_code=404, detail="Not Found")


def not_found(what: str, identifier) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{what} '{identifier}' not found")
