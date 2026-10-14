import React, { useRef, useEffect, useState } from 'react'

const HAZARD_COLORS = {
  NORMAL:   '#43C59E',
  WARNING:  '#F5BE55',
  HIGH_RISK:'#FF8A4C',
  CRITICAL: '#FF5D6C',
  UNKNOWN:  '#9AA7BA',
}

const HAZARD_ALPHA = 0.25  // fill opacity

/**
 * BuildingMap2D — renders a 2D SVG floor plan from building data.
 *
 * Props:
 *   building      — { nodes, edges, exits }
 *   rooms         — [{ room_id, name, current_hazard_level, map_position, dimensions }]
 *   route         — { node_ids, edge_ids, status }
 *   onRoomSelect  — (room_id) => void
 *   selectedRoom  — room_id string
 *   compact       — boolean (smaller variant for Overview)
 */
export default function BuildingMap2D({
  building,
  rooms = [],
  route,
  onRoomSelect,
  selectedRoom,
  compact = false,
}) {
  // Build a lookup from room_id → room data
  const roomMap = Object.fromEntries((rooms || []).map(r => [r.room_id, r]))

  // Use the sample building layout if no real data yet
  const nodes  = building?.nodes  || []
  const edges  = building?.edges  || []
  const exits  = building?.exits  || []

  // Determine which node_ids are on the active route
  const routeNodeSet = new Set(route?.node_ids || [])
  const routeEdgeSet = new Set(route?.edge_ids || [])
  const hasRoute = route?.status === 'ROUTE_FOUND' && routeNodeSet.size > 0

  // Simple SVG viewBox derived from node positions
  const allX = nodes.map(n => n.position?.x ?? 0)
  const allY = nodes.map(n => n.position?.y ?? 0)
  const minX = Math.min(...allX, 0) - 30
  const minY = Math.min(...allY, 0) - 30
  const maxX = Math.max(...allX, 200) + 80
  const maxY = Math.max(...allY, 200) + 80
  const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`

  const nodeMap = Object.fromEntries(nodes.map(n => [n.node_id, n]))

  const containerStyle = {
    background: 'var(--surface-inset)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-inset)',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    aspectRatio: compact ? '16/9' : '4/3',
  }

  if (nodes.length === 0) {
    return (
      <div style={containerStyle}>
        <div className="empty-state">
          <span aria-hidden="true" style={{ fontSize: 32 }}>🗺</span>
          <p>No building data loaded</p>
          <p style={{ fontSize: 12 }}>Connect to backend or load building configuration</p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <svg
        viewBox={vb}
        style={{ width: '100%', height: '100%' }}
        role="img"
        aria-label="2D building floor plan"
      >
        {/* Edges / corridors */}
        {edges.map(edge => {
          const from = nodeMap[edge.from_node || edge.from_node_id]
          const to   = nodeMap[edge.to_node   || edge.to_node_id]
          if (!from || !to) return null
          const isOnRoute = routeEdgeSet.has(edge.edge_id)
          const isBlocked = edge.traversable === false
          return (
            <line
              key={edge.edge_id}
              x1={from.position.x} y1={from.position.y}
              x2={to.position.x}   y2={to.position.y}
              stroke={isBlocked ? '#FF5D6C' : isOnRoute ? '#69B7FF' : '#29364D'}
              strokeWidth={isOnRoute ? 4 : isBlocked ? 2 : 1.5}
              strokeDasharray={isBlocked ? '6 3' : undefined}
              aria-label={`Corridor ${edge.edge_id}${isBlocked ? ' — blocked' : ''}`}
            />
          )
        })}

        {/* Room nodes */}
        {nodes.filter(n => n.node_type === 'room' || n.node_type === 'junction').map(node => {
          const room = roomMap[node.room_id || node.node_id]
          const hazard = room?.current_hazard_level || 'UNKNOWN'
          const color  = HAZARD_COLORS[hazard] || HAZARD_COLORS.UNKNOWN
          const isSelected = selectedRoom === (node.room_id || node.node_id)
          const isOnRoute  = routeNodeSet.has(node.node_id)
          const label = room?.name || node.node_id

          const W = 60, H = 40
          const x = node.position.x - W / 2
          const y = node.position.y - H / 2

          return (
            <g
              key={node.node_id}
              onClick={() => onRoomSelect?.(node.room_id || node.node_id)}
              style={{ cursor: onRoomSelect ? 'pointer' : 'default' }}
              role="button"
              aria-label={`${label} — ${hazard}`}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onRoomSelect?.(node.room_id || node.node_id)}
            >
              <rect
                x={x} y={y} width={W} height={H}
                rx={6}
                fill={`${color}${Math.round(HAZARD_ALPHA * 255).toString(16).padStart(2, '0')}`}
                stroke={isSelected ? 'var(--accent-primary)' : isOnRoute ? '#69B7FF' : color}
                strokeWidth={isSelected ? 2.5 : isOnRoute ? 2 : 1}
              />
              <text
                x={node.position.x}
                y={node.position.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fill="var(--text-primary)"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {label.length > 12 ? label.slice(0, 11) + '…' : label}
              </text>
            </g>
          )
        })}

        {/* Exit nodes */}
        {exits.map(exit => {
          const node = nodeMap[exit.node_id]
          if (!node) return null
          const available = exit.available !== false
          return (
            <g key={exit.exit_id} aria-label={`${exit.name} — ${available ? 'available' : 'unavailable'}`}>
              <circle
                cx={node.position.x} cy={node.position.y}
                r={12}
                fill={available ? 'rgba(67,197,158,0.2)' : 'rgba(255,93,108,0.2)'}
                stroke={available ? 'var(--status-normal)' : 'var(--status-critical)'}
                strokeWidth={2}
              />
              <text
                x={node.position.x} y={node.position.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill={available ? 'var(--status-normal)' : 'var(--status-critical)'}
                aria-hidden="true"
              >
                E
              </text>
              <text
                x={node.position.x} y={node.position.y + 18}
                textAnchor="middle"
                fontSize={7} fill="var(--text-muted)"
                style={{ userSelect: 'none' }}
              >
                {exit.name?.replace('EXIT ', '') || exit.exit_id}
              </text>
            </g>
          )
        })}
      </svg>

      {/* No-route warning overlay */}
      {route && route.status === 'NO_VALID_ROUTE' && (
        <div style={{
          position: 'absolute', top: 8, left: 8, right: 8,
          background: 'rgba(255,93,108,0.15)',
          border: '1px solid var(--status-critical)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          color: 'var(--status-critical)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          ✕ No valid evacuation route found
        </div>
      )}
    </div>
  )
}
