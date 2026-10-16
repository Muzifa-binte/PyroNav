/**
 * Sensors of shared-contracts/hospital-3d-sensors.json, with world positions.
 * Every sensor carries its room_id; message topics and payloads are built from
 * these exact ids, so the Decision Engine always knows where a reading comes from.
 */
import registry from '@contracts/hospital-3d-sensors.json'
import { CEILING_Y, ROOM_BY_ID, ROOMS, wallMount } from './hospitalLayout'
import { fieldsOf, fieldSpec } from './sensorTypes'

function placement(sensor) {
  const room = ROOM_BY_ID[sensor.room_id]
  const p = sensor.placement
  if (sensor.mount === 'ceiling') {
    return { position: [room.x1 + p.u * room.w, CEILING_Y, room.z1 + p.v * room.d], rotY: 0 }
  }
  const m = wallMount(room, p.wall, p.u)
  return { position: [m.x, p.h, m.z], rotY: m.rotY }
}

export const SENSORS = registry.sensors.map((s) => {
  const fields = fieldsOf(s)
  const baseline = Object.fromEntries(fields.map((f) => [f, s.baseline?.[f] ?? fieldSpec(s, f).min]))
  return { ...s, fields, baseline, ...placement(s) }
})

export const SENSOR_BY_ID = Object.fromEntries(SENSORS.map((s) => [s.sensor_id, s]))

export const SENSORS_BY_ROOM = Object.fromEntries(
  ROOMS.map((r) => [r.room_id, SENSORS.filter((s) => s.room_id === r.room_id)]),
)

export function baselineValues() {
  return Object.fromEntries(SENSORS.map((s) => [s.sensor_id, { ...s.baseline }]))
}

export const REGISTRY_META = {
  buildingId: registry.building_id,
  floorId: registry.floor_id,
  version: registry.version,
  sensorTypes: registry.sensor_types,
}
