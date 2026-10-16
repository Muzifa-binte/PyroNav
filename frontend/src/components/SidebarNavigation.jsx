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

// SVG flame icon — matches the reference screenshot's orange flame mark
function FlameIcon({ size = 22 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2C12 2 7 7.5 7 12.5C7 15.537 9.239 18 12 18C14.761 18 17 15.537 17 12.5C17 10.5 15.5 9 15.5 9C15.5 9 15 11 13.5 11C12.672 11 12 10.328 12 9.5C12 8 13 6.5 13 5C13 3.7 12 2 12 2Z"
        fill="var(--orange-500)"
      />
      <path
        d="M12 14C12 14 10 12.5 10 10.5C10 9.7 10.3 9 10.3 9C10.3 9 10 11.5 12 11.5C12.828 11.5 13.5 10.828 13.5 10C13.5 10 14.5 11 14.5 12.5C14.5 13.5 13.381 15 12 15C12 15 12 14 12 14Z"
        fill="var(--orange-300)"
        opacity="0.7"
      />
    </svg>
  )
}

// Collapsed-mode mini icon (emoji initials)
const ITEM_ABBR = {
  '/overview':   'OV',
  '/map':        'MP',
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
  { path: '/map',        label: 'Live Floor Map'   },
  { path: '/sensors',    label: 'Sensors'          },
  { path: '/security',   label: 'IoT Security'     },
  { path: '/risk',       label: 'Risk Analytics'   },
  { path: '/alerts',     label: 'Alerts'           },
  { path: '/incidents',  label: 'Incidents'        },
]

const TOOL_ITEMS = [
  { path: '/simulation', label: 'Simulation'   },
  { path: '/settings',   label: 'Settings'     },
  { path: '/evacuation', label: 'Evacuation'   },
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
          width:          38,
          height:         38,
          borderRadius:   12,
          background:     'var(--bg-raised)',
          boxShadow:      'var(--neo-raised-sm)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}>
          <FlameIcon size={22} />
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

        {/* Divider before tools */}
        {!collapsed && (
          <div style={{
            margin:     '10px 4px 6px',
            borderTop:  '1px solid var(--border-subtle)',
          }} />
        )}
        {collapsed && <div style={{ height: 14 }} />}

        {/* Tools section label */}
        {!collapsed && (
          <div style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color:         'var(--ink-400)',
            padding:       '0 4px 2px',
          }}>
            Tools
          </div>
        )}

        {TOOL_ITEMS.map(item => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
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
