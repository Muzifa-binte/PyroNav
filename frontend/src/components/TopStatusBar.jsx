import React from 'react'
import { useLocation, Link } from 'react-router-dom'

const PAGE_TITLES = {
  '/overview':   { title: 'Overview',                subtitle: 'Building status & live activity' },
  '/map':        { title: 'Live Map',                subtitle: 'Situational awareness — 2D floor plan' },
  '/sensors':    { title: 'Sensors & Monitoring',    subtitle: 'Measurement and data quality' },
  '/evacuation': { title: 'Evacuation & Pathfinding',subtitle: 'Current route and status' },
  '/alerts':     { title: 'Alerts & Incidents',      subtitle: 'Active and historical events' },
  '/security':   { title: 'Network Security',        subtitle: 'IDS events and cyber-defence' },
  '/risk':       { title: 'Risk Analytics',          subtitle: 'Room state and hazard assessment' },
  '/simulation': { title: 'Simulation / Developer',  subtitle: 'Controlled test scenarios' },
  '/settings':   { title: 'Configuration',           subtitle: 'System settings and mappings' },
}

const CONN = {
  connected:    { color: '#43C59E', bg: 'rgba(67,197,158,0.15)',  dot: '#43C59E', label: 'Connected',    animated: true  },
  delayed:      { color: '#F5BE55', bg: 'rgba(245,190,85,0.15)',  dot: '#F5BE55', label: 'Delayed',       animated: false },
  disconnected: { color: '#FF5D6C', bg: 'rgba(255,93,108,0.15)',  dot: '#FF5D6C', label: 'Disconnected',  animated: false },
  unknown:      { color: '#9AA7BA', bg: 'rgba(154,167,186,0.15)', dot: '#9AA7BA', label: 'Unknown',       animated: false },
  simulation:   { color: '#F5BE55', bg: 'rgba(245,190,85,0.15)',  dot: '#F5BE55', label: 'Simulation',    animated: false },
  stale:        { color: '#F5BE55', bg: 'rgba(245,190,85,0.15)',  dot: '#F5BE55', label: 'Stale',         animated: false },
}

export default function TopStatusBar({ connectionState = 'unknown', lastUpdate }) {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] || { title: 'PyroNav', subtitle: '' }
  const conn = CONN[connectionState] || CONN.unknown

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'rgba(14,22,39,0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 20,
      flexShrink: 0,
    }} role="banner">

      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 1 }}>
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Last update */}
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
          {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
        </div>

        {/* Connection pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 999,
          background: conn.bg,
          border: `1px solid ${conn.color}4D`,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: conn.dot, flexShrink: 0,
            animation: conn.animated ? 'pulse-glow 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: conn.color }}>
            {conn.label}
          </span>
        </div>

        {/* Alerts shortcut */}
        <Link to="/alerts" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-glass)',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: 12, fontWeight: 500,
          transition: 'all var(--transition-fast)',
        }}>
          <span>🔔</span>
          <span>Alerts</span>
        </Link>

        {/* Operator label */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-glass)',
          fontSize: 12, color: 'var(--text-secondary)',
          fontWeight: 500,
        }}>
          OPS-1
        </div>
      </div>
    </header>
  )
}
