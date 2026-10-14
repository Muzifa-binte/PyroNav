"""
Shared pytest fixtures.

Database tests run in a throw-away schema ("pyronav_test" by default, override
with TEST_DB_SCHEMA) inside the database configured in backend/.env, so they
need no extra privileges and never touch the real tables. They are skipped
automatically when PostgreSQL is unreachable.
"""
import os

# App behaviour for tests — set before the app (and its settings) are imported
os.environ["LOG_DIR"] = ""                  # no log files from test runs
os.environ["WS_HEARTBEAT_SECONDS"] = "0"    # tests that need it enable it
os.environ["AUTO_MIGRATE"] = "false"
os.environ["DEMO_FALLBACK"] = "true"
os.environ["ENABLE_DEV_ENDPOINTS"] = "true"
os.environ["RETENTION_DAYS"] = "0"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from api.config import get_settings  # noqa: E402
from api.main import app  # noqa: E402
from api.routes import evacuation  # noqa: E402
from database.connection import DatabaseUnavailableError, db_manager  # noqa: E402
from database.migrations.migrate import MigrationRunner  # noqa: E402
from database.seed import seed_demo_building  # noqa: E402
from events import event_types as ev  # noqa: E402
from events.event_bus import event_bus  # noqa: E402

TEST_SCHEMA = os.getenv("TEST_DB_SCHEMA", "pyronav_test")
UNREACHABLE = {"host": "127.0.0.1", "port": 1, "connect_timeout": 1}


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def no_database():
    """Point the app at a port where nothing listens → DatabaseUnavailableError."""
    saved = db_manager.current_config()
    db_manager.configure(**UNREACHABLE)
    yield
    db_manager.configure(**saved)


@pytest.fixture
def fallback_disabled():
    settings = get_settings()
    settings.demo_fallback = False
    yield
    settings.demo_fallback = True


@pytest.fixture(scope="session")
def _test_schema():
    saved = db_manager.current_config()
    db_manager.configure(search_path=TEST_SCHEMA)
    try:
        db_manager.execute_write(f"DROP SCHEMA IF EXISTS {TEST_SCHEMA} CASCADE")
    except DatabaseUnavailableError as exc:
        db_manager.configure(**saved)
        pytest.skip(f"PostgreSQL not reachable ({exc}) - database tests skipped")
    db_manager.execute_write(f"CREATE SCHEMA {TEST_SCHEMA}")
    with db_manager.get_connection() as conn:
        MigrationRunner(conn).run()
    seed_demo_building()
    yield
    db_manager.configure(**{**saved, "search_path": TEST_SCHEMA})
    db_manager.execute_write(f"DROP SCHEMA IF EXISTS {TEST_SCHEMA} CASCADE")
    db_manager.configure(**saved)


@pytest.fixture
def database(_test_schema):
    """Migrated + seeded test schema, with runtime tables emptied before each test."""
    saved = db_manager.current_config()
    db_manager.configure(search_path=TEST_SCHEMA)
    db_manager.execute_write(
        "TRUNCATE notifications, hazard_events, sensor_readings, route_results, "
        "system_logs, api_audit_log, websocket_sessions, security_events"
    )
    db_manager.execute_write(
        "UPDATE rooms SET current_hazard_level = 'NORMAL', data_quality_status = 'FRESH'"
    )
    db_manager.execute_write("UPDATE sensors SET last_seen_at = NULL, status = 'active'")
    yield db_manager
    db_manager.configure(**saved)


@pytest.fixture(autouse=True)
def _reset_route_state():
    """The route monitor is a per-process singleton; isolate it between tests."""
    yield
    if evacuation._monitor is not None:
        event_bus.unsubscribe(ev.ROOM_STATUS_CHANGED, evacuation._monitor.on_room_hazard_changed)
    evacuation._monitor = None
    evacuation._fallback_route = None
