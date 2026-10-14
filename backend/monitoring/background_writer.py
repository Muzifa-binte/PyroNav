"""
Background database writer for fire-and-forget inserts: API audit log,
system_logs, WebSocket session tracking.

Request handlers and log calls never wait on PostgreSQL and never fail because
it is down. Statements are queued and executed in batches on a daemon thread;
if the database is unavailable (or the queue is full) they are dropped and
counted, never retried indefinitely.
"""
import logging
import queue
import threading
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple

from database.connection import DatabaseManager, DatabaseUnavailableError, db_manager

# NOTE: records from this logger are excluded from the database log handler,
# otherwise a DB outage would feed warnings back into the queue that failed.
logger = logging.getLogger(__name__)

Statement = Tuple[str, Optional[Sequence[Any]]]

_WAKE = object()  # queued by stop() so the writer thread exits without waiting


class BackgroundDbWriter:
    def __init__(self, db: DatabaseManager, max_queue: int = 10_000,
                 batch_size: int = 200, flush_interval: float = 1.0):
        self._db = db
        self._queue: "queue.Queue[Statement]" = queue.Queue(maxsize=max_queue)
        self._batch_size = batch_size
        self._flush_interval = flush_interval
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._start_lock = threading.Lock()
        self.written = 0
        self.dropped = 0
        self.failed_batches = 0
        self._last_warning_at = 0.0

    # ------------------------------------------------------------------

    def start(self) -> None:
        with self._start_lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop.clear()
            self._thread = threading.Thread(
                target=self._run, name="pyronav-db-writer", daemon=True
            )
            self._thread.start()

    def stop(self, timeout: float = 5.0) -> None:
        """Flush what is queued (best effort) and stop the thread."""
        self._stop.set()
        try:
            self._queue.put_nowait(_WAKE)
        except queue.Full:
            pass  # the thread is busy draining and will notice the stop flag
        if self._thread:
            self._thread.join(timeout)
        self._thread = None

    def submit(self, sql: str, params: Optional[Sequence[Any]] = None) -> bool:
        """Queue a statement. Returns False if it was dropped (queue full)."""
        if self._thread is None or not self._thread.is_alive():
            self.start()
        try:
            self._queue.put_nowait((sql, params))
            return True
        except queue.Full:
            self.dropped += 1
            return False

    def flush(self, timeout: float = 5.0) -> None:
        """Block until everything queued so far has been processed (tests, shutdown)."""
        deadline = time.monotonic() + timeout
        while self._queue.unfinished_tasks and time.monotonic() < deadline:
            time.sleep(0.02)

    def stats(self) -> Dict[str, int]:
        return {
            "queued": self._queue.qsize(),
            "written": self.written,
            "dropped": self.dropped,
            "failed_batches": self.failed_batches,
        }

    # ------------------------------------------------------------------

    def _run(self) -> None:
        while not (self._stop.is_set() and self._queue.empty()):
            batch = self._drain()
            if batch:
                self._write(batch)

    def _drain(self) -> List[Statement]:
        batch: List[Statement] = []
        try:
            item = self._queue.get(timeout=self._flush_interval)
        except queue.Empty:
            return batch
        while True:
            if item is _WAKE:
                self._queue.task_done()
            else:
                batch.append(item)
            if len(batch) >= self._batch_size:
                break
            try:
                item = self._queue.get_nowait()
            except queue.Empty:
                break
        return batch

    def _write(self, batch: List[Statement]) -> None:
        try:
            with self._db.get_connection() as conn:
                with conn.cursor() as cur:
                    for sql, params in batch:
                        cur.execute(sql, params)
            self.written += len(batch)
        except DatabaseUnavailableError as exc:
            self._drop(batch, exc)
        except Exception:
            # One bad statement aborts the whole transaction — retry individually
            for sql, params in batch:
                try:
                    self._db.execute_write(sql, params)
                    self.written += 1
                except Exception as exc:
                    self._drop([(sql, params)], exc)
        finally:
            for _ in batch:
                self._queue.task_done()

    def _drop(self, batch: List[Statement], exc: Exception) -> None:
        self.dropped += len(batch)
        self.failed_batches += 1
        now = time.monotonic()
        if now - self._last_warning_at > 30:  # rate-limit the warning
            self._last_warning_at = now
            logger.warning("Background DB writer dropped %d statement(s): %s", len(batch), exc)


# Shared instance: started by the API lifespan, used by the audit middleware,
# the database log handler and the WebSocket session tracker.
db_writer = BackgroundDbWriter(db_manager)
