"""
HTTP middleware (pure ASGI — WebSocket traffic passes straight through).

For every HTTP request:
  * assigns a request id (honours an incoming X-Request-ID) → request.state.request_id
  * adds X-Request-ID and X-Process-Time-Ms response headers
  * records metrics for GET /api/v1/system/stats
  * queues a row for the api_audit_log table (never blocks the response)
"""
import time
import uuid

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from monitoring.metrics import RequestMetrics

AUDIT_INSERT_SQL = (
    "INSERT INTO api_audit_log "
    "(endpoint, method, status_code, response_time_ms, error_message, "
    " request_id, client_ip, query_string) "
    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
)

# Probes and docs would only flood the audit table
AUDIT_SKIP_PREFIXES = ("/api/v1/health", "/docs", "/redoc", "/openapi.json", "/favicon.ico")


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp, metrics: RequestMetrics, audit_writer=None):
        self.app = app
        self.metrics = metrics
        self.audit_writer = audit_writer

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        incoming = Headers(scope=scope).get("x-request-id", "")
        request_id = incoming[:64] if incoming else uuid.uuid4().hex[:16]
        scope.setdefault("state", {})["request_id"] = request_id
        status_code = 500
        error_message = None

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = MutableHeaders(scope=message)
                headers["X-Request-ID"] = request_id
                headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - start) * 1000:.2f}"
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            error_message = f"{type(exc).__name__}: {exc}"[:1000]
            raise
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            self.metrics.record(status_code, duration_ms)
            path = scope.get("path", "")
            if self.audit_writer is not None and not path.startswith(AUDIT_SKIP_PREFIXES):
                client = scope.get("client")
                self.audit_writer.submit(
                    AUDIT_INSERT_SQL,
                    (
                        path[:200],
                        scope.get("method", "")[:10],
                        status_code,
                        int(round(duration_ms)),
                        error_message,
                        request_id,
                        client[0] if client else None,
                        scope.get("query_string", b"").decode("latin-1")[:1000] or None,
                    ),
                )
