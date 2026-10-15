/**
 * TopStatusBar
 *
 * Matches the reference design:
 *   - Single neumorphic pill / glass strip spanning the full content width
 *   - Left: page title (Playfair Display, bold) + subtitle in smaller ink-400
 *   - Right: live clock (tabular mono), "Live" green pill, "N active alerts" orange pill
 *   - Orange scan-line sweeps under the bar on each new WebSocket message
 *   - Zero hardcoded colour values — all CSS variables for theme-engine readiness
 */
import React, { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'

const PAGE_META = {
  '/overview':   { title: 'Command Overview',         subtitle: 'Hospital prototype building, Block A' },
  '/map':        { title: 'Live Floor Map',            subtitle: 'Real-time 2D situational awareness'  },
  '/sensors':    { title: 'Sensors & Monitoring',      subtitle: 'Measurement and data quality'         },
  '/evacuation': { title: 'Evacuation & Pathfinding',  subtitle: 'Current route and exit status'        },
  '/alerts':     { title: 'Alerts & Incidents',        subtitle: 'Active and historical events'          },
  '/security':   { title: 'IoT Security Centre',       subtitle: 'IDS events and cyber-defence'         },
  '/risk':       { title: 'Risk Analytics',            subtitle: 'Room state and hazard assessment'     },
  '/simulation': { title: 'Simulation',                subtitle: 'Controlled test scenarios'            },
  '/settings':   { title: 'Configuration',             subtitle: 'System settings and mappings'         },
  '/incidents':  { title: 'Incidents',                 subtitle: 'History and replay'                   },
}

// Connection state → label + colour tokens
const CONN_META = {
  connected:    { label: 'Live',         color: 'var(--green-600)',  bg: 'var(--topbar-pill-live-bg)',  dot: 'var(--green-600)',  animated: true  },
  delayed:      { label: 'Delayed',      color: 'var(--amber-500)',  bg: 'var(--topbar-pill-warn-bg)',  dot: 'var(--amber-500)',  animated: false },
  disconnected: { label: 'Disconnected', color: 'var(--red-600)',    bg: 'var(--topbar-pill-crit-bg)',  dot: 'var(--red-600)',    animated: false },
  unknown:      { label: 'Connecting…',  color: 'var(--ink-400)',    bg: 'var(--bg-inset)',             dot: 'var(--ink-400)',    animated: false },
}

// Live digital clock — updates every second
function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-GB'))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('en-GB')), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="tabular" style={{
      fontFamily:    'var(--font-mono)',
      fontSize:      15,
      fontWeight:    500,
      color:         'var(--ink-600)',
      letterSpacing: '0.04em',
    }}>
      {time}
    </span>
  )
}

export default function TopStatusBar({
  connectionState = 'unknown',
  lastUpdate,
  alertCount = 0,
  emergencyMode = false,
}) {
  const { pathname } = useLocation()
  const page = PAGE_META[pathname] || { title: 'PyroNav', subtitle: '' }
  const conn = CONN_META[connectionState] || CONN_META.unknown

  return (
    <header
      role="banner"
      style={{
        position:   'sticky',
        top:        0,
        zIndex:     20,
        flexShrink: 0,
        padding:    '10px 20px',
        background: 'transparent',   // container is transparent — the bar is the card below
      }}
    >
      {/* The neumorphic/glass bar itself */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            16,
        padding:        '12px 20px',
        background:     'var(--topbar-bg)',
        backdropFilter: 'var(--topbar-blur)',
        WebkitBackdropFilter: 'var(--topbar-blur)',
        border:         '1px solid var(--topbar-border)',
        borderRadius:   'var(--topbar-radius)',
        boxShadow:      'var(--topbar-shadow)',
        position:       'relative',
        overflow:       'hidden',
        transition:     'box-shadow var(--transition-med)',
      }}>

        {/* Scan line — animated orange bar that sweeps on new data */}
        {lastUpdate && (
          <div
            key={lastUpdate}
            aria-hidden="true"
            style={{
              position:        'absolute',
              bottom:          0,
              left:            0,
              height:          2,
              width:           '100%',
              background:      'var(--orange-500)',
              transformOrigin: 'left center',
              animation:       'scanLine 0.9s ease-out forwards',
              pointerEvents:   'none',
              opacity:         0.7,
            }}
          />
        )}

        {/* Emergency pulse border */}
        {emergencyMode && (
          <div aria-hidden="true" style={{
            position:      'absolute',
            inset:         0,
            borderRadius:  'inherit',
            border:        '2px solid var(--red-600)',
            animation:     'emergencyPulse 1s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* ── Left: page title + subtitle ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      20,
            fontWeight:    700,
            color:         'var(--ink-900)',
            lineHeight:    1.15,
            margin:        0,
            letterSpacing: '-0.01em',
            whiteSpace:    'nowrap',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
          }}>
            {page.title}
          </h1>
          {page.subtitle && (
            <p style={{
              fontSize:   13,
              color:      'var(--ink-400)',
              marginTop:  2,
              whiteSpace: 'nowrap',
              overflow:   'hidden',
              textOverflow: 'ellipsis',
            }}>
              {page.subtitle}
            </p>
          )}
        </div>

        {/* ── Right: clock + connection pill + alerts pill ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

          {/* Live clock */}
          <LiveClock />

          {/* Connection state pill */}
          <span style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           5,
            padding:       '5px 13px',
            borderRadius:  'var(--radius-full)',
            background:    conn.bg,
            fontSize:      12,
            fontWeight:    600,
            color:         conn.color,
            whiteSpace:    'nowrap',
          }}>
            <span style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   conn.dot,
              flexShrink:   0,
              display:      'inline-block',
              animation:    conn.animated ? 'pulse-glow 2s infinite' : 'none',
            }} aria-hidden="true" />
            {conn.label}
          </span>

          {/* Active alerts pill — links to /alerts */}
          <Link
            to="/alerts"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            5,
              padding:        '5px 14px',
              borderRadius:   'var(--radius-full)',
              background:     'var(--topbar-pill-alert-bg)',
              fontSize:       12,
              fontWeight:     600,
              color:          'var(--topbar-pill-alert-color)',
              textDecoration: 'none',
              whiteSpace:     'nowrap',
              transition:     'opacity var(--transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {alertCount > 0
              ? `${alertCount} active alert${alertCount !== 1 ? 's' : ''}`
              : 'No alerts'}
          </Link>

        </div>
      </div>
    </header>
  )
}
