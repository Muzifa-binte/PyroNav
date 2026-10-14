import React from 'react'

const HAZARD_ITEMS = [
  { color: '#43C59E', label: 'Normal',    dot: true },
  { color: '#F5BE55', label: 'Warning',   dot: true },
  { color: '#FF8A4C', label: 'High Risk', dot: true },
  { color: '#FF5D6C', label: 'Critical',  dot: true },
  { color: '#9AA7BA', label: 'Unknown',   dot: true },
]

const ROOM_TYPE_ITEMS = [
  { color: '#1C3A5E', label: 'ICU / Critical Care',      dot: true },
  { color: '#1A3344', label: 'Patient Room / Ward',      dot: true },
  { color: '#1E3B2A', label: 'Operating Theatre',        dot: true },
  { color: '#2A1F3D', label: 'Diagnostic (Lab/X-Ray)',   dot: true },
  { color: '#2D2B1A', label: 'Administration',           dot: true },
  { color: '#3B1A1A', label: 'Emergency',                dot: true },
  { color: '#1A2A2A', label: 'Support / Cafeteria',      dot: true },
]

const MAP_ITEMS = [
  { color: '#69B7FF', label: 'Active Route',  icon: '─▶' },
  { color: '#43C59E', label: 'Exit (open)',   icon: '◉' },
  { color: '#FF5D6C', label: 'Exit (closed)', icon: '◉' },
  { color: '#FF5D6C', label: 'Blocked path',  icon: '╌✕' },
]

function Dot({ color }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 10, height: 10,
        borderRadius: 2,
        background: color,
        border: `1px solid ${color}88`,
        flexShrink: 0,
      }}
    />
  )
}

export default function MapLegend({ compact = false }) {
  if (compact) {
    // Minimal inline version for Overview
    return (
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px 12px',
          padding: '6px 10px',
          background: 'var(--surface-inset)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: 11,
        }}
        role="list"
        aria-label="Map legend"
      >
        {HAZARD_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
            <Dot color={item.color} />
            {item.label}
          </div>
        ))}
        {MAP_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
            <span aria-hidden="true" style={{ color: item.color, fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--surface-inset)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        fontSize: 12,
      }}
      role="list"
      aria-label="Map legend"
    >
      {/* Left column: hazard states */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          Hazard State
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {HAZARD_ITEMS.map(item => (
            <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <Dot color={item.color} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Right column: room types + map symbols */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          Room Type
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {ROOM_TYPE_ITEMS.map(item => (
            <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <Dot color={item.color} />
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          Map Symbols
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {MAP_ITEMS.map(item => (
            <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <span aria-hidden="true" style={{ color: item.color, fontSize: 13, width: 10, textAlign: 'center', lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
