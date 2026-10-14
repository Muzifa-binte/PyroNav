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
  connected:    { color: '#276749', bg: '#C6F6D5', dot: '#38A169', label: 'Connected' },
  delayed:      { color: '#975A16', bg: '#FEFCBF', dot: '#D69E2E', label: 'Delayed' },
  disconnected: { color: '#9B2C2C', bg: '#FED7D7', dot: '#E53E3E', label: 'Disconnected' },
  unknown:      { color: '#4A5568', bg: '#EDF2F7', dot: '#718096', label: 'Unknown' },
  simulation:   { color: '#975A16', bg: '#FEFCBF', dot: '#D69E2E', label: 'Simulation' },
}

export default function TopStatusBar({ connectionState = 'unknown', lastUpdate }) {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] || { title: 'PyroNav', subtitle: '' }
  const conn = CONN[connectionState] || CONN.unknown

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--surface-base)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 var(--space-6)',
      gap: 'var(--space-4)',
      flexShrink: 0,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }} role="banner">
      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Last update */}
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <div style={{ color: 'var(--text-muted)' }}>Last update</div>
          <div className="tabular" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
          </div>
        </div>

        {/* Connection pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 999,
          background: conn.bg,
          border: `1px solid ${conn.dot}40`,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: conn.dot, flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: conn.color }}>
            {conn.label}
          </span>
        </div>

        {/* Alerts shortcut */}
        <Link to="/alerts" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px',
          borderRadius: 8,
          background: 'var(--surface-inset)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: 12, fontWeight: 500,
          transition: 'all var(--transition-fast)',
        }}>
          <span>🔔</span>
          <span>Alerts</span>
        </Link>

        {/* Operator badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px',
          borderRadius: 8,
          background: 'var(--surface-inset)',
          border: '1px solid var(--border-subtle)',
          fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), #F0883E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', fontWeight: 700,
          }}>O</div>
          <span style={{ fontWeight: 500 }}>Operator</span>
        </div>
      </div>
    </header>
  )
}
