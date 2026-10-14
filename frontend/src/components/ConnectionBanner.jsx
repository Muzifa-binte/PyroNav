import React from 'react'

const CONFIGS = {
  disconnected: {
    bg: 'rgba(232,77,106,0.08)',
    border: '#E84D6A',
    color: '#C0244C',
    icon: '⚠',
    text: 'Backend disconnected — showing last known state.',
  },
  delayed: {
    bg: 'rgba(245,166,35,0.08)',
    border: '#F5A623',
    color: '#B8750A',
    icon: '⏱',
    text: 'Data delayed',
  },
  stale: {
    bg: 'rgba(245,166,35,0.08)',
    border: '#F5A623',
    color: '#B8750A',
    icon: '⏱',
    text: 'Data may be stale.',
  },
  simulation: {
    bg: 'rgba(245,166,35,0.08)',
    border: '#F5A623',
    color: '#B8750A',
    icon: '⚗',
    text: 'SIMULATION MODE — TEST DATA — not live sensor readings.',
  },
}

export default function ConnectionBanner({ connectionState, state, lastUpdate, onDismiss }) {
  const key = connectionState || state
  if (!key || key === 'connected') return null

  const cfg = CONFIGS[key]
  if (!cfg) return null

  const lastUpdateText = lastUpdate
    ? ` Last update: ${new Date(lastUpdate).toLocaleTimeString()}.`
    : ''

  return (
    <div
      role="alert"
      style={{
        width: '100%',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: cfg.bg,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span style={{
        fontSize: 16,
        animation: key === 'disconnected' ? 'pulse-glow 2s infinite' : 'none',
      }}>
        {cfg.icon}
      </span>
      <span style={{ flex: 1 }}>
        {cfg.text}{lastUpdateText}
      </span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss banner"
          style={{
            background: 'transparent',
            border: 'none',
            color: cfg.color,
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '0 4px',
            opacity: 0.7,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
