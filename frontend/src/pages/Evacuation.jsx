import React, { useEffect, useState, useCallback } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// ── View modes ───────────────────────────────────────────────────────────────
const VIEW_MODES = {
  SINGLE:  'single',
  COMPARE: 'compare',
}

// ── Small helpers ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ink-400)',
      marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-subtle, rgba(0,0,0,0.07))', margin: '14px 0' }} />
}

function RouteSteps({ nodeIds, color }) {
  if (!nodeIds || nodeIds.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
      {nodeIds.map((n, idx) => (
        <div key={`${n}-${idx}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 4,
        }}>
          <span style={{
            background: color,
            color: '#fff',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {idx + 1}
          </span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            {idx > 0 && (
              <div style={{ width: 1, height: 10, background: `${color}44`, position: 'absolute', marginLeft: -13 }} />
            )}
            <span style={{ fontSize: 12, color: 'var(--ink-700, #374151)' }}>
              {n.replace(/_/g, ' ').replace(/^J /, 'Junction ').replace(/^EXIT /, 'Exit ')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AlgoResultPanel({ label, route, color, accentBg }) {
  if (!route) return null
  const noRoute = route.status === 'NO_VALID_ROUTE' || route.status === 'NO_AVAILABLE_EXIT'

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${noRoute ? 'rgba(214,40,40,0.3)' : color + '44'}`,
      background: noRoute ? 'rgba(214,40,40,0.04)' : accentBg,
      padding: '12px 14px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: noRoute ? '#D62828' : color,
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-900)' }}>{label}</span>
      </div>

      {noRoute ? (
        <div style={{ fontSize: 11, color: '#D62828', fontWeight: 600 }}>
          ✕ {route.status === 'NO_AVAILABLE_EXIT' ? 'No exits available' : 'No valid route'}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--ink-600)', fontWeight: 600, marginBottom: 4 }}>
            → {(route.exit_id || '').replace(/-/g, ' ')}
          </div>
          {route.total_cost != null && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: color, fontWeight: 700 }}>
              {route.algorithm === 'bfs' ? `${Math.round(route.total_cost)} hops` : `${route.total_cost} m`}
            </div>
          )}
          <RouteSteps nodeIds={route.node_ids} color={color} />
        </>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Evacuation() {
  const [building,      setBuilding]      = useState(null)
  const [rooms,         setRooms]         = useState([])
  const [route,         setRoute]         = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [exits,         setExits]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [calcLoading,   setCalcLoading]   = useState(false)
  const [origin,        setOrigin]        = useState('main_lobby')
  const [algo,          setAlgo]          = useState('dijkstra')
  const [viewMode,      setViewMode]      = useState(VIEW_MODES.SINGLE)
  const [toast,         setToast]         = useState(null)
  const [fireAlarm,     setFireAlarm]     = useState(false)

  // Derived routes for map
  const dijkstraRoute = viewMode === VIEW_MODES.COMPARE
    ? compareResult?.dijkstra
    : (algo === 'dijkstra' ? route : null)
  const bfsRoute = viewMode === VIEW_MODES.COMPARE
    ? compareResult?.bfs
    : (algo === 'bfs' ? route : null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const autoCalculateOnAlarm = useCallback(async () => {
    try {
      const result = await api.compareRoutes(origin)
      setCompareResult(result)
      setViewMode(VIEW_MODES.COMPARE)
      showToast('🔥 Fire alarm — routes auto-calculated!')
    } catch (_) {}
  }, [origin, showToast])

  // WebSocket listeners
  useEffect(() => {
    const onRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail
      const incoming = data?.route || data
      if (!incoming?.status) return
      if (data?.bfs_route) {
        setCompareResult({ dijkstra: incoming, bfs: data.bfs_route })
        setViewMode(VIEW_MODES.COMPARE)
      } else {
        setRoute(incoming)
      }
      showToast(`Route recalculated — ${new Date().toLocaleTimeString()}`)
    }
    const onRoomStatus = (e) => {
      const data = e.detail?.data ?? e.detail
      if (data?.hazard_level === 'CRITICAL' || data?.hazard_level === 'HIGH_RISK') {
        setFireAlarm(true)
        autoCalculateOnAlarm()
      }
    }
    wsEventBus.addEventListener('route_updated', onRouteUpdate)
    wsEventBus.addEventListener('room_status_changed', onRoomStatus)
    return () => {
      wsEventBus.removeEventListener('route_updated', onRouteUpdate)
      wsEventBus.removeEventListener('room_status_changed', onRoomStatus)
    }
  }, [origin, showToast, autoCalculateOnAlarm])

  // Initial load
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

  const handleCalculateSingle = async () => {
    setCalcLoading(true)
    setViewMode(VIEW_MODES.SINGLE)
    try {
      const result = await api.calculateRoute(origin, algo)
      setRoute(result)
    } catch (e) {
      alert(`Route calculation failed: ${e.message}`)
    } finally {
      setCalcLoading(false)
    }
  }

  const handleCompare = async () => {
    setCalcLoading(true)
    setViewMode(VIEW_MODES.COMPARE)
    try {
      const result = await api.compareRoutes(origin)
      setCompareResult(result)
    } catch {
      try {
        const [d, b] = await Promise.all([
          api.calculateRoute(origin, 'dijkstra'),
          api.calculateRoute(origin, 'bfs'),
        ])
        setCompareResult({ dijkstra: d, bfs: b, origin_room_id: origin })
      } catch (e2) {
        alert(`Comparison failed: ${e2.message}`)
        setViewMode(VIEW_MODES.SINGLE)
      }
    } finally {
      setCalcLoading(false)
    }
  }

  const activeRoute = viewMode === VIEW_MODES.SINGLE ? route : null
  const noRoute = activeRoute &&
    (activeRoute.status === 'NO_VALID_ROUTE' || activeRoute.status === 'NO_AVAILABLE_EXIT')

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Fire alarm banner ── */}
      {fireAlarm && (
        <div style={{
          background: '#D62828',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: 14,
        }}>
          <span>🔥 FIRE ALARM ACTIVE — Evacuation routes displayed below</span>
          <button onClick={() => setFireAlarm(false)} style={{
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            borderRadius: 6,
            padding: '3px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}>Dismiss</button>
        </div>
      )}

      {/* ── Algorithm legend + toast ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: 0 }}>
          Dijkstra <span style={{ color: '#FF6A1A' }}>●</span> optimal distance &nbsp;·&nbsp;
          BFS <span style={{ color: '#2F6FDE' }}>●</span> fewest hops &nbsp;·&nbsp;
          Outer path <span style={{ color: '#2E8B57' }}>- -</span>
        </p>
        {toast && (
          <div style={{
            padding: '6px 14px',
            background: 'rgba(255,106,26,0.10)',
            border: '1px solid var(--orange-500)',
            borderRadius: 8,
            color: 'var(--orange-600)',
            fontSize: 12,
            fontWeight: 600,
            alignSelf: 'center',
          }}>
            ↻ {toast}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { id: VIEW_MODES.SINGLE,  label: 'Single Algorithm' },
          { id: VIEW_MODES.COMPARE, label: '⚡ Compare Dijkstra vs BFS' },
        ].map(({ id, label }) => {
          const active = viewMode === id
          return (
            <button key={id} onClick={() => setViewMode(id)} style={{
              padding: '6px 16px',
              background: 'var(--bg-raised)',
              boxShadow: active ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
              color: active ? 'var(--orange-600)' : 'var(--ink-500, #6B7280)',
              border: 'none',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s',
            }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Main two-column body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: Map ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="glass-card" style={{ padding: 14 }}>
            {/* Map header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>
                Live Evacuation Map
              </span>
              {/* Path type pills — show when a route is active */}
              {(dijkstraRoute?.status === 'ROUTE_FOUND' || bfsRoute?.status === 'ROUTE_FOUND') && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {dijkstraRoute?.status === 'ROUTE_FOUND' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 9px', background: 'rgba(255,106,26,0.10)', border: '1px solid #FF6A1A', borderRadius: 100, fontSize: 10, fontWeight: 700, color: '#E5530A' }}>
                      <span style={{ width: 14, height: 3, background: '#FF6A1A', borderRadius: 2 }} />
                      Dijkstra
                    </span>
                  )}
                  {bfsRoute?.status === 'ROUTE_FOUND' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 9px', background: 'rgba(47,111,222,0.10)', border: '1px solid #2F6FDE', borderRadius: 100, fontSize: 10, fontWeight: 700, color: '#2F6FDE' }}>
                      <span style={{ width: 14, height: 3, background: '#2F6FDE', borderRadius: 2 }} />
                      BFS
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 9px', background: 'rgba(46,139,87,0.08)', border: '1px solid #2E8B57', borderRadius: 100, fontSize: 10, fontWeight: 700, color: '#2E8B57' }}>
                    <span style={{ width: 14, height: 2, borderTop: '2px dashed #2E8B57' }} />
                    Outer
                  </span>
                </div>
              )}
            </div>

            {loading
              ? <LoadingSkeleton type="map" height={420} />
              : <BuildingMap2D
                  building={building}
                  rooms={rooms}
                  route={viewMode === VIEW_MODES.SINGLE ? route : null}
                  dijkstraRoute={dijkstraRoute}
                  bfsRoute={bfsRoute}
                />}
          </div>

          <MapLegend compact />
        </div>

        {/* ── RIGHT: Controls + Results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── CARD 1: Route Controls ── */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 14 }}>
              Route Controls
            </div>

            {/* Origin room */}
            <SectionLabel>Origin Room</SectionLabel>
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
                padding: '9px 12px',
                color: 'var(--ink-900)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                appearance: 'auto',
              }}
            >
              {rooms.length === 0
                ? <option value="main_lobby">Main Lobby & Reception</option>
                : rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.name}</option>)
              }
            </select>

            {/* Algorithm toggle — only in single mode */}
            {viewMode === VIEW_MODES.SINGLE && (
              <>
                <SectionLabel>Algorithm</SectionLabel>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[
                    { id: 'dijkstra', label: 'Dijkstra', color: '#FF6A1A' },
                    { id: 'bfs',      label: 'BFS',      color: '#2F6FDE' },
                  ].map(({ id, label, color }) => {
                    const active = algo === id
                    return (
                      <button
                        key={id}
                        onClick={() => setAlgo(id)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          background: 'var(--bg-raised)',
                          boxShadow: active ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
                          color: active ? color : 'var(--ink-500, #6B7280)',
                          border: active ? `1px solid ${color}44` : '1px solid transparent',
                          borderRadius: 10,
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: 'var(--font-sans)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Primary action button */}
            {viewMode === VIEW_MODES.SINGLE ? (
              <button
                onClick={handleCalculateSingle}
                disabled={calcLoading}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: calcLoading ? 'var(--ink-300, #D1D5DB)' : 'var(--orange-500)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: calcLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  marginBottom: 8,
                  transition: 'background 0.15s',
                }}
              >
                {calcLoading ? '⏳ Calculating…' : 'Calculate Route'}
              </button>
            ) : (
              <button
                onClick={handleCompare}
                disabled={calcLoading}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: calcLoading ? 'var(--ink-300, #D1D5DB)' : 'linear-gradient(135deg, #FF6A1A 0%, #2F6FDE 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: calcLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  marginBottom: 8,
                }}
              >
                {calcLoading ? '⏳ Comparing…' : '⚡ Run Both Algorithms'}
              </button>
            )}

            {/* Simulate fire alarm */}
            <button
              onClick={() => { setFireAlarm(true); autoCalculateOnAlarm() }}
              disabled={calcLoading}
              style={{
                width: '100%',
                padding: '9px 0',
                background: 'rgba(214,40,40,0.06)',
                color: '#D62828',
                border: '1px solid rgba(214,40,40,0.35)',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: calcLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background 0.15s',
              }}
            >
              🔥 Simulate Fire Alarm
            </button>
          </div>

          {/* ── CARD 2: Route Result(s) ── */}
          {viewMode === VIEW_MODES.COMPARE && compareResult ? (
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 12 }}>
                Algorithm Comparison
              </div>

              {/* Two stat chips */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ padding: '10px 12px', background: 'rgba(255,106,26,0.07)', border: '1px solid rgba(255,106,26,0.25)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#FF6A1A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Dijkstra</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-800, #1F2937)' }}>
                    {compareResult.dijkstra?.status === 'ROUTE_FOUND'
                      ? `${compareResult.dijkstra.total_cost} m`
                      : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#FF6A1A', marginTop: 2 }}>
                    {compareResult.dijkstra?.exit_id?.replace(/-/g, ' ') || '—'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(47,111,222,0.07)', border: '1px solid rgba(47,111,222,0.25)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#2F6FDE', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>BFS</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-800, #1F2937)' }}>
                    {compareResult.bfs?.status === 'ROUTE_FOUND'
                      ? `${(compareResult.bfs?.node_ids?.length || 1) - 1} hops`
                      : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#2F6FDE', marginTop: 2 }}>
                    {compareResult.bfs?.exit_id?.replace(/-/g, ' ') || '—'}
                  </div>
                </div>
              </div>

              {/* Insight line */}
              {compareResult.dijkstra?.status === 'ROUTE_FOUND' && compareResult.bfs?.status === 'ROUTE_FOUND' && (
                <div style={{ fontSize: 11, color: 'var(--ink-600)', background: 'var(--bg-inset)', borderRadius: 6, padding: '7px 10px', marginBottom: 12, lineHeight: 1.5 }}>
                  <strong>Dijkstra</strong> picks the shortest distance ({compareResult.dijkstra.total_cost} m).{' '}
                  <strong>BFS</strong> picks fewest corridor hops ({(compareResult.bfs?.node_ids?.length || 1) - 1}).
                  {compareResult.dijkstra?.exit_id === compareResult.bfs?.exit_id
                    ? ' Both lead to the same exit.'
                    : ' They recommend different exits.'}
                </div>
              )}

              {/* Two route panels side-by-side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <AlgoResultPanel
                  label="Dijkstra"
                  route={compareResult.dijkstra}
                  color="#FF6A1A"
                  accentBg="rgba(255,106,26,0.04)"
                />
                <AlgoResultPanel
                  label="BFS"
                  route={compareResult.bfs}
                  color="#2F6FDE"
                  accentBg="rgba(47,111,222,0.04)"
                />
              </div>
            </div>
          ) : viewMode === VIEW_MODES.SINGLE && route && route.status !== 'NO_ROUTE_CALCULATED' ? (
            <div className="glass-card" style={{
              padding: 16,
              borderLeft: `3px solid ${noRoute ? '#D62828' : route?.algorithm === 'bfs' ? '#2F6FDE' : '#FF6A1A'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 100,
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: noRoute ? 'rgba(214,40,40,0.10)' : route?.algorithm === 'bfs' ? 'rgba(47,111,222,0.10)' : 'rgba(255,106,26,0.10)',
                  color: noRoute ? '#D62828' : route?.algorithm === 'bfs' ? '#2F6FDE' : '#E5530A',
                }}>
                  {noRoute ? route.status.replace(/_/g, ' ') : route.status.replace(/_/g, ' ')}
                </span>
              </div>

              {noRoute ? (
                <div style={{ fontSize: 13, color: '#D62828', fontWeight: 600 }}>
                  {route.status === 'NO_AVAILABLE_EXIT' ? 'All exits are unavailable.' : 'All paths to exits are blocked.'}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 4 }}>
                    → {(route.exit_id || '').replace(/-/g, ' ')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <span style={{
                      padding: '2px 8px',
                      background: route.algorithm === 'bfs' ? 'rgba(47,111,222,0.12)' : 'rgba(255,106,26,0.12)',
                      color: route.algorithm === 'bfs' ? '#2F6FDE' : '#E5530A',
                      borderRadius: 100, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                    }}>
                      {route.algorithm}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-600)', fontWeight: 600 }}>
                      {route.algorithm === 'bfs'
                        ? `${Math.round(route.total_cost)} hops`
                        : `${route.total_cost} m`}
                    </span>
                  </div>

                  <SectionLabel>Route Steps</SectionLabel>
                  <RouteSteps
                    nodeIds={route.node_ids}
                    color={route.algorithm === 'bfs' ? '#2F6FDE' : '#FF6A1A'}
                  />
                </>
              )}
            </div>
          ) : null}

          {/* ── CARD 3: Available Exits ── */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 12 }}>
              Available Exits
            </div>

            {exits.length === 0 ? (
              <div style={{ color: 'var(--ink-400)', fontSize: 12, fontStyle: 'italic' }}>
                Exit data not loaded — running in demo mode.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {exits.map((e, i) => (
                  <div key={e.exit_id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: i < exits.length - 1 ? '1px solid var(--border-subtle, rgba(0,0,0,0.06))' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: e.available ? '#2E8B57' : '#D62828',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 500 }}>
                        {e.name || e.exit_id}
                      </span>
                    </div>
                    <StatusPill
                      status={e.available ? 'SAFE' : 'CRITICAL'}
                      label={e.available ? 'Open' : 'Blocked'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CARD 4: Outer Path info ── */}
          <div className="glass-card" style={{ padding: 14, borderLeft: '3px solid #2E8B57' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 6 }}>
              Outer Perimeter Path
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.6, margin: 0 }}>
              The <strong style={{ color: '#2E8B57' }}>green dashed ring</strong> traces the building's
              outer corridor — the perimeter evacuation route connecting all 5 emergency exits
              while avoiding every interior room.
            </p>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {['EXIT NW', 'EXIT NE', 'EXIT SE', 'EXIT S', 'EXIT SW'].map((ex, i, arr) => (
                <React.Fragment key={ex}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#2E8B57', background: 'rgba(46,139,87,0.10)', padding: '2px 7px', borderRadius: 4 }}>
                    {ex}
                  </span>
                  {i < arr.length - 1 && <span style={{ fontSize: 10, color: 'var(--ink-400)', alignSelf: 'center' }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

        </div>
        {/* end right column */}
      </div>
    </div>
  )
}
