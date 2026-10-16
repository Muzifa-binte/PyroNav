/**
 * Runtime configuration — values come from hospital-3d/.env (see .env.example).
 */
const env = import.meta.env
const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'

export const CONFIG = {
  mqtt: {
    // Mosquitto's WebSocket listener (backend/mqtt/mosquitto.conf, port 9001)
    url: env.VITE_MQTT_URL || `${wsScheme}://${window.location.hostname || 'localhost'}:9001`,
    username: env.VITE_MQTT_USERNAME || undefined,
    password: env.VITE_MQTT_PASSWORD || undefined,
    qos: Number(env.VITE_MQTT_QOS ?? 1) === 0 ? 0 : 1,
  },
  // shared-contracts/sensor-message-schema.json → x-mqtt
  topicTemplate: 'pyronav/v1/sensors/{room_id}/{sensor_id}/reading',
  statusTopicTemplate: 'pyronav/v1/clients/{client_id}/status',
  schemaVersion: '1.0',
  source: 'hospital-3d',

  // PyroNav API (Member 4): REST + WebSocket, through the Vite proxy by default
  api: {
    base: env.VITE_API_BASE || '/api/v1',
    ws: env.VITE_PYRONAV_WS_URL || `${wsScheme}://${window.location.host}/ws/v1/live`,
  },

  periodicSeconds: Number(env.VITE_PERIODIC_SECONDS ?? 15),
  throttleMs: Number(env.VITE_PUBLISH_THROTTLE_MS ?? 250),
}
