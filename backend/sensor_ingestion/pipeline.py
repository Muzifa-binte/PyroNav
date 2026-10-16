"""
Processing of one MQTT message: validate → store → forward to the Decision Engine.

    pipeline = IngestionPipeline()
    pipeline.process(topic, payload_bytes)

Forwarding = ``event_bus.publish_sync(Event("sensor_reading_received", data))``,
the event Member 2's Decision Engine subscribes to (docs/ARCHITECTURE.md §5.2).
The reading is stored BEFORE the event is published, so an engine that queries
``sensor_readings`` / ``latest_sensor_readings`` sees it. Only valid readings are
forwarded. When PostgreSQL is down, valid readings are still forwarded in real
time with ``persisted: false``.

Independent of paho-mqtt (see mqtt_subscriber.py), so it is tested without a broker.
"""
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Callable, Dict, Optional

import psycopg2

from database.connection import DatabaseUnavailableError, db_manager
from events import event_types as ev
from events.event_bus import Event, event_bus
from sensor_ingestion import registry as reg
from sensor_ingestion.config import IngestionSettings, get_ingestion_settings
from sensor_ingestion.database_writer import ReadingWriter, StoreResult
from sensor_ingestion.message_validator import (
    INVALID, REJECTED, STALE, UNKNOWN_SENSOR, VALID, RegisteredSensor, validate_message,
)
from utils.serialization import iso_utc

logger = logging.getLogger(__name__)

REGISTRY_TTL_SECONDS = 60      # re-read the sensors table at most this often…
REGISTRY_MISS_RETRY = 5        # …or this often when an unknown sensor shows up
AUTO_REGISTER_RETRY = 30       # self-heal after `database.seed --replace`
WARN_EVERY_SECONDS = 30        # WARNING logs also land in system_logs: rate-limit them


class IngestionPipeline:
    def __init__(
        self,
        writer: Optional[ReadingWriter] = None,
        settings: Optional[IngestionSettings] = None,
        publish: Optional[Callable[[Event], None]] = None,
        db=db_manager,
        clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ):
        self.settings = settings or get_ingestion_settings()
        self.writer = writer or ReadingWriter(db)
        self.publish = publish or event_bus.publish_sync
        self.db = db
        self.clock = clock

        self._lock = threading.Lock()
        self._registry: Optional[Dict[str, RegisteredSensor]] = None
        self._registry_loaded_at = 0.0
        self._registry_source = "none"
        self._last_auto_register = 0.0
        self._warned: Dict[tuple, float] = {}
        self.stats = {
            "received": 0, "forwarded": 0, "stored": 0, "duplicates": 0,
            "invalid": 0, "stale": 0, "rejected": 0, "unknown_sensor": 0, "db_errors": 0,
            "last_message_at": None, "last_forwarded_at": None, "last_error": None,
        }

    # ------------------------------------------------------------------
    # Registry (sensors table, with the JSON registry as offline fallback)
    # ------------------------------------------------------------------

    def _load_registry(self, force: bool = False) -> Dict[str, RegisteredSensor]:
        now = time.monotonic()
        age = now - self._registry_loaded_at
        if self._registry is not None and age < (REGISTRY_MISS_RETRY if force else REGISTRY_TTL_SECONDS):
            return self._registry
        try:
            self._registry = reg.database_sensors(self.db)
            self._registry_source = "database"
        except DatabaseUnavailableError:
            if self._registry is None or self._registry_source != "database":
                self._registry = self._file_registry()
                self._registry_source = "registry-file"
        self._registry_loaded_at = now
        return self._registry

    def _file_registry(self) -> Dict[str, RegisteredSensor]:
        try:
            return reg.registry_sensors(self.settings.ingestion_registry_file)
        except (OSError, ValueError, KeyError) as exc:
            logger.error("Cannot read sensor registry file: %s", exc)
            return {}

    def _try_auto_register(self, sensor_id: str) -> bool:
        """A sensor of the 3D registry is missing from the DB (e.g. after
        `database.seed --replace`): register the registry again, at most every 30 s."""
        if not self.settings.ingestion_auto_register:
            return False
        if sensor_id not in self._file_registry():
            return False
        now = time.monotonic()
        if now - self._last_auto_register < AUTO_REGISTER_RETRY:
            return False
        self._last_auto_register = now
        try:
            result = reg.register(self.db, self.settings.ingestion_registry_file)
            logger.info("Re-registered 3D hospital sensors (%s rooms added)", len(result["rooms_added"]))
            self._registry_loaded_at = 0.0
            return True
        except Exception as exc:  # DB down or schema problem — keep ingesting
            logger.warning("Automatic sensor registration failed: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Processing
    # ------------------------------------------------------------------

    def process(self, topic: str, payload) -> str:
        """Handle one message; returns the outcome (valid/invalid/stale/rejected/duplicate)."""
        with self._lock:
            self.stats["received"] += 1
            self.stats["last_message_at"] = iso_utc(self.clock())
        try:
            return self._process(topic, payload)
        except Exception as exc:  # never kill the worker thread
            logger.exception("Unexpected error while ingesting a message on %s", topic)
            self._count("db_errors", error=str(exc))
            return "error"

    def _process(self, topic: str, payload) -> str:
        max_age = self.settings.ingestion_max_age_seconds
        result = validate_message(topic, payload, self._load_registry(), self.clock(), max_age)
        if result.code == UNKNOWN_SENSOR:
            # The cache may be old, or the registry was wiped by seed --replace
            registry = self._load_registry(force=True)
            if result.reading["sensor_id"] not in registry and self._try_auto_register(result.reading["sensor_id"]):
                registry = self._load_registry(force=True)
            result = validate_message(topic, payload, registry, self.clock(), max_age)

        if result.status == REJECTED:
            self._count("unknown_sensor" if result.code == UNKNOWN_SENSOR else "rejected")
            self._warn((result.code, (result.reading or {}).get("sensor_id")),
                       "Rejected MQTT message on %s: %s", topic, "; ".join(result.errors))
            return REJECTED

        reading = result.reading
        if result.status in (INVALID, STALE):
            self._count(result.status)
            self._warn((result.status, reading["sensor_id"]), "%s reading from %s: %s",
                       result.status.capitalize(), reading["sensor_id"], "; ".join(result.errors))
            if result.status == STALE or self.settings.ingestion_store_invalid:
                self._store(reading, result.status)  # audit trail; never forwarded
            return result.status

        stored = self._store(reading, VALID)
        if stored is not None and stored.duplicate:
            self._count("duplicates")
            return "duplicate"
        if stored is not None and not stored.stored:  # refused by the database
            return REJECTED

        self._forward(reading, stored)
        return VALID

    def _store(self, reading: dict, status: str) -> Optional[StoreResult]:
        """None = PostgreSQL unreachable (the reading is still forwarded)."""
        try:
            result = self.writer.store(reading, status)
            if result.stored:
                self._count("stored")
            return result
        except DatabaseUnavailableError as exc:
            self._count("db_errors", error=str(exc))
            self._warn(("db",), "Reading %s not stored, database unavailable: %s", reading["message_id"], exc)
            return None
        except psycopg2.IntegrityError as exc:  # e.g. sensor deleted since the registry was cached
            self._registry_loaded_at = 0.0
            self._count("db_errors", error=str(exc))
            self._warn(("integrity", reading["sensor_id"]), "Reading %s rejected by the database: %s",
                       reading["message_id"], exc)
            return StoreResult(stored=False)  # do not forward an unstorable reading

    def _forward(self, reading: dict, stored: Optional[StoreResult]) -> None:
        received_at = stored.received_at if stored and stored.received_at else self.clock()
        data = {
            "message_id": reading["message_id"],
            "sensor_id": reading["sensor_id"],
            "room_id": reading["room_id"],
            "sensor_type": reading["sensor_type"],
            "values": reading["values"],
            "units": reading["units"],
            "timestamp": iso_utc(reading["timestamp"]),
            "received_at": iso_utc(received_at),
            "validation_status": VALID,
            "persisted": stored is not None,
            "source": reading.get("source"),
            "trigger": reading.get("trigger"),
        }
        self.publish(Event(ev.SENSOR_READING_RECEIVED, data))
        with self._lock:
            self.stats["forwarded"] += 1
            self.stats["last_forwarded_at"] = data["received_at"]

        previous = stored.previous_status if stored else None
        if previous and previous != "active":
            self.publish(Event(ev.SENSOR_STATUS_CHANGED, {
                "sensor_id": reading["sensor_id"], "room_id": reading["room_id"],
                "status": "active", "previous_status": previous,
            }))

    # ------------------------------------------------------------------

    def _count(self, key: str, error: Optional[str] = None) -> None:
        with self._lock:
            self.stats[key] += 1
            if error:
                self.stats["last_error"] = error[:300]

    def _warn(self, key: tuple, msg: str, *args) -> None:
        now = time.monotonic()
        if now - self._warned.get(key, -WARN_EVERY_SECONDS) >= WARN_EVERY_SECONDS:
            self._warned[key] = now
            logger.warning(msg, *args)
        else:
            logger.debug(msg, *args)

    def snapshot(self) -> dict:
        with self._lock:
            return {**self.stats, "registry_source": self._registry_source,
                    "registered_sensors": len(self._registry or {})}
