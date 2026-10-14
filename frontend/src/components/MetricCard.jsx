import React from 'react'

const SEVERITY_COLORS = {
  CRITICAL: '#FF5D6C',
  HIGH_RISK: '#FF8A4C',
  WARNING: '#F5BE55',
  NORMAL: '#43C59E',
}

function getSeverityColor(severity) {
  return SEVERITY_COLORS[severity] || '#69B7FF'
}

function Sparkline({ data, color }) {
  const points = (data && data.length >= 2)
    ? data
    : [0,20,10,15,20,25,30,10,40,30,50,20,60,15,70,25,80,18,90,22,100,20].reduce((a,v,i) => {
        if (i % 2 === 0) a.push({ x: v, y: null })
        else a[a.length - 1].y = v
        return a
      }, []).map(p => p.x !== undefined ? p : null).filter(Boolean)

  const rawPoints = (data && data.length >= 2)
    ? data.map((v, i) => ({ x: i, y: v }))
    : [0,20,10,15,20,25,30,10,40,30,50,20,60,15,70,25,80,18,90,22,100,20].reduce((acc, val, i, arr) => {
        if (i % 2 === 0) return acc
        acc.push({ x: arr[i-1], y: val })
        return acc
      }, [])

  const allPoints = (data && data.length >= 2)
    ? data.map((v, i) => ({ x: i, y: v }))
    : rawPoints

  if (allPoints.length < 2) return null

  const minY = Math.min(...allPoints.map(p => p.y))
  const maxY = Math.max(...allPoints.map(p => p.y))
  const rangeY = maxY - minY || 1
  const maxX = allPoints.length - 1

  const toSvg = (p) => ({
    x: (p.x / maxX) * 100,
    y: 36 - ((p.y - minY) / rangeY) * 36,
  })

  const pts = allPoints.map(toSvg)
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `${pts[0].x},36 ${polyline} ${pts[pts.length - 1].x},36`

  const gradId = `grad-${Math.random().toString(36).slice(2)}`

  return (
    <svg
      width="100%" height="40"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      style={{ display: 'block', marginTop: 8 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={area}
        fill={`url(#${gradId})`}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function MetricCard({
  title,
  label,
  value,
  unit,
  sub,
  trend,
  trendDirection,
  severity,
  sparklineData = [],
  icon,
  accent,
  onClick,
}) {
  const displayTitle = title || label || ''
  const accentColor = accent || getSeverityColor(severity)
  const clickable = typeof onClick === 'function'

  const trendColor = trendDirection === 'up'
    ? '#43C59E'
    : trendDirection === 'down'
    ? '#FF5D6C'
    : 'var(--text-muted)'

  const trendArrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? e => e.key === 'Enter' && onClick() : undefined}
      aria-label={clickable ? `${displayTitle}: ${value}. Click for details.` : undefined}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--glass-shadow)',
        padding: 20,
        animation: 'fadeInUp 0.4s ease both',
        position: 'relative',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        borderTop: `3px solid ${accentColor}`,
        flex: 1,
        minWidth: 150,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--glass-shadow)'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon && (
          <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
        )}
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {displayTitle}
        </span>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 32,
        fontWeight: 800,
        color: 'var(--text-primary)',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
      }} className="tabular">
        {value ?? '—'}
        {unit && (
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{unit}</span>
        )}
      </div>

      {/* Sub-label */}
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {sub}
        </div>
      )}

      {/* Trend indicator */}
      {(trend || trendDirection) && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 6,
          padding: '2px 8px',
          borderRadius: 99,
          background: `${trendColor}18`,
          fontSize: 11,
          fontWeight: 600,
          color: trendColor,
        }}>
          <span>{trendArrow}</span>
          {trend && <span>{trend}</span>}
        </div>
      )}

      {/* Arrow if clickable */}
      {clickable && (
        <div style={{
          position: 'absolute', bottom: 14, right: 14,
          color: accentColor, fontSize: 14, opacity: 0.5,
        }}>→</div>
      )}

      {/* Sparkline */}
      <Sparkline data={sparklineData} color={accentColor} />
    </div>
  )
}
