"""
Database maintenance tasks.

Data retention: deletes operational data (sensor readings, logs, audit rows,
WebSocket sessions, security events, old routes) older than N days via the
purge_old_data() SQL function from migration 002. Hazard events and
notifications are kept as incident history.

    python -m database.maintenance --purge 30      # one-off, from backend/

The API runs it periodically when RETENTION_DAYS > 0.
"""
import argparse
import logging
import os
import sys
from typing import Dict

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database.connection import DatabaseManager, DatabaseUnavailableError, db_manager  # noqa: E402

logger = logging.getLogger(__name__)


def purge_old_data(retention_days: int, db: DatabaseManager = db_manager) -> Dict[str, int]:
    """Returns {table_name: rows_deleted}."""
    rows = db.fetch_all("SELECT * FROM purge_old_data(%s)", (retention_days,))
    deleted = {r["table_name"]: r["rows_deleted"] for r in rows}
    total = sum(deleted.values())
    if total:
        logger.info("Retention purge (%d days) deleted %d row(s): %s", retention_days, total, deleted)
    return deleted


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="PyroNav database maintenance")
    parser.add_argument("--purge", type=int, metavar="DAYS", required=True,
                        help="delete operational data older than DAYS days")
    args = parser.parse_args(argv)
    try:
        for table, n in purge_old_data(args.purge).items():
            print(f"  {table:<20} {n} row(s) deleted")
    except DatabaseUnavailableError as exc:
        print(f"Database unavailable: {exc}")
        return 2
    finally:
        db_manager.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
