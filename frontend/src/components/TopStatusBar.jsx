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
  connected:    { color: '#16A97A', bg: 'rgba(34,201,135,0.10)',  dot: '#22C987', label: 'Connected',    animated: true  },
  delayed:      { color: '#C8820A', bg: 'rgba(245,166,35,0.10)',  dot: '#F5A623', label: 'Delayed',       animated: false },
  disconnected: { color: '#C0244C', bg: 'rgba(232,77,106,0.10)',  dot: '#E84D6A', label: 'Disconnected',  animated: false },
  unknown:      { color: '#546280', bg: 'rgba(148,163,184,0.12)', dot: '#94A3B8', label: 'Unknown',       animated: false },
  simulation:   { color: '#C8820A', bg: 'rgba(245,166,35,0.10)',  dot: '#F5A623', label: 'Simulation',    animated: false },
  stale:        { color: '#C8820A', bg: 'rgba(245,166,35,0.10)',  dot: '#F5A623', label: 'Stale',         animated: false },
}

export default function TopStatusBar({ connectionState = 'unknown', lastUpdate }) {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] || { title: 'PyroNav', subtitle: '' }
  const conn = CONN[connectionState] || CONN.unknown

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(180,200,240,0.45)',
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
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A2340', lineHeight: 1.2 }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p style={{ fontSize: 13, color: '#4A5878', marginTop: 1 }}>
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Last update */}
        <div style={{ textAlign: 'right', fontSize: 11, color: '#8A99B8' }}>
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
          border: `1px solid ${conn.color}55`,
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
          background: 'rgba(91,155,245,0.08)',
          border: '1px solid rgba(91,155,245,0.25)',
          color: '#4A5878',
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
          background: 'rgba(91,155,245,0.08)',
          border: '1px solid rgba(91,155,245,0.25)',
          fontSize: 12, color: '#4A5878',
          fontWeight: 500,
        }}>
          OPS-1
        </div>
      </div>
    </header>
  )
}
