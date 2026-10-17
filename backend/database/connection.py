"""
Database connection manager with psycopg2 connection pooling.

Design goals
------------
* **Lazy** — the pool is created on first use, so the API can start while
  PostgreSQL is down and recovers on its own once the database comes back.
* **Thread-safe** — uses ThreadedConnectionPool. FastAPI runs sync endpoints in
  a thread pool, and the MQTT / decision-engine workers run in their own threads.
* **Self-healing** — when a connection is lost (e.g. the DB restarted) the whole
  pool is discarded, so stale connections are never handed out again.
* **Explicit failure** — every connectivity problem surfaces as
  ``DatabaseUnavailableError``, which the API maps to HTTP 503.

Usage
-----
    from database.connection import db_manager

    rows = db_manager.fetch_all("SELECT * FROM rooms WHERE room_id = %s", (room_id,))
    db_manager.execute_write("UPDATE rooms SET ... WHERE room_id = %s", (room_id,))

    with db_manager.get_connection() as conn:        # multi-statement transaction
        with conn.cursor() as cur:
            ...
"""
import logging
import threading
import time
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional, Sequence

import psycopg2
import psycopg2.extensions
from psycopg2.extras import Json, RealDictCursor
from psycopg2.pool import PoolError, ThreadedConnectionPool

from database.config import (
    DB_CONNECT_TIMEOUT, DB_HOST, DB_NAME, DB_PASSWORD, DB_POOL_MAX, DB_POOL_MIN,
    DB_PORT, DB_USER,
)

logger = logging.getLogger(__name__)

# Allow plain dicts as parameters for JSONB columns:
#   db_manager.execute_write("INSERT INTO t (meta) VALUES (%s)", ({"a": 1},))
psycopg2.extensions.register_adapter(dict, Json)


class DatabaseUnavailableError(RuntimeError):
    """PostgreSQL cannot be reached. The API turns this into HTTP 503."""


def _describe(exc: Exception) -> str:
    """psycopg2 messages span several tab-indented lines; collapse to one."""
    return " ".join(str(exc).split()) or exc.__class__.__name__


class DatabaseManager:
    # After a failed connection attempt, fail fast for this long instead of
    # making every request wait for a connect timeout.
    RETRY_COOLDOWN_SECONDS = 2.0
    # How long a caller waits for a free connection when all are in use
    POOL_WAIT_SECONDS = 10.0

    def __init__(self, host, port, database, user, password,
                 minconn=1, maxconn=20, connect_timeout=3, search_path=None):
        self._params: Dict[str, Any] = dict(
            host=host, port=port, database=database, user=user, password=password,
        )
        self._minconn = minconn
        self._maxconn = maxconn
        self._connect_timeout = connect_timeout
        self._search_path: Optional[str] = search_path
        self._slots = threading.BoundedSemaphore(maxconn)
        self._pool: Optional[ThreadedConnectionPool] = None
        self._lock = threading.Lock()
        self._last_failure_at = 0.0
        self._last_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Pool lifecycle
    # ------------------------------------------------------------------

    def configure(self, **params) -> None:
        """Change connection settings (host, port, database, search_path, …) at
        runtime. Closes the current pool; the next query reconnects with them."""
        for key in ("minconn", "maxconn", "connect_timeout", "search_path"):
            if key in params:
                setattr(self, f"_{key}", params.pop(key))
        self._params.update(params)
        self._slots = threading.BoundedSemaphore(self._maxconn)
        self.close()
        self._last_failure_at = 0.0
        self._last_error = None

    def current_config(self) -> Dict[str, Any]:
        """Settings accepted by configure() — handy to save and restore (tests)."""
        return {**self._params, "minconn": self._minconn, "maxconn": self._maxconn,
                "connect_timeout": self._connect_timeout, "search_path": self._search_path}

    @property
    def database_name(self) -> str:
        return self._params["database"]

    def _session_options(self) -> str:
        # Store and return every TIMESTAMP value as UTC wall-clock time
        options = "-c timezone=UTC"
        if self._search_path:
            options += f" -c search_path={self._search_path}"
        return options

    def _ensure_pool(self) -> ThreadedConnectionPool:
        pool = self._pool
        if pool is not None:
            return pool
        with self._lock:
            if self._pool is not None:
                return self._pool
            if time.monotonic() - self._last_failure_at < self.RETRY_COOLDOWN_SECONDS:
                raise DatabaseUnavailableError(self._last_error or "Database unavailable")
            try:
                self._pool = ThreadedConnectionPool(
                    self._minconn,
                    self._maxconn,
                    connect_timeout=self._connect_timeout,
                    options=self._session_options(),
                    application_name="pyronav-backend",
                    **self._params,
                )
            except psycopg2.Error as exc:
                self._last_failure_at = time.monotonic()
                self._last_error = _describe(exc)
                logger.warning("Database unavailable: %s", self._last_error)
                raise DatabaseUnavailableError(self._last_error) from exc
            self._last_error = None
            logger.info(
                "Database pool ready (%s@%s:%s/%s)",
                self._params["user"], self._params["host"],
                self._params["port"], self._params["database"],
            )
            return self._pool

    def _discard_pool(self, pool: ThreadedConnectionPool, reason: Exception) -> None:
        """Drop every pooled connection after a connection-level failure."""
        with self._lock:
            if self._pool is pool:
                self._pool = None
                self._last_error = _describe(reason)
                logger.warning("Database connection lost - pool reset: %s", self._last_error)
                try:
                    pool.closeall()
                except Exception:
                    pass

    def close(self) -> None:
        with self._lock:
            pool, self._pool = self._pool, None
        if pool is not None:
            try:
                pool.closeall()
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Connections
    # ------------------------------------------------------------------

    @contextmanager
    def get_connection(self):
        """Yield a pooled connection; commit on success, roll back on error.

        When all DB_POOL_MAX connections are busy the caller waits (up to
        POOL_WAIT_SECONDS) instead of failing — psycopg2's pool alone would raise
        immediately and turn a burst of traffic into 503s. Do not request a second
        connection while holding one in the same thread."""
        slots = self._slots  # keep a reference: configure() may swap it
        if not slots.acquire(timeout=self.POOL_WAIT_SECONDS):
            raise DatabaseUnavailableError("Timed out waiting for a free database connection")
        try:
            pool = self._ensure_pool()
            try:
                conn = pool.getconn()
            except PoolError as exc:
                # Closed by a concurrent pool reset
                raise DatabaseUnavailableError(f"Connection pool error: {exc}") from exc
            except psycopg2.Error as exc:
                self._discard_pool(pool, exc)
                raise DatabaseUnavailableError(_describe(exc)) from exc

            lost = False
            try:
                yield conn
                conn.commit()
            except Exception as exc:
                if conn.closed:
                    lost = True
                else:
                    try:
                        conn.rollback()
                    except psycopg2.Error:
                        lost = True
                if lost:
                    self._discard_pool(pool, exc)
                    if isinstance(exc, psycopg2.Error):
                        raise DatabaseUnavailableError(_describe(exc)) from exc
                raise
            finally:
                try:
                    pool.putconn(conn, close=lost or bool(conn.closed))
                except PoolError:
                    # Pool was closed underneath us — just close the connection
                    try:
                        conn.close()
                    except Exception:
                        pass
        finally:
            slots.release()

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def execute_query(self, query: str, params: Optional[Sequence] = None) -> List[tuple]:
        """Execute a statement and return all rows as tuples ([] if it returns none)."""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.fetchall() if cursor.description else []

    def execute_write(self, query: str, params: Optional[Sequence] = None) -> int:
        """Execute an INSERT/UPDATE/DELETE and return the affected row count."""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.rowcount

    def execute(self, query: str, params: Optional[Sequence] = None) -> int:
        """Alias of execute_write (used by the decision engine)."""
        return self.execute_write(query, params)

    def execute_many(self, query: str, param_list: Iterable[Sequence]) -> None:
        """Execute the same statement for many parameter sets in one transaction."""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.executemany(query, list(param_list))

    def fetch_all(self, query: str, params: Optional[Sequence] = None) -> List[Dict[str, Any]]:
        """Execute a statement and return rows as dicts keyed by column name."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                return [dict(r) for r in cursor.fetchall()] if cursor.description else []

    def fetch_one(self, query: str, params: Optional[Sequence] = None) -> Optional[Dict[str, Any]]:
        """Execute a statement and return the first row as a dict (or None).
        Also works for INSERT/UPDATE … RETURNING."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                row = cursor.fetchone() if cursor.description else None
                return dict(row) if row else None

    def fetch_value(self, query: str, params: Optional[Sequence] = None) -> Any:
        """Return the first column of the first row (e.g. COUNT(*))."""
        rows = self.execute_query(query, params)
        return rows[0][0] if rows else None

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    def ping(self) -> float:
        """Round-trip a trivial query. Returns latency in ms; raises if unavailable."""
        start = time.perf_counter()
        self.execute_query("SELECT 1")
        return round((time.perf_counter() - start) * 1000, 2)

    def is_available(self) -> bool:
        try:
            self.ping()
            return True
        except DatabaseUnavailableError:
            return False

    def pool_status(self) -> Dict[str, Any]:
        pool = self._pool
        status: Dict[str, Any] = {
            "initialised": pool is not None,
            "min_connections": self._minconn,
            "max_connections": self._maxconn,
            "last_error": self._last_error,
        }
        if pool is not None:
            # psycopg2 keeps these as private attributes; best effort only
            status["in_use"] = len(getattr(pool, "_used", {}))
            status["idle"] = len(getattr(pool, "_pool", []))
        return status


# ---------------------------------------------------------------------------
# Singleton — import this everywhere instead of creating new instances.
# Creating it never touches the network; the first query opens the pool.
# ---------------------------------------------------------------------------
db_manager = DatabaseManager(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    minconn=DB_POOL_MIN,
    maxconn=DB_POOL_MAX,
    connect_timeout=DB_CONNECT_TIMEOUT,
)
