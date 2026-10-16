/**
 * Ground-floor geometry, traced from the reference floor plan ("Hospital – 2D
 * Floor Map (Ground Floor)"). Footprints are written in plan pixels of that
 * image so they can be compared with it directly; px()/pz() convert to metres.
 *
 *   world x = east (+) / west (−)     world z = south (+) / north (−)     y = up
 *
 * Room ids and names come from shared-contracts/hospital-3d-sensors.json — the
 * same ids the Decision Engine and the database use.
 */
import registry from '@contracts/hospital-3d-sensors.json'

export const SCALE = 0.055 // metres per plan pixel → corridors ≈ 2.5 m, building ≈ 63 × 37 m
const ORIGIN = { x: 620, y: 540 }
export const WALL_H = 3.0
export const DOOR_H = 2.2
export const T_INT = 0.12 // each room owns its walls: two rooms side by side → 0.24 m wall
export const T_EXT = 0.3
export const CEILING_Y = WALL_H

export const px = (v) => (v - ORIGIN.x) * SCALE
export const pz = (v) => (v - ORIGIN.y) * SCALE

// [x1, y1, x2, y2] in plan pixels
const RECTS = {
  stair_nw:          [50, 155, 170, 365],
  icu:               [170, 155, 430, 320],
  isolation_room:    [430, 155, 580, 320],
  patient_room:      [580, 155, 805, 320],
  operation_theater: [805, 155, 1065, 320],
  stair_ne:          [1065, 155, 1190, 365],
  corridor_north:    [170, 320, 1065, 365],
  radiology:         [50, 365, 240, 512],
  lab:               [50, 512, 240, 672],
  corridor_west:     [240, 365, 290, 630],
  pharmacy:          [290, 365, 440, 630],
  waiting_area:      [440, 365, 680, 630],
  administration:    [680, 365, 862, 512],
  records:           [680, 512, 862, 630],
  corridor_east:     [862, 365, 905, 630],
  general_ward:      [905, 365, 1190, 537],
  maternity_ward:    [905, 537, 1190, 672],
  corridor_south:    [240, 630, 905, 672],
  cafeteria:         [50, 672, 290, 830],
  hall_southwest:    [290, 672, 440, 830],
  main_lobby:        [440, 672, 715, 830],
  emergency_dept:    [715, 672, 865, 830],
  hall_southeast:    [865, 672, 1050, 830],
  blood_bank:        [1050, 672, 1190, 830],
  stair_sw:          [50, 830, 215, 912],
  stair_se:          [1060, 830, 1190, 912],
}

// Floor colours follow the legend of the reference plan
export const CATEGORY_STYLE = {
  critical_care: { floor: '#C9E3F6', label: 'ICU / Critical care' },
  patient:       { floor: '#D4E8F7', label: 'Patient room' },
  ward:          { floor: '#F6D0C2', label: 'Ward' },
  surgical:      { floor: '#CDEBD2', label: 'Operating theatre' },
  diagnostic:    { floor: '#E4D4F1', label: 'Diagnostic (imaging / lab)' },
  emergency:     { floor: '#DDD3F2', label: 'Emergency / trauma' },
  support:       { floor: '#CBE6F7', label: 'Support services' },
  admin:         { floor: '#F7E6BA', label: 'Administration / records' },
  public:        { floor: '#F6EFDF', label: 'Public hall' },
  food:          { floor: '#D3EBD5', label: 'Food / cafeteria' },
  circulation:   { floor: '#E3E6EA', label: 'Corridor / hall' },
  stairs:        { floor: '#CDD2D8', label: 'Stairs / exit' },
}
const FLOOR_OVERRIDE = { isolation_room: '#EDD5EC' }

export const ROOMS = registry.rooms.map((r) => {
  const rect = RECTS[r.room_id]
  if (!rect) throw new Error(`No footprint for room ${r.room_id} in hospitalLayout.js`)
  const [x1, y1, x2, y2] = rect
  return {
    ...r,
    rect,
    x1: px(x1), z1: pz(y1), x2: px(x2), z2: pz(y2),
    w: (x2 - x1) * SCALE, d: (y2 - y1) * SCALE,
    cx: px((x1 + x2) / 2), cz: pz((y1 + y2) / 2),
    floor: FLOOR_OVERRIDE[r.room_id] || CATEGORY_STYLE[r.category]?.floor || '#E5E7EB',
    hasWalls: r.kind !== 'corridor',
  }
})
export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.room_id, r]))

/**
 * Doors. at = centre on the wall line (plan px); orient h = in a wall running
 * east-west, v = north-south; open = direction the leaf swings towards
 * (egress doors swing in the direction of escape); width in metres.
 */
export const DOORS = [
  { id: 'D-ICU',      at: [200, 320],  orient: 'h', width: 1.4, kind: 'single', open: 'n' },
  { id: 'D-ISO',      at: [458, 320],  orient: 'h', width: 1.2, kind: 'single', open: 'n' },
  { id: 'D-PAT',      at: [615, 320],  orient: 'h', width: 1.3, kind: 'single', open: 'n' },
  { id: 'D-OT',       at: [850, 320],  orient: 'h', width: 1.8, kind: 'double', open: 'n' },
  { id: 'D-STNW',     at: [170, 342],  orient: 'v', width: 1.2, kind: 'single', open: 'w' },
  { id: 'D-STNE',     at: [1065, 342], orient: 'v', width: 1.2, kind: 'single', open: 'e', hinge: 'end' },
  { id: 'EXIT-NW',    at: [110, 155],  orient: 'h', width: 1.4, kind: 'exit',   open: 'n' },
  { id: 'EXIT-NE',    at: [1128, 155], orient: 'h', width: 1.4, kind: 'exit',   open: 'n', hinge: 'end' },
  { id: 'D-RAD',      at: [240, 450],  orient: 'v', width: 1.3, kind: 'single', open: 'w' },
  { id: 'D-LAB',      at: [240, 600],  orient: 'v', width: 1.3, kind: 'single', open: 'w' },
  { id: 'D-PH',       at: [405, 365],  orient: 'h', width: 1.2, kind: 'single', open: 's', hinge: 'end' },
  { id: 'D-WA-N',     at: [540, 365],  orient: 'h', width: 1.8, kind: 'double', open: 's' },
  { id: 'D-WA-S',     at: [560, 630],  orient: 'h', width: 2.6, kind: 'opening' },
  { id: 'D-ADM',      at: [680, 480],  orient: 'v', width: 1.1, kind: 'single', open: 'e' },
  { id: 'D-REC',      at: [715, 630],  orient: 'h', width: 1.1, kind: 'single', open: 'n' },
  { id: 'D-GW',       at: [905, 445],  orient: 'v', width: 1.4, kind: 'single', open: 'e' },
  { id: 'D-MAT',      at: [905, 595],  orient: 'v', width: 1.4, kind: 'single', open: 'e' },
  { id: 'D-CAF',      at: [265, 672],  orient: 'h', width: 1.4, kind: 'single', open: 's', hinge: 'end' },
  { id: 'D-CAF-ST',   at: [192, 830],  orient: 'h', width: 1.2, kind: 'single', open: 's' },
  { id: 'EXIT-SW',    at: [92, 912],   orient: 'h', width: 1.4, kind: 'exit',   open: 's' },
  { id: 'D-HSW-N',    at: [355, 672],  orient: 'h', width: 1.6, kind: 'double', open: 's' },
  { id: 'D-HSW-E',    at: [440, 765],  orient: 'v', width: 1.6, kind: 'double', open: 'e' },
  { id: 'D-LOB-N',    at: [560, 672],  orient: 'h', width: 2.4, kind: 'double', open: 's' },
  { id: 'EXIT-S',     at: [578, 830],  orient: 'h', width: 2.8, kind: 'sliding' },
  { id: 'D-ED-N',     at: [755, 672],  orient: 'h', width: 1.6, kind: 'double', open: 's' },
  { id: 'D-ED-AMB',   at: [790, 830],  orient: 'h', width: 2.2, kind: 'sliding' },
  { id: 'D-HSE-N',    at: [884, 672],  orient: 'h', width: 1.4, kind: 'single', open: 's' },
  { id: 'D-HSE-BB',   at: [1050, 800], orient: 'v', width: 1.4, kind: 'single', open: 'e' },
  { id: 'D-BB-ST',    at: [1160, 830], orient: 'h', width: 1.2, kind: 'single', open: 's', hinge: 'end' },
  { id: 'EXIT-SE',    at: [1105, 912], orient: 'h', width: 1.4, kind: 'exit',   open: 's' },
]

// Emergency exits as in sample-building.json (exit_id ↔ door)
export const EXITS = [
  { exit_id: 'EXIT-NW', name: 'Emergency Exit', door: 'EXIT-NW' },
  { exit_id: 'EXIT-NE', name: 'Emergency Exit', door: 'EXIT-NE' },
  { exit_id: 'EXIT-SW', name: 'Emergency Exit', door: 'EXIT-SW' },
  { exit_id: 'EXIT-SE', name: 'Emergency Exit', door: 'EXIT-SE' },
  { exit_id: 'EXIT-S',  name: 'Main Entrance',  door: 'EXIT-S' },
]

// ── Wall generation ─────────────────────────────────────────────────────────

const EPS = 0.5 // plan px

function sideInfo(rect, side) {
  const [x1, y1, x2, y2] = rect
  switch (side) {
    case 'n': return { line: y1, a: x1, b: x2, horizontal: true }
    case 's': return { line: y2, a: x1, b: x2, horizontal: true }
    case 'w': return { line: x1, a: y1, b: y2, horizontal: false }
    default:  return { line: x2, a: y1, b: y2, horizontal: false }
  }
}
const OPPOSITE = { n: 's', s: 'n', w: 'e', e: 'w' }

/** Intervals of a room side that touch another room (interior) — the rest is facade. */
function coveredIntervals(room, side) {
  const me = sideInfo(room.rect, side)
  const out = []
  for (const other of ROOMS) {
    if (other === room) continue
    const o = sideInfo(other.rect, OPPOSITE[side])
    if (Math.abs(o.line - me.line) > EPS) continue
    const a = Math.max(me.a, o.a)
    const b = Math.min(me.b, o.b)
    if (b - a > EPS) out.push([a, b])
  }
  return out.sort((p, q) => p[0] - q[0])
}

/** Is the wall at position `pos` (plan px along the side) a facade wall? */
export function isExterior(room, side, pos) {
  return !coveredIntervals(room, side).some(([a, b]) => pos >= a - EPS && pos <= b + EPS)
}

export function wallThickness(room, side, pos) {
  return isExterior(room, side, pos) ? T_EXT : T_INT
}

function doorsOn(room, side) {
  const s = sideInfo(room.rect, side)
  return DOORS.filter((d) => {
    const [dx, dy] = d.at
    if (s.horizontal !== (d.orient === 'h')) return false
    const line = s.horizontal ? dy : dx
    const pos = s.horizontal ? dx : dy
    return Math.abs(line - s.line) < EPS && pos > s.a && pos < s.b
  })
}

/**
 * Wall boxes for every room that has walls. Each room's walls sit inside its
 * own footprint; facade segments are thicker. Door openings get a lintel.
 * Returns [{ key, pos:[x,y,z], size:[sx,sy,sz], exterior }].
 */
export function buildWalls(height = WALL_H) {
  const boxes = []
  for (const room of ROOMS) {
    if (!room.hasWalls) continue
    for (const side of ['n', 's', 'w', 'e']) {
      const s = sideInfo(room.rect, side)
      let a = s.a
      let b = s.b
      if (!s.horizontal) {
        // trim east/west walls so they butt against the north/south walls
        a += wallThickness(room, 'n', side === 'w' ? room.rect[0] + 1 : room.rect[2] - 1) / SCALE
        b -= wallThickness(room, 's', side === 'w' ? room.rect[0] + 1 : room.rect[2] - 1) / SCALE
      }
      // breakpoints: coverage changes + door gaps
      const cuts = new Set([a, b])
      for (const [ca, cb] of coveredIntervals(room, side)) {
        if (ca > a && ca < b) cuts.add(ca)
        if (cb > a && cb < b) cuts.add(cb)
      }
      const gaps = doorsOn(room, side).map((d) => {
        const c = s.horizontal ? d.at[0] : d.at[1]
        const half = d.width / 2 / SCALE
        cuts.add(c - half); cuts.add(c + half)
        return [c - half, c + half, d]
      })
      const pts = [...cuts].filter((p) => p >= a && p <= b).sort((p, q) => p - q)
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i]
        const p1 = pts[i + 1]
        if (p1 - p0 < 0.05) continue
        const mid = (p0 + p1) / 2
        const inGap = gaps.find(([g0, g1]) => mid > g0 && mid < g1)
        const t = wallThickness(room, side, mid)
        const len = (p1 - p0) * SCALE
        const y0 = inGap ? DOOR_H : 0
        const h = height - y0
        if (h <= 0.02) continue
        boxes.push(wallBox(room, side, s, mid, len, t, y0, h, `${room.room_id}-${side}-${i}`, t === T_EXT))
      }
    }
  }
  return boxes
}

function wallBox(room, side, s, mid, len, t, y0, h, key, exterior) {
  const y = y0 + h / 2
  if (s.horizontal) {
    const z = side === 'n' ? pz(s.line) + t / 2 : pz(s.line) - t / 2
    return { key, pos: [px(mid), y, z], size: [len, h, t], exterior }
  }
  const x = side === 'w' ? px(s.line) + t / 2 : px(s.line) - t / 2
  return { key, pos: [x, y, pz(mid)], size: [t, h, len], exterior }
}

/** World position + rotation of a door's hinge and its leaf geometry. */
export function doorGeometry(door) {
  const [dx, dy] = door.at
  const x = px(dx)
  const z = pz(dy)
  return { x, z, horizontal: door.orient === 'h' }
}

// Room-local helpers (furniture is authored in metres from the room's NW corner)
export function roomOrigin(room) {
  return [room.x1, 0, room.z1]
}

/** Inner face offset of a wall at a fraction u along it (for wall-mounted devices). */
export function wallMount(room, side, u) {
  const [x1, y1, x2, y2] = room.rect
  const along = side === 'n' || side === 's' ? x1 + u * (x2 - x1) : y1 + u * (y2 - y1)
  const t = room.hasWalls ? wallThickness(room, side, along) : 0
  switch (side) {
    case 'n': return { x: px(along), z: pz(y1) + t, rotY: 0 }
    case 's': return { x: px(along), z: pz(y2) - t, rotY: Math.PI }
    case 'w': return { x: px(x1) + t, z: pz(along), rotY: Math.PI / 2 }
    default:  return { x: px(x2) - t, z: pz(along), rotY: -Math.PI / 2 }
  }
}

/** Room containing a plan-pixel point (or null). */
export function roomAt(x, y) {
  return ROOMS.find(({ rect: [x1, y1, x2, y2] }) => x > x1 && x < x2 && y > y1 && y < y2) || null
}

/**
 * Stretches of a room side that are solid wall on the far side (a neighbouring
 * room's wall), minus door openings — in room-local metres along the side.
 * Used to run handrails along corridors without crossing doors or junctions.
 */
export function solidSpans(room, side, doorMargin = 0.35) {
  const s = sideInfo(room.rect, side)
  const gaps = DOORS.filter((d) => {
    if (s.horizontal !== (d.orient === 'h')) return false
    const line = s.horizontal ? d.at[1] : d.at[0]
    return Math.abs(line - s.line) < EPS
  }).map((d) => {
    const c = s.horizontal ? d.at[0] : d.at[1]
    const half = d.width / 2 / SCALE + doorMargin / SCALE
    return [c - half, c + half]
  })
  const out = []
  for (const [a, b] of coveredIntervals(room, side)) {
    let start = a
    for (const [g0, g1] of gaps.filter(([g0, g1]) => g1 > a && g0 < b).sort((p, q) => p[0] - q[0])) {
      if (g0 > start) out.push([start, g0])
      start = Math.max(start, g1)
    }
    if (b > start) out.push([start, b])
  }
  return out
    .map(([a, b]) => [(a - s.a) * SCALE, (b - s.a) * SCALE])
    .filter(([a, b]) => b - a > 0.6)
}

export const BUILDING_BOUNDS = (() => {
  const xs = ROOMS.flatMap((r) => [r.x1, r.x2])
  const zs = ROOMS.flatMap((r) => [r.z1, r.z2])
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
})()

export const BUILDING = { id: registry.building_id, floorId: registry.floor_id }
