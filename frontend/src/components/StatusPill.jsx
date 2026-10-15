import React from 'react'

// Spec-aligned status color mapping (Section 3.2 + file instructions)
const STATUS_MAP = {
  // Normal / Safe variants
  normal:   { color: '#2E8B57' },
  NORMAL:   { color: '#2E8B57' },
  safe:     { color: '#2E8B57' },
  SAFE:     { color: '#2E8B57' },
  // Warning
  warning:  { color: '#F5A400' },
  WARNING:  { color: '#F5A400' },
  // High Risk / Danger
  high:     { color: '#FF6A1A' },
  HIGH_RISK:{ color: '#FF6A1A' },
  danger:   { color: '#FF6A1A' },
  DANGER:   { color: '#FF6A1A' },
  // Critical
  critical: { color: '#D62828' },
  CRITICAL: { color: '#D62828' },
  // Unknown / Offline
  unknown:  { color: '#8B7F76' },
  UNKNOWN:  { color: '#8B7F76' },
  offline:  { color: '#8B7F76' },
  OFFLINE:  { color: '#8B7F76' },
  // Info / Watch
  info:     { color: '#2F6FDE' },
  INFO:     { color: '#2F6FDE' },
  watch:    { color: '#2F6FDE' },
  WATCH:    { color: '#2F6FDE' },
  // Untrusted
  untrusted:{ color: '#6B4FBB' },
  UNTRUSTED:{ color: '#6B4FBB' },
  // Connection states
  connected:    { color: '#2E8B57', animated: true },
  CONNECTED:    { color: '#2E8B57', animated: true },
  disconnected: { color: '#D62828' },
  DISCONNECTED: { color: '#D62828' },
  stale:        { color: '#F5A400' },
  STALE:        { color: '#F5A400' },
  // Route statuses
  ROUTE_FOUND:           { color: '#2E8B57' },
  NO_VALID_ROUTE:        { color: '#D62828' },
  NO_AVAILABLE_EXIT:     { color: '#D62828' },
  RECALCULATION_PENDING: { color: '#F5A400' },
  INVALID_ORIGIN:        { color: '#FF6A1A' },
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function StatusPill({ status, level, label, size = 'sm' }) {
  const key = status || level || 'UNKNOWN'
  const variant = STATUS_MAP[key] || STATUS_MAP.UNKNOWN
  const color = variant.color
  const displayLabel = label ?? String(key).replace(/_/g, ' ')

  const dotSize = size === 'lg' ? 9 : size === 'md' ? 7 : 6
  const padding = size === 'lg' ? '6px 14px' : size === 'md' ? '4px 12px' : '2px 10px'
  const fontSize = size === 'lg' ? 13 : size === 'md' ? 12 : 11

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding,
        borderRadius: '100px',
        fontSize,
        fontWeight: 600,
        background: hexToRgba(color, 0.12),
        color,
        border: `1px solid ${hexToRgba(color, 0.30)}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          animation: variant.animated ? 'pulse-glow 2s infinite' : 'none',
        }}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  )
}
