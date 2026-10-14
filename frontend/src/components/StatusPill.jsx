import React from 'react'

const STATUS_VARIANTS = {
  normal:       { bg: 'rgba(34,201,135,0.12)',  color: '#16A97A', dot: '#22C987',  animated: false },
  NORMAL:       { bg: 'rgba(34,201,135,0.12)',  color: '#16A97A', dot: '#22C987',  animated: false },
  warning:      { bg: 'rgba(245,166,35,0.12)',  color: '#C8820A', dot: '#F5A623',  animated: false },
  WARNING:      { bg: 'rgba(245,166,35,0.12)',  color: '#C8820A', dot: '#F5A623',  animated: false },
  high:         { bg: 'rgba(245,110,59,0.12)',  color: '#C4470E', dot: '#F56E3B',  animated: false },
  HIGH_RISK:    { bg: 'rgba(245,110,59,0.12)',  color: '#C4470E', dot: '#F56E3B',  animated: false },
  critical:     { bg: 'rgba(232,77,106,0.12)',  color: '#C0244C', dot: '#E84D6A',  animated: false },
  CRITICAL:     { bg: 'rgba(232,77,106,0.12)',  color: '#C0244C', dot: '#E84D6A',  animated: false },
  unknown:      { bg: 'rgba(148,163,184,0.12)', color: '#546280', dot: '#94A3B8',  animated: false },
  UNKNOWN:      { bg: 'rgba(148,163,184,0.12)', color: '#546280', dot: '#94A3B8',  animated: false },
  info:         { bg: 'rgba(107,143,255,0.12)', color: '#3A5FD9', dot: '#6B8FFF',  animated: false },
  INFO:         { bg: 'rgba(107,143,255,0.12)', color: '#3A5FD9', dot: '#6B8FFF',  animated: false },
  connected:    { bg: 'rgba(34,201,135,0.12)',  color: '#16A97A', dot: '#22C987',  animated: true  },
  CONNECTED:    { bg: 'rgba(34,201,135,0.12)',  color: '#16A97A', dot: '#22C987',  animated: true  },
  disconnected: { bg: 'rgba(232,77,106,0.12)',  color: '#C0244C', dot: '#E84D6A',  animated: false },
  DISCONNECTED: { bg: 'rgba(232,77,106,0.12)',  color: '#C0244C', dot: '#E84D6A',  animated: false },
  stale:        { bg: 'rgba(245,166,35,0.12)',  color: '#C8820A', dot: '#F5A623',  animated: false },
  STALE:        { bg: 'rgba(245,166,35,0.12)',  color: '#C8820A', dot: '#F5A623',  animated: false },
}

export default function StatusPill({ status, level, label, size = 'sm' }) {
  const key = status || level || 'UNKNOWN'
  const variant = STATUS_VARIANTS[key] || STATUS_VARIANTS.UNKNOWN
  const displayLabel = label ?? String(key).replace(/_/g, ' ')

  const dotSize = size === 'lg' ? 8 : 6
  const padding = size === 'lg' ? '6px 14px' : '4px 10px'
  const fontSize = size === 'lg' ? 13 : 11

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding,
      borderRadius: 99,
      fontSize,
      fontWeight: 600,
      background: variant.bg,
      color: variant.color,
      border: `1px solid ${variant.color}4D`,
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}>
      <span style={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        background: variant.dot,
        flexShrink: 0,
        animation: variant.animated ? 'pulse-glow 2s infinite' : 'none',
      }} aria-hidden="true" />
      {displayLabel}
    </span>
  )
}
