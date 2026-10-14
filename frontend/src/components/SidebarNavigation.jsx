import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/overview',   label: 'Overview',          icon: '⬡' },
  { path: '/map',        label: 'Live Map',           icon: '🗺' },
  { path: '/sensors',    label: 'Sensors',            icon: '📡' },
  { path: '/evacuation', label: 'Evacuation',         icon: '🚪' },
  { path: '/alerts',     label: 'Alerts & Incidents', icon: '🔔' },
  { path: '/security',   label: 'Network Security',   icon: '🛡' },
  { path: '/risk',       label: 'Risk Analytics',     icon: '📊' },
]

const TOOLS_ITEMS = [
  { path: '/simulation', label: 'Simulation / Dev',  icon: '⚗' },
  { path: '/settings',   label: 'Configuration',      icon: '⚙' },
]

const sidebarBase = {
  backgroundColor: 'var(--bg-sidebar)',
  borderRight: '1px solid var(--border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'width var(--transition-med)',
  flexShrink: 0,
  overflow: 'hidden',
}

const logoArea = {
  padding: 'var(--space-5) var(--space-4)',
  borderBottom: '1px solid var(--border-subtle)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  minHeight: 'var(--topbar-height)',
}

const navArea = {
  flex: 1,
  overflowY: 'auto',
  padding: 'var(--space-3) var(--space-2)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
}

const dividerStyle = {
  margin: 'var(--space-3) var(--space-2) var(--space-2)',
  borderTop: '1px solid var(--border-subtle)',
}

const toolsLabel = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  padding: '0 var(--space-3) var(--space-1)',
}

function NavItem({ item, collapsed }) {
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
        backgroundColor: isActive ? 'rgba(105,183,255,0.1)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 400,
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      })}
    >
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

export default function SidebarNavigation({ collapsed, onToggle }) {
  return (
    <nav
      aria-label="Primary navigation"
      style={{ ...sidebarBase, width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Logo / brand */}
      <div style={logoArea}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>🔥</span>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            PyroNav
          </span>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: 'var(--space-1)',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Main nav */}
      <div style={navArea}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}

        {/* Tools divider */}
        <div style={dividerStyle} />
        {!collapsed && <div style={toolsLabel}>Tools</div>}
        {TOOLS_ITEMS.map(item => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </div>
    </nav>
  )
}
