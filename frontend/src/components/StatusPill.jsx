import React from 'react'

const ICONS = {
  NORMAL:   '✓',
  WARNING:  '⚠',
  HIGH_RISK:'▲',
  CRITICAL: '✕',
  UNKNOWN:  '?',
  NORMAL_ROUTE: '→',
}

/**
 * StatusPill — renders a coloured pill for hazard level, sensor status, etc.
 * level: 'NORMAL' | 'WARNING' | 'HIGH_RISK' | 'CRITICAL' | 'UNKNOWN'
 */
export default function StatusPill({ level = 'UNKNOWN', label, size = 'md' }) {
  const cssClass = {
    NORMAL:   'pill pill--normal',
    WARNING:  'pill pill--warning',
    HIGH_RISK:'pill pill--high',
    CRITICAL: 'pill pill--critical',
    UNKNOWN:  'pill pill--unknown',
  }[level] || 'pill pill--unknown'

  const displayLabel = label ?? level.replace('_', ' ')
  const icon = ICONS[level] || '?'

  const sizeStyle = size === 'sm'
    ? { fontSize: '11px', padding: '1px 6px' }
    : {}

  return (
    <span className={cssClass} style={sizeStyle}>
      <span aria-hidden="true">{icon}</span>
      {displayLabel}
    </span>
  )
}
