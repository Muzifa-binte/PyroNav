import React from 'react'

// Spec-aligned status color mapping (Section 3.2 + file instructions)
// icon: SVG path data for inline rendering — corresponds to spec Section 3.2 icon names
const STATUS_MAP = {
  // Normal / Safe variants — icon: Shield-check
  normal:   { color: '#2E8B57', icon: 'shield-check' },
  NORMAL:   { color: '#2E8B57', icon: 'shield-check' },
  safe:     { color: '#2E8B57', icon: 'shield-check' },
  SAFE:     { color: '#2E8B57', icon: 'shield-check' },
  // Warning — icon: Triangle-alert
  warning:  { color: '#F5A400', icon: 'triangle-alert' },
  WARNING:  { color: '#F5A400', icon: 'triangle-alert' },
  // High Risk / Danger — icon: Flame-outline
  high:     { color: '#FF6A1A', icon: 'flame-outline' },
  HIGH_RISK:{ color: '#FF6A1A', icon: 'flame-outline' },
  danger:   { color: '#FF6A1A', icon: 'flame-outline' },
  DANGER:   { color: '#FF6A1A', icon: 'flame-outline' },
  // Critical — icon: Flame-solid
  critical: { color: '#D62828', icon: 'flame-solid' },
  CRITICAL: { color: '#D62828', icon: 'flame-solid' },
  // Unknown / Offline — icon: Plug-off
  unknown:  { color: '#8B7F76', icon: 'plug-off' },
  UNKNOWN:  { color: '#8B7F76', icon: 'plug-off' },
  offline:  { color: '#8B7F76', icon: 'plug-off' },
  OFFLINE:  { color: '#8B7F76', icon: 'plug-off' },
  // Info / Watch — icon: Eye
  info:     { color: '#2F6FDE', icon: 'eye' },
  INFO:     { color: '#2F6FDE', icon: 'eye' },
  watch:    { color: '#2F6FDE', icon: 'eye' },
  WATCH:    { color: '#2F6FDE', icon: 'eye' },
  // Untrusted — icon: Shield-alert
  untrusted:{ color: '#6B4FBB', icon: 'shield-alert' },
  UNTRUSTED:{ color: '#6B4FBB', icon: 'shield-alert' },
  // Connection states — reuse closest icon
  connected:    { color: '#2E8B57', icon: 'shield-check', animated: true },
  CONNECTED:    { color: '#2E8B57', icon: 'shield-check', animated: true },
  disconnected: { color: '#D62828', icon: 'plug-off' },
  DISCONNECTED: { color: '#D62828', icon: 'plug-off' },
  stale:        { color: '#F5A400', icon: 'triangle-alert' },
  STALE:        { color: '#F5A400', icon: 'triangle-alert' },
  // Route statuses — reuse closest semantic icon
  ROUTE_FOUND:           { color: '#2E8B57', icon: 'shield-check' },
  NO_VALID_ROUTE:        { color: '#D62828', icon: 'plug-off' },
  NO_AVAILABLE_EXIT:     { color: '#D62828', icon: 'plug-off' },
  RECALCULATION_PENDING: { color: '#F5A400', icon: 'triangle-alert' },
  INVALID_ORIGIN:        { color: '#FF6A1A', icon: 'flame-outline' },
}

// Inline SVG icons — minimal paths, sized to 1em x 1em viewBox
// Spec icons: Shield-check, Eye, Triangle-alert, Flame-outline, Flame-solid, Shield-alert, Plug-off
const ICONS = {
  'shield-check': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  'eye': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  'triangle-alert': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'flame-outline': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0011 17c1.38 0 2.5-1.12 2.5-2.5 0-1.5-1-3-2.5-4.5-1.5 1.5-2.5 3-2.5 4.5z" />
      <path d="M12 2C12 2 7 7.5 7 13a5 5 0 0010 0c0-4.5-3-8-5-11z" />
    </svg>
  ),
  'flame-solid': (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M12 2C12 2 7 7.5 7 13a5 5 0 0010 0c0-4.5-3-8-5-11zm0 16a2.5 2.5 0 01-2.5-2.5c0-1.5 1-3 2.5-4.5 1.5 1.5 2.5 3 2.5 4.5A2.5 2.5 0 0112 18z" />
    </svg>
  ),
  'shield-alert': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  'plug-off': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 17v5" />
      <path d="M9 5v3" />
      <path d="M15 5v3" />
      <path d="M7 8h10l-1 7H8L7 8z" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
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

  const iconSize = size === 'lg' ? 14 : size === 'md' ? 12 : 11
  const padding  = size === 'lg' ? '6px 14px' : size === 'md' ? '4px 12px' : '2px 10px'
  const fontSize = size === 'lg' ? 13 : size === 'md' ? 12 : 11

  const iconEl = ICONS[variant.icon]

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
      {iconEl ? (
        <span
          style={{
            width: iconSize,
            height: iconSize,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: variant.animated ? 'pulse-glow 2s infinite' : 'none',
          }}
          aria-hidden="true"
        >
          {React.cloneElement(iconEl, { style: { width: iconSize, height: iconSize } })}
        </span>
      ) : (
        /* Fallback dot in case icon not found */
        <span
          style={{
            width: iconSize - 2,
            height: iconSize - 2,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  )
}
