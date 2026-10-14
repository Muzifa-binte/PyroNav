"""
Migration runner.

Applies every ``*.sql`` file in this directory that is not yet recorded in the
``schema_migrations`` table — in filename order, each in its own transaction.

Usage (from the backend/ directory):
    python -m database.migrations.migrate            # apply pending migrations
    python -m database.migrations.migrate --status   # list applied / pending

It can also be run by path from any directory:
    python backend/database/migrations/migrate.py

Rules for teammates adding migrations: see README.md in this folder.
"""
import argparse
import hashlib
import logging
import os
import sys
from typing import Dict, List

MIGRATIONS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(MIGRATIONS_DIR, "..", ".."))
if BACKEND_DIR not in sys.path:  # allow running as a plain script
    sys.path.insert(0, BACKEND_DIR)

import psycopg2  # noqa: E402

from database.config import (  # noqa: E402
    DB_CONNECT_TIMEOUT, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER,
)

logger = logging.getLogger(__name__)

# Serialises concurrent runners, e.g. several API workers starting at once
# with AUTO_MIGRATE=true. The value is arbitrary but must stay constant.
ADVISORY_LOCK_ID = 7_340_001


class MigrationError(RuntimeError):
    pass


def _checksum(sql: str) -> str:
    # Normalise line endings so Windows/Linux checkouts produce the same hash
    return hashlib.sha256(sql.replace("\r\n", "\n").encode("utf-8")).hexdigest()


class MigrationRunner:
    def __init__(self, conn, migrations_dir: str = MIGRATIONS_DIR):
        self.conn = conn
        self.migrations_dir = migrations_dir
        self._create_migration_table()

    def _create_migration_table(self):
        with self.conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    migration_id SERIAL       PRIMARY KEY,
                    filename     VARCHAR(255) UNIQUE NOT NULL,
                    applied_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute(
                "ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)"
            )
        self.conn.commit()

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def migration_files(self) -> List[str]:
        return sorted(f for f in os.listdir(self.migrations_dir) if f.endswith(".sql"))

    def _read(self, filename: str) -> str:
        with open(os.path.join(self.migrations_dir, filename), "r", encoding="utf-8") as f:
            return f.read()

    def _applied(self) -> Dict[str, dict]:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT filename, applied_at, checksum FROM schema_migrations "
                "ORDER BY migration_id"
            )
            return {
                row[0]: {"applied_at": row[1], "checksum": row[2]}
                for row in cur.fetchall()
            }

    def get_applied_migrations(self) -> List[str]:
        return list(self._applied().keys())

    def pending(self) -> List[str]:
        applied = self._applied()
        return [f for f in self.migration_files() if f not in applied]

    def status(self) -> List[dict]:
        applied = self._applied()
        result = []
        for filename in self.migration_files():
            info = applied.get(filename)
            if info is None:
                state = "pending"
            elif info["checksum"] and info["checksum"] != _checksum(self._read(filename)):
                state = "modified-after-apply"
            else:
                state = "applied"
            result.append({
                "filename": filename,
                "state": state,
                "applied_at": info["applied_at"].isoformat() if info else None,
            })
        return result

    # ------------------------------------------------------------------
    # Applying
    # ------------------------------------------------------------------

    def apply_migration(self, filename: str):
        sql = self._read(filename)
        try:
            with self.conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO schema_migrations (filename, checksum) VALUES (%s, %s)",
                    (filename, _checksum(sql)),
                )
            self.conn.commit()
        except psycopg2.Error as exc:
            self.conn.rollback()
            raise MigrationError(f"{filename} failed and was rolled back: {exc}") from exc
        logger.info("Applied migration %s", filename)

    def run(self) -> List[str]:
        """Apply all pending migrations. Returns the filenames applied."""
        with self.conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_lock(%s)", (ADVISORY_LOCK_ID,))
        try:
            for entry in self.status():
                if entry["state"] == "modified-after-apply":
                    logger.warning(
                        "Migration %s was edited after it was applied — the change "
                        "will NOT be re-run. Add a new migration instead.",
                        entry["filename"],
                    )
            applied_now = []
            for filename in self.pending():
                self.apply_migration(filename)
                applied_now.append(filename)
            return applied_now
        finally:
            with self.conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_unlock(%s)", (ADVISORY_LOCK_ID,))
            self.conn.commit()


def connect(database: str = DB_NAME):
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=database,
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=DB_CONNECT_TIMEOUT,
        options="-c timezone=UTC",
    )


def run_migrations(database: str = DB_NAME) -> List[str]:
    """Open a dedicated connection, apply pending migrations, close it."""
    conn = connect(database)
    try:
        return MigrationRunner(conn).run()
    finally:
        conn.close()


def migration_status(database: str = DB_NAME) -> List[dict]:
    conn = connect(database)
    try:
        return MigrationRunner(conn).status()
    finally:
        conn.close()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="PyroNav database migrations")
    parser.add_argument("--status", action="store_true", help="show migration state and exit")
    args = parser.parse_args(argv)

    try:
        if args.status:
            for entry in migration_status():
                print(f"  {entry['state']:<22} {entry['filename']}"
                      + (f"  ({entry['applied_at']})" if entry["applied_at"] else ""))
            return 0
        applied = run_migrations()
    except psycopg2.OperationalError as exc:
        print(f"Cannot connect to {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}: {exc}")
        return 2
    except MigrationError as exc:
        print(f"ERROR: {exc}")
        return 1

    if applied:
        for filename in applied:
            print(f"  + Applied: {filename}")
        print(f"Done - {len(applied)} migration(s) applied.")
    else:
        print("All migrations already applied. Nothing to do.")
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")
    sys.exit(main())
