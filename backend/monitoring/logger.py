"""
Logging setup: console + rotating file + database (system_logs table).

    from monitoring.logger import setup_logging
    setup_logging(level="INFO", log_dir="logs", db_writer=writer)

Everywhere else just use the standard library:

    import logging
    logger = logging.getLogger(__name__)
    logger.warning("Stale sensor detected", extra={"metadata": {"sensor_id": sid}})

The optional ``extra={"metadata": {...}}`` dict is stored in system_logs.metadata.

(This package is deliberately not called ``logging`` — a local package with that
name would shadow the standard library module for the whole backend.)
"""
import json
import logging
import os
from logging.handlers import RotatingFileHandler
from typing import Optional

from psycopg2.extras import Json

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DB_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}  # log_level_enum

# Never persist these to the database: they describe the database path itself,
# and would loop back into the queue during an outage.
DB_EXCLUDED_LOGGERS = ("monitoring.background_writer", "database.connection")

_HANDLER_MARK = "_pyronav_handler"


class DatabaseLogHandler(logging.Handler):
    """Queues log records for insertion into system_logs (never blocks)."""

    INSERT_SQL = (
        "INSERT INTO system_logs (level, component, message, metadata) "
        "VALUES (%s, %s, %s, %s)"
    )

    def __init__(self, writer, level=logging.WARNING):
        super().__init__(level)
        self._writer = writer
        self._formatter = logging.Formatter()

    def emit(self, record: logging.LogRecord) -> None:
        if record.name.startswith(DB_EXCLUDED_LOGGERS):
            return
        try:
            metadata = {
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno,
            }
            extra = getattr(record, "metadata", None)
            if isinstance(extra, dict):
                metadata.update(extra)
            if record.exc_info:
                metadata["exception"] = self._formatter.formatException(record.exc_info)
            level = record.levelname if record.levelname in DB_LEVELS else "INFO"
            self._writer.submit(
                self.INSERT_SQL,
                (level, record.name[:100], record.getMessage(), Json(metadata, dumps=_dumps)),
            )
        except Exception:
            self.handleError(record)


def _dumps(obj) -> str:
    return json.dumps(obj, default=str)


def setup_logging(level: str = "INFO", log_dir: Optional[str] = "logs",
                  db_writer=None, db_level: str = "WARNING") -> logging.Logger:
    """Configure the root logger. Safe to call more than once."""
    root = logging.getLogger()
    for handler in list(root.handlers):
        if getattr(handler, _HANDLER_MARK, False):
            root.removeHandler(handler)
            handler.close()

    numeric_level = logging.getLevelName(level.upper())
    if not isinstance(numeric_level, int):
        numeric_level = logging.INFO
    formatter = logging.Formatter(LOG_FORMAT)

    handlers = []
    console = logging.StreamHandler()
    console.setLevel(numeric_level)
    console.setFormatter(formatter)
    handlers.append(console)

    if log_dir:
        try:
            os.makedirs(log_dir, exist_ok=True)
            file_handler = RotatingFileHandler(
                os.path.join(log_dir, "pyronav.log"),
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,
                encoding="utf-8",
            )
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(formatter)
            handlers.append(file_handler)
        except OSError as exc:
            console.handle(logging.makeLogRecord({
                "levelno": logging.WARNING, "levelname": "WARNING", "name": __name__,
                "msg": f"File logging disabled: {exc}",
            }))

    if db_writer is not None:
        db_handler = DatabaseLogHandler(db_writer)
        db_handler.setLevel(logging.getLevelName(db_level.upper()))
        handlers.append(db_handler)

    for handler in handlers:
        setattr(handler, _HANDLER_MARK, True)
        root.addHandler(handler)
    root.setLevel(numeric_level)
    return root
