import React from 'react'

const HAZARD_ITEMS = [
  { color: '#43C59E', label: 'Normal' },
  { color: '#F5BE55', label: 'Warning' },
  { color: '#FF8A4C', label: 'High Risk' },
  { color: '#FF5D6C', label: 'Critical' },
  { color: '#9AA7BA', label: 'Unknown' },
]

const MAP_ITEMS = [
  { color: '#69B7FF', label: 'Active Route',  icon: '─▶' },
  { color: '#69B7FF', label: 'Exit (open)',   icon: '◉' },
  { color: '#FF5D6C', label: 'Exit (closed)', icon: '◉' },
  { color: '#FF5D6C', label: 'Blocked',       icon: '✕' },
]

function Swatch({ color }) {
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
    return (
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px 12px',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(180,200,240,0.50)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--glass-shadow)',
          fontSize: 11,
        }}
        role="list"
        aria-label="Map legend"
      >
        {HAZARD_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
            <Swatch color={item.color} />
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
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(180,200,240,0.50)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--glass-shadow)',
        fontSize: 12,
        minWidth: 140,
      }}
      role="list"
      aria-label="Map legend"
    >
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: 8,
      }}>
        Legend
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {HAZARD_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Swatch color={item.color} />
            {item.label}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {MAP_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span aria-hidden="true" style={{ color: item.color, fontSize: 13, width: 10, textAlign: 'center', lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
