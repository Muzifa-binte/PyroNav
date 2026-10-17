/**
 * SidebarNavigation
 *
 * Matches the reference design exactly:
 *   - Ivory/warm-base background, no hard border
 *   - Brand row: flame icon + "PyroNav" in Playfair Display, no sub-label
 *   - Nav items are neumorphic raised pills (--neo-raised-sm)
 *   - Active item: orange left accent bar, orange bold text, slightly deeper shadow
 *   - Inactive items: --ink-600 text, subtle hover lift
 *   - No icons next to labels (matches reference screenshot)
 *   - Collapsed mode: icon-only pills
 *   - ALL colours are CSS variables — zero hardcoded hex values
 */
import React from 'react'
import { NavLink } from 'react-router-dom'
import LogoSvg from '../assets/Logo.svg'

// PyroNav logo — uses the actual SVG logo asset
function FlameIcon({ size = 30 }) {
  return (
    <img
      src={LogoSvg}
      alt="PyroNav"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}

// Collapsed-mode mini icon (emoji initials)
const ITEM_ABBR = {
  '/overview':   'OV',
  '/map':        'HM',
  '/sensors':    'SN',
  '/security':   'IS',
  '/risk':       'RA',
  '/alerts':     'AL',
  '/incidents':  'IN',
  '/simulation': 'SIM',
  '/settings':   'CFG',
  '/evacuation': 'EV',
}

const NAV_ITEMS = [
  { path: '/overview',   label: 'Command Overview' },
  { path: '/map',        label: 'Heat Map'         },
  { path: '/evacuation', label: 'Evacuation'       },
  { path: '/sensors',    label: 'Sensors'          },
  { path: '/security',   label: 'IoT Security'     },
  { path: '/risk',       label: 'Risk Analytics'   },
  { path: '/alerts',     label: 'Alerts'           },
  { path: '/incidents',  label: 'Incidents'        },
  { path: '/simulation', label: 'Simulation'       },
  { path: '/settings',   label: 'Settings'         },
]

function NavItem({ item, collapsed }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <NavLink
      to={item.path}
      title={item.label}
      aria-label={item.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        collapsed ? '10px 0' : '11px 16px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius:   'var(--sidebar-item-radius, 12px)',
        textDecoration: 'none',
        fontFamily:     'var(--font-sans)',
        fontSize:       14,
        fontWeight:     isActive ? 600 : 400,
        color:          isActive
                          ? 'var(--sidebar-item-active-color)'
                          : (hovered ? 'var(--ink-900)' : 'var(--sidebar-item-color)'),
        background:     isActive
                          ? 'var(--sidebar-item-active-bg)'
                          : (hovered ? 'var(--sidebar-item-hover-bg)' : 'var(--sidebar-item-bg, transparent)'),
        boxShadow:      isActive
                          ? 'var(--sidebar-item-shadow, var(--neo-raised-sm))'
                          : (hovered ? 'var(--neo-raised-sm)' : 'none'),
        borderLeft:     isActive
                          ? '3px solid var(--sidebar-item-active-border)'
                          : '3px solid transparent',
        transition:     'all var(--transition-fast)',
        whiteSpace:     'nowrap',
        overflow:       'hidden',
        letterSpacing:  0,
      })}
    >
      {collapsed ? (
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'inherit',
          letterSpacing: '0.04em',
        }}>
          {ITEM_ABBR[item.path] || item.label.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <span>{item.label}</span>
      )}
    </NavLink>
  )
}

export default function SidebarNavigation({ collapsed, onToggle }) {
  return (
    <nav
      aria-label="Primary navigation"
      style={{
        width:              collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        minWidth:           collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        background:         'var(--sidebar-bg)',
        backdropFilter:     'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderRight:        '1px solid var(--sidebar-border)',
        boxShadow:          'var(--sidebar-shadow)',
        display:            'flex',
        flexDirection:      'column',
        flexShrink:         0,
        overflow:           'hidden',
        transition:         'width var(--transition-med), min-width var(--transition-med)',
        position:           'relative',
        zIndex:             10,
      }}
    >
      {/* ── Brand row ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        collapsed ? '20px 0' : '22px 20px 18px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        flexShrink:     0,
      }}>
        {/* Flame mark */}
        <div style={{
          width:          42,
          height:         42,
          borderRadius:   12,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          overflow:       'hidden',
        }}>
          <FlameIcon size={42} />
        </div>

        {/* "PyroNav" wordmark */}
        {!collapsed && (
          <span style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      20,
            color:         'var(--ink-900)',
            letterSpacing: '-0.02em',
            lineHeight:    1,
          }}>
            PyroNav
          </span>
        )}

        {/* Collapse toggle — only show when expanded */}
        {!collapsed && (
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            style={{
              marginLeft:   'auto',
              background:   'var(--bg-inset)',
              boxShadow:    'var(--neo-raised-sm)',
              border:       'none',
              color:        'var(--ink-400)',
              cursor:       'pointer',
              fontSize:     12,
              width:        26,
              height:       26,
              borderRadius: 8,
              flexShrink:   0,
              fontWeight:   700,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              transition:   'all var(--transition-fast)',
            }}
          >
            ‹
          </button>
        )}

        {/* Expand toggle — only when collapsed */}
        {collapsed && (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            style={{
              position:     'absolute',
              bottom:       20,
              left:         '50%',
              transform:    'translateX(-50%)',
              background:   'var(--bg-inset)',
              boxShadow:    'var(--neo-raised-sm)',
              border:       'none',
              color:        'var(--ink-400)',
              cursor:       'pointer',
              fontSize:     12,
              width:        26,
              height:       26,
              borderRadius: 8,
              fontWeight:   700,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}
          >
            ›
          </button>
        )}
      </div>

      {/* ── Nav list ── */}
      <div style={{
        flex:           1,
        overflowY:      'auto',
        overflowX:      'hidden',
        padding:        collapsed ? '4px 10px' : '4px 14px',
        display:        'flex',
        flexDirection:  'column',
        gap:            6,
        /* hide scrollbar visually but keep it functional */
        scrollbarWidth: 'none',
      }}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </div>

      {/* ── 3D Hospital Model Shortcut ── */}
      <div style={{ padding: collapsed ? '8px 10px' : '8px 14px' }}>
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          title="Open 3D Hospital Model (Sensor Input Simulator)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            padding: collapsed ? '10px 0' : '10px 14px',
            background: 'linear-gradient(135deg, rgba(255,106,26,0.15) 0%, rgba(255,178,122,0.10) 100%)',
            border: '1px solid rgba(255,106,26,0.35)',
            borderRadius: 'var(--sidebar-item-radius, 12px)',
            color: 'var(--orange-500)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--orange-500)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,106,26,0.15) 0%, rgba(255,178,122,0.10) 100%)'
            e.currentTarget.style.color = 'var(--orange-500)'
          }}
        >
          <span style={{ fontSize: 16 }}>🧊</span>
          {!collapsed && <span>3D Model Input ↗</span>}
        </a>
      </div>

      {/* ── Footer status pill ── */}
      {!collapsed && (
        <div style={{
          padding:    '14px 20px',
          borderTop:  '1px solid var(--border-subtle)',
          display:    'flex',
          alignItems: 'center',
          gap:        7,
          flexShrink: 0,
        }}>
          <span style={{
            width:        7,
            height:       7,
            borderRadius: '50%',
            background:   'var(--green-600)',
            flexShrink:   0,
            display:      'inline-block',
          }} />
          <span style={{
            fontSize: 11,
            color:    'var(--ink-400)',
            fontFamily: 'var(--font-sans)',
          }}>
            Academic Prototype · v1.0
          </span>
        </div>
      )}
    </nav>
  )
}
