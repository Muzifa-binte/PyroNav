import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MetricCard from '../components/MetricCard'
import BuildingMap2D from '../components/BuildingMap2D'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

function timeAgo(isoString) {
  if (!isoString) return '—'
  const diff = Date.now() - new Date(isoString).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH_RISK', 'WARNING']

function worstSeverity(rooms, alerts = []) {
  if (alerts && alerts.some(a => (a.severity || a.hazard_level) === 'CRITICAL')) return 'CRITICAL'
  if (alerts && alerts.some(a => (a.severity || a.hazard_level) === 'HIGH_RISK')) return 'HIGH_RISK'
  if (alerts && alerts.some(a => (a.severity || a.hazard_level) === 'WARNING')) return 'WARNING'
  for (const s of SEVERITY_ORDER) {
    if (rooms && rooms.some(r => r.current_hazard_level === s)) return s
  }
  return 'NORMAL'
}

const SEVERITY_COLOR = {
  CRITICAL:  '#D62828',
  HIGH_RISK: '#FF6A1A',
  WARNING:   '#F5A400',
  NORMAL:    '#2E8B57',
  UNKNOWN:   '#8B7F76',
}

const STATE_ICON = {
  NORMAL:   '🛡️',
  WARNING:  '⚠️',
  HIGH_RISK:'🔥',
  CRITICAL: '🔥',
  UNKNOWN:  '❓',
}

export default function Overview() {
  const navigate = useNavigate()
  const [rooms,    setRooms]    = useState([])
  const [building, setBuilding] = useState(null)
  const [route,    setRoute]    = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

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
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const onRoomStatus = (e) => {
      const data = e.detail?.data ?? e.detail ?? {}
      const { room_id, hazard_level, current_hazard_level } = data
      const level = hazard_level || current_hazard_level
      if (!room_id || !level) return
      setRooms(prev => prev.map(r =>
        r.room_id === room_id ? { ...r, current_hazard_level: level } : r
      ))
    }
    const onHazardEvent = (e) => {
      const ev = e.detail?.data ?? e.detail
      if (ev) setAlerts(prev => [ev, ...prev.slice(0, 9)])
    }
    const onRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail
      const incoming = data?.route || data
      if (incoming?.status) setRoute(incoming)
    }
    wsEventBus.addEventListener('room_status_changed',  onRoomStatus)
    wsEventBus.addEventListener('hazard_event_created', onHazardEvent)
    wsEventBus.addEventListener('route_updated',        onRouteUpdate)
    return () => {
      wsEventBus.removeEventListener('room_status_changed',  onRoomStatus)
      wsEventBus.removeEventListener('hazard_event_created', onHazardEvent)
      wsEventBus.removeEventListener('route_updated',        onRouteUpdate)
    }
  }, [])

  const affectedRooms = rooms.filter(r => ['CRITICAL','HIGH_RISK','WARNING'].includes(r.current_hazard_level))
  const criticalRooms = rooms.filter(r => r.current_hazard_level === 'CRITICAL')
  const warningRooms  = rooms.filter(r => ['WARNING','HIGH_RISK'].includes(r.current_hazard_level))
  const buildingState = worstSeverity(rooms, alerts)
  const stateColor    = SEVERITY_COLOR[buildingState] || SEVERITY_COLOR.UNKNOWN
  const sensorsTotal  = rooms.length > 0 ? rooms.length : 16
  const recentEvents  = alerts.slice(0, 6)
  const topAlert      = alerts.find(a =>
    ['CRITICAL','HIGH_RISK'].includes(a.severity || a.hazard_level)
  ) || alerts[0]

  // Compute "since" for building state
  const latestEventAt = alerts[0]?.detected_at || alerts[0]?.created_at

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24 }}>

      {/* ── 1. GLOBAL SAFETY HERO ── */}
      <div className="glass-card" style={{ padding: '28px 36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Left: state */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 40, lineHeight: 1 }}>{STATE_ICON[buildingState] || '🛡️'}</span>
              <span style={{
                fontSize: 48,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: stateColor,
                lineHeight: 1,
              }}>
                {loading ? '—' : buildingState.replace('_', ' ')}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-600)', marginTop: 8 }}>
              {buildingState === 'NORMAL'
                ? 'All zones within safe thresholds'
                : `${affectedRooms.length} room(s) affected — check map for details`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 6 }}>
              {latestEventAt ? `Last event ${timeAgo(latestEventAt)}` : 'No recent events'}
            </div>
          </div>

          {/* Right: recommended exit */}
          {route?.status === 'ROUTE_FOUND' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                background: 'var(--orange-500)',
                color: '#fff',
                borderRadius: '100px',
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 4,
              }}>
                → {route.exit_id || 'Exit'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 4 }}>
                via {route.algorithm || 'Dijkstra'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. KPI ROW ── */}
      {loading ? (
        <LoadingSkeleton rows={1} cols={4} height={120} />
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          <MetricCard
            title="Building State"
            value={buildingState.replace('_', ' ')}
            sub={buildingState === 'NORMAL' ? 'All zones safe' : `${affectedRooms.length} zone(s) impacted`}
            severity={buildingState}
            icon="🏥"
            onClick={() => navigate('/map')}
          />
          <MetricCard
            title="Affected Rooms"
            value={affectedRooms.length}
            sub={affectedRooms.length === 0 ? 'All clear' : `${criticalRooms.length} critical · ${warningRooms.length} warning`}
            severity={affectedRooms.length > 0 ? (criticalRooms.length > 0 ? 'CRITICAL' : 'WARNING') : 'NORMAL'}
            icon="⚠️"
            onClick={() => navigate('/map')}
          />
          <MetricCard
            title="Active Alerts"
            value={alerts.length}
            sub={alerts.length === 0 ? 'All systems nominal' : `${alerts.length} require attention`}
            severity={alerts.length > 0 ? 'CRITICAL' : 'NORMAL'}
            icon="🔔"
            onClick={() => navigate('/alerts')}
          />
          <MetricCard
            title="Sensors Online"
            value={`${sensorsTotal}/${sensorsTotal}`}
            sub="All nodes operational"
            severity="NORMAL"
            icon="📡"
            onClick={() => navigate('/sensors')}
          />
        </div>
      )}

      {/* ── 3. TWO-COLUMN: MAP + ALERTS ── */}
      <div style={{ display: 'flex', gap: 20 }}>

        {/* Left: mini floor plan */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--ink-900)',
                margin: 0,
              }}>
                Live Floor Plan
              </h3>
              <button
                onClick={() => navigate('/map')}
                style={{
                  padding: '8px 18px',
                  background: 'var(--orange-500)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-600)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--orange-500)'}
              >
                Full Map →
              </button>
            </div>
            <div style={{ padding: 16 }}>
              {loading
                ? <LoadingSkeleton type="map" height={280} />
                : (
                  <BuildingMap2D
                    building={building}
                    rooms={rooms}
                    route={route}
                    compact
                    onRoomSelect={() => navigate('/map')}
                    style={{ height: 280 }}
                  />
                )}
            </div>
          </div>
        </div>

        {/* Right: priority alert + recent events */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Priority alert */}
          <div className="glass-card" style={{
            padding: 16,
            borderLeft: topAlert
              ? `4px solid ${SEVERITY_COLOR[topAlert.severity || topAlert.hazard_level] || 'var(--ink-400)'}`
              : '4px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Priority Alert
            </div>
            {loading ? <LoadingSkeleton rows={2} height={16} /> :
             !topAlert ? (
              <div style={{ fontSize: 13, color: 'var(--green-600)', fontWeight: 600 }}>✓ No active alerts</div>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-900)', marginBottom: 4 }}>
                  {topAlert.message || topAlert.room_id?.replace(/_/g, ' ') || 'Hazard event'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 4 }}>
                  {topAlert.room_id?.replace(/_/g, ' ') || '—'} · {timeAgo(topAlert.detected_at || topAlert.created_at)}
                </div>
                <StatusPill status={topAlert.severity || topAlert.hazard_level || 'UNKNOWN'} />
              </>
            )}
          </div>

          {/* Recent events */}
          <div className="glass-card" style={{ padding: 16, flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--ink-900)',
              marginBottom: 10,
            }}>
              Recent Events
            </div>
            {loading ? <LoadingSkeleton rows={5} height={14} gap={10} /> :
             recentEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-400)' }}>No recent events</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentEvents.map((ev, i) => {
                  const sev = ev.severity || ev.hazard_level || 'UNKNOWN'
                  const col = SEVERITY_COLOR[sev] || 'var(--ink-400)'
                  return (
                    <div key={ev.event_id || i} style={{
                      display: 'flex',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 8,
                      borderLeft: `3px solid ${col}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12,
                          color: 'var(--ink-900)',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {(ev.room_id || '—').replace(/_/g, ' ')}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: 'var(--ink-600)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {ev.message || ev.description || sev}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-400)', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                        {timeAgo(ev.detected_at || ev.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW ── */}
      <div style={{ display: 'flex', gap: 20 }}>

        {/* Sensor coverage */}
        <div className="glass-card" style={{ flex: 1, padding: 16 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--ink-900)',
            marginBottom: 12,
          }}>
            Sensor Coverage
          </div>
          <div style={{
            height: 8,
            borderRadius: 4,
            background: 'var(--bg-inset)',
            overflow: 'hidden',
            marginBottom: 10,
          }}>
            <div style={{
              height: '100%',
              width: '100%',
              background: 'var(--green-600)',
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-600)' }}>
            <span style={{ color: 'var(--green-600)' }}>● {sensorsTotal} Online</span>
            <span style={{ color: 'var(--amber-500)' }}>● 0 Stale</span>
            <span style={{ color: 'var(--red-600)' }}>● 0 Offline</span>
          </div>
        </div>

        {/* Route status */}
        <div className="glass-card" style={{ flex: 1, padding: 16 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--ink-900)',
            marginBottom: 12,
          }}>
            Route Status
          </div>
          {loading ? <LoadingSkeleton rows={2} height={16} gap={8} /> :
           route?.status === 'ROUTE_FOUND' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StatusPill status="ROUTE_FOUND" label="Route Found" />
              <div style={{ fontSize: 13, color: 'var(--ink-900)' }}>
                → <strong>{route.exit_id}</strong>
                {route.total_cost != null && (
                  <span className="tabular" style={{ color: 'var(--ink-400)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
                    {route.total_cost} m
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                <span style={{
                  padding: '2px 8px',
                  background: 'var(--orange-100)',
                  color: 'var(--orange-600)',
                  borderRadius: '100px',
                  fontSize: 11,
                  fontWeight: 600,
                  marginRight: 6,
                }}>
                  {route.algorithm || 'dijkstra'}
                </span>
                {timeAgo(route.calculated_at)}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusPill status="unknown" label="No Route" />
              <button
                onClick={() => navigate('/evacuation')}
                style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--orange-500)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Calculate →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
