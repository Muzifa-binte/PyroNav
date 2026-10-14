import React, { useEffect, useRef, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

export default function Evacuation() {
  const [building, setBuilding] = useState(null)
  const [rooms,    setRooms]    = useState([])
  const [route,    setRoute]    = useState(null)
  const [exits,    setExits]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [calcLoading, setCalcLoading] = useState(false)
  const [origin,   setOrigin]   = useState('main_lobby')
  const [algo,     setAlgo]     = useState('dijkstra')
  const [routeRecalcMsg, setRouteRecalcMsg] = useState(null)

  // Subscribe to WebSocket route_updated events
  useEffect(() => {
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail  // WebSocket envelope: {event_type, data, timestamp}
      const incoming = data?.route || data
      if (incoming?.status) {
        setRoute(incoming)
        setRouteRecalcMsg(`Route recalculated — ${new Date().toLocaleTimeString()}`)
        // Clear the toast after 4 s
        setTimeout(() => setRouteRecalcMsg(null), 4000)
      }
    }
    wsEventBus.addEventListener('route_updated', handleRouteUpdate)
    return () => wsEventBus.removeEventListener('route_updated', handleRouteUpdate)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [b, r, rt, ex] = await Promise.all([
          api.getBuilding(), api.getRooms(), api.getCurrentRoute(), api.getExits(),
        ])
        setBuilding(b)
        setRooms(r.rooms || [])
        setRoute(rt)
        setExits(ex.exits || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCalculate = async () => {
    setCalcLoading(true)
    try {
      const result = await api.calculateRoute(origin, algo)
      setRoute(result)
    } catch (e) {
      alert(`Route calculation failed: ${e.message}`)
    } finally {
      setCalcLoading(false)
    }
  }

  const routeStatusLevel = {
    ROUTE_FOUND:          'NORMAL',
    NO_VALID_ROUTE:       'CRITICAL',
    NO_AVAILABLE_EXIT:    'CRITICAL',
    RECALCULATION_PENDING:'WARNING',
    INVALID_ORIGIN:       'HIGH_RISK',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* WebSocket route recalculation toast */}
      {routeRecalcMsg && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(105,183,255,0.12)',
          border: '1px solid var(--accent-primary)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-primary)',
          fontSize: 13,
          fontWeight: 500,
        }}>
          ↻ {routeRecalcMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-4)' }}>
        {/* Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading ? <LoadingSkeleton lines={6} height={30} /> : (
            <BuildingMap2D building={building} rooms={rooms} route={route} />
          )}
          <MapLegend />
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Calculate controls */}
          <div className="card">
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Calculate Route</div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Origin room
            </label>
            <select
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              style={{
                width: '100%', marginBottom: 'var(--space-3)',
                background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', padding: '6px 10px',
                color: 'var(--text-primary)', fontSize: 13,
              }}
            >
              {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Algorithm
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              {['dijkstra', 'bfs'].map(a => (
                <button
                  key={a}
                  onClick={() => setAlgo(a)}
                  style={{
                    flex: 1, padding: '6px',
                    background: algo === a ? 'rgba(105,183,255,0.15)' : 'var(--surface-inset)',
                    border: algo === a ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', color: algo === a ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 12, fontWeight: algo === a ? 600 : 400,
                  }}
                >
                  {a === 'dijkstra' ? 'Dijkstra (min cost)' : 'BFS (min hops)'}
                </button>
              ))}
            </div>

            <button
              onClick={handleCalculate}
              disabled={calcLoading}
              style={{
                width: '100%', padding: '8px',
                background: 'rgba(105,183,255,0.2)', border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)',
                cursor: calcLoading ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13,
              }}
            >
              {calcLoading ? 'Calculating…' : 'Calculate Route'}
            </button>
          </div>

          {/* Route result */}
          {route && route.status !== 'NO_ROUTE_CALCULATED' && (
            <div className="card">
              <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Route Result</div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <StatusPill
                  level={routeStatusLevel[route.status] || 'UNKNOWN'}
                  label={route.status?.replace(/_/g, ' ')}
                />
              </div>

              {route.status === 'NO_VALID_ROUTE' && (
                <div style={{ padding: 'var(--space-3)', background: 'rgba(255,93,108,0.1)', border: '1px solid var(--status-critical)', borderRadius: 'var(--radius-sm)', color: 'var(--status-critical)', fontSize: 13, marginBottom: 'var(--space-3)' }}>
                  ✕ No valid evacuation route found. All paths to exits are blocked or unsafe.
                </div>
              )}

              {route.exit_id && (
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Destination Exit</div>
                  <div style={{ fontWeight: 600, color: 'var(--status-normal)' }}>🚪 {route.exit_id}</div>
                </div>
              )}

              {route.node_ids && route.node_ids.length > 0 && (
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Route Path</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {route.node_ids.map((n, i) => (
                      <React.Fragment key={`${n}-${i}`}>
                        <span style={{ fontSize: 11, background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                          {n.replace(/_/g, ' ')}
                        </span>
                        {i < route.node_ids.length - 1 && <span style={{ color: 'var(--accent-primary)', fontSize: 11 }}>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Cost: <span className="tabular" style={{ color: 'var(--text-primary)' }}>{route.total_cost != null ? `${route.total_cost} m` : '—'}</span></span>
                <span>Calc: <span className="tabular">{route.calculated_at ? new Date(route.calculated_at).toLocaleTimeString() : '—'}</span></span>
              </div>
            </div>
          )}

          {/* Exits */}
          <div className="card">
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Exits</div>
            {exits.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No exit data available</div>
            ) : exits.map(e => (
              <div key={e.exit_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.name || e.exit_id}</span>
                <StatusPill level={e.available ? 'NORMAL' : 'CRITICAL'} label={e.available ? 'Available' : 'Unavailable'} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
