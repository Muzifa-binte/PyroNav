import React, { useEffect, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const ROUTE_STATUS_MAP = {
  ROUTE_FOUND:           'normal',
  NO_VALID_ROUTE:        'critical',
  NO_AVAILABLE_EXIT:     'critical',
  RECALCULATION_PENDING: 'warning',
  INVALID_ORIGIN:        'high',
}

export default function Evacuation() {
  const [building,     setBuilding]     = useState(null)
  const [rooms,        setRooms]        = useState([])
  const [route,        setRoute]        = useState(null)
  const [exits,        setExits]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [calcLoading,  setCalcLoading]  = useState(false)
  const [origin,       setOrigin]       = useState('main_lobby')
  const [algo,         setAlgo]         = useState('dijkstra')
  const [recalcToast,  setRecalcToast]  = useState(null)

  // WebSocket route updates
  useEffect(() => {
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail  // WebSocket envelope: {event_type, data, timestamp}
      const incoming = data?.route || data
      if (incoming?.status) {
        setRoute(incoming)
        setRecalcToast(`Route recalculated — ${new Date().toLocaleTimeString()}`)
        setTimeout(() => setRecalcToast(null), 4000)
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

  const noRoute = route?.status === 'NO_VALID_ROUTE' || route?.status === 'NO_AVAILABLE_EXIT'

  return (
    <div style={{ padding: 24, background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'Playfair Display, serif' }}>
            Evacuation &amp; Pathfinding
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 2 }}>
            Current route and status
          </p>
        </div>
        {recalcToast && (
          <div style={{
            padding: '8px 14px',
            background: 'rgba(105,183,255,0.12)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-primary)',
            fontSize: 13, fontWeight: 500,
            animation: 'fadeInUp 0.3s ease',
          }}>
            ↻ {recalcToast}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            {loading ? <LoadingSkeleton type="map" height={400} /> : (
              <BuildingMap2D building={building} rooms={rooms} route={route} />
            )}
          </div>
          <MapLegend compact />
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Calculate route */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              Calculate Route
            </div>

            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Origin room
            </label>
            <select
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              style={{
                width: '100%', marginBottom: 12,
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                color: 'var(--ink-900)',
                fontSize: 13,
                outline: 'none',
                boxShadow: 'var(--neo-inset)',
              }}
            >
              {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Algorithm
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['dijkstra', 'bfs'].map(a => (
                <button
                  key={a}
                  onClick={() => setAlgo(a)}
                  style={{
                    flex: 1, padding: '7px',
                    background: algo === a ? 'rgba(105,183,255,0.15)' : 'var(--surface-inset)',
                    border: algo === a ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: algo === a ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 12, fontWeight: algo === a ? 600 : 400,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {a === 'dijkstra' ? 'Dijkstra' : 'BFS'}
                </button>
              ))}
            </div>

            <button
              onClick={handleCalculate}
              disabled={calcLoading}
              style={{
                width: '100%', padding: '10px 24px',
                background: '#FF6A1A',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: calcLoading ? 'wait' : 'pointer',
                fontWeight: 600, fontSize: 14,
                letterSpacing: '0.02em',
                transition: 'all var(--transition-fast)',
              }}
            >
              {calcLoading ? 'Calculating…' : 'Calculate Route'}
            </button>
          </div>

          {/* Route result */}
          {route && route.status !== 'NO_ROUTE_CALCULATED' && (
            <div className="glass-card" style={{
              padding: 16,
              borderLeft: noRoute ? '3px solid var(--status-critical)' : '3px solid var(--status-normal)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                Route Result
              </div>

              {/* Status pill */}
              <div style={{ marginBottom: 10 }}>
                <StatusPill
                  status={ROUTE_STATUS_MAP[route.status] || 'unknown'}
                  label={route.status?.replace(/_/g, ' ')}
                />
              </div>

              {/* No route warning */}
              {noRoute && (
                <div style={{
                  background: 'rgba(214,40,40,0.1)',
                  border: '2px solid #D62828',
                  borderRadius: 12,
                  padding: 24,
                  textAlign: 'center',
                  color: '#D62828',
                  fontWeight: 700,
                  fontSize: 18,
                  marginBottom: 10,
                }}>
                  ⚠️ {route.status === 'NO_AVAILABLE_EXIT'
                    ? 'All exits are unavailable.'
                    : 'No valid evacuation route. All paths blocked or unsafe.'}
                </div>
              )}

              {/* Destination */}
              {route.exit_id && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Destination Exit</div>
                  <div style={{ fontWeight: 600, color: 'var(--status-normal)' }}>🚪 {route.exit_id}</div>
                </div>
              )}

              {/* Origin */}
              {route.origin_node_id && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Origin</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{route.origin_node_id.replace(/_/g, ' ')}</div>
                </div>
              )}

              {/* Algorithm badge */}
              {route.algorithm && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 99,
                    background: 'rgba(105,183,255,0.12)',
                    border: '1px solid rgba(105,183,255,0.25)',
                    fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)',
                    textTransform: 'capitalize',
                  }}>
                    {route.algorithm}
                  </span>
                  {route.total_cost != null && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }} className="tabular">
                      {route.total_cost} m
                    </span>
                  )}
                </div>
              )}

              {/* Steps list */}
              {route.node_ids && route.node_ids.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Route Steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {route.node_ids.map((n, idx) => (
                      <div key={`${n}-${idx}`} style={{
                        borderLeft: '3px solid #FF6A1A',
                        paddingLeft: 12,
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span style={{
                          background: '#FF6A1A',
                          color: '#fff',
                          borderRadius: '50%',
                          width: 22,
                          height: 22,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>{idx + 1}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>
                          {n.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {route.calculated_at && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }} className="tabular">
                  Calculated: {new Date(route.calculated_at).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Exits */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              Exits
            </div>
            {exits.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No exit data available</div>
            ) : exits.map(e => (
              <div key={e.exit_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0',
                borderBottom: '1px solid var(--border-glass)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.name || e.exit_id}</span>
                <StatusPill
                  status={e.available ? 'normal' : 'critical'}
                  label={e.available ? 'Available' : 'Unavailable'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
