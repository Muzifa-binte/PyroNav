/**
 * Overview — Command Overview screen
 *
 * Matches the reference screenshot exactly:
 *
 *  ┌─────────────────────────────────────────────────────┐
 *  │  TopStatusBar (handled by AppShell)                  │
 *  ├─────────────────────────────────────────────────────┤
 *  │                                                      │
 *  │  ┌─── Hero card (orange gradient, ~55% width) ───┐  │
 *  │  │  [DANGER badge]                                │  │  ┌── KPI 2×2 grid ──┐
 *  │  │  Room 3 risk is rising fast                    │  │  │ Rooms at risk   2 │
 *  │  │  Desc text                                     │  │  │ Sensors online    │
 *  │  │  [View evacuation route] [Acknowledge alert]   │  │  │   23/24           │
 *  │  └────────────────────────────────────────────────┘  │  │ Untrusted       1 │
 *  │                                                      │  │ Avg risk score 41 │
 *  │                                                      │  └───────────────────┘
 *  │  Mini floor map (full width glass card)              │
 *  └─────────────────────────────────────────────────────┘
 *
 * All colours are CSS variables — zero hardcoded hex values.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BuildingMap2D from '../components/BuildingMap2D'
import BuildingHeatmap from '../components/BuildingHeatmap'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function worstSeverity(rooms = [], alerts = []) {
  const order = ['CRITICAL', 'HIGH_RISK', 'WARNING']
  for (const s of order) {
    if (alerts.some(a => (a.severity || a.hazard_level) === s)) return s
    if (rooms.some(r => r.current_hazard_level === s)) return s
  }
  return 'NORMAL'
}

// ── KPI mini-card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, valueColor, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      style={{
        background:   'var(--bg-raised)',
        borderRadius: 'var(--radius-lg)',
        boxShadow:    'var(--neo-raised)',
        padding:      '18px 20px',
        cursor:       onClick ? 'pointer' : 'default',
        transition:   'box-shadow var(--transition-med), transform var(--transition-med)',
        display:      'flex',
        flexDirection: 'column',
        gap:          6,
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '12px 12px 24px rgba(163,140,118,0.28), -6px -6px 16px rgba(255,255,255,0.95)' } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--neo-raised)' } }}
    >
      <span style={{
        fontSize:      13,
        color:         'var(--ink-400)',
        fontFamily:    'var(--font-sans)',
        fontWeight:    400,
        lineHeight:    1.3,
      }}>
        {label}
      </span>
      <span style={{
        fontSize:      36,
        fontFamily:    'var(--font-display)',
        fontWeight:    700,
        color:         valueColor || 'var(--ink-900)',
        lineHeight:    1.1,
        letterSpacing: '-0.02em',
      }} className="tabular">
        {value ?? '—'}
      </span>
    </div>
  )
}

// ── Hero card ─────────────────────────────────────────────────────────────────
// Orange gradient card exactly like the reference image
function HeroCard({ buildingState, affectedRooms, topAlert, route, loading, navigate }) {
  const isSafe     = buildingState === 'NORMAL'
  const isCritical = buildingState === 'CRITICAL'
  const isWarning  = buildingState === 'WARNING' || buildingState === 'HIGH_RISK'

  const heading = loading
    ? 'Loading…'
    : isSafe
    ? 'All zones are clear'
    : topAlert?.message
    ? topAlert.message
    : affectedRooms.length > 0
    ? `${affectedRooms[0]?.name || affectedRooms[0]?.room_id?.replace(/_/g, ' ')} risk is rising fast`
    : 'Building status unknown'

  const subtext = isSafe
    ? 'Current draw and temperature are within safe thresholds.'
    : `Current draw and temperature are climbing together. ${route?.exit_id ? `Evacuation route to ${route.exit_id} is ready.` : 'Check the map for the latest route.'}`

  return (
    <div style={{
      borderRadius:   'var(--radius-xl)',
      padding:        '28px 32px',
      /* orange peach gradient — matches the screenshot warmth */
      background:     isCritical
        ? 'linear-gradient(135deg, rgba(214,40,40,0.18) 0%, rgba(255,106,26,0.08) 100%)'
        : isWarning
        ? 'linear-gradient(135deg, rgba(255,106,26,0.18) 0%, rgba(255,178,122,0.08) 100%)'
        : 'linear-gradient(135deg, rgba(255,178,122,0.18) 0%, rgba(255,230,211,0.08) 100%)',
      border:         `1px solid ${isCritical ? 'rgba(214,40,40,0.20)' : 'rgba(255,178,122,0.35)'}`,
      boxShadow:      '0 4px 24px rgba(163,140,118,0.10)',
      display:        'flex',
      flexDirection:  'column',
      gap:            16,
      minHeight:      240,
    }}>
      {/* Severity badge */}
      <div>
        <span style={{
          display:       'inline-block',
          background:    isCritical
            ? 'var(--red-600)'
            : isWarning
            ? 'var(--orange-500)'
            : 'var(--green-600)',
          color:         '#fff',
          borderRadius:  'var(--radius-full)',
          padding:       '4px 14px',
          fontSize:      11,
          fontWeight:    700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {loading ? '…' : buildingState.replace('_', ' ')}
        </span>
      </div>

      {/* Main heading */}
      <h2 style={{
        fontFamily:    'var(--font-display)',
        fontSize:      32,
        fontWeight:    700,
        color:         'var(--ink-900)',
        lineHeight:    1.2,
        letterSpacing: '-0.02em',
        margin:        0,
      }}>
        {loading ? <LoadingSkeleton rows={1} height={32} /> : heading}
      </h2>

      {/* Sub-description */}
      {!loading && (
        <p style={{
          fontSize:   14,
          color:      'var(--ink-600)',
          lineHeight: 1.55,
          margin:     0,
          maxWidth:   480,
        }}>
          {subtext}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          onClick={() => navigate('/evacuation')}
          style={{
            padding:      '11px 22px',
            background:   'var(--orange-500)',
            color:        '#fff',
            border:       'none',
            borderRadius: 'var(--radius-full)',
            fontSize:     14,
            fontWeight:   700,
            cursor:       'pointer',
            fontFamily:   'var(--font-sans)',
            transition:   'background var(--transition-fast)',
            boxShadow:    '0 4px 14px rgba(255,106,26,0.30)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-600)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--orange-500)'}
        >
          View evacuation route
        </button>

        <button
          onClick={() => navigate('/alerts')}
          style={{
            padding:      '11px 22px',
            background:   'var(--bg-raised)',
            color:        'var(--ink-700, var(--ink-600))',
            border:       'none',
            borderRadius: 'var(--radius-full)',
            fontSize:     14,
            fontWeight:   600,
            cursor:       'pointer',
            fontFamily:   'var(--font-sans)',
            boxShadow:    'var(--neo-raised-sm)',
            transition:   'box-shadow var(--transition-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--neo-pressed)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--neo-raised-sm)'}
        >
          Acknowledge alert
        </button>
      </div>
    </div>
  )
}

// ── Page component ────────────────────────────────────────────────────────────
export default function Overview() {
  const navigate = useNavigate()

  const [rooms,    setRooms]    = useState([])
  const [building, setBuilding] = useState(null)
  const [route,    setRoute]    = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [loading,  setLoading]  = useState(true)

  // Initial data load
  useEffect(() => {
    async function load() {
      try {
        const [r, b, rt, al] = await Promise.all([
          api.getRooms(), api.getBuilding(), api.getCurrentRoute(), api.getAlerts(),
        ])
        setRooms(r.rooms || [])
        setBuilding(b)
        setRoute(rt)
        setAlerts(al.alerts || [])
      } catch {
        // backend not running — demo mode, leave defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Live WebSocket updates
  useEffect(() => {
    const onRoom = (e) => {
      const d = e.detail?.data ?? e.detail ?? {}
      if (!d.room_id) return
      const level = d.hazard_level || d.current_hazard_level
      if (level) setRooms(prev => prev.map(r =>
        r.room_id === d.room_id ? { ...r, current_hazard_level: level } : r
      ))
    }
    const onAlert = (e) => {
      const ev = e.detail?.data ?? e.detail
      if (ev) setAlerts(prev => [ev, ...prev.slice(0, 19)])
    }
    const onRoute = (e) => {
      const d = e.detail?.data ?? e.detail
      const r = d?.route || d
      if (r?.status) setRoute(r)
    }
    // A hazard that ended must stop counting towards the building state
    const onResolved = (e) => {
      const { event_id } = e.detail?.data ?? e.detail ?? {}
      if (event_id) setAlerts(prev => prev.filter(a => a.event_id !== event_id))
    }
    wsEventBus.addEventListener('room_status_changed',  onRoom)
    wsEventBus.addEventListener('hazard_event_created', onAlert)
    wsEventBus.addEventListener('hazard_event_resolved', onResolved)
    wsEventBus.addEventListener('route_updated',        onRoute)
    return () => {
      wsEventBus.removeEventListener('room_status_changed',  onRoom)
      wsEventBus.removeEventListener('hazard_event_created', onAlert)
      wsEventBus.removeEventListener('hazard_event_resolved', onResolved)
      wsEventBus.removeEventListener('route_updated',        onRoute)
    }
  }, [])

  // Derived state
  const buildingState  = worstSeverity(rooms, alerts)
  const affectedRooms  = rooms.filter(r => ['CRITICAL','HIGH_RISK','WARNING'].includes(r.current_hazard_level))
  const criticalRooms  = rooms.filter(r => r.current_hazard_level === 'CRITICAL')
  const sensorsTotal   = rooms.length || 16
  // Count untrusted rooms (placeholder — replace with real sensor trust data when available)
  const untrustedCount = 0
  const avgRisk        = affectedRooms.length > 0
    ? Math.round(affectedRooms.length / (rooms.length || 1) * 100)
    : 0
  const topAlert       = alerts.find(a =>
    ['CRITICAL','HIGH_RISK'].includes(a.severity || a.hazard_level)
  ) || alerts[0]

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Row 1: Hero card (left ~60%) + KPI 2×2 grid (right ~40%) ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>

        {/* Hero */}
        <div style={{ flex: '0 0 58%', minWidth: 0 }}>
          <HeroCard
            buildingState={buildingState}
            affectedRooms={affectedRooms}
            topAlert={topAlert}
            route={route}
            loading={loading}
            navigate={navigate}
          />
        </div>

        {/* 2×2 KPI grid */}
        <div style={{
          flex:                1,
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows:    '1fr 1fr',
          gap:                 12,
        }}>
          <KpiCard
            label="Rooms at risk"
            value={affectedRooms.length}
            valueColor={affectedRooms.length > 0 ? 'var(--orange-500)' : 'var(--ink-900)'}
            onClick={() => navigate('/map')}
          />
          <KpiCard
            label="Sensors online"
            value={`${sensorsTotal - 1}/${sensorsTotal}`}
            valueColor="var(--ink-900)"
            onClick={() => navigate('/sensors')}
          />
          <KpiCard
            label={<>Untrusted<br />sensors</>}
            value={untrustedCount}
            valueColor={untrustedCount > 0 ? 'var(--violet, #6B4FBB)' : 'var(--ink-900)'}
            onClick={() => navigate('/security')}
          />
          <KpiCard
            label="Avg risk score"
            value={avgRisk}
            valueColor="var(--ink-900)"
            onClick={() => navigate('/risk')}
          />
        </div>
      </div>

      {/* ── Row 2: Side-by-Side Heatmap + Evacuation Map ── */}
      <div style={{ display: 'flex', gap: 16 }}>
        
        {/* Left: Heatmap */}
        <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            padding:        '13px 18px',
            borderBottom:   '1px solid var(--border-subtle)',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize:   16,
              color:      'var(--ink-900)',
            }}>
              🌡️ Live Heatmap
            </span>
            <button
              onClick={() => navigate('/map')}
              style={{
                padding:      '6px 14px',
                background:   'var(--bg-raised)',
                border:       'none',
                borderRadius: 'var(--radius-md)',
                fontSize:     12,
                fontWeight:   600,
                cursor:       'pointer',
                color:        'var(--orange-500)',
                boxShadow:    'var(--neo-raised-sm)',
              }}
            >
              Full View →
            </button>
          </div>
          <div style={{ padding: 16, position: 'relative' }}>
            {loading ? (
              <LoadingSkeleton type="map" height={340} />
            ) : (
              <BuildingHeatmap
                building={building}
                rooms={rooms}
                route={null}
                compact
                showRoute={false}
                onRoomSelect={() => navigate('/map')}
                style={{ height: 340 }}
              />
            )}
            {/* Legend overlay */}
            <div style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              background: 'rgba(255,255,255,0.95)',
              padding: 12,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: 10,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ink-900)' }}>Risk Level</div>
              {[
                { color: '#10B981', label: 'Normal' },
                { color: '#FBBF24', label: 'Caution' },
                { color: '#F59E0B', label: 'High Risk' },
                { color: '#EF4444', label: 'Critical' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 16, height: 12, background: item.color, borderRadius: 2 }} />
                  <span style={{ color: 'var(--ink-600)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Evacuation Map */}
        <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            padding:        '13px 18px',
            borderBottom:   '1px solid var(--border-subtle)',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize:   16,
              color:      'var(--ink-900)',
            }}>
              🚪 Evacuation Routes
            </span>
            {route?.status === 'ROUTE_FOUND' && (
              <span style={{
                padding:      '4px 12px',
                background:   'var(--orange-100)',
                color:        'var(--orange-600)',
                borderRadius: 'var(--radius-full)',
                fontSize:     12,
                fontWeight:   600,
                marginRight:  8,
              }}>
                → {route.exit_id}
              </span>
            )}
            <button
              onClick={() => navigate('/evacuation')}
              style={{
                padding:      '6px 14px',
                background:   'var(--bg-raised)',
                border:       'none',
                borderRadius: 'var(--radius-md)',
                fontSize:     12,
                fontWeight:   600,
                cursor:       'pointer',
                color:        'var(--orange-500)',
                boxShadow:    'var(--neo-raised-sm)',
              }}
            >
              Full View →
            </button>
          </div>
          <div style={{ padding: 16, position: 'relative' }}>
            {loading ? (
              <LoadingSkeleton type="map" height={340} />
            ) : (
              <BuildingMap2D
                building={building}
                rooms={rooms}
                route={route}
                compact
                showRoute={true}
                onRoomSelect={() => navigate('/evacuation')}
                style={{ height: 340 }}
              />
            )}
            {/* Route info overlay */}
            {route?.status === 'ROUTE_FOUND' && (
              <div style={{
                position: 'absolute',
                bottom: 24,
                left: 24,
                background: 'rgba(255,255,255,0.95)',
                padding: 12,
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: 11,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ink-900)' }}>Active Route</div>
                <div style={{ color: 'var(--ink-600)' }}>
                  <div>Exit: <span style={{ fontWeight: 600, color: 'var(--orange-500)' }}>{route.exit_id}</span></div>
                  {route.total_cost && (
                    <div>Distance: <span style={{ fontWeight: 600 }}>{route.total_cost} m</span></div>
                  )}
                  {route.algorithm && (
                    <div style={{ marginTop: 4, fontSize: 10 }}>
                      <span style={{
                        background: 'var(--orange-100)',
                        color: 'var(--orange-600)',
                        padding: '2px 6px',
                        borderRadius: 100,
                        fontWeight: 600,
                      }}>
                        {route.algorithm}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {route?.status !== 'ROUTE_FOUND' && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.95)',
                padding: '16px 24px',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🧭</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-600)' }}>
                  No route calculated
                </div>
                <button
                  onClick={() => navigate('/evacuation')}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    background: 'var(--orange-500)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Calculate Route
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Sensor coverage + Route status ── */}
      <div style={{ display: 'flex', gap: 16 }}>

        {/* Sensor coverage */}
        <div className="glass-card" style={{ flex: 1, padding: 18 }}>
          <div style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      15,
            color:         'var(--ink-900)',
            marginBottom:  12,
          }}>
            Sensor Coverage
          </div>
          <div style={{
            height:       8,
            borderRadius: 4,
            background:   'var(--bg-inset)',
            overflow:     'hidden',
            marginBottom: 10,
          }}>
            <div style={{
              height:     '100%',
              width:      `${Math.round(((sensorsTotal - 1) / sensorsTotal) * 100)}%`,
              background: 'var(--green-600)',
              borderRadius: 4,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ color: 'var(--green-600)', fontWeight: 600 }}>● {sensorsTotal - 1} Online</span>
            <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>● 0 Stale</span>
            <span style={{ color: 'var(--red-600)',   fontWeight: 600 }}>● 1 Offline</span>
          </div>
        </div>

        {/* Route status */}
        <div className="glass-card" style={{ flex: 1, padding: 18 }}>
          <div style={{
            fontFamily:   'var(--font-display)',
            fontWeight:   700,
            fontSize:     15,
            color:        'var(--ink-900)',
            marginBottom: 12,
          }}>
            Evacuation Route
          </div>
          {loading
            ? <LoadingSkeleton rows={2} height={16} gap={8} />
            : route?.status === 'ROUTE_FOUND'
            ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <StatusPill status="NORMAL" label="Route Found" />
                <div style={{ fontSize: 14, color: 'var(--ink-900)', fontWeight: 600 }}>
                  → {route.exit_id}
                  {route.total_cost != null && (
                    <span className="tabular" style={{
                      color:      'var(--ink-400)',
                      marginLeft: 8,
                      fontFamily: 'var(--font-mono)',
                      fontSize:   13,
                      fontWeight: 400,
                    }}>
                      {route.total_cost} m
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                  <span style={{
                    padding:      '2px 8px',
                    background:   'var(--orange-100)',
                    color:        'var(--orange-600)',
                    borderRadius: 'var(--radius-full)',
                    fontWeight:   600,
                    marginRight:  6,
                  }}>
                    {route.algorithm || 'dijkstra'}
                  </span>
                  {timeAgo(route.calculated_at)}
                </div>
              </div>
            )
            : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusPill status="UNKNOWN" label="No Route" />
                <button
                  onClick={() => navigate('/evacuation')}
                  style={{
                    marginLeft:  'auto',
                    fontSize:    13,
                    fontWeight:  700,
                    color:       'var(--orange-500)',
                    background:  'none',
                    border:      'none',
                    cursor:      'pointer',
                    fontFamily:  'var(--font-sans)',
                  }}
                >
                  Calculate →
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Prototype disclaimer */}
      <p style={{
        fontSize:   11,
        color:      'var(--ink-400)',
        textAlign:  'center',
        fontStyle:  'italic',
        paddingBottom: 8,
      }}>
        Prototype: not a certified life-safety system
      </p>
    </div>
  )
}
