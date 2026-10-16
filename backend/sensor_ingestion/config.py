"""
Ingestion settings — environment variables / backend/.env.

MQTT_BROKER and MQTT_PORT are the keys already listed in backend/.env.example;
everything else is optional and has a development default.
"""
import os
import socket
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class IngestionSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore",
    )

    # ── Broker (shared with the simulator and the 3D app) ──────────────────
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: Optional[str] = None
    mqtt_password: Optional[str] = None
    mqtt_keepalive: int = 30
    mqtt_qos: int = 1
    # Wildcard over shared-contracts/sensor-message-schema.json → x-mqtt.topic
    mqtt_topic_readings: str = "pyronav/v1/sensors/+/+/reading"
    # Empty → "pyronav-ingestion-<host>-<pid>" (must be unique per broker)
    mqtt_client_id: str = ""

    # ── Ingestion behaviour ────────────────────────────────────────────────
    # Register the rooms/sensors of shared-contracts/hospital-3d-sensors.json
    # when the service starts (idempotent; never changes existing rooms).
    ingestion_auto_register: bool = True
    # Empty → <contracts dir>/hospital-3d-sensors.json
    ingestion_registry_file: str = ""
    # Readings older than this (or > 60 s in the future) are stored as "stale"
    # and not forwarded to the Decision Engine.
    ingestion_max_age_seconds: int = 300
    # Store semantically invalid readings (validation_status='invalid') for auditing
    ingestion_store_invalid: bool = True
    # Bounded hand-off queue between the MQTT network thread and the DB worker
    ingestion_queue_size: int = 10000

    @property
    def client_id(self) -> str:
        return self.mqtt_client_id or f"pyronav-ingestion-{socket.gethostname()}-{os.getpid()}"

    @property
    def broker_label(self) -> str:
        return f"{self.mqtt_broker}:{self.mqtt_port}"


@lru_cache(maxsize=1)
def get_ingestion_settings() -> IngestionSettings:
    return IngestionSettings()
