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
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'rgba(105,183,255,0.12)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
        fontWeight: isActive ? 600 : 400,
        fontSize: 13,
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'rgba(105,183,255,0.06)'
        }
      }}
      onMouseLeave={e => {
        // NavLink style function handles active state
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
        if (!isActive) e.currentTarget.style.background = 'transparent'
      }}
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
        background: 'rgba(14,22,39,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width var(--transition-med)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <div style={{
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        borderBottom: '1px solid var(--border-glass)',
        flexShrink: 0,
      }}>
        {/* Flame logo */}
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #69B7FF, #43C59E)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
          boxShadow: '0 4px 16px rgba(105,183,255,0.3)',
        }}>
          🔥
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              PyroNav
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              Fire Safety
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            marginLeft: 'auto',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 13,
            padding: '4px 7px',
            borderRadius: 6,
            flexShrink: 0,
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
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
        <div style={{ margin: '12px 4px 8px', borderTop: '1px solid var(--border-glass)' }} />
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
          borderTop: '1px solid var(--border-glass)',
          fontSize: 11, color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: 'var(--status-normal)',
            display: 'inline-block',
            flexShrink: 0,
          }} />
          Academic Prototype · v1.0
        </div>
      )}
    </nav>
  )
}
