"""
API configuration — environment variables / backend/.env (see .env.example).
Database credentials live in database/config.py.
"""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore",
    )

    api_title: str = "PyroNav API"
    api_version: str = "1.0.0"

    # Comma-separated (kept as a string so .env needs no JSON syntax)
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    auto_migrate: bool = False
    demo_fallback: bool = True
    enable_dev_endpoints: bool = True
    debug: bool = True

    log_level: str = "INFO"
    log_dir: str = "logs"
    log_to_database: bool = True
    audit_log_enabled: bool = True

    ws_heartbeat_seconds: float = 30.0

    retention_days: int = 0
    retention_interval_hours: float = 6.0

    # Comma-separated modules that register in-process workers (see api/services.py).
    # MQTT ingestion and Member 2's decision engine are on by default, so 3D-app
    # readings and room hazard levels reach /ws/v1/live. Without a broker the
    # ingestion keeps retrying in the background and /health reports "mqtt".
    background_services: str = "sensor_ingestion.service,decision_engine.service"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def background_service_modules(self) -> List[str]:
        return [m.strip() for m in self.background_services.split(",") if m.strip()]

    @property
    def log_path(self) -> str:
        """log_dir resolved against backend/ when relative; "" disables file logging."""
        if not self.log_dir.strip():
            return ""
        path = Path(self.log_dir)
        return str(path if path.is_absolute() else BACKEND_DIR / path)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
