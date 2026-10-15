import React from 'react'

// Spec Section 3.2 status colors — warm ivory palette
const HAZARD_ITEMS = [
  { color: '#2E8B57', label: 'Normal' },
  { color: '#F5A400', label: 'Warning' },
  { color: '#FF6A1A', label: 'High Risk' },
  { color: '#D62828', label: 'Critical' },
  { color: '#8B7F76', label: 'Unknown' },
]

const MAP_ITEMS = [
  { color: '#FF6A1A', label: 'Active Route',  icon: '─▶' },
  { color: '#2E8B57', label: 'Exit (open)',   icon: '◉' },
  { color: '#D62828', label: 'Exit (closed)', icon: '◉' },
  { color: '#D62828', label: 'Blocked',       icon: '✕' },
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
        border: `1px solid ${color}66`,
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
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 12px',
          padding: '8px 12px',
          background: 'var(--bg-raised)',
          boxShadow: 'var(--neo-raised-sm)',
          borderRadius: 'var(--radius-md)',
          fontSize: 11,
          fontFamily: 'var(--font-sans)',
        }}
        role="list"
        aria-label="Map legend"
      >
        {HAZARD_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-600)' }}>
            <Swatch color={item.color} />
            {item.label}
          </div>
        ))}
        {MAP_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-600)' }}>
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
        background: 'var(--bg-raised)',
        boxShadow: 'var(--neo-raised-sm)',
        borderRadius: 'var(--radius-lg)',
        fontSize: 12,
        minWidth: 140,
        fontFamily: 'var(--font-sans)',
      }}
      role="list"
      aria-label="Map legend"
    >
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-900)',
        fontFamily: 'var(--font-display)',
        marginBottom: 8,
      }}>
        Legend
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {HAZARD_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-600)' }}>
            <Swatch color={item.color} />
            {item.label}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {MAP_ITEMS.map(item => (
          <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-600)' }}>
            <span aria-hidden="true" style={{ color: item.color, fontSize: 13, width: 10, textAlign: 'center', lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
