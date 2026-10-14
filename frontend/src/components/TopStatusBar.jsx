import React from 'react'
import { useLocation, Link } from 'react-router-dom'

const PAGE_TITLES = {
  '/overview':   { title: 'Overview',              subtitle: 'Building status and live system activity' },
  '/map':        { title: 'Live Map',              subtitle: 'Situational awareness — 2D floor plan' },
  '/sensors':    { title: 'Sensors & Monitoring',  subtitle: 'Measurement and data quality' },
  '/evacuation': { title: 'Evacuation & Pathfinding', subtitle: 'Current route and status' },
  '/alerts':     { title: 'Alerts & Incidents',    subtitle: 'Active and historical events' },
  '/security':   { title: 'Network Security',      subtitle: 'IDS events and cyber-defence status' },
  '/risk':       { title: 'Risk Analytics',        subtitle: 'Room state and hazard assessment' },
  '/simulation': { title: 'Simulation / Developer', subtitle: 'Controlled test scenarios' },
  '/settings':   { title: 'Configuration',         subtitle: 'System settings and mappings' },
}

const CONNECTION_COLORS = {
  connected:    'var(--status-normal)',
  delayed:      'var(--status-warning)',
  disconnected: 'var(--status-critical)',
  unknown:      'var(--status-unknown)',
  simulation:   'var(--status-warning)',
}

const barStyle = {
  height: 'var(--topbar-height)',
  borderBottom: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-sidebar)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 var(--space-6)',
  gap: 'var(--space-4)',
  flexShrink: 0,
}

export default function TopStatusBar({ connectionState = 'unknown', lastUpdate }) {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] || { title: 'PyroNav', subtitle: '' }
  const connColor = CONNECTION_COLORS[connectionState] || 'var(--status-unknown)'

  const formattedUpdate = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString()
    : '—'

  return (
    <header style={barStyle} role="banner">
      {/* Page title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Right side status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0 }}>
        {/* Last update */}
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Last update</div>
          <div className="tabular">{formattedUpdate}</div>
        </div>

        {/* Connection state */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${connColor}30`,
            backgroundColor: `${connColor}15`,
          }}
          aria-label={`Connection status: ${connectionState}`}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: connColor,
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span style={{ fontSize: '12px', color: connColor, fontWeight: 500, textTransform: 'capitalize' }}>
            {connectionState === 'simulation' ? 'Simulation Active' : connectionState}
          </span>
        </div>

        {/* Alerts shortcut */}
        <Link
          to="/alerts"
          aria-label="Go to alerts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span aria-hidden="true">🔔</span>
          <span style={{ fontSize: '12px' }}>Alerts</span>
        </Link>
      </div>
    </header>
  )
}
