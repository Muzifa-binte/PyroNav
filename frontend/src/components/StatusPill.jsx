import React from 'react'

const STATUS_VARIANTS = {
  normal:       { bg: 'rgba(67,197,158,0.15)',  color: '#43C59E', dot: '#43C59E',  animated: false },
  NORMAL:       { bg: 'rgba(67,197,158,0.15)',  color: '#43C59E', dot: '#43C59E',  animated: false },
  warning:      { bg: 'rgba(245,190,85,0.15)',  color: '#F5BE55', dot: '#F5BE55',  animated: false },
  WARNING:      { bg: 'rgba(245,190,85,0.15)',  color: '#F5BE55', dot: '#F5BE55',  animated: false },
  high:         { bg: 'rgba(255,138,76,0.15)',  color: '#FF8A4C', dot: '#FF8A4C',  animated: false },
  HIGH_RISK:    { bg: 'rgba(255,138,76,0.15)',  color: '#FF8A4C', dot: '#FF8A4C',  animated: false },
  critical:     { bg: 'rgba(255,93,108,0.15)',  color: '#FF5D6C', dot: '#FF5D6C',  animated: false },
  CRITICAL:     { bg: 'rgba(255,93,108,0.15)',  color: '#FF5D6C', dot: '#FF5D6C',  animated: false },
  unknown:      { bg: 'rgba(154,167,186,0.15)', color: '#9AA7BA', dot: '#9AA7BA',  animated: false },
  UNKNOWN:      { bg: 'rgba(154,167,186,0.15)', color: '#9AA7BA', dot: '#9AA7BA',  animated: false },
  info:         { bg: 'rgba(139,168,255,0.15)', color: '#8BA8FF', dot: '#8BA8FF',  animated: false },
  INFO:         { bg: 'rgba(139,168,255,0.15)', color: '#8BA8FF', dot: '#8BA8FF',  animated: false },
  connected:    { bg: 'rgba(67,197,158,0.15)',  color: '#43C59E', dot: '#43C59E',  animated: true  },
  CONNECTED:    { bg: 'rgba(67,197,158,0.15)',  color: '#43C59E', dot: '#43C59E',  animated: true  },
  disconnected: { bg: 'rgba(255,93,108,0.15)',  color: '#FF5D6C', dot: '#FF5D6C',  animated: false },
  DISCONNECTED: { bg: 'rgba(255,93,108,0.15)',  color: '#FF5D6C', dot: '#FF5D6C',  animated: false },
  stale:        { bg: 'rgba(245,190,85,0.15)',  color: '#F5BE55', dot: '#F5BE55',  animated: false },
  STALE:        { bg: 'rgba(245,190,85,0.15)',  color: '#F5BE55', dot: '#F5BE55',  animated: false },
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
