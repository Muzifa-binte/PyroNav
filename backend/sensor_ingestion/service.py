"""
Runs MQTT ingestion INSIDE the API process, so readings reach the Decision
Engine and the WebSocket over the shared in-process event bus
(docs/ARCHITECTURE.md §3 and §5.3).

Enable in backend/.env:
    BACKGROUND_SERVICES=sensor_ingestion.service
or, together with Member 2's engine:
    BACKGROUND_SERVICES=sensor_ingestion.service,decision_engine.service

Shows up in GET /api/v1/health as "service:mqtt_ingestion" (running/failed)
and "mqtt" (broker connection + counters).
"""
import logging

from api.services import background_service
from database.connection import DatabaseUnavailableError
from monitoring.health import register_health_check, unregister_health_check
from sensor_ingestion import registry
from sensor_ingestion.config import get_ingestion_settings
from sensor_ingestion.mqtt_subscriber import MqttIngestionService

logger = logging.getLogger(__name__)


@background_service("mqtt_ingestion")
def start():
    settings = get_ingestion_settings()

    if settings.ingestion_auto_register:
        try:
            result = registry.register(path=settings.ingestion_registry_file)
            logger.info("3D hospital registry: %s room(s) added, %s sensor(s) upserted",
                        len(result["rooms_added"]), result["sensors_upserted"])
        except DatabaseUnavailableError as exc:
            logger.warning("Sensor registry not loaded, database unavailable: %s", exc)
        except Exception:
            logger.exception("Sensor registry could not be loaded")

    service = MqttIngestionService(settings)
    service.start()  # returns immediately; paho reconnects in its own thread
    register_health_check("mqtt", service.health)

    def stop():
        unregister_health_check("mqtt")
        service.stop()

    return stop
