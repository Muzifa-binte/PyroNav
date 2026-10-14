import React from 'react'

/**
 * MetricCard — summary stat card for the Overview dashboard row.
 * Light modern style with coloured top-strip accent.
 */
export default function MetricCard({ label, value, sub, accent, onClick, icon }) {
  const clickable = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? e => e.key === 'Enter' && onClick() : undefined}
      aria-label={clickable ? `${label}: ${value}. Click for details.` : undefined}
      style={{
        background: 'var(--surface-base)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--space-5)',
        flex: 1,
        minWidth: 150,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all var(--transition-fast)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.boxShadow = 'var(--shadow-raised)' }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      {/* Coloured top strip */}
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 4, background: accent, borderRadius: '14px 14px 0 0',
        }} />
      )}

      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 10, marginTop: accent ? 4 : 0,
      }}>
        <span className="label">{label}</span>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: accent ? `${accent}18` : 'var(--surface-inset)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 26, fontWeight: 800,
        color: accent || 'var(--text-primary)',
        lineHeight: 1.1, letterSpacing: '-0.02em',
      }} className="tabular">
        {value ?? '—'}
      </div>

      {/* Sub-label */}
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {sub}
        </div>
      )}

      {/* Arrow indicator if clickable */}
      {clickable && (
        <div style={{
          position: 'absolute', bottom: 14, right: 14,
          color: accent || 'var(--text-muted)', fontSize: 14, opacity: 0.5,
        }}>→</div>
      )}
    </div>
  )
}
