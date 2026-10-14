"""
Exception → HTTP response mapping.

  DatabaseUnavailableError  → 503 {"error": "Database unavailable", ...}
  anything unhandled        → 500 {"error": "Internal server error", ...}

HTTPException / validation errors keep FastAPI's default {"detail": ...} shape.
Every error body carries the request_id that is also logged and returned in the
X-Request-ID header, so a frontend report can be matched to the server log.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from database.connection import DatabaseUnavailableError
from utils.serialization import utc_now_iso

logger = logging.getLogger(__name__)


def _request_id(request: Request):
    return getattr(request.state, "request_id", None)


def register_exception_handlers(app: FastAPI, debug: bool) -> None:

    @app.exception_handler(DatabaseUnavailableError)
    async def database_unavailable_handler(request: Request, exc: DatabaseUnavailableError):
        logger.warning("503 for %s %s: database unavailable", request.method, request.url.path)
        return JSONResponse(
            status_code=503,
            headers={"Retry-After": "5"},
            content={
                "error": "Database unavailable",
                "detail": "The database is temporarily unreachable. Please retry shortly.",
                "timestamp": utc_now_iso(),
                "request_id": _request_id(request),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": str(exc) if debug else None,
                "timestamp": utc_now_iso(),
                "request_id": _request_id(request),
            },
        )
