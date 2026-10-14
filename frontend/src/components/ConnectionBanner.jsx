import React from 'react'

/**
 * Shows a persistent banner when the backend is disconnected or stale.
 * state: 'disconnected' | 'stale' | 'simulation'
 */
export default function ConnectionBanner({ state, lastUpdate }) {
  if (!state || state === 'connected') return null

  const configs = {
    disconnected: {
      bg: 'rgba(255,93,108,0.1)',
      border: 'var(--status-critical)',
      color: 'var(--status-critical)',
      text: 'Backend disconnected — showing last known state.',
    },
    stale: {
      bg: 'rgba(245,190,85,0.1)',
      border: 'var(--status-warning)',
      color: 'var(--status-warning)',
      text: `Data may be stale. Last update: ${lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'unknown'}.`,
    },
    simulation: {
      bg: 'rgba(245,190,85,0.1)',
      border: 'var(--status-warning)',
      color: 'var(--status-warning)',
      text: 'SIMULATION MODE — TEST DATA — not live sensor readings.',
    },
  }

  const cfg = configs[state]
  if (!cfg) return null

  return (
    <div
      role="alert"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        padding: 'var(--space-2) var(--space-4)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 'var(--space-4)',
      }}
    >
      ⚠ {cfg.text}
    </div>
  )
}
