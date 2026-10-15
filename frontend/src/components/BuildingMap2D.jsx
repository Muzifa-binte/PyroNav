import React, { useState } from 'react'

/**
 * Hospital 2D Floor Map (Ground Floor)
 * Exact 1:1 blueprint reproduction of the PyroNav hospital floor plan.
 * Matches all architectural dimensions, room colors, furniture, door swings,
 * safety equipment, exits, legend, and compass rose.
 */

// ── SVG Canvas Dimensions ───────────────────────────────────────────────────
const VW = 1020
const VH = 660

// ── Room Layout Definitions ─────────────────────────────────────────────────
export const ROOMS_DATA = [
  // ── Top Row ──
  {
    id: 'icu',
    name: 'ICU (4 Beds)',
    x: 75, y: 80, w: 165, h: 115,
    fill: '#BEE3F8',
    borderColor: '#1E293B',
    type: 'icu',
    label: ['ICU', '(4 Beds)'],
    door: { x: 85, y: 195, size: 24, orientation: 'bottom', swing: 'left' },
  },
  {
    id: 'isolation_room',
    name: 'Isolation Room',
    x: 240, y: 80, w: 95, h: 115,
    fill: '#F0D5EE',
    borderColor: '#1E293B',
    type: 'isolation',
    label: ['Isolation', 'Room'],
    door: { x: 250, y: 195, size: 24, orientation: 'bottom', swing: 'left' },
  },
  {
    id: 'patient_room',
    name: 'Patient Room (2 Beds)',
    x: 335, y: 80, w: 145, h: 115,
    fill: '#BEE3F8',
    borderColor: '#1E293B',
    type: 'patient',
    label: ['Patient Room', '(2 Beds)'],
    door: { x: 345, y: 195, size: 24, orientation: 'bottom', swing: 'left' },
  },
  {
    id: 'operation_theater',
    name: 'Operating Theatre (OT)',
    x: 480, y: 80, w: 180, h: 115,
    fill: '#D5EEDB',
    borderColor: '#1E293B',
    type: 'ot',
    label: ['Operating', 'Theatre (OT)'],
    door: { x: 635, y: 195, size: 24, orientation: 'bottom', swing: 'right' },
  },

  // ── Left Column ──
  {
    id: 'radiology',
    name: 'Radiology (X-Ray)',
    x: 40, y: 240, w: 115, h: 105,
    fill: '#EAD6F4',
    borderColor: '#1E293B',
    type: 'radiology',
    label: ['Radiology', '(X-Ray)'],
    door: { x: 155, y: 290, size: 24, orientation: 'right', swing: 'down' },
  },
  {
    id: 'lab',
    name: 'Lab',
    x: 40, y: 345, w: 115, h: 105,
    fill: '#EAD6F4',
    borderColor: '#1E293B',
    type: 'lab',
    label: ['Lab'],
    door: { x: 155, y: 395, size: 24, orientation: 'right', swing: 'down' },
  },
  {
    id: 'cafeteria',
    name: 'Cafeteria',
    x: 40, y: 450, w: 145, h: 120,
    fill: '#D5EEDB',
    borderColor: '#1E293B',
    type: 'cafeteria',
    label: ['Cafeteria'],
    door: { x: 185, y: 490, size: 24, orientation: 'right', swing: 'down' },
    exitDoor: { x: 40, y: 540, size: 24, orientation: 'left' },
  },

  // ── Center Section ──
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    x: 190, y: 240, w: 95, h: 190,
    fill: '#CCEBFB',
    borderColor: '#0F172A',
    borderWidth: 3,
    type: 'pharmacy',
    label: ['Pharmacy'],
    door: { x: 250, y: 240, size: 24, orientation: 'top', swing: 'left' },
    door2: { x: 220, y: 430, size: 24, orientation: 'bottom', swing: 'left' },
  },
  {
    id: 'waiting_area',
    name: 'Waiting Area',
    x: 285, y: 240, w: 160, h: 190,
    fill: '#FFFFFF',
    borderColor: '#1E293B',
    type: 'waiting_area',
    label: ['Waiting Area'],
  },
  {
    id: 'administration',
    name: 'Administration',
    x: 445, y: 240, w: 115, h: 95,
    fill: '#FFF2D1',
    borderColor: '#1E293B',
    type: 'admin',
    label: ['Administration'],
    door: { x: 445, y: 285, size: 24, orientation: 'left', swing: 'down' },
  },
  {
    id: 'records',
    name: 'Records',
    x: 445, y: 335, w: 115, h: 95,
    fill: '#FFF2D1',
    borderColor: '#1E293B',
    type: 'records',
    label: ['Records'],
    door: { x: 445, y: 400, size: 24, orientation: 'left', swing: 'down' },
  },

  // ── Right Column ──
  {
    id: 'general_ward',
    name: 'General Ward (6 Beds)',
    x: 595, y: 240, w: 185, h: 120,
    fill: '#FDD9CC',
    borderColor: '#1E293B',
    type: 'general_ward',
    label: ['General Ward', '(6 Beds)'],
    door: { x: 595, y: 290, size: 24, orientation: 'left', swing: 'down' },
  },
  {
    id: 'maternity_ward',
    name: 'Maternity Ward (4 Beds)',
    x: 595, y: 360, w: 185, h: 105,
    fill: '#FDD9CC',
    borderColor: '#1E293B',
    type: 'maternity_ward',
    label: ['Maternity Ward', '(4 Beds)'],
    door: { x: 595, y: 410, size: 24, orientation: 'left', swing: 'down' },
  },
  {
    id: 'blood_bank',
    name: 'Blood Bank',
    x: 690, y: 465, w: 90, h: 105,
    fill: '#CCEBFB',
    borderColor: '#1E293B',
    type: 'blood_bank',
    label: ['Blood Bank'],
    door: { x: 690, y: 520, size: 24, orientation: 'left', swing: 'down' },
    exitDoor: { x: 745, y: 570, size: 24, orientation: 'bottom' },
  },

  // ── Bottom Center ──
  {
    id: 'main_lobby',
    name: 'Main Lobby & Reception',
    x: 285, y: 465, w: 160, h: 105,
    fill: '#FFF8EB',
    borderColor: '#1E293B',
    type: 'main_lobby',
    label: ['Main Lobby & Reception'],
    entrance: true,
  },
  {
    id: 'emergency_dept',
    name: 'Emergency Department',
    x: 465, y: 465, w: 95, h: 105,
    fill: '#E2DAF7',
    borderColor: '#1E293B',
    type: 'emergency_dept',
    label: ['Emergency', 'Department'],
    door: { x: 510, y: 465, size: 24, orientation: 'top', swing: 'left' },
  },
]

// ── Exit Sign Definitions ───────────────────────────────────────────────────
const EXITS = [
  { id: 'EXIT-NW', name: 'Emergency Exit', x: 25, y: 45, w: 105, h: 32, connected: 'icu' },
  { id: 'EXIT-NE', name: 'Emergency Exit', x: 685, y: 45, w: 105, h: 32, connected: 'operation_theater' },
  { id: 'EXIT-SW', name: 'Emergency Exit', x: 25, y: 595, w: 105, h: 32, connected: 'cafeteria' },
  { id: 'EXIT-SE', name: 'Emergency Exit', x: 690, y: 595, w: 105, h: 32, connected: 'blood_bank' },
  { id: 'EXIT-S',  name: 'Main Entrance',  x: 325, y: 620, w: 80,  h: 22, connected: 'main_lobby' },
]

// ── Corridor Waypoints for Safe Route Navigation ───────────────────────────
const ROOM_ENTRY_POINTS = {
  icu:               { x: 97,  y: 218 },
  isolation_room:    { x: 262, y: 218 },
  patient_room:      { x: 357, y: 218 },
  operation_theater: { x: 647, y: 218 },
  radiology:         { x: 172, y: 302 },
  lab:               { x: 172, y: 407 },
  cafeteria:         { x: 202, y: 502 },
  pharmacy:          { x: 232, y: 218 },
  waiting_area:      { x: 365, y: 300 },
  administration:    { x: 420, y: 297 },
  records:           { x: 420, y: 412 },
  general_ward:      { x: 578, y: 302 },
  maternity_ward:    { x: 578, y: 422 },
  blood_bank:        { x: 670, y: 532 },
  main_lobby:        { x: 365, y: 450 },
  emergency_dept:    { x: 512, y: 450 },
  'EXIT-NW':         { x: 55,  y: 218 },
  'EXIT-NE':         { x: 745, y: 218 },
  'EXIT-SW':         { x: 55,  y: 532 },
  'EXIT-S':          { x: 365, y: 555 },
  'EXIT-SE':         { x: 745, y: 532 },
}

// ── Room Icons & Furniture Helpers ──────────────────────────────────────────

function HospitalBed({ x, y, width = 24, height = 20, color = '#2563EB' }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Bed frame */}
      <rect x={0} y={4} width={width} height={height - 4} rx={2} fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
      {/* Pillow */}
      <rect x={2} y={5} width={width - 4} height={4} rx={1} fill="#E2E8F0" stroke={color} strokeWidth={0.8} />
      {/* Blanket fold */}
      <line x1={0} y1={11} x2={width} y2={11} stroke={color} strokeWidth={1.2} />
      {/* Headboard */}
      <rect x={0} y={1} width={width} height={3} rx={1} fill={color} />
      {/* Footboard */}
      <rect x={0} y={height - 2} width={width} height={2} rx={0.5} fill={color} />
    </g>
  )
}

function PottedPlant({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Pot */}
      <polygon points="-5,6 5,6 3.5,12 -3.5,12" fill="#B45309" stroke="#78350F" strokeWidth={0.8} />
      {/* Plant leaves */}
      <circle cx={-3} cy={2} r={4.5} fill="#16A34A" />
      <circle cx={3}  cy={2} r={4.5} fill="#15803D" />
      <circle cx={0}  cy={-2} r={4.5} fill="#22C55E" />
      <circle cx={-4} cy={-1} r={3.5} fill="#4ADE80" opacity={0.7} />
      <circle cx={4}  cy={-1} r={3.5} fill="#16A34A" opacity={0.7} />
    </g>
  )
}

function WaitingChair({ x, y, color = '#2563EB' }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Seat back */}
      <rect x={-7} y={-7} width={14} height={5} rx={1} fill={color} opacity={0.9} />
      {/* Seat cushion */}
      <rect x={-7} y={-1} width={14} height={8} rx={1} fill={color} />
      {/* Legs */}
      <line x1={-6} y1={7} x2={-6} y2={11} stroke="#64748B" strokeWidth={1.2} />
      <line x1={6}  y1={7} x2={6}  y2={11} stroke="#64748B" strokeWidth={1.2} />
    </g>
  )
}

function FireExtinguisher({ x, y, orientation = 'vertical' }) {
  return (
    <g transform={`translate(${x},${y})`} filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))">
      {/* Body */}
      <rect x={-3.5} y={-8} width={7} height={15} rx={2} fill="#DC2626" stroke="#991B1B" strokeWidth={0.8} />
      {/* Handle & Gauge */}
      <rect x={-2.5} y={-11} width={5} height={3} rx={0.5} fill="#1E293B" />
      <circle cx={2.5} cy={-9} r={1.2} fill="#FACC15" />
      {/* Hose */}
      <path d="M-2.5,-9 Q-6,-6 -3,1" fill="none" stroke="#1E293B" strokeWidth={1} />
      {/* Band */}
      <line x1={-3.5} y1={-2} x2={3.5} y2={-2} stroke="#FFFFFF" strokeWidth={1} />
    </g>
  )
}

function FireAlarmCallPoint({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`} filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))">
      {/* Target rings */}
      <circle cx={0} cy={0} r={8.5} fill="#DC2626" stroke="#991B1B" strokeWidth={1.2} />
      <circle cx={0} cy={0} r={5.5} fill="#FFFFFF" />
      <circle cx={0} cy={0} r={3}   fill="#DC2626" />
    </g>
  )
}

function EvacuationArrow({ x, y, direction = 'right' }) {
  const rot = direction === 'right' ? 0 : direction === 'down' ? 90 : direction === 'up' ? -90 : 180
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`} filter="drop-shadow(0 1px 1px rgba(0,0,0,0.2))">
      <path
        d="M-10,-3.5 L0,-3.5 L0,-7 L10,0 L0,7 L0,3.5 L-10,3.5 Z"
        fill="#15803D"
        stroke="#065F46"
        strokeWidth={0.8}
      />
    </g>
  )
}

function ArchitecturalDoor({ x, y, size = 24, orientation = 'bottom', swing = 'left' }) {
  // Draws authentic architectural door leaf and circular swing arc
  let leafX2, leafY2, arcPath
  const rad = size

  if (orientation === 'bottom') {
    if (swing === 'left') {
      leafX2 = x
      leafY2 = y + rad
      arcPath = `M ${x + rad} ${y} A ${rad} ${rad} 0 0 1 ${x} ${y + rad}`
    } else {
      leafX2 = x + rad
      leafY2 = y + rad
      arcPath = `M ${x} ${y} A ${rad} ${rad} 0 0 0 ${x + rad} ${y + rad}`
    }
  } else if (orientation === 'top') {
    leafX2 = x
    leafY2 = y - rad
    arcPath = `M ${x + rad} ${y} A ${rad} ${rad} 0 0 0 ${x} ${y - rad}`
  } else if (orientation === 'right') {
    leafX2 = x + rad
    leafY2 = y
    arcPath = `M ${x} ${y + rad} A ${rad} ${rad} 0 0 1 ${x + rad} ${y}`
  } else if (orientation === 'left') {
    leafX2 = x - rad
    leafY2 = y
    arcPath = `M ${x} ${y + rad} A ${rad} ${rad} 0 0 0 ${x - rad} ${y}`
  }

  return (
    <g>
      {/* Swing Arc (dashed or fine stroke) */}
      <path d={arcPath} fill="none" stroke="#64748B" strokeWidth={1} strokeDasharray="3 2" />
      {/* Door Leaf */}
      <line x1={x} y1={y} x2={leafX2} y2={leafY2} stroke="#1E293B" strokeWidth={2} />
    </g>
  )
}

// ── Compass Rose Component ──────────────────────────────────────────────────
function CompassRose({ cx, cy, size = 36 }) {
  const r = size
  const rSmall = size * 0.4
  return (
    <g transform={`translate(${cx},${cy})`}>
      {/* Outer Ring */}
      <circle cx={0} cy={0} r={r + 6} fill="none" stroke="#1E293B" strokeWidth={1.5} />
      <circle cx={0} cy={0} r={r + 8} fill="none" stroke="#64748B" strokeWidth={0.6} />

      {/* 8-Point Compass Star */}
      {/* North */}
      <polygon points={`0,0 -4,-${rSmall} 0,-${r}`} fill="#0F172A" />
      <polygon points={`0,0 4,-${rSmall} 0,-${r}`}  fill="#94A3B8" />
      {/* South */}
      <polygon points={`0,0 4,${rSmall} 0,${r}`}   fill="#0F172A" />
      <polygon points={`0,0 -4,${rSmall} 0,${r}`}  fill="#94A3B8" />
      {/* East */}
      <polygon points={`0,0 ${rSmall},-4 ${r},0`}  fill="#0F172A" />
      <polygon points={`0,0 ${rSmall},4 ${r},0`}   fill="#94A3B8" />
      {/* West */}
      <polygon points={`0,0 -${rSmall},4 -${r},0`} fill="#0F172A" />
      <polygon points={`0,0 -${rSmall},-4 -${r},0`}fill="#94A3B8" />

      {/* Minor Intercardinal points */}
      <polygon points={`0,0 0,-${rSmall * 0.8} ${rSmall * 0.8},-${rSmall * 0.8}`} fill="#64748B" opacity={0.6} />
      <polygon points={`0,0 0,${rSmall * 0.8} ${rSmall * 0.8},${rSmall * 0.8}`}   fill="#64748B" opacity={0.6} />
      <polygon points={`0,0 0,${rSmall * 0.8} -${rSmall * 0.8},${rSmall * 0.8}`}  fill="#64748B" opacity={0.6} />
      <polygon points={`0,0 0,-${rSmall * 0.8} -${rSmall * 0.8},-${rSmall * 0.8}`} fill="#64748B" opacity={0.6} />

      {/* Cardinal Labels */}
      <text x={0} y={-(r + 14)} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={800} fill="#0F172A">N</text>
      <text x={0} y={r + 16}    textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={800} fill="#0F172A">S</text>
      <text x={r + 16} y={1}    textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={800} fill="#0F172A">E</text>
      <text x={-(r + 16)} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={800} fill="#0F172A">W</text>
    </g>
  )
}

// ── Main Map Component ──────────────────────────────────────────────────────
export default function BuildingMap2D({
  building,
  rooms = [],
  route,
  onRoomSelect,
  selectedRoom,
  compact = false,
}) {
  const [hoveredRoom, setHoveredRoom] = useState(null)

  // Map hazard levels by room_id
  const hazardMap = Object.fromEntries(
    (rooms || []).map(r => [r.room_id, r.current_hazard_level || 'NORMAL'])
  )

  const routeNodes = new Set(route?.node_ids || [])
  const hasRoute   = route?.status === 'ROUTE_FOUND' && routeNodes.size > 0

  // Build clean corridor route polyline
  const routePoints = []
  if (hasRoute && route?.node_ids && route.node_ids.length > 0) {
    for (const nodeId of route.node_ids) {
      const pt = ROOM_ENTRY_POINTS[nodeId]
      if (pt) routePoints.push(pt)
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: compact ? '16/10' : `${VW}/${VH}`,
        background: '#F8FAFC',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #CBD5E1',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
      }}
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="Hospital Ground Floor 2D Plan"
      >
        <defs>
          {/* Route arrow marker (legacy, kept for compatibility) */}
          <marker id="route-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <polygon points="0 1, 7 4, 0 7" fill="#FF6A1A" />
          </marker>

          {/* Red hatch pattern for blocked rooms */}
          <pattern id="redHatch" patternUnits="userSpaceOnUse" width="8" height="8">
            <line x1="0" y1="8" x2="8" y2="0" stroke="#D62828" strokeWidth="1.5" opacity="0.6"/>
          </pattern>

          {/* Animations */}
          <style>{`
            @keyframes routeDash { to { stroke-dashoffset: -30; } }
            @keyframes arrowFlow { 0%{opacity:0.3} 50%{opacity:1} 100%{opacity:0.3} }
            @keyframes hazardPulse {
              0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 4px rgba(225, 29, 72, 0.6)); }
              50% { opacity: 0.35; filter: drop-shadow(0 0 12px rgba(225, 29, 72, 0.9)); }
            }
            @keyframes warningPulse {
              0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 4px rgba(217, 119, 6, 0.6)); }
              50% { opacity: 0.45; filter: drop-shadow(0 0 10px rgba(217, 119, 6, 0.8)); }
            }
            @keyframes exitHalo {
              0%, 100% { r: 22; opacity: 0.5; }
              50%       { r: 28; opacity: 0.2; }
            }
            @media (prefers-reduced-motion: reduce) {
              .route-dash { animation: none !important; }
              .arrow-flow { animation: none !important; opacity: 1 !important; }
            }
          `}</style>
        </defs>

        {/* ── Background: Canvas ── */}
        <rect x={0} y={0} width={VW} height={VH} fill="#F8FAFC" />

        {/* ── Outer Building Envelope & Corridor Base ── */}
        {/* The entire interior walkable corridor is crisp white */}
        <rect
          x={38} y={78} width={744} height={494}
          fill="#FFFFFF"
          stroke="#1E293B"
          strokeWidth={4}
          rx={2}
        />

        {/* ── Room Rectangles ── */}
        {ROOMS_DATA.map((room) => {
          const hazard = hazardMap[room.id] || 'NORMAL'
          const isCritical = hazard === 'CRITICAL'
          const isWarning  = hazard === 'WARNING' || hazard === 'HIGH_RISK'
          const isSelected = selectedRoom === room.id
          const isHovered  = hoveredRoom === room.id
          const isOnRoute  = routeNodes.has(room.id)

          let roomFill = room.fill
          if (isCritical) roomFill = 'rgba(254, 205, 211, 0.85)'
          else if (isWarning) roomFill = 'rgba(254, 240, 138, 0.85)'

          return (
            <g
              key={room.id}
              onClick={() => onRoomSelect?.(room.id)}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              style={{ cursor: onRoomSelect ? 'pointer' : 'default' }}
              role="button"
              tabIndex={0}
              aria-label={`${room.name} — Hazard: ${hazard}`}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRoomSelect?.(room.id)}
            >
              {/* Room Body */}
              <rect
                x={room.x}
                y={room.y}
                width={room.w}
                height={room.h}
                fill={roomFill}
                stroke={isSelected ? '#0284C7' : room.borderColor || '#1E293B'}
                strokeWidth={isSelected ? 3.5 : room.borderWidth || 2.5}
                style={{
                  transition: 'fill 0.2s ease, stroke 0.2s ease',
                  ...(isCritical ? { animation: 'hazardPulse 1.8s infinite' } : {}),
                  ...(isWarning ? { animation: 'warningPulse 2.2s infinite' } : {}),
                }}
              />

              {/* Selection / Route Glow Ring */}
              {(isSelected || isOnRoute) && (
                <rect
                  x={room.x - 3}
                  y={room.y - 3}
                  width={room.w + 6}
                  height={room.h + 6}
                  fill="none"
                  stroke={isSelected ? '#0284C7' : '#38BDF8'}
                  strokeWidth={3}
                  strokeDasharray={isOnRoute && !isSelected ? '6 4' : 'none'}
                  rx={2}
                  opacity={0.8}
                />
              )}

              {/* Room Door Openings and Architectural Swings */}
              {room.door && (
                <ArchitecturalDoor
                  x={room.door.x}
                  y={room.door.y}
                  size={room.door.size}
                  orientation={room.door.orientation}
                  swing={room.door.swing}
                />
              )}
              {room.door2 && (
                <ArchitecturalDoor
                  x={room.door2.x}
                  y={room.door2.y}
                  size={room.door2.size}
                  orientation={room.door2.orientation}
                  swing={room.door2.swing}
                />
              )}

              {/* Room Title & Label */}
              {room.label && (
                <text
                  x={room.x + room.w / 2}
                  y={room.y + (room.label.length > 1 ? 22 : 26)}
                  textAnchor="middle"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fontWeight={700}
                  fontSize={room.w < 110 ? 10.5 : 12}
                  fill="#0F172A"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {room.label[0]}
                </text>
              )}
              {room.label && room.label.length > 1 && (
                <text
                  x={room.x + room.w / 2}
                  y={room.y + 36}
                  textAnchor="middle"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fontWeight={600}
                  fontSize={10.5}
                  fill="#475569"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {room.label[1]}
                </text>
              )}

              {/* ── Room Specific Architectural Furniture / Icons ── */}
              {/* ICU: 4 Beds */}
              {room.type === 'icu' && (
                <g>
                  <HospitalBed x={room.x + 12} y={room.y + 55} width={26} height={26} color="#0284C7" />
                  <HospitalBed x={room.x + 48} y={room.y + 55} width={26} height={26} color="#0284C7" />
                  <HospitalBed x={room.x + 84} y={room.y + 55} width={26} height={26} color="#0284C7" />
                  <HospitalBed x={room.x + 120} y={room.y + 55} width={26} height={26} color="#0284C7" />
                </g>
              )}

              {/* Isolation Room: 1 Bed */}
              {room.type === 'isolation' && (
                <g>
                  <HospitalBed x={room.x + 32} y={room.y + 55} width={30} height={28} color="#9333EA" />
                </g>
              )}

              {/* Patient Room: 2 Beds */}
              {room.type === 'patient' && (
                <g>
                  <HospitalBed x={room.x + 30} y={room.y + 55} width={30} height={28} color="#0284C7" />
                  <HospitalBed x={room.x + 82} y={room.y + 55} width={30} height={28} color="#0284C7" />
                </g>
              )}

              {/* Operating Theatre (OT): Surgical lamp & table */}
              {room.type === 'ot' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 70})`}>
                  {/* Surgical Lamp */}
                  <circle cx={0} cy={-12} r={14} fill="#16A34A" opacity={0.2} />
                  <circle cx={0} cy={-12} r={9}  fill="#15803D" stroke="#0F172A" strokeWidth={1.5} />
                  <line x1={0} y1={-25} x2={0} y2={-12} stroke="#0F172A" strokeWidth={2} />
                  {/* Lamp light cone lines */}
                  <line x1={-8} y1={-12} x2={-14} y2={0} stroke="#15803D" strokeWidth={1} strokeDasharray="2 1" />
                  <line x1={8}  y1={-12} x2={14}  y2={0} stroke="#15803D" strokeWidth={1} strokeDasharray="2 1" />
                  {/* Operating Table */}
                  <rect x={-22} y={-2} width={44} height={14} rx={3} fill="#059669" stroke="#047857" strokeWidth={1.2} />
                  <rect x={-4}  y={12} width={8}  height={8} rx={1} fill="#0F172A" />
                </g>
              )}

              {/* Radiology (X-Ray): Navy square with skeleton ribcage */}
              {room.type === 'radiology' && (
                <g transform={`translate(${room.x + room.w / 2 - 18},${room.y + 50})`}>
                  <rect x={0} y={0} width={36} height={40} rx={4} fill="#1E293B" stroke="#0F172A" strokeWidth={1.5} />
                  {/* Spine */}
                  <line x1={18} y1={6} x2={18} y2={34} stroke="#F8FAFC" strokeWidth={2} />
                  {/* Ribs */}
                  <path d="M12,12 Q18,9 24,12" stroke="#F8FAFC" strokeWidth={1.6} fill="none" />
                  <path d="M10,17 Q18,14 26,17" stroke="#F8FAFC" strokeWidth={1.6} fill="none" />
                  <path d="M11,22 Q18,19 25,22" stroke="#F8FAFC" strokeWidth={1.6} fill="none" />
                  <path d="M13,27 Q18,24 23,27" stroke="#F8FAFC" strokeWidth={1.6} fill="none" />
                </g>
              )}

              {/* Lab: Science Erlenmeyer Flask */}
              {room.type === 'lab' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 68})`}>
                  {/* Flask Body */}
                  <polygon points="-16,18 16,18 5,-8 5,-16 -5,-16 -5,-8" fill="#EDE9FE" stroke="#6B21A8" strokeWidth={1.8} />
                  {/* Liquid */}
                  <polygon points="-13,15 13,15 8,7 -8,7" fill="#8B5CF6" opacity={0.65} />
                  {/* Top rim */}
                  <rect x={-7} y={-18} width={14} height={3} rx={1} fill="#6B21A8" />
                  {/* Bubbles */}
                  <circle cx={-2} cy={9} r={1.8} fill="#FFFFFF" />
                  <circle cx={4}  cy={12} r={1.2} fill="#FFFFFF" />
                </g>
              )}

              {/* Cafeteria: Dining Table with 4 Chairs */}
              {room.type === 'cafeteria' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 68})`}>
                  {/* Table */}
                  <rect x={-20} y={-10} width={40} height={20} rx={2} fill="#059669" stroke="#047857" strokeWidth={1.5} />
                  {/* Top Chair */}
                  <rect x={-10} y={-17} width={20} height={4} rx={1} fill="#0F172A" />
                  <line x1={-8} y1={-13} x2={-8} y2={-10} stroke="#0F172A" strokeWidth={1.5} />
                  <line x1={8}  y1={-13} x2={8}  y2={-10} stroke="#0F172A" strokeWidth={1.5} />
                  {/* Bottom Chair */}
                  <rect x={-10} y={13} width={20} height={4} rx={1} fill="#0F172A" />
                  <line x1={-8} y1={10} x2={-8} y2={13} stroke="#0F172A" strokeWidth={1.5} />
                  <line x1={8}  y1={10} x2={8}  y2={13} stroke="#0F172A" strokeWidth={1.5} />
                  {/* Left Chair */}
                  <rect x={-27} y={-5} width={4} height={10} rx={1} fill="#0F172A" />
                  <line x1={-23} y1={0} x2={-20} y2={0} stroke="#0F172A" strokeWidth={1.5} />
                  {/* Right Chair */}
                  <rect x={23} y={-5} width={4} height={10} rx={1} fill="#0F172A" />
                  <line x1={20} y1={0} x2={23} y2={0} stroke="#0F172A" strokeWidth={1.5} />
                </g>
              )}

              {/* Pharmacy: Angled Medicine Capsule */}
              {room.type === 'pharmacy' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 110}) rotate(-45)`}>
                  <rect x={-12} y={-24} width={24} height={24} rx={12} fill="#0284C7" stroke="#0F172A" strokeWidth={1.5} />
                  <rect x={-12} y={0}   width={24} height={24} rx={12} fill="#FFFFFF" stroke="#0F172A" strokeWidth={1.5} />
                  <line x1={-12} y1={0} x2={12} y2={0} stroke="#0F172A" strokeWidth={2} />
                </g>
              )}

              {/* Waiting Area: 8 Chairs & 2 Plants */}
              {room.type === 'waiting_area' && (
                <g>
                  {/* Left & Right Potted Plants */}
                  <PottedPlant x={room.x + 18} y={room.y + 115} />
                  <PottedPlant x={room.x + room.w - 18} y={room.y + 115} />

                  {/* Top Row: 4 Chairs */}
                  <WaitingChair x={room.x + 42} y={room.y + 95} color="#0284C7" />
                  <WaitingChair x={room.x + 68} y={room.y + 95} color="#0284C7" />
                  <WaitingChair x={room.x + 94} y={room.y + 95} color="#0284C7" />
                  <WaitingChair x={room.x + 120} y={room.y + 95} color="#0284C7" />

                  {/* Bottom Row: 4 Chairs */}
                  <WaitingChair x={room.x + 42} y={room.y + 138} color="#0284C7" />
                  <WaitingChair x={room.x + 68} y={room.y + 138} color="#0284C7" />
                  <WaitingChair x={room.x + 94} y={room.y + 138} color="#0284C7" />
                  <WaitingChair x={room.x + 120} y={room.y + 138} color="#0284C7" />
                </g>
              )}

              {/* Administration: Desk with Person */}
              {room.type === 'admin' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 60})`}>
                  {/* Person */}
                  <circle cx={0} cy={-12} r={6} fill="#0F172A" />
                  <path d="M-8,-2 Q0,-7 8,-2 L6,2 L-6,2 Z" fill="#0F172A" />
                  {/* Desk */}
                  <rect x={-20} y={2} width={40} height={12} rx={2} fill="#B45309" stroke="#78350F" strokeWidth={1.2} />
                  {/* Computer Monitor */}
                  <rect x={-5} y={-3} width={10} height={5} rx={1} fill="#38BDF8" stroke="#0F172A" strokeWidth={0.8} />
                </g>
              )}

              {/* Records: Document Icon */}
              {room.type === 'records' && (
                <g transform={`translate(${room.x + room.w / 2 - 12},${room.y + 50})`}>
                  {/* Paper sheet with folded top-right corner */}
                  <polygon points="0,0 16,0 24,8 24,30 0,30" fill="#FFFFFF" stroke="#0F172A" strokeWidth={1.5} />
                  <polygon points="16,0 16,8 24,8" fill="#E2E8F0" stroke="#0F172A" strokeWidth={1.2} />
                  {/* Lines of text */}
                  <line x1={4}  y1={12} x2={20} y2={12} stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
                  <line x1={4}  y1={17} x2={20} y2={17} stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
                  <line x1={4}  y1={22} x2={14} y2={22} stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
                </g>
              )}

              {/* General Ward: 6 Beds (2 rows of 3) */}
              {room.type === 'general_ward' && (
                <g>
                  {/* Row 1 */}
                  <HospitalBed x={room.x + 22} y={room.y + 48} width={26} height={24} color="#EA580C" />
                  <HospitalBed x={room.x + 75} y={room.y + 48} width={26} height={24} color="#EA580C" />
                  <HospitalBed x={room.x + 128} y={room.y + 48} width={26} height={24} color="#EA580C" />
                  {/* Row 2 */}
                  <HospitalBed x={room.x + 22} y={room.y + 82} width={26} height={24} color="#EA580C" />
                  <HospitalBed x={room.x + 75} y={room.y + 82} width={26} height={24} color="#EA580C" />
                  <HospitalBed x={room.x + 128} y={room.y + 82} width={26} height={24} color="#EA580C" />
                </g>
              )}

              {/* Maternity Ward: 4 Beds in 1 row */}
              {room.type === 'maternity_ward' && (
                <g>
                  <HospitalBed x={room.x + 16} y={room.y + 58} width={26} height={26} color="#EA580C" />
                  <HospitalBed x={room.x + 56} y={room.y + 58} width={26} height={26} color="#EA580C" />
                  <HospitalBed x={room.x + 96} y={room.y + 58} width={26} height={26} color="#EA580C" />
                  <HospitalBed x={room.x + 136} y={room.y + 58} width={26} height={26} color="#EA580C" />
                </g>
              )}

              {/* Blood Bank: Dark Blue Blood Drop */}
              {room.type === 'blood_bank' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 66})`}>
                  <path
                    d="M0,-16 C12,-4 14,8 0,16 C-14,8 -12,-4 0,-16 Z"
                    fill="#0284C7"
                    stroke="#0369A1"
                    strokeWidth={1.5}
                  />
                  {/* Shine reflection */}
                  <ellipse cx={-3} cy={3} rx={2} ry={5} fill="#BAE6FD" opacity={0.6} transform="rotate(-20)" />
                </g>
              )}

              {/* Main Lobby & Reception: Reception Counter & Person */}
              {room.type === 'main_lobby' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 60})`}>
                  {/* Receptionist */}
                  <circle cx={0} cy={-12} r={6} fill="#0F172A" />
                  <path d="M-8,-3 Q0,-8 8,-3 L6,3 L-6,3 Z" fill="#0F172A" />
                  {/* Reception desk with curve */}
                  <rect x={-26} y={0} width={52} height={14} rx={3} fill="#0284C7" stroke="#0369A1" strokeWidth={1.5} />
                  <rect x={-18} y={3} width={36} height={8} rx={1} fill="#38BDF8" opacity={0.5} />
                </g>
              )}

              {/* Emergency Department: Hospital Bed with Medical Cross */}
              {room.type === 'emergency_dept' && (
                <g transform={`translate(${room.x + room.w / 2},${room.y + 60})`}>
                  {/* Medical Blue Cross */}
                  <path
                    d="M-4,-18 L4,-18 L4,-12 L10,-12 L10,-4 L4,-4 L4,2 L-4,2 L-4,-4 L-10,-4 L-10,-12 L-4,-12 Z"
                    fill="#2563EB"
                  />
                  {/* Gurney / Bed */}
                  <HospitalBed x={-18} y={2} width={36} height={20} color="#6D28D9" />
                </g>
              )}

              {/* Hazard Alert Badge on Room */}
              {hazard !== 'NORMAL' && (
                <g transform={`translate(${room.x + room.w - 38},${room.y + 6})`}>
                  <rect
                    x={0} y={0} width={32} height={15} rx={3}
                    fill={isCritical ? '#E11D48' : '#D97706'}
                    stroke="#FFFFFF" strokeWidth={1}
                  />
                  <text
                    x={16} y={11}
                    textAnchor="middle"
                    fontSize={8.5} fontWeight={800} fill="#FFFFFF"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {isCritical ? 'CRIT' : 'WARN'}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* ── Corridors & Safety Infrastructure Overlays ── */}

        {/* Static Green Evacuation Arrows — shown only when no live route is active */}
        {!(hasRoute && routePoints.length >= 2) && (
          <g id="evacuation-arrows" opacity={0.92}>
            {/* Top Corridor: Moving right toward NE Exit */}
            <EvacuationArrow x={175} y={218} direction="right" />
            <EvacuationArrow x={345} y={218} direction="right" />
            <EvacuationArrow x={570} y={218} direction="right" />

            {/* Right Corridor: Moving down toward SE Exit */}
            <EvacuationArrow x={578} y={305} direction="down" />
            <EvacuationArrow x={578} y={415} direction="down" />

            {/* Left Corridor: Moving up */}
            <EvacuationArrow x={172} y={305} direction="up" />

            {/* Bottom Corridor: Moving right */}
            <EvacuationArrow x={235} y={515} direction="right" />
            <EvacuationArrow x={605} y={515} direction="right" />

            {/* Main Entrance: Moving up into Lobby */}
            <EvacuationArrow x={365} y={588} direction="up" />
          </g>
        )}

        {/* Fire Extinguishers (Mounted on Walls) */}
        <g id="fire-extinguishers">
          <FireExtinguisher x={105} y={210} />
          <FireExtinguisher x={485} y={210} />
          <FireExtinguisher x={145} y={410} />
          <FireExtinguisher x={535} y={360} />
          <FireExtinguisher x={535} y={455} />
          <FireExtinguisher x={535} y={548} />
          <FireExtinguisher x={295} y={555} />
          <FireExtinguisher x={435} y={555} />
        </g>

        {/* Fire Alarm Target Bell Call Point */}
        <g id="fire-alarms">
          <FireAlarmCallPoint x={655} y={218} />
        </g>

        {/* ── Main Entrance Vestibule & Steps ── */}
        <g id="main-entrance">
          {/* Steps */}
          <rect x={305} y={570} width={120} height={14} fill="#E2E8F0" stroke="#1E293B" strokeWidth={1.5} />
          <rect x={300} y={584} width={130} height={14} fill="#CBD5E1" stroke="#1E293B" strokeWidth={1.5} />
          <rect x={295} y={598} width={140} height={16} fill="#94A3B8" stroke="#1E293B" strokeWidth={1.5} />

          {/* Potted bushes beside entrance stairs */}
          <PottedPlant x={282} y={596} />
          <PottedPlant x={448} y={596} />

          {/* Double entrance doors opening inward */}
          <line x1={345} y1={570} x2={345} y2={546} stroke="#1E293B" strokeWidth={2} />
          <path d="M 365 570 A 20 20 0 0 1 345 546" fill="none" stroke="#64748B" strokeWidth={1} strokeDasharray="3 2" />
          <line x1={385} y1={570} x2={385} y2={546} stroke="#1E293B" strokeWidth={2} />
          <path d="M 365 570 A 20 20 0 0 0 385 546" fill="none" stroke="#64748B" strokeWidth={1} strokeDasharray="3 2" />

          {/* Green Entrance Sign with Up Arrow */}
          <g transform="translate(325, 620)">
            <rect x={0} y={0} width={80} height={20} rx={3} fill="#15803D" stroke="#065F46" strokeWidth={1.2} />
            <text x={40} y={14} textAnchor="middle" fontSize={9} fontWeight={800} fill="#FFFFFF">
              Main Entrance
            </text>
          </g>
        </g>

        {/* ── Emergency Exit Signs (Corners) ── */}
        {EXITS.map((exit) => {
          if (exit.id === 'EXIT-S') return null // rendered with Main Entrance

          return (
            <g key={exit.id} transform={`translate(${exit.x},${exit.y})`}>
              {/* Badge Background */}
              <rect
                x={0} y={0} width={exit.w} height={exit.h} rx={4}
                fill="#15803D" stroke="#065F46" strokeWidth={1.5}
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
              />
              {/* Running person icon */}
              <g transform="translate(6, 4)" fill="#FFFFFF">
                <circle cx={7} cy={5} r={3} />
                <path d="M4,10 L1,18 L5,18 L7,13 L10,18 L14,18 L11,10 L13,7 L8,7 Z" />
              </g>
              {/* Exit door frame icon */}
              <rect x={18} y={6} width={10} height={20} rx={1} fill="none" stroke="#FFFFFF" strokeWidth={1.5} />
              {/* Exit Label */}
              <text x={64} y={15} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#FFFFFF">
                Emergency
              </text>
              <text x={64} y={25} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#FFFFFF">
                Exit
              </text>

              {/* Outer door connection to building wall */}
              {exit.id === 'EXIT-NW' && (
                <line x1={exit.w - 15} y1={exit.h} x2={exit.w - 15} y2={exit.h + 10} stroke="#1E293B" strokeWidth={2.5} />
              )}
              {exit.id === 'EXIT-NE' && (
                <line x1={15} y1={exit.h} x2={15} y2={exit.h + 10} stroke="#1E293B" strokeWidth={2.5} />
              )}
            </g>
          )
        })}

        {/* ── Animated Real-Time Evacuation Route ── */}
        {hasRoute && routePoints.length >= 2 && (() => {
          // Compute arrow placements along each segment
          const arrowMarkers = []
          let markerIndex = 0
          for (let i = 0; i < routePoints.length - 1; i++) {
            const p1 = routePoints[i]
            const p2 = routePoints[i + 1]
            const dx = p2.x - p1.x
            const dy = p2.y - p1.y
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            [0.33, 0.66].forEach((t) => {
              arrowMarkers.push({
                x: p1.x + dx * t,
                y: p1.y + dy * t,
                angle,
                delay: (markerIndex * 0.2) % 1.5,
              })
              markerIndex++
            })
          }

          const start = routePoints[0]
          const end = routePoints[routePoints.length - 1]
          const pointsStr = routePoints.map(p => `${p.x},${p.y}`).join(' ')
          const exitName = route.exit_id || 'EXIT'
          const cost = route.total_cost ? `${route.total_cost.toFixed(1)} m` : ''

          // Blocked rooms from hazard snapshot
          const blockedRooms = route.hazard_state_snapshot || []

          // Lookup coordinates for blocked rooms using ROOMS_DATA
          const roomLookup = {}
          ROOMS_DATA.forEach(r => {
            roomLookup[r.id] = { x: r.x, y: r.y, width: r.w, height: r.h }
          })

          return (
            <g id="animated-route">
              {/* Blocked room overlays */}
              {blockedRooms.map(roomId => {
                const rd = roomLookup[roomId]
                if (!rd) return null
                return (
                  <rect key={`blocked-${roomId}`}
                    x={rd.x} y={rd.y}
                    width={rd.width} height={rd.height}
                    fill="url(#redHatch)"
                    rx={4}
                  />
                )
              })}

              {/* Exit halos */}
              {EXITS.map(exit => {
                const ep = ROOM_ENTRY_POINTS[exit.id]
                if (!ep) return null
                const isTarget = exit.id === route.exit_id
                return (
                  <g key={`halo-${exit.id}`}>
                    <circle cx={ep.x} cy={ep.y} r={isTarget ? 22 : 14}
                      fill={isTarget ? 'rgba(255,106,26,0.15)' : 'rgba(46,139,87,0.08)'}
                      stroke={isTarget ? '#FF6A1A' : '#2E8B57'}
                      strokeWidth={isTarget ? 2 : 1}
                    />
                    {isTarget && (
                      <circle cx={ep.x} cy={ep.y} r={28}
                        fill="none" stroke="#FF6A1A" strokeWidth={1.5} opacity={0.5}
                        style={{ animation: 'exitHalo 1.5s ease-in-out infinite' }}
                      />
                    )}
                  </g>
                )
              })}

              {/* Route glow layer */}
              <polyline points={pointsStr}
                fill="none" stroke="#FF6A1A" strokeWidth={9} opacity={0.25}
                strokeLinejoin="round" strokeLinecap="round"
              />
              {/* Route white outline */}
              <polyline points={pointsStr}
                fill="none" stroke="#FFFFFF" strokeWidth={7}
                strokeLinejoin="round" strokeLinecap="round"
              />
              {/* Main animated dashed line */}
              <polyline points={pointsStr}
                fill="none" stroke="#FF6A1A" strokeWidth={5}
                strokeDasharray="14 8"
                strokeLinejoin="round" strokeLinecap="round"
                className="route-dash"
                style={{ animation: 'routeDash 0.7s linear infinite' }}
              />

              {/* Animated arrowheads along route */}
              {arrowMarkers.map((am, i) => (
                <polygon key={`arrow-${i}`}
                  points="-7,4 7,0 -7,-4"
                  fill="#FF6A1A"
                  className="arrow-flow"
                  style={{ animation: `arrowFlow 1.5s ease-in-out infinite`, animationDelay: `${am.delay}s` }}
                  transform={`translate(${am.x},${am.y}) rotate(${am.angle})`}
                />
              ))}

              {/* Waypoint circles at intermediate points */}
              {routePoints.slice(1, -1).map((pt, i) => (
                <g key={`wp-${i}`}>
                  <circle cx={pt.x} cy={pt.y} r={7} fill="#FF6A1A" stroke="#FFFFFF" strokeWidth={2}/>
                  <text x={pt.x} y={pt.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize={8} fill="#fff" fontWeight="bold">{i + 1}</text>
                </g>
              ))}

              {/* Origin marker — person icon */}
              <g>
                <circle cx={start.x} cy={start.y} r={14}
                  fill="rgba(255,106,26,0.25)" stroke="#FF6A1A" strokeWidth={2.5}/>
                {/* head */}
                <circle cx={start.x} cy={start.y - 4} r={3} fill="#FF6A1A"/>
                {/* body */}
                <line x1={start.x} y1={start.y - 1} x2={start.x} y2={start.y + 5}
                  stroke="#FF6A1A" strokeWidth={2} strokeLinecap="round"/>
                {/* arms */}
                <line x1={start.x - 4} y1={start.y + 2} x2={start.x + 4} y2={start.y + 2}
                  stroke="#FF6A1A" strokeWidth={2} strokeLinecap="round"/>
              </g>

              {/* Exit destination marker */}
              <g>
                <circle cx={end.x} cy={end.y} r={14}
                  fill="rgba(46,139,87,0.3)" stroke="#2E8B57" strokeWidth={3}/>
                <circle cx={end.x} cy={end.y} r={20}
                  fill="none" stroke="#2E8B57" strokeWidth={1.5}
                  style={{ animation: 'exitHalo 1.5s ease-in-out infinite' }}
                />
                <text x={end.x} y={end.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fill="#2E8B57" fontWeight="bold">✓</text>
              </g>

              {/* Exit info badge near destination */}
              <g transform={`translate(${end.x - 40}, ${end.y + 26})`}>
                <rect x={0} y={0} width={80} height={22} rx={6}
                  fill="rgba(248,244,238,0.92)" stroke="rgba(46,139,87,0.6)" strokeWidth={1}
                />
                <text x={40} y={11} textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fill="#2E8B57" fontWeight="600" fontFamily="Inter, sans-serif">
                  {exitName}{cost ? ` · ${cost}` : ''}
                </text>
              </g>
            </g>
          )
        })()}

        {/* ── Top Title Box ── */}
        <g transform="translate(260, 15)">
          <rect
            x={0} y={0} width={300} height={46} rx={8}
            fill="#EFF6FF"
            stroke="#2563EB"
            strokeWidth={2}
            filter="drop-shadow(0 2px 6px rgba(37, 99, 235, 0.15))"
          />
          <text
            x={150} y={20}
            textAnchor="middle"
            fontFamily="'Inter', system-ui, sans-serif"
            fontSize={15} fontWeight={800} fill="#1E3A8A"
          >
            Hospital – 2D Floor Map
          </text>
          <text
            x={150} y={36}
            textAnchor="middle"
            fontFamily="'Inter', system-ui, sans-serif"
            fontSize={12} fontWeight={700} fill="#1E40AF"
          >
            (Ground Floor)
          </text>
        </g>

        {/* ── Legend Box (Right Side) ── */}
        <g transform="translate(820, 75)">
          {/* Legend Border Card */}
          <rect
            x={0} y={0} width={180} height={425} rx={8}
            fill="#FFFFFF"
            stroke="#2563EB"
            strokeWidth={2}
            filter="drop-shadow(0 4px 12px rgba(37, 99, 235, 0.10))"
          />
          <text
            x={14} y={25}
            fontFamily="'Inter', system-ui, sans-serif"
            fontSize={15} fontWeight={800} fill="#1E3A8A"
          >
            Legend
          </text>

          {/* Legend Items */}
          {[
            { label: 'Patient Room / Ward', color: '#FDD9CC' },
            { label: 'ICU / Critical Care', color: '#BEE3F8' },
            { label: 'Operating Theatre', color: '#D5EEDB' },
            { label: 'Diagnostic (Imaging / Lab)', color: '#EAD6F4' },
            { label: 'Administration / Records', color: '#FFF2D1' },
            { label: 'Support Services', color: '#CCEBFB' },
            { label: 'Emergency / Trauma', color: '#E2DAF7' },
            { label: 'Food / Cafeteria', color: '#D5EEDB' },
            { label: 'Stairs', color: '#CBD5E1' },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(14, ${45 + i * 24})`}>
              <rect x={0} y={0} width={20} height={14} rx={2} fill={item.color} stroke="#1E293B" strokeWidth={0.8} />
              <text x={28} y={11} fontSize={10.5} fontWeight={600} fill="#1E293B">
                {item.label}
              </text>
            </g>
          ))}

          {/* Emergency Exit icon item */}
          <g transform="translate(14, 265)">
            <rect x={0} y={0} width={20} height={14} rx={2} fill="#15803D" />
            <path d="M4,10 L2,12 L5,12 L6,9 L8,12 L11,12 L9,7 Z" fill="#FFFFFF" />
            <text x={28} y={11} fontSize={10.5} fontWeight={600} fill="#1E293B">Emergency Exit</text>
          </g>

          {/* Evacuation Route arrow item */}
          <g transform="translate(14, 290)">
            <line x1={0} y1={7} x2={16} y2={7} stroke="#15803D" strokeWidth={3} strokeLinecap="round" />
            <polygon points="14,3 20,7 14,11" fill="#15803D" />
            <text x={28} y={11} fontSize={10.5} fontWeight={600} fill="#1E293B">Evacuation Route</text>
          </g>

          {/* Fire Extinguisher icon item */}
          <g transform="translate(14, 315)">
            <rect x={6} y={0} width={8} height={14} rx={2} fill="#DC2626" />
            <line x1={7} y1={-2} x2={13} y2={-2} stroke="#0F172A" strokeWidth={1} />
            <text x={28} y={11} fontSize={10.5} fontWeight={600} fill="#1E293B">Fire Extinguisher</text>
          </g>

          {/* Fire Alarm icon item */}
          <g transform="translate(14, 340)">
            <circle cx={10} cy={7} r={6.5} fill="#DC2626" stroke="#991B1B" strokeWidth={1} />
            <circle cx={10} cy={7} r={4} fill="#FFFFFF" />
            <circle cx={10} cy={7} r={2} fill="#DC2626" />
            <text x={28} y={11} fontSize={10.5} fontWeight={600} fill="#1E293B">Fire Alarm</text>
          </g>
        </g>

        {/* ── Compass Rose (Bottom Right) ── */}
        <CompassRose cx={910} cy={565} size={34} />
      </svg>

      {/* Floating Selected Room Info Toast */}
      {selectedRoom && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '8px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            zIndex: 10,
          }}
        >
          <span style={{ fontWeight: 700, color: '#0F172A' }}>
            Selected: {ROOMS_DATA.find(r => r.id === selectedRoom)?.name || selectedRoom}
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              background: hazardMap[selectedRoom] === 'CRITICAL' ? '#FFE4E6' : hazardMap[selectedRoom] === 'WARNING' ? '#FEF3C7' : '#DCFCE7',
              color: hazardMap[selectedRoom] === 'CRITICAL' ? '#BE123C' : hazardMap[selectedRoom] === 'WARNING' ? '#B45309' : '#15803D',
            }}
          >
            {hazardMap[selectedRoom] || 'NORMAL'}
          </span>
        </div>
      )}
    </div>
  )
}
