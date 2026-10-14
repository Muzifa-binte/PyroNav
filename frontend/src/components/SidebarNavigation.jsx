import React from 'react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/overview',   label: 'Overview',          icon: '🏠' },
  { path: '/map',        label: 'Live Map',           icon: '🗺️' },
  { path: '/sensors',    label: 'Sensors',            icon: '📡' },
  { path: '/evacuation', label: 'Evacuation',         icon: '🚪' },
  { path: '/alerts',     label: 'Alerts & Incidents', icon: '🔔' },
  { path: '/security',   label: 'Network Security',   icon: '🛡️' },
  { path: '/risk',       label: 'Risk Analytics',     icon: '📊' },
]

const TOOLS_ITEMS = [
  { path: '/simulation', label: 'Simulation',    icon: '⚗️' },
  { path: '/settings',   label: 'Configuration', icon: '⚙️' },
]

function NavItem({ item, collapsed }) {
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 10,
        textDecoration: 'none',
        color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
        background: isActive
          ? 'linear-gradient(135deg, var(--accent-primary), #F0883E)'
          : 'transparent',
        boxShadow: isActive ? '0 4px 12px rgba(232,104,26,0.30)' : 'none',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      })}
    >
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

export default function SidebarNavigation({ collapsed, onToggle }) {
  return (
    <nav
      aria-label="Primary navigation"
      style={{
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width var(--transition-med)',
        boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
      }}
    >
      {/* Brand */}
      <div style={{
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        {/* Flame logo */}
        <div style={{
          width: 34, height: 34,
          borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent-primary), #F0883E)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          boxShadow: '0 4px 10px rgba(232,104,26,0.35)',
        }}>
          🔥
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              PyroNav
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              Fire Safety System
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            marginLeft: 'auto',
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 13,
            padding: '4px 7px',
            borderRadius: 6,
            flexShrink: 0,
            fontWeight: 700,
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav items */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}

        {/* Tools divider */}
        <div style={{ margin: '12px 4px 8px', borderTop: '1px solid var(--border-subtle)' }} />
        {!collapsed && (
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            padding: '0 8px 4px',
          }}>
            Tools
          </div>
        )}
        {TOOLS_ITEMS.map(item => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          Academic Prototype · v1.0
        </div>
      )}
    </nav>
  )
}
