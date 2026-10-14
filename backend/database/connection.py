"""
Database connection manager with psycopg2 connection pooling.
Provides a context-manager-based API so connections are always returned
to the pool even when exceptions occur.
"""
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from database.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_POOL_MIN, DB_POOL_MAX


class DatabaseManager:
    def __init__(self, host, port, database, user, password,
                 minconn=1, maxconn=20):
        self.pool = SimpleConnectionPool(
            minconn=minconn,
            maxconn=maxconn,
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
        )

    @contextmanager
    def get_connection(self):
        """Yield a connection from the pool and return it afterwards."""
        conn = self.pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self.pool.putconn(conn)

    def execute_query(self, query: str, params=None):
        """Execute a SELECT query and return all rows."""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()

    def execute_write(self, query: str, params=None):
        """Execute an INSERT/UPDATE/DELETE and return row count."""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.rowcount

    def close(self):
        self.pool.closeall()


# ---------------------------------------------------------------------------
# Singleton — import this everywhere instead of creating new instances.
# Will raise an error at startup if credentials are wrong (fail fast).
# ---------------------------------------------------------------------------
try:
    db_manager = DatabaseManager(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        minconn=DB_POOL_MIN,
        maxconn=DB_POOL_MAX,
    )
except Exception as e:
    # Allow the app to start without a DB so the API can return 503 gracefully.
    print(f"[WARNING] Could not connect to database at startup: {e}")
    db_manager = None  # type: ignore[assignment]
