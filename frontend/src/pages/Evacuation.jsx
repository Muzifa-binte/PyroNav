import React, { useEffect, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const ROUTE_STATUS_MAP = {
  ROUTE_FOUND:           'ROUTE_FOUND',
  NO_VALID_ROUTE:        'NO_VALID_ROUTE',
  NO_AVAILABLE_EXIT:     'NO_AVAILABLE_EXIT',
  RECALCULATION_PENDING: 'RECALCULATION_PENDING',
  INVALID_ORIGIN:        'INVALID_ORIGIN',
}

export default function Evacuation() {
  const [building,    setBuilding]    = useState(null)
  const [rooms,       setRooms]       = useState([])
  const [route,       setRoute]       = useState(null)
  const [exits,       setExits]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [calcLoading, setCalcLoading] = useState(false)
  const [origin,      setOrigin]      = useState('main_lobby')
  const [algo,        setAlgo]        = useState('dijkstra')
  const [recalcToast, setRecalcToast] = useState(null)

  // WebSocket route updates
  useEffect(() => {
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail
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
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--ink-900)',
            margin: 0,
          }}>
            Evacuation &amp; Pathfinding
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 4 }}>
            Current route and status
          </p>
        </div>
        {recalcToast && (
          <div style={{
            padding: '8px 14px',
            background: 'rgba(255,106,26,0.10)',
            border: '1px solid var(--orange-500)',
            borderRadius: 8,
            color: 'var(--orange-600)',
            fontSize: 13,
            fontWeight: 500,
          }}>
            ↻ {recalcToast}
          </div>
        )}
      </div>

      {/* Main two-column */}
      <div style={{ display: 'flex', gap: 20 }}>

        {/* Left column: map + legend */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--ink-900)',
              marginBottom: 12,
            }}>
              Evacuation Route
            </div>
            {loading
              ? <LoadingSkeleton type="map" height={400} />
              : <BuildingMap2D building={building} rooms={rooms} route={route} />}
          </div>
          <MapLegend compact />
        </div>

        {/* Right column: controls + result + exits */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Calculate route card */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink-900)',
              marginBottom: 16,
            }}>
              Calculate Route
            </div>

            {/* Origin room */}
            <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Origin Room
            </div>
            <select
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              style={{
                width: '100%',
                marginBottom: 14,
                background: 'var(--bg-inset)',
                boxShadow: 'var(--neo-inset)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--ink-900)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name}</option>)}
            </select>

            {/* Algorithm */}
            <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Algorithm
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {['dijkstra', 'bfs'].map(a => {
                const isActive = algo === a
                return (
                  <button
                    key={a}
                    onClick={() => setAlgo(a)}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: 'var(--bg-raised)',
                      boxShadow: isActive ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
                      color: isActive ? 'var(--orange-500)' : 'var(--ink-600)',
                      border: 'none',
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      fontFamily: 'var(--font-sans)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {a === 'dijkstra' ? 'Dijkstra' : 'BFS'}
                  </button>
                )
              })}
            </div>

            {/* Calculate button — flat orange */}
            <button
              onClick={handleCalculate}
              disabled={calcLoading}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: calcLoading ? 'var(--ink-400)' : 'var(--orange-500)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: calcLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={e => { if (!calcLoading) e.currentTarget.style.background = 'var(--orange-600)' }}
              onMouseLeave={e => { if (!calcLoading) e.currentTarget.style.background = 'var(--orange-500)' }}
            >
              {calcLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Calculating…
                </span>
              ) : 'Calculate Route'}
            </button>
          </div>

          {/* Route result card */}
          {route && route.status !== 'NO_ROUTE_CALCULATED' && (
            <div className="glass-card" style={{
              padding: 16,
              borderLeft: noRoute ? '4px solid var(--red-600)' : '4px solid var(--green-600)',
            }}>
              <div style={{ marginBottom: 10 }}>
                <StatusPill status={ROUTE_STATUS_MAP[route.status] || 'unknown'} label={route.status?.replace(/_/g, ' ')} size="lg" />
              </div>

              {noRoute ? (
                <div style={{
                  background: 'rgba(214,40,40,0.08)',
                  border: '1px solid var(--red-600)',
                  borderRadius: 8,
                  padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-600)', fontWeight: 700, fontSize: 14 }}>
                    <span>✕</span>
                    <span>No valid evacuation route found</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 6 }}>
                    {route.status === 'NO_AVAILABLE_EXIT'
                      ? 'All exits are currently unavailable.'
                      : 'All paths to exits are blocked or unsafe.'}
                  </div>
                </div>
              ) : (
                <>
                  {/* Destination */}
                  {route.exit_id && (
                    <div style={{ fontSize: 16, color: 'var(--ink-900)', marginBottom: 8 }}>
                      → {route.exit_id}
                    </div>
                  )}

                  {/* Cost + algorithm */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {route.algorithm && (
                      <span style={{
                        padding: '2px 8px',
                        background: 'var(--orange-100)',
                        color: 'var(--orange-600)',
                        borderRadius: '100px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {route.algorithm}
                      </span>
                    )}
                    {route.total_cost != null && (
                      <span className="tabular" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-600)', fontSize: 13 }}>
                        {route.total_cost} m
                      </span>
                    )}
                  </div>

                  {/* Steps list */}
                  {route.node_ids && route.node_ids.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Route Steps
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {route.node_ids.map((n, idx) => (
                          <div key={`${n}-${idx}`} style={{
                            borderLeft: '3px solid var(--orange-500)',
                            paddingLeft: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <span style={{
                              background: 'var(--orange-500)',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}>
                              {idx + 1}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--ink-900)' }}>
                              {n.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Exits card */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--ink-900)',
              marginBottom: 10,
            }}>
              Available Exits
            </div>
            {exits.length === 0 ? (
              <div style={{ color: 'var(--ink-400)', fontSize: 13 }}>No exit data available</div>
            ) : exits.map(e => (
              <div key={e.exit_id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--ink-900)' }}>{e.name || e.exit_id}</span>
                <StatusPill
                  status={e.available ? 'SAFE' : 'CRITICAL'}
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
