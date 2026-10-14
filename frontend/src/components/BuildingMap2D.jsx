import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS  (SVG viewBox = 0 0 900 680)
// Matches the provided hospital floor-plan image exactly.
// ─────────────────────────────────────────────────────────────────────────────

// Outer building wall
const WALL = { x: 10, y: 10, w: 880, h: 660 }

// Corridor Y-bands (the horizontal walkways between room rows)
const CORRIDOR_TOP    = { y: 190, h: 36 }   // between top row and middle row
const CORRIDOR_BOTTOM = { y: 450, h: 36 }   // between middle row and bottom row

// ─── Room definitions ────────────────────────────────────────────────────────
// fill      = light interior color (like the image)
// textColor = dark text on light background
const ROOMS = [
  // ── Top row ────────────────────────────────────────────────────────────────
  { id:'icu',               x:10,  y:10,  w:175, h:180, label:['ICU','(4 Beds)'],          fill:'#BDE8F7', textColor:'#0A3550', icon:'beds4',    borderColor:'#1A5276' },
  { id:'isolation_room',    x:185, y:10,  w:145, h:180, label:['Isolation','Room'],          fill:'#D6EAF8', textColor:'#1A3A5C', icon:'bed1',     borderColor:'#2E86C1' },
  { id:'patient_room',      x:330, y:10,  w:155, h:180, label:['Patient Room','(2 Beds)'],   fill:'#D6EAF8', textColor:'#1A3A5C', icon:'beds2',    borderColor:'#2E86C1' },
  { id:'operation_theater', x:485, y:10,  w:175, h:180, label:['Operating','Theatre (OT)'], fill:'#D5F5E3', textColor:'#0B5345', icon:'ot',       borderColor:'#1E8449' },
  // right gap space (665–900) is handled by wall
  { id:'general_ward',      x:660, y:10,  w:230, h:215, label:['General Ward','(6 Beds)'],   fill:'#FADBD8', textColor:'#641E16', icon:'beds6',    borderColor:'#C0392B' },

  // ── Middle row ─────────────────────────────────────────────────────────────
  { id:'radiology',         x:10,  y:226, w:115, h:130, label:['Radiology','(X-Ray)'],       fill:'#E8DAEF', textColor:'#4A235A', icon:'xray',     borderColor:'#8E44AD' },
  { id:'lab',               x:10,  y:356, w:115, h:130, label:['Lab'],                       fill:'#E8DAEF', textColor:'#4A235A', icon:'lab',      borderColor:'#8E44AD' },
  { id:'pharmacy',          x:125, y:226, w:150, h:260, label:['Pharmacy'],                  fill:'#D1F2EB', textColor:'#0E6655', icon:'pharmacy', borderColor:'#1ABC9C' },
  { id:'waiting_area',      x:275, y:226, w:165, h:260, label:['Waiting','Area'],             fill:'#EBF5FB', textColor:'#154360', icon:'chairs',   borderColor:'#2E86C1' },
  { id:'administration',    x:440, y:226, w:155, h:115, label:['Administration'],             fill:'#FEF9E7', textColor:'#7D6608', icon:'desk',     borderColor:'#D4AC0D' },
  { id:'records',           x:440, y:341, w:155, h:145, label:['Records'],                   fill:'#FEF9E7', textColor:'#7D6608', icon:'doc',      borderColor:'#D4AC0D' },
  { id:'maternity_ward',    x:660, y:226, w:230, h:220, label:['Maternity Ward','(4 Beds)'],  fill:'#FADBD8', textColor:'#641E16', icon:'beds4',    borderColor:'#C0392B' },

  // ── Bottom row ─────────────────────────────────────────────────────────────
  { id:'cafeteria',         x:10,  y:486, w:155, h:184, label:['Cafeteria'],                 fill:'#FDFEFE', textColor:'#1C2833', icon:'cafe',     borderColor:'#839192' },
  { id:'main_lobby',        x:220, y:486, w:185, h:184, label:['Main Lobby &','Reception'],   fill:'#EBF5FB', textColor:'#154360', icon:'reception',borderColor:'#2E86C1' },
  { id:'emergency_dept',    x:440, y:486, w:155, h:184, label:['Emergency','Department'],     fill:'#FDEDEC', textColor:'#7B241C', icon:'emergency',borderColor:'#E74C3C' },
  { id:'blood_bank',        x:660, y:486, w:140, h:130, label:['Blood Bank'],                fill:'#EBF5FB', textColor:'#154360', icon:'blood',    borderColor:'#2E86C1' },
]

// ─── Exit definitions ─────────────────────────────────────────────────────────
// Placed at corners/edges, matching image
const EXITS = [
  { id:'EXIT-NW', x:10,  y:10,  label:'Emergency\nExit', side:'tl' },
  { id:'EXIT-NE', x:800, y:10,  label:'Emergency\nExit', side:'tr' },
  { id:'EXIT-SW', x:10,  y:620, label:'Emergency\nExit', side:'bl' },
  { id:'EXIT-S',  x:340, y:645, label:'Main\nEntrance',  side:'bc' },
  { id:'EXIT-SE', x:800, y:620, label:'Emergency\nExit', side:'br' },
]

// ─── Hazard state overlay colors ──────────────────────────────────────────────
const HAZARD = {
  NORMAL:   { fill:'#D5F5E3', border:'#1E8449', badge:null },
  WARNING:  { fill:'#FEF9E7', border:'#D4AC0D', badge:'WARN' },
  HIGH_RISK:{ fill:'#FDEBD0', border:'#D35400', badge:'HIGH' },
  CRITICAL: { fill:'#FDEDEC', border:'#C0392B', badge:'CRIT' },
  UNKNOWN:  { fill:null,      border:null,       badge:null },
}

// ─── Corridor waypoints for route rendering ───────────────────────────────────
// Each room has an entry-point on the nearest corridor strip.
// Route lines follow: room-center → corridor-waypoint → corridor-waypoint → room-center
// This keeps route lines inside corridors, never cutting through rooms diagonally.

const TOP_CORRIDOR_Y    = CORRIDOR_TOP.y + CORRIDOR_TOP.h / 2       // 208
const BOTTOM_CORRIDOR_Y = CORRIDOR_BOTTOM.y + CORRIDOR_BOTTOM.h / 2 // 468

// Corridor entry X per room (horizontal mid-point clamped to corridor)
const CORRIDOR_ENTRY = {
  // Top row → enters TOP corridor from above
  icu:               { x: 97,  topY: TOP_CORRIDOR_Y },
  isolation_room:    { x: 257, topY: TOP_CORRIDOR_Y },
  patient_room:      { x: 407, topY: TOP_CORRIDOR_Y },
  operation_theater: { x: 572, topY: TOP_CORRIDOR_Y },
  general_ward:      { x: 775, topY: TOP_CORRIDOR_Y },

  // Middle row → enters TOP corridor from below OR BOTTOM corridor from above
  radiology:         { x: 67,  topY: TOP_CORRIDOR_Y, bottomY: BOTTOM_CORRIDOR_Y },
  lab:               { x: 67,  topY: TOP_CORRIDOR_Y, bottomY: BOTTOM_CORRIDOR_Y },
  pharmacy:          { x: 200, topY: TOP_CORRIDOR_Y, bottomY: BOTTOM_CORRIDOR_Y },
  waiting_area:      { x: 357, topY: TOP_CORRIDOR_Y, bottomY: BOTTOM_CORRIDOR_Y },
  administration:    { x: 517, topY: TOP_CORRIDOR_Y, bottomY: BOTTOM_CORRIDOR_Y },
  records:           { x: 517, topY: TOP_CORRIDOR_Y, bottomY: BOTTOM_CORRIDOR_Y },
  maternity_ward:    { x: 775, topY: TOP_CORRIDOR_Y, bottomY: BOTTOM_CORRIDOR_Y },

  // Bottom row → enters BOTTOM corridor from below
  cafeteria:         { x: 87,  bottomY: BOTTOM_CORRIDOR_Y },
  main_lobby:        { x: 312, bottomY: BOTTOM_CORRIDOR_Y },
  emergency_dept:    { x: 517, bottomY: BOTTOM_CORRIDOR_Y },
  blood_bank:        { x: 730, bottomY: BOTTOM_CORRIDOR_Y },

  // Exits
  'EXIT-NW':         { x: 60,  topY: TOP_CORRIDOR_Y },
  'EXIT-NE':         { x: 850, topY: TOP_CORRIDOR_Y },
  'EXIT-SW':         { x: 60,  bottomY: BOTTOM_CORRIDOR_Y },
  'EXIT-S':          { x: 390, bottomY: BOTTOM_CORRIDOR_Y },
  'EXIT-SE':         { x: 850, bottomY: BOTTOM_CORRIDOR_Y },
}

// Room geometric centers
const ROOM_CENTER = Object.fromEntries(
  ROOMS.map(r => [r.id, { x: r.x + r.w / 2, y: r.y + r.h / 2 }])
)

// Exit centers
const EXIT_CENTER = {
  'EXIT-NW': { x: 55,  y: 55  },
  'EXIT-NE': { x: 845, y: 55  },
  'EXIT-SW': { x: 55,  y: 645 },
  'EXIT-S':  { x: 390, y: 665 },
  'EXIT-SE': { x: 845, y: 645 },
}

function getCenter(id) {
  return ROOM_CENTER[id] || EXIT_CENTER[id] || { x: 450, y: 340 }
}

// Determine which corridor strip a node uses and its direction
function getNodeRow(id) {
  const topRow    = ['icu','isolation_room','patient_room','operation_theater','general_ward','EXIT-NW','EXIT-NE']
  const middleRow = ['radiology','lab','pharmacy','waiting_area','administration','records','maternity_ward']
  const bottomRow = ['cafeteria','main_lobby','emergency_dept','blood_bank','EXIT-SW','EXIT-S','EXIT-SE']
  if (topRow.includes(id))    return 'top'
  if (middleRow.includes(id)) return 'middle'
  if (bottomRow.includes(id)) return 'bottom'
  return 'middle'
}

// Build a polyline path between two nodes that travels through the corridor strips
// instead of cutting diagonally through rooms
function buildRoutePath(fromId, toId) {
  const c1   = getCenter(fromId)
  const c2   = getCenter(toId)
  const row1 = getNodeRow(fromId)
  const row2 = getNodeRow(toId)
  const e1   = CORRIDOR_ENTRY[fromId] || {}
  const e2   = CORRIDOR_ENTRY[toId]   || {}

  const pts = [c1]

  if (row1 === row2) {
    // Same row — travel horizontally in their shared corridor
    if (row1 === 'top') {
      pts.push({ x: c1.x, y: TOP_CORRIDOR_Y })
      pts.push({ x: c2.x, y: TOP_CORRIDOR_Y })
    } else if (row1 === 'bottom') {
      pts.push({ x: c1.x, y: BOTTOM_CORRIDOR_Y })
      pts.push({ x: c2.x, y: BOTTOM_CORRIDOR_Y })
    } else {
      // Both middle — cross via top corridor
      pts.push({ x: c1.x, y: TOP_CORRIDOR_Y })
      pts.push({ x: c2.x, y: TOP_CORRIDOR_Y })
    }
  } else if (row1 === 'top' && row2 === 'middle') {
    pts.push({ x: c1.x, y: TOP_CORRIDOR_Y })
    pts.push({ x: c2.x, y: TOP_CORRIDOR_Y })
  } else if (row1 === 'middle' && row2 === 'top') {
    pts.push({ x: c1.x, y: TOP_CORRIDOR_Y })
    pts.push({ x: c2.x, y: TOP_CORRIDOR_Y })
  } else if (row1 === 'middle' && row2 === 'bottom') {
    pts.push({ x: c1.x, y: BOTTOM_CORRIDOR_Y })
    pts.push({ x: c2.x, y: BOTTOM_CORRIDOR_Y })
  } else if (row1 === 'bottom' && row2 === 'middle') {
    pts.push({ x: c1.x, y: BOTTOM_CORRIDOR_Y })
    pts.push({ x: c2.x, y: BOTTOM_CORRIDOR_Y })
  } else if (row1 === 'top' && row2 === 'bottom') {
    pts.push({ x: c1.x, y: TOP_CORRIDOR_Y })
    pts.push({ x: c2.x, y: TOP_CORRIDOR_Y })
    pts.push({ x: c2.x, y: BOTTOM_CORRIDOR_Y })
  } else if (row1 === 'bottom' && row2 === 'top') {
    pts.push({ x: c1.x, y: BOTTOM_CORRIDOR_Y })
    pts.push({ x: c2.x, y: BOTTOM_CORRIDOR_Y })
    pts.push({ x: c2.x, y: TOP_CORRIDOR_Y })
  }

  pts.push(c2)

  // Remove consecutive duplicate points
  const clean = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const prev = clean[clean.length - 1]
    if (Math.abs(pts[i].x - prev.x) > 0.5 || Math.abs(pts[i].y - prev.y) > 0.5) {
      clean.push(pts[i])
    }
  }
  return clean.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ')
}

// ─── Small room icons ─────────────────────────────────────────────────────────
function RoomIcon({ type, cx, cy, color }) {
  const c = color || '#555'
  const s = { fill: c, stroke: 'none' }

  switch (type) {
    case 'bed1': return (
      <g transform={`translate(${cx - 14},${cy - 8})`}>
        <rect x={0} y={4} width={28} height={12} rx={2} fill={c} opacity={0.8} />
        <rect x={0} y={0} width={12} height={8}  rx={2} fill={c} opacity={0.6} />
      </g>
    )
    case 'beds2': return (
      <g transform={`translate(${cx - 20},${cy - 8})`}>
        {[0, 22].map(ox => (
          <g key={ox} transform={`translate(${ox},0)`}>
            <rect x={0} y={4} width={18} height={10} rx={2} fill={c} opacity={0.8} />
            <rect x={0} y={0} width={8}  height={7}  rx={2} fill={c} opacity={0.6} />
          </g>
        ))}
      </g>
    )
    case 'beds4': return (
      <g transform={`translate(${cx - 34},${cy - 8})`}>
        {[0,17,34,51].map(ox => (
          <g key={ox} transform={`translate(${ox},0)`}>
            <rect x={0} y={3} width={14} height={9} rx={2} fill={c} opacity={0.8} />
            <rect x={0} y={0} width={6}  height={6} rx={2} fill={c} opacity={0.6} />
          </g>
        ))}
      </g>
    )
    case 'beds6': return (
      <g transform={`translate(${cx - 42},${cy - 14})`}>
        {[0,1].map(row => (
          [0,18,36,54,72,90].slice(0,3).map(ox => (
            <g key={`${row}-${ox}`} transform={`translate(${ox},${row * 16})`}>
              <rect x={0} y={2} width={14} height={9} rx={2} fill={c} opacity={0.8} />
              <rect x={0} y={0} width={6}  height={6} rx={2} fill={c} opacity={0.6} />
            </g>
          ))
        ))}
      </g>
    )
    case 'ot': return (
      <g>
        <circle cx={cx} cy={cy} r={16} fill="none" stroke={c} strokeWidth={2} opacity={0.7} />
        <line x1={cx-12} y1={cy} x2={cx+12} y2={cy} stroke={c} strokeWidth={2} />
        <line x1={cx} y1={cy-12} x2={cx} y2={cy+12} stroke={c} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={5} fill={c} opacity={0.5} />
      </g>
    )
    case 'xray': return (
      <g>
        <rect x={cx-12} y={cy-14} width={24} height={18} rx={2} fill="none" stroke={c} strokeWidth={1.5} />
        <line x1={cx-8} y1={cy-6} x2={cx+8} y2={cy+6} stroke={c} strokeWidth={1.5} />
        <line x1={cx+8} y1={cy-6} x2={cx-8} y2={cy+6} stroke={c} strokeWidth={1.5} />
        <rect x={cx-10} y={cy+6} width={20} height={5} rx={1} fill={c} opacity={0.4} />
      </g>
    )
    case 'lab': return (
      <g>
        <polygon points={`${cx},${cy-16} ${cx-10},${cy+10} ${cx+10},${cy+10}`} fill="none" stroke={c} strokeWidth={1.5} />
        <line x1={cx} y1={cy-8} x2={cx} y2={cy+6} stroke={c} strokeWidth={1.5} />
        <ellipse cx={cx} cy={cy+10} rx={10} ry={4} fill={c} opacity={0.3} />
      </g>
    )
    case 'pharmacy': return (
      <g>
        <ellipse cx={cx} cy={cy} rx={14} ry={9} fill="none" stroke={c} strokeWidth={2} transform={`rotate(-30,${cx},${cy})`} />
        <ellipse cx={cx} cy={cy} rx={14} ry={9} fill={c} opacity={0.15} transform={`rotate(-30,${cx},${cy})`} />
      </g>
    )
    case 'chairs': return (
      <g>
        {[-18,-6,6,18].map(ox => (
          <g key={ox} transform={`translate(${cx+ox},${cy})`}>
            <rect x={-4} y={-8} width={8} height={6} rx={1} fill={c} opacity={0.7} />
            <rect x={-4} y={-2} width={8} height={8} rx={1} fill={c} opacity={0.5} />
            <line x1={-4} y1={6} x2={-4} y2={10} stroke={c} strokeWidth={1} />
            <line x1={4}  y1={6} x2={4}  y2={10} stroke={c} strokeWidth={1} />
          </g>
        ))}
      </g>
    )
    case 'desk': return (
      <g>
        <rect x={cx-20} y={cy-8} width={40} height={16} rx={2} fill={c} opacity={0.5} />
        <rect x={cx-8}  y={cy-16} width={6} height={10} rx={1} fill={c} opacity={0.7} />
        <circle cx={cx+14} cy={cy} r={6} fill="none" stroke={c} strokeWidth={1.5} opacity={0.7} />
      </g>
    )
    case 'doc': return (
      <g>
        <rect x={cx-12} y={cy-16} width={24} height={28} rx={2} fill="none" stroke={c} strokeWidth={1.5} />
        <line x1={cx-8} y1={cy-8}  x2={cx+8} y2={cy-8}  stroke={c} strokeWidth={1.2} />
        <line x1={cx-8} y1={cy-2}  x2={cx+8} y2={cy-2}  stroke={c} strokeWidth={1.2} />
        <line x1={cx-8} y1={cy+4}  x2={cx+4} y2={cy+4}  stroke={c} strokeWidth={1.2} />
      </g>
    )
    case 'cafe': return (
      <g>
        {[-18,0,18].map(ox => (
          <g key={ox} transform={`translate(${cx+ox},${cy-4})`}>
            <rect x={-7} y={0} width={14} height={8} rx={1} fill={c} opacity={0.4} />
            <line x1={-7} y1={8} x2={-7} y2={14} stroke={c} strokeWidth={1} />
            <line x1={7}  y1={8} x2={7}  y2={14} stroke={c} strokeWidth={1} />
            <line x1={-7} y1={14} x2={7} y2={14} stroke={c} strokeWidth={1} />
          </g>
        ))}
      </g>
    )
    case 'reception': return (
      <g>
        <ellipse cx={cx} cy={cy+4} rx={20} ry={10} fill="none" stroke={c} strokeWidth={1.5} />
        <circle cx={cx} cy={cy-8} r={7} fill="none" stroke={c} strokeWidth={1.5} />
      </g>
    )
    case 'emergency': return (
      <g>
        <rect x={cx-16} y={cy-6} width={32} height={12} rx={2} fill={c} opacity={0.7} />
        <rect x={cx-6} y={cy-16} width={12} height={32} rx={2} fill={c} opacity={0.7} />
      </g>
    )
    case 'blood': return (
      <g>
        <path d={`M${cx},${cy-18} C${cx+14},${cy} ${cx+14},${cy+8} ${cx},${cy+16} C${cx-14},${cy+8} ${cx-14},${cy} ${cx},${cy-18}`}
          fill={c} opacity={0.6} />
      </g>
    )
    default: return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BuildingMap2D({
  building,
  rooms = [],
  route,
  onRoomSelect,
  selectedRoom,
  compact = false,
}) {
  // Live hazard lookup
  const hazardMap = Object.fromEntries((rooms || []).map(r => [r.room_id, r.current_hazard_level]))

  // Route sets
  const routeNodes = new Set(route?.node_ids || [])
  const hasRoute   = route?.status === 'ROUTE_FOUND' && routeNodes.size > 0

  // Build route polyline segments from consecutive node_ids
  const routeSegments = []
  if (hasRoute && route.node_ids && route.node_ids.length >= 2) {
    for (let i = 0; i < route.node_ids.length - 1; i++) {
      routeSegments.push({ from: route.node_ids[i], to: route.node_ids[i + 1] })
    }
  }

  // Available exits
  const availableExits = new Set(
    (building?.exits || EXITS).filter(e => e.available !== false).map(e => e.exit_id || e.id)
  )

  const VW = 900, VH = 680

  return (
    <div style={{
      background: '#F8F9FA',
      borderRadius: 8,
      border: '2px solid #BDC3C7',
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
      aspectRatio: compact ? '16/9' : `${VW}/${VH}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="Hospital Ground Floor 2D Plan"
      >
        <defs>
          {/* Route arrow */}
          <marker id="arr-route" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#27AE60" />
          </marker>
          {/* Drop shadow */}
          <filter id="shadow" x="-5%" y="-5%" width="115%" height="115%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* ── Outer building background ───────────────────────────────────── */}
        <rect x={0} y={0} width={VW} height={VH} fill="#E8ECEF" />
        <rect x={WALL.x} y={WALL.y} width={WALL.w} height={WALL.h}
          rx={4} fill="#D5D8DC" stroke="#2C3E50" strokeWidth={4} />

        {/* ── Corridor strips (light grey walkways) ─────────────────────── */}
        <rect x={WALL.x} y={CORRIDOR_TOP.y} width={WALL.w} height={CORRIDOR_TOP.h}
          fill="#D0D3D4" />
        <rect x={WALL.x} y={CORRIDOR_BOTTOM.y} width={WALL.w} height={CORRIDOR_BOTTOM.h}
          fill="#D0D3D4" />

        {/* Corridor centre dashed line */}
        {[CORRIDOR_TOP, CORRIDOR_BOTTOM].map((c, i) => (
          <line key={i}
            x1={WALL.x + 10} y1={c.y + c.h / 2}
            x2={WALL.x + WALL.w - 10} y2={c.y + c.h / 2}
            stroke="#BDC3C7" strokeWidth={1} strokeDasharray="10 8" />
        ))}

        {/* ── Green evacuation arrows on corridors ─────────────────────── */}
        {!compact && [
          // Top corridor arrows (left → right)
          { x1:200, y1:208, x2:290, y2:208 },
          { x1:370, y1:208, x2:460, y2:208 },
          { x1:540, y1:208, x2:630, y2:208 },
          // Bottom corridor arrows
          { x1:195, y1:468, x2:280, y2:468 },
          { x1:440, y1:468, x2:530, y2:468 },
          { x1:620, y1:468, x2:710, y2:468 },
        ].map((a, i) => (
          <line key={i}
            x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke="#27AE60" strokeWidth={2}
            markerEnd="url(#arr-green)"
            opacity={0.7}
          />
        ))}
        <defs>
          <marker id="arr-green" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="#27AE60" />
          </marker>
        </defs>

        {/* ── Room rectangles (draw FIRST so route goes on top) ────────── */}
        {ROOMS.map(room => {
          const hazard   = hazardMap[room.id]
          const hData    = hazard && hazard !== 'UNKNOWN' ? HAZARD[hazard] : null
          const fillCol  = hData ? hData.fill : room.fill
          const bordCol  = hData ? hData.border : room.borderColor
          const isOnRoute  = routeNodes.has(room.id)
          const isSelected = selectedRoom === room.id

          return (
            <g
              key={room.id}
              onClick={() => onRoomSelect?.(room.id)}
              style={{ cursor: onRoomSelect ? 'pointer' : 'default' }}
              role="button"
              tabIndex={0}
              aria-label={`${room.label.join(' ')} — ${hazard || 'UNKNOWN'}`}
              onKeyDown={e => e.key === 'Enter' && onRoomSelect?.(room.id)}
              filter="url(#shadow)"
            >
              {/* Main room fill */}
              <rect
                x={room.x} y={room.y} width={room.w} height={room.h}
                fill={fillCol}
                stroke={isSelected ? '#2980B9' : isOnRoute ? '#27AE60' : bordCol}
                strokeWidth={isSelected ? 3 : isOnRoute ? 3 : 2}
                rx={0}
              />

              {/* Route highlight: green border glow */}
              {isOnRoute && !isSelected && (
                <rect
                  x={room.x - 2} y={room.y - 2}
                  width={room.w + 4} height={room.h + 4}
                  fill="none"
                  stroke="#27AE60"
                  strokeWidth={4}
                  opacity={0.35}
                  rx={1}
                />
              )}

              {/* Selected: blue highlight */}
              {isSelected && (
                <rect
                  x={room.x - 2} y={room.y - 2}
                  width={room.w + 4} height={room.h + 4}
                  fill="rgba(41,128,185,0.08)"
                  stroke="#2980B9"
                  strokeWidth={3}
                  rx={1}
                />
              )}

              {/* Room icon */}
              {!compact && (
                <RoomIcon
                  type={room.icon}
                  cx={room.x + room.w / 2}
                  cy={room.y + room.h * 0.62}
                  color={room.textColor}
                />
              )}

              {/* Room label */}
              {room.label.map((line, i) => (
                <text
                  key={i}
                  x={room.x + room.w / 2}
                  y={room.y + (compact ? room.h * 0.52 : room.h * 0.28) + i * (compact ? 11 : 13)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="'Segoe UI', Arial, sans-serif"
                  fontSize={compact ? Math.min(9, room.w / 10) : Math.min(11, room.w / 9)}
                  fontWeight={600}
                  fill={room.textColor}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {line}
                </text>
              ))}

              {/* Hazard badge */}
              {hData?.badge && (
                <g>
                  <rect
                    x={room.x + room.w - 30} y={room.y + 4}
                    width={26} height={13} rx={3}
                    fill={bordCol} opacity={0.92}
                  />
                  <text
                    x={room.x + room.w - 17} y={room.y + 11.5}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={6.5} fontWeight={700} fill="#fff"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {hData.badge}
                  </text>
                </g>
              )}

              {/* NORMAL green dot */}
              {hazard === 'NORMAL' && (
                <circle
                  cx={room.x + room.w - 10} cy={room.y + 10}
                  r={5} fill="#27AE60"
                />
              )}
            </g>
          )
        })}

        {/* ── Door arcs (decorative, matches image) ────────────────────── */}
        {!compact && [
          // Top corridor door arcs (rooms opening onto top corridor)
          { cx:175, cy:190, r:16, start:180, end:270 },
          { cx:185, cy:190, r:16, start:270, end:360 },
          { cx:320, cy:190, r:16, start:180, end:270 },
          { cx:330, cy:190, r:16, start:270, end:360 },
          { cx:465, cy:190, r:16, start:180, end:270 },
          { cx:475, cy:190, r:16, start:270, end:360 },
          // Bottom corridor door arcs
          { cx:210, cy:450, r:16, start:90,  end:180 },
          { cx:220, cy:450, r:16, start:0,   end:90  },
          { cx:430, cy:450, r:16, start:90,  end:180 },
          { cx:440, cy:450, r:16, start:0,   end:90  },
        ].map((arc, i) => {
          const rad = Math.PI / 180
          const x1  = arc.cx + arc.r * Math.cos(arc.start * rad)
          const y1  = arc.cy + arc.r * Math.sin(arc.start * rad)
          const x2  = arc.cx + arc.r * Math.cos(arc.end   * rad)
          const y2  = arc.cy + arc.r * Math.sin(arc.end   * rad)
          return (
            <path key={i}
              d={`M${x1},${y1} A${arc.r},${arc.r} 0 0,1 ${x2},${y2}`}
              fill="none" stroke="#2C3E50" strokeWidth={2}
              aria-hidden="true"
            />
          )
        })}

        {/* ── Fire extinguishers ────────────────────────────────────────── */}
        {!compact && [
          { x:180, y:194 }, { x:328, y:194 }, { x:483, y:194 }, { x:658, y:194 },
          { x:218, y:452 }, { x:438, y:452 }, { x:658, y:452 },
        ].map((f, i) => (
          <g key={i} aria-hidden="true">
            <rect x={f.x-3} y={f.y-8}  width={6} height={12} rx={1} fill="#E74C3C" />
            <rect x={f.x-5} y={f.y-10} width={10} height={4} rx={1} fill="#922B21" />
            <line x1={f.x} y1={f.y-10} x2={f.x+5} y2={f.y-14} stroke="#922B21" strokeWidth={1.5} />
          </g>
        ))}

        {/* ── Fire alarm (red circle) ───────────────────────────────────── */}
        {!compact && (
          <g aria-hidden="true">
            <circle cx={658} cy={190} r={7} fill="#E74C3C" stroke="#7B241C" strokeWidth={1.5} />
            <circle cx={658} cy={190} r={4} fill="none"    stroke="#FDEDEC"  strokeWidth={1} />
          </g>
        )}

        {/* ── ROUTE OVERLAY (polyline through corridors) ────────────────── */}
        {routeSegments.map((seg, i) => {
          const pts = buildRoutePath(seg.from, seg.to)
          return (
            <polyline
              key={i}
              points={pts}
              fill="none"
              stroke="#27AE60"
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round"
              markerEnd="url(#arr-route)"
              opacity={0.92}
            />
          )
        })}

        {/* Route origin pulse ring */}
        {hasRoute && route.node_ids?.[0] && (() => {
          const c = getCenter(route.node_ids[0])
          return (
            <circle cx={c.x} cy={c.y} r={10}
              fill="rgba(39,174,96,0.2)"
              stroke="#27AE60" strokeWidth={2.5}
            />
          )
        })()}

        {/* ── Exit signs ───────────────────────────────────────────────── */}
        {EXITS.map(exit => {
          const available = availableExits.has(exit.id)
          const onRoute   = routeNodes.has(exit.id)
          const bg        = onRoute ? '#1A5276' : available ? '#145A32' : '#641E16'
          const bc        = onRoute ? '#3498DB' : available ? '#27AE60' : '#E74C3C'
          const tc        = '#FFFFFF'
          const lines     = exit.label.split('\n')

          // Position: 80×40 badge
          let bx, by
          if (exit.side === 'tl') { bx = WALL.x;          by = WALL.y }
          if (exit.side === 'tr') { bx = WALL.x+WALL.w-80; by = WALL.y }
          if (exit.side === 'bl') { bx = WALL.x;           by = WALL.y+WALL.h-40 }
          if (exit.side === 'bc') { bx = exit.x - 40;      by = WALL.y+WALL.h }
          if (exit.side === 'br') { bx = WALL.x+WALL.w-80; by = WALL.y+WALL.h-40 }

          return (
            <g key={exit.id} aria-label={`${exit.id} — ${available ? 'available' : 'unavailable'}`}>
              <rect x={bx} y={by} width={80} height={40} rx={4}
                fill={bg} stroke={bc} strokeWidth={onRoute ? 2.5 : 1.5} />
              {/* Running-person icon */}
              <g transform={`translate(${bx+8},${by+6})`} fill={tc} aria-hidden="true">
                <circle cx={8}  cy={4}  r={3} />
                <path d="M5 8 L2 16 L6 16 L8 12 L10 16 L14 16 L11 8 L14 5 L9 5 Z" />
              </g>
              {lines.map((l, i) => (
                <text key={i}
                  x={bx + 48} y={by + 12 + i * 12}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Segoe UI', Arial, sans-serif"
                  fontSize={compact ? 7 : 8.5} fontWeight={700} fill={tc}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {l}
                </text>
              ))}
            </g>
          )
        })}

        {/* ── Main Entrance (bottom centre, matches image) ─────────────── */}
        {!compact && (
          <g aria-label="Main Entrance">
            {/* Entrance steps */}
            <rect x={330} y={660} width={120} height={18} rx={3}
              fill="#27AE60" stroke="#1E8449" strokeWidth={2} />
            <text x={390} y={673}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="'Segoe UI',Arial,sans-serif"
              fontSize={9} fontWeight={700} fill="#fff"
              style={{ pointerEvents:'none', userSelect:'none' }}>
              Main Entrance
            </text>
            {/* Bushes */}
            {[316, 454].map((bx, i) => (
              <g key={i}>
                <circle cx={bx} cy={668} r={9} fill="#1E8449" opacity={0.8} />
                <circle cx={bx+4} cy={663} r={7} fill="#27AE60" opacity={0.8} />
              </g>
            ))}
          </g>
        )}

        {/* ── No-route overlay ─────────────────────────────────────────── */}
        {(route?.status === 'NO_VALID_ROUTE' || route?.status === 'NO_AVAILABLE_EXIT') && (
          <g>
            <rect x={220} y={290} width={460} height={70} rx={8}
              fill="rgba(231,76,60,0.1)" stroke="#E74C3C" strokeWidth={2} />
            <text x={450} y={318}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="'Segoe UI',Arial,sans-serif"
              fontSize={15} fontWeight={700} fill="#C0392B">
              {route.status === 'NO_AVAILABLE_EXIT' ? '✕ No Available Exit' : '✕ No Valid Evacuation Route'}
            </text>
            <text x={450} y={342}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="'Segoe UI',Arial,sans-serif"
              fontSize={10} fill="#E74C3C">
              {route.status === 'NO_AVAILABLE_EXIT'
                ? 'All exits are marked unavailable'
                : 'All paths to exits are blocked or unsafe'}
            </text>
          </g>
        )}

        {/* ── Title (non-compact) ───────────────────────────────────────── */}
        {!compact && (
          <g>
            <rect x={290} y={0} width={320} height={28} rx={4}
              fill="#EBF5FB" stroke="#2E86C1" strokeWidth={1.5} />
            <text x={450} y={10}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="'Segoe UI',Arial,sans-serif"
              fontSize={11} fontWeight={700} fill="#1A5276">
              Hospital – 2D Floor Map
            </text>
            <text x={450} y={21}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="'Segoe UI',Arial,sans-serif"
              fontSize={8} fill="#2E86C1">
              (Ground Floor)
            </text>
          </g>
        )}

        {/* ── Compass rose ──────────────────────────────────────────────── */}
        {!compact && (
          <g transform="translate(858,658)" aria-hidden="true">
            <circle cx={0} cy={0} r={16} fill="#EBF5FB" stroke="#BDC3C7" strokeWidth={1} />
            {[['N',0,-13],['S',0,13],['E',13,0],['W',-13,0]].map(([l,dx,dy]) => (
              <text key={l} x={dx} y={dy}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fontWeight={700} fill="#2C3E50">
                {l}
              </text>
            ))}
            <polygon points="0,-10 2,-3 0,-6 -2,-3" fill="#E74C3C" />
            <polygon points="0,10 2,3 0,6 -2,3"   fill="#7F8C8D" />
          </g>
        )}
      </svg>
    </div>
  )
}
