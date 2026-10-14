"""
Simple migration runner.
Run: python backend/database/migrations/migrate.py
Applies any *.sql files in this directory that haven't been applied yet.
"""
import os
import sys
import psycopg2

# Allow running from any working directory
MIGRATIONS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(MIGRATIONS_DIR, "..", "..", ".."))

from backend.database.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD  # noqa: E402


class MigrationRunner:
    def __init__(self, conn):
        self.conn = conn
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
        self.conn.commit()

    def get_applied_migrations(self):
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT filename FROM schema_migrations ORDER BY migration_id"
            )
            return [row[0] for row in cur.fetchall()]

    def apply_migration(self, filename: str):
        path = os.path.join(MIGRATIONS_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            sql = f.read()
        with self.conn.cursor() as cur:
            cur.execute(sql)
            cur.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s)",
                (filename,),
            )
        self.conn.commit()
        print(f"  ✓ Applied: {filename}")

    def run(self):
        applied = set(self.get_applied_migrations())
        files = sorted(
            f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")
        )
        pending = [f for f in files if f not in applied]
        if not pending:
            print("All migrations already applied. Nothing to do.")
            return
        print(f"Applying {len(pending)} migration(s)…")
        for filename in pending:
            self.apply_migration(filename)
        print("Done.")


if __name__ == "__main__":
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    try:
        MigrationRunner(conn).run()
    finally:
        conn.close()
