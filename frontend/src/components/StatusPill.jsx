import React from 'react'

const LEVEL_CONFIG = {
  NORMAL:   { icon: '✓', cls: 'pill pill--normal'   },
  WARNING:  { icon: '⚠', cls: 'pill pill--warning'  },
  HIGH_RISK:{ icon: '▲', cls: 'pill pill--high'     },
  CRITICAL: { icon: '✕', cls: 'pill pill--critical' },
  UNKNOWN:  { icon: '?', cls: 'pill pill--unknown'  },
  INFO:     { icon: 'ℹ', cls: 'pill pill--info'     },
}

export default function StatusPill({ level = 'UNKNOWN', label, size = 'md' }) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.UNKNOWN
  const displayLabel = label ?? level.replace(/_/g, ' ')
  const sizeStyle = size === 'sm' ? { fontSize: 11, padding: '2px 8px' } : {}

  return (
    <span className={config.cls} style={sizeStyle}>
      <span aria-hidden="true">{config.icon}</span>
      {displayLabel}
    </span>
  )
}
