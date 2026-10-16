"""
MQTT subscriber (paho-mqtt 2.x) feeding the ingestion pipeline.

Threads
-------
* paho network thread (loop_start): receives messages, puts them on a bounded
  queue and returns immediately, so keep-alive pings never wait for PostgreSQL.
* ingestion worker: takes messages off the queue and runs IngestionPipeline,
  which stores them and publishes ``sensor_reading_received`` (publish_sync is
  thread-safe, see events/event_bus.py).

Reconnection: paho retries with exponential backoff (1 s → 30 s) and the
subscription is renewed in on_connect after every reconnect.
"""
import logging
import queue
import threading
from typing import Optional

try:
    import paho.mqtt.client as mqtt
except ImportError as exc:  # reported in GET /api/v1/health as service:sensor_ingestion.service
    raise ImportError(
        "paho-mqtt is not installed — run: pip install -r sensor_ingestion/requirements.txt"
    ) from exc

from sensor_ingestion.config import IngestionSettings
from sensor_ingestion.pipeline import IngestionPipeline

logger = logging.getLogger(__name__)


class MqttIngestionService:
    def __init__(self, settings: IngestionSettings, pipeline: Optional[IngestionPipeline] = None):
        self.settings = settings
        self.pipeline = pipeline or IngestionPipeline(settings=settings)
        self._queue: "queue.Queue[tuple]" = queue.Queue(maxsize=settings.ingestion_queue_size)
        self._stop = threading.Event()
        self._worker: Optional[threading.Thread] = None
        self._state = "stopped"
        self._dropped = 0
        self._last_connect_error: Optional[str] = None

        self.client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=settings.client_id,
            clean_session=True,
        )
        if settings.mqtt_username:
            self.client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        self.client.reconnect_delay_set(min_delay=1, max_delay=30)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Non-blocking: connects in the background and keeps retrying."""
        self._stop.clear()
        self._worker = threading.Thread(target=self._work, name="mqtt-ingestion-worker", daemon=True)
        self._worker.start()
        self._state = "connecting"
        self.client.connect_async(self.settings.mqtt_broker, self.settings.mqtt_port,
                                  keepalive=self.settings.mqtt_keepalive)
        self.client.loop_start()
        logger.info("MQTT ingestion connecting to %s, topic %s",
                    self.settings.broker_label, self.settings.mqtt_topic_readings)

    def stop(self) -> None:
        self._stop.set()
        try:
            self.client.disconnect()
        finally:
            self.client.loop_stop()
        if self._worker:
            self._worker.join(timeout=5)
        self._state = "stopped"

    # ------------------------------------------------------------------
    # paho callbacks (network thread)
    # ------------------------------------------------------------------

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            self._state = "error"
            self._last_connect_error = str(reason_code)
            logger.error("MQTT broker %s refused the connection: %s", self.settings.broker_label, reason_code)
            return
        self._state = "connected"
        self._last_connect_error = None
        client.subscribe(self.settings.mqtt_topic_readings, qos=self.settings.mqtt_qos)
        logger.info("MQTT connected to %s, subscribed to %s",
                    self.settings.broker_label, self.settings.mqtt_topic_readings)

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties):
        if self._stop.is_set():
            return
        self._state = "reconnecting"
        logger.warning("MQTT disconnected from %s (%s) - reconnecting", self.settings.broker_label, reason_code)

    def _on_message(self, client, userdata, message):
        try:
            self._queue.put_nowait((message.topic, message.payload))
        except queue.Full:
            self._dropped += 1
            if self._dropped % 100 == 1:
                logger.error("Ingestion queue full - %s message(s) dropped so far", self._dropped)

    # ------------------------------------------------------------------
    # Worker thread
    # ------------------------------------------------------------------

    def _work(self) -> None:
        while not self._stop.is_set():
            try:
                topic, payload = self._queue.get(timeout=0.5)
            except queue.Empty:
                continue
            self.pipeline.process(topic, payload)

    # ------------------------------------------------------------------

    def health(self) -> dict:
        """Component for GET /api/v1/health (monitoring/health.py)."""
        connected = self.client.is_connected()
        return {
            "status": "connected" if connected else ("error" if self._state == "error" else "disconnected"),
            "broker": self.settings.broker_label,
            "topic": self.settings.mqtt_topic_readings,
            "client_id": self.settings.client_id,
            "queue_depth": self._queue.qsize(),
            "dropped": self._dropped,
            "connect_error": self._last_connect_error,
            **self.pipeline.snapshot(),
        }
