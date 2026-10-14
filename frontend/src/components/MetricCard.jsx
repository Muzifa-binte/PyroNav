import React from 'react'

/**
 * MetricCard — a summary stat card for the Overview dashboard row.
 * Props: label, value, sub, accent (CSS color), onClick, icon
 */
export default function MetricCard({ label, value, sub, accent, onClick, icon }) {
  const isClickable = typeof onClick === 'function'

  return (
    <div
      className="card"
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? e => e.key === 'Enter' && onClick() : undefined}
      aria-label={isClickable ? `${label}: ${value}. Click for details.` : undefined}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        transition: 'background var(--transition-fast)',
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span className="label">{label}</span>
        {icon && <span aria-hidden="true" style={{ fontSize: '18px', opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: accent || 'var(--text-primary)', lineHeight: 1 }} className="tabular">
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
