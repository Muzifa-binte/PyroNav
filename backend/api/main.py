"""
PyroNav — FastAPI application entry point.

Start with:
    cd backend
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

Interactive docs:
    http://localhost:8000/docs      (Swagger UI)
    http://localhost:8000/redoc     (ReDoc)
"""
import time
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import health, sensors, rooms, evacuation, system, alerts
from websocket.server import router as ws_router
from websocket.event_broadcaster import broadcaster  # noqa: F401 — registers subscriptions

app = FastAPI(
    title="PyroNav API",
    version="1.0.0",
    description=(
        "PyroNav — Emergency Evacuation & Predictive Fire Safety System.\n\n"
        "**Note:** This is an academic prototype. Values marked `demo_data: true` "
        "are illustrative until the PostgreSQL database is configured."
    ),
)

# ---------------------------------------------------------------------------
# CORS — allow the React dev server and any configured origin
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Middleware: request timing
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    elapsed_ms = round((time.monotonic() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
    return response


# ---------------------------------------------------------------------------
# Global error handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error":     "Internal server error",
            "message":   str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
PREFIX = "/api/v1"

app.include_router(health.router,     prefix=PREFIX, tags=["Health"])
app.include_router(sensors.router,    prefix=PREFIX, tags=["Sensors"])
app.include_router(rooms.router,      prefix=PREFIX, tags=["Rooms & Hazards"])
app.include_router(evacuation.router, prefix=PREFIX, tags=["Evacuation & Routes"])
app.include_router(alerts.router,     prefix=PREFIX, tags=["Alerts & Security"])
app.include_router(system.router,     prefix=PREFIX, tags=["System"])
app.include_router(ws_router)  # WebSocket — no prefix, mounts at /ws/v1/live


# ---------------------------------------------------------------------------
# Lifecycle events
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("  PyroNav API starting…")
    print("  Swagger UI : http://localhost:8000/docs")
    print("  WebSocket  : ws://localhost:8000/ws/v1/live")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    from database.connection import db_manager
    if db_manager:
        db_manager.close()
    print("PyroNav API shut down cleanly.")


# ---------------------------------------------------------------------------
# Run directly (dev only — prefer uvicorn CLI in production)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
