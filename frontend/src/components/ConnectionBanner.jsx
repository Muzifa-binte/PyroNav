import React from 'react'

// Spec palette — no blue hex
const CONFIGS = {
  disconnected: {
    bg: 'rgba(214,40,40,0.10)',
    border: 'var(--red-600)',
    color: 'var(--red-600)',
    icon: '⚠',
    text: 'Backend disconnected — showing last known state.',
  },
  delayed: {
    bg: 'rgba(245,164,0,0.10)',
    border: 'var(--amber-500)',
    color: 'var(--amber-500)',
    icon: '⏱',
    text: 'Data delayed',
  },
  stale: {
    bg: 'rgba(139,127,118,0.10)',
    border: 'var(--ink-400)',
    color: 'var(--ink-400)',
    icon: '⏱',
    text: 'Data may be stale.',
  },
  simulation: {
    bg: 'rgba(245,164,0,0.10)',
    border: 'var(--amber-500)',
    color: 'var(--amber-500)',
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
        fontFamily: 'var(--font-sans)',
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
