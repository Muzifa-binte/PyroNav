/**
 * Builds MQTT readings exactly as shared-contracts/sensor-message-schema.json
 * defines them — the format backend/sensor_ingestion validates and forwards to
 * the Decision Engine (which reads sensor_id, room_id, sensor_type and values).
 */
import { CONFIG } from '../config'
import { REGISTRY_META } from '../data/sensorRegistry'
import { fieldSpec } from '../data/sensorTypes'

export function topicFor(sensor) {
  return CONFIG.topicTemplate
    .replace('{room_id}', sensor.room_id)
    .replace('{sensor_id}', sensor.sensor_id)
}

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  // crypto.randomUUID needs a secure context; plain-http LAN addresses fall back here
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** trigger: slider | manual | periodic | reset | sync */
export function buildReading(sensor, values, trigger) {
  const rounded = {}
  for (const field of sensor.fields) {
    const spec = fieldSpec(sensor, field)
    rounded[field] = Number(Number(values?.[field] ?? 0).toFixed(spec.decimals))
  }
  return {
    message_id: `h3d-${uuid()}`,
    sensor_id: sensor.sensor_id,
    room_id: sensor.room_id,
    sensor_type: sensor.sensor_type,
    timestamp: new Date().toISOString(),
    values: rounded,
    units: { ...sensor.unit_config },
    source: CONFIG.source,
    trigger,
    schema_version: CONFIG.schemaVersion,
    building_id: REGISTRY_META.buildingId,
    floor_id: REGISTRY_META.floorId,
  }
}
