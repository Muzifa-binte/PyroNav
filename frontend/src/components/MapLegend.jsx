import React from 'react'

const ITEMS = [
  { color: 'var(--status-normal)',   label: 'Normal',    icon: '■' },
  { color: 'var(--status-warning)',  label: 'Warning',   icon: '■' },
  { color: 'var(--status-high)',     label: 'High Risk', icon: '■' },
  { color: 'var(--status-critical)', label: 'Critical',  icon: '■' },
  { color: 'var(--status-unknown)',  label: 'Unknown',   icon: '■' },
  { color: 'var(--accent-primary)',  label: 'Route',     icon: '—' },
  { color: 'var(--status-normal)',   label: 'Exit',      icon: '◉' },
  { color: 'var(--status-critical)', label: 'Blocked',   icon: '╌' },
]

export default function MapLegend() {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--surface-inset)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)',
      fontSize: 12,
    }}
    role="list"
    aria-label="Map legend"
    >
      {ITEMS.map(item => (
        <div key={item.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
          <span aria-hidden="true" style={{ color: item.color, fontSize: 14 }}>{item.icon}</span>
          {item.label}
        </div>
      ))}
    </div>
  )
}
