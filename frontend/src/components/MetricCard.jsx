import React from 'react'

const SEVERITY_THEMES = {
  NORMAL: {
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    accent: '#10B981',
    badge: 'NORMAL',
  },
  WARNING: {
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    accent: '#F59E0B',
    badge: 'WARNING',
  },
  HIGH_RISK: {
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
    accent: '#F97316',
    badge: 'HIGH RISK',
  },
  CRITICAL: {
    color: '#E11D48',
    bgColor: '#FFF1F2',
    borderColor: '#FECDD3',
    accent: '#F43F5E',
    badge: 'CRITICAL',
  },
  INFO: {
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    accent: '#3B82F6',
    badge: 'INFO',
  },
  UNKNOWN: {
    color: '#475569',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    accent: '#64748B',
    badge: 'STATUS',
  },
}

function getTheme(severity) {
  return SEVERITY_THEMES[severity] || SEVERITY_THEMES.UNKNOWN
}

function Sparkline({ data, color }) {
  if (!data || !Array.isArray(data) || data.length < 2) return null

  const allPoints = data.map((v, i) => ({ x: i, y: typeof v === 'number' ? v : (v?.y ?? 0) }))
  const minY = Math.min(...allPoints.map(p => p.y))
  const maxY = Math.max(...allPoints.map(p => p.y))
  const rangeY = maxY - minY || 1
  const maxX = allPoints.length - 1

  const toSvg = (p) => ({
    x: (p.x / maxX) * 100,
    y: 28 - ((p.y - minY) / rangeY) * 24,
  })

  const pts = allPoints.map(toSvg)
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `${pts[0].x},28 ${polyline} ${pts[pts.length - 1].x},28`
  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`

  return (
    <div style={{ marginTop: 10, height: 28, overflow: 'hidden' }}>
      <svg
        width="100%"
        height="28"
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
  trend,
  trendDirection,
  severity = 'NORMAL',
  sparklineData = null,
  icon,
  accent,
  onClick,
}) {
  const displayTitle = title || label || ''
  const theme = getTheme(severity)
  const accentColor = accent || theme.accent
  const clickable = typeof onClick === 'function'

  const trendColor = trendDirection === 'up'
    ? '#059669'
    : trendDirection === 'down'
    ? '#E11D48'
    : '#64748B'

  const trendArrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      aria-label={clickable ? `${displayTitle}: ${value}. Click for details.` : undefined}
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.04)',
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 124,
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)'
          e.currentTarget.style.borderColor = accentColor
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.04)'
          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)'
        }
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accentColor,
          opacity: 0.85,
        }}
      />

      {/* Card Header: Icon + Title + Status Dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: theme.bgColor,
                border: `1px solid ${theme.borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {displayTitle}
          </span>
        </div>

        {/* Status Indicator Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 8px',
            borderRadius: 999,
            background: theme.bgColor,
            border: `1px solid ${theme.borderColor}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: theme.color,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: theme.color,
              letterSpacing: '0.02em',
            }}
          >
            {severity === 'NORMAL' ? 'SAFE' : severity.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Value Row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
          className="tabular"
        >
          {value ?? '—'}
        </div>
        {unit && (
          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle & Trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        {sub ? (
          <div style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
            {sub}
          </div>
        ) : <div />}

        {(trend || trendDirection) && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              fontWeight: 600,
              color: trendColor,
            }}
          >
            <span>{trendArrow}</span>
            {trend && <span>{trend}</span>}
          </div>
        )}

        {clickable && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>View</span>
            <span style={{ fontSize: 13 }}>→</span>
          </div>
        )}
      </div>

      {/* Optional real sparkline if data provided */}
      {sparklineData && sparklineData.length >= 2 && (
        <Sparkline data={sparklineData} color={accentColor} />
      )}
    </div>
  )
}
