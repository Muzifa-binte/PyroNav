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

const SEVERITY_ORDER = ['CRITICAL', 'HIGH_RISK', 'WARNING', 'NORMAL', 'UNKNOWN']

function worstSeverity(rooms) {
  for (const s of SEVERITY_ORDER) {
    if (rooms.some(r => r.current_hazard_level === s)) return s
  }
  return 'NORMAL'
}

const SEVERITY_COLOR = {
  CRITICAL: '#FF5D6C',
  HIGH_RISK: '#FF8A4C',
  WARNING: '#F5BE55',
  NORMAL: '#43C59E',
  UNKNOWN: '#9AA7BA',
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

  // Live updates
  useEffect(() => {
    const onRoomStatus = (e) => {
      const { room_id, hazard_level, current_hazard_level } = e.detail || {}
      const level = hazard_level || current_hazard_level
      if (!room_id || !level) return
      setRooms(prev => prev.map(r =>
        r.room_id === room_id ? { ...r, current_hazard_level: level } : r
      ))
    }
    const onHazardEvent = (e) => {
      const ev = e.detail
      if (ev) setAlerts(prev => [ev, ...prev.slice(0, 9)])
    }
    const onRouteUpdate = (e) => {
      const data = e.detail
      const incoming = data?.route || data
      if (incoming?.status) setRoute(incoming)
    }
    wsEventBus.addEventListener('room_status_changed', onRoomStatus)
    wsEventBus.addEventListener('hazard_event_created', onHazardEvent)
    wsEventBus.addEventListener('route_updated', onRouteUpdate)
    return () => {
      wsEventBus.removeEventListener('room_status_changed', onRoomStatus)
      wsEventBus.removeEventListener('hazard_event_created', onHazardEvent)
      wsEventBus.removeEventListener('route_updated', onRouteUpdate)
    }
  }, [])

  const affectedRooms = rooms.filter(r =>
    r.current_hazard_level !== 'NORMAL' && r.current_hazard_level !== 'UNKNOWN'
  )
  const criticalRooms = rooms.filter(r => r.current_hazard_level === 'CRITICAL')
  const buildingState = worstSeverity(rooms)
  const sensorsOnline = rooms.length
  const sensorsTotal  = rooms.length

  const recentEvents = alerts.slice(0, 6)
  const topAlert = alerts.find(a =>
    (a.severity || a.hazard_level) === 'CRITICAL' || (a.severity || a.hazard_level) === 'HIGH_RISK'
  ) || alerts[0]

  const cardDelay = ['0s', '0.1s', '0.2s', '0.3s']

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Overview
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Building status and live system activity
        </p>
      </div>

      {/* Metric cards row */}
      {loading ? (
        <LoadingSkeleton rows={1} cols={4} height={120} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ animationDelay: cardDelay[0] }}>
            <MetricCard
              title="Building State"
              value={buildingState}
              severity={buildingState}
              icon="🏥"
              sparklineData={[]}
              onClick={() => navigate('/map')}
            />
          </div>
          <div style={{ animationDelay: cardDelay[1] }}>
            <MetricCard
              title="Affected Rooms"
              value={affectedRooms.length}
              sub={`${criticalRooms.length} critical`}
              severity={affectedRooms.length > 0 ? 'WARNING' : 'NORMAL'}
              icon="⚠️"
              sparklineData={[]}
              onClick={() => navigate('/map')}
            />
          </div>
          <div style={{ animationDelay: cardDelay[2] }}>
            <MetricCard
              title="Active Alerts"
              value={alerts.length}
              sub={alerts.length === 0 ? 'All clear' : 'Requires attention'}
              severity={alerts.length > 0 ? 'CRITICAL' : 'NORMAL'}
              icon="🔔"
              sparklineData={[]}
              onClick={() => navigate('/alerts')}
            />
          </div>
          <div style={{ animationDelay: cardDelay[3] }}>
            <MetricCard
              title="Sensors Online"
              value={`${sensorsOnline}/${sensorsTotal}`}
              severity="NORMAL"
              icon="📡"
              sparklineData={[]}
              onClick={() => navigate('/sensors')}
            />
          </div>
        </div>
      )}

      {/* Main two-column layout */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left: map */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Glass header bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Live Floor Plan</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click to open full map</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {route && (
                  <StatusPill
                    status={route.status === 'ROUTE_FOUND' ? 'normal' : 'critical'}
                    label={route.status === 'ROUTE_FOUND' ? `→ ${route.exit_id || 'Exit'}` : 'No Route'}
                  />
                )}
                <button
                  onClick={() => navigate('/map')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'rgba(105,183,255,0.15)',
                    border: '1px solid rgba(105,183,255,0.3)',
                    color: 'var(--accent-primary)',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Full Map →
                </button>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              {loading ? <LoadingSkeleton type="map" height={320} /> : (
                <BuildingMap2D
                  building={building}
                  rooms={rooms}
                  route={route}
                  compact
                  onRoomSelect={() => navigate('/map')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: alerts + events */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* Top alert */}
          <div className="glass-card" style={{
            padding: 16,
            borderLeft: topAlert
              ? `4px solid ${SEVERITY_COLOR[topAlert.severity || topAlert.hazard_level] || '#9AA7BA'}`
              : '4px solid var(--border-subtle)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
              Priority Alert
            </div>
            {loading ? <LoadingSkeleton rows={2} height={16} /> :
             !topAlert ? (
              <div style={{ fontSize: 13, color: 'var(--status-normal)' }}>✓ No active alerts</div>
            ) : (
              <>
                <StatusPill status={topAlert.severity || topAlert.hazard_level || 'UNKNOWN'} />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {topAlert.message || topAlert.room_id || 'Hazard event'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {timeAgo(topAlert.detected_at || topAlert.created_at)}
                </div>
              </>
            )}
          </div>

          {/* Recent events feed */}
          <div className="glass-card" style={{ padding: 16, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
              Recent Events
            </div>
            {loading ? <LoadingSkeleton rows={5} height={14} gap={10} /> :
             recentEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No recent events</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentEvents.map((ev, i) => {
                  const sev = ev.severity || ev.hazard_level || 'UNKNOWN'
                  const col = SEVERITY_COLOR[sev] || '#9AA7BA'
                  return (
                    <div key={ev.event_id || i} style={{
                      display: 'flex',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      borderLeft: `3px solid ${col}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.room_id || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.message || ev.description || sev}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Sensor freshness */}
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
            Sensor Coverage
          </div>
          {loading ? <LoadingSkeleton rows={1} height={20} /> : (
            <>
              <div style={{ display: 'flex', gap: 4, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ flex: sensorsOnline, background: 'var(--status-normal)', borderRadius: 3 }} />
                <div style={{ flex: 0, background: 'var(--status-warning)', borderRadius: 3 }} />
                <div style={{ flex: 0, background: 'var(--status-critical)', borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ color: 'var(--status-normal)' }}>● {sensorsOnline} Online</span>
                <span style={{ color: 'var(--text-muted)' }}>● 0 Stale</span>
                <span style={{ color: 'var(--status-critical)' }}>● 0 Offline</span>
              </div>
            </>
          )}
        </div>

        {/* IDS / Quick summary */}
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
            Route Status
          </div>
          {loading ? <LoadingSkeleton rows={2} height={16} gap={8} /> :
           route && route.status === 'ROUTE_FOUND' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StatusPill status="normal" label="Route Found" />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                → <strong style={{ color: 'var(--text-primary)' }}>{route.exit_id}</strong>
                {route.total_cost != null && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{route.total_cost} m</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                via {route.algorithm || 'dijkstra'} · {timeAgo(route.calculated_at)}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusPill status="unknown" label="No Route" />
              <button
                onClick={() => navigate('/evacuation')}
                style={{
                  marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                  color: 'var(--accent-primary)', background: 'none',
                  border: 'none', cursor: 'pointer',
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
