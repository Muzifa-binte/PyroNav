import React from 'react'

// Spec Section 3.1 palette — never hardcode blue
const SEVERITY_ACCENT = {
  normal:   '#2E8B57',
  NORMAL:   '#2E8B57',
  warning:  '#F5A400',
  WARNING:  '#F5A400',
  high:     '#FF6A1A',
  HIGH_RISK:'#FF6A1A',
  critical: '#D62828',
  CRITICAL: '#D62828',
  unknown:  '#8B7F76',
  UNKNOWN:  '#8B7F76',
  info:     '#2F6FDE',
  INFO:     '#2F6FDE',
}

function getAccent(severity) {
  return SEVERITY_ACCENT[severity] || SEVERITY_ACCENT.unknown
}

function Sparkline({ data, color }) {
  if (!data || !Array.isArray(data) || data.length < 2) return null
  const allPoints = data.map((v, i) => ({ x: i, y: typeof v === 'number' ? v : (v?.y ?? 0) }))
  const minY = Math.min(...allPoints.map(p => p.y))
  const maxY = Math.max(...allPoints.map(p => p.y))
  const rangeY = maxY - minY || 1
  const maxX = allPoints.length - 1
  const toSvg = (p) => ({ x: (p.x / maxX) * 100, y: 28 - ((p.y - minY) / rangeY) * 24 })
  const pts = allPoints.map(toSvg)
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `${pts[0].x},28 ${polyline} ${pts[pts.length - 1].x},28`
  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`
  return (
    <div style={{ marginTop: 10, height: 28, overflow: 'hidden' }}>
      <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function MetricCard({
  title,
  label,
  value,
  unit,
  sub,
  severity = 'NORMAL',
  sparklineData = null,
  icon,
  onClick,
  children,
}) {
  const displayTitle = title || label || ''
  const accent = getAccent(severity)
  const clickable = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      aria-label={clickable ? `${displayTitle}: ${value}. Click for details.` : undefined}
      style={{
        background: 'var(--bg-raised)',
        borderRadius: 20,
        boxShadow: 'var(--neo-raised)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'box-shadow var(--transition-med), transform var(--transition-med)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 120,
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '12px 12px 26px rgba(163,140,118,0.30), -8px -8px 20px rgba(255,255,255,0.95)'
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--neo-raised)'
        }
      }}
    >
      {/* Top accent bar — 3px, full width, severity color */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />

      {/* Header row: icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
        {icon && <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink-600)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-sans)',
        }}>
          {displayTitle}
        </span>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 28,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color: 'var(--ink-900)',
        lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
        flex: 1,
      }}>
        {value ?? '—'}
        {unit && <span style={{ fontSize: 14, color: 'var(--ink-400)', fontWeight: 500, marginLeft: 6 }}>{unit}</span>}
      </div>

      {/* Sub text */}
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 8, fontFamily: 'var(--font-sans)' }}>
          {sub}
        </div>
      )}

      {/* Optional sparkline */}
      {sparklineData && sparklineData.length >= 2 && (
        <Sparkline data={sparklineData} color={accent} />
      )}

      {/* Optional children */}
      {children}
    </div>
  )
}
