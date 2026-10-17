"""
Runs Member 2's Decision Engine INSIDE the API process, so its
room_status_changed / hazard_event_* / notification_created events reach the
WebSocket (/ws/v1/live) and Member 3's route monitor over the shared in-process
event bus (docs/ARCHITECTURE.md §5.3).

On by default (api/config.py). In backend/.env:
    BACKGROUND_SERVICES=sensor_ingestion.service,decision_engine.service

Shows up in GET /api/v1/health as "service:decision_engine" (running/failed)
and "decision_engine" (processor state).

`python decision_engine/processor.py` still runs it standalone, but then its
events stay in that separate process and never reach the dashboard.
"""
import logging
import threading

from api.services import background_service
from database.connection import db_manager
from decision_engine.processor import DecisionEngineProcessor
from monitoring.health import register_health_check, unregister_health_check
from utils.serialization import iso_utc

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 2.0
RESTART_DELAY_SECONDS = 10.0


@background_service("decision_engine")
def start():
    processor = DecisionEngineProcessor(poll_interval=POLL_INTERVAL_SECONDS)
    stopping = threading.Event()
    state = {"restarts": 0}

    def run():
        # processor.start() blocks until stop() or a fatal error (e.g. the database
        # went away); keep the engine alive until the API shuts down.
        while not stopping.is_set():
            if not db_manager.is_available():
                stopping.wait(RESTART_DELAY_SECONDS)
                continue
            processor.start()
            if stopping.wait(RESTART_DELAY_SECONDS):
                break
            state["restarts"] += 1
            logger.warning("Decision engine stopped unexpectedly - restarting")

    thread = threading.Thread(target=run, name="decision-engine", daemon=True)
    thread.start()

    def health():
        return {
            "status": "running" if processor.running else "waiting for database",
            "poll_interval_seconds": processor.poll_interval,
            "last_processed_reading": (iso_utc(processor.last_processed_timestamp)
                                       if processor.last_processed_timestamp else None),
            "restarts": state["restarts"],
        }

    register_health_check("decision_engine", health)

    def stop():
        unregister_health_check("decision_engine")
        stopping.set()
        processor.stop()
        thread.join(timeout=POLL_INTERVAL_SECONDS + 3)

    return stop
