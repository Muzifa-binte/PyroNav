/**
 * Building configuration export in the format of docs/MEMBER-1-TASKS.md
 * (Week 3, "Export Building Configuration"): rooms, connections, sensors, exits.
 * Positions/dimensions in metres, world axes: x east, y up, z south.
 */
import { DOORS, EXITS, px, pz, roomAt, ROOMS, WALL_H } from '../data/hospitalLayout'
import { REGISTRY_META, SENSORS } from '../data/sensorRegistry'

const r2 = (v) => Math.round(v * 100) / 100

function sidesOf(door) {
  const [x, y] = door.at
  const h = door.orient === 'h'
  const a = h ? roomAt(x, y - 4) : roomAt(x - 4, y)
  const b = h ? roomAt(x, y + 4) : roomAt(x + 4, y)
  return [a?.room_id || null, b?.room_id || null]
}

export function buildingConfig() {
  const doorPos = (d) => ({ x: r2(px(d.at[0])), y: 0, z: r2(pz(d.at[1])) })
  return {
    building_id: REGISTRY_META.buildingId,
    floor_id: REGISTRY_META.floorId,
    generated_by: 'hospital-3d',
    generated_at: new Date().toISOString(),
    units: 'm',
    rooms: ROOMS.map((r) => ({
      room_id: r.room_id,
      name: r.name,
      kind: r.kind,
      category: r.category,
      position: { x: r2(r.x1), y: 0, z: r2(r.z1) },
      dimensions: { width: r2(r.w), height: WALL_H, depth: r2(r.d) },
    })),
    connections: DOORS.map((d) => ({ door: d, rooms: sidesOf(d) }))
      .filter(({ rooms }) => rooms[0] && rooms[1])
      .map(({ door, rooms }) => ({ from_room: rooms[0], to_room: rooms[1], door_id: door.id, width: door.width,
                                   door_position: doorPos(door) })),
    sensors: SENSORS.map((s) => ({
      sensor_id: s.sensor_id,
      room_id: s.room_id,
      sensor_type: s.sensor_type,
      mount: s.mount,
      position: { x: r2(s.position[0]), y: r2(s.position[1]), z: r2(s.position[2]) },
    })),
    exits: EXITS.map((e) => {
      const d = DOORS.find((x) => x.id === e.door)
      const [a, b] = sidesOf(d)
      return { exit_id: e.exit_id, name: e.name, room_id: a || b, position: doorPos(d) }
    }),
  }
}

export function downloadBuildingConfig() {
  const blob = new Blob([JSON.stringify(buildingConfig(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'building-config.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
