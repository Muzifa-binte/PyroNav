import React, { useEffect, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmergencyBanner from '../components/EmergencyBanner'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const DEMO_ROUTE = {
  route_id: 'demo-route-001',
  origin_node_id: 'main_lobby',
  exit_id: 'EXIT-NW',
  node_ids: ['main_lobby', 'waiting_area', 'pharmacy', 'icu', 'EXIT-NW'],
  status: 'ROUTE_FOUND',
  total_cost: 31.0,
  algorithm: 'dijkstra',
  hazard_state_snapshot: [],
  calculated_at: new Date().toISOString(),
}

const LAYER_EMOJI = { Heat: '🌡️', Route: '🗺️', Sensors: '📡', Blocked: '🚫', IDS: '🛡️' }

export default function LiveMap() {
  const [building,          setBuilding]         = useState(null)
  const [rooms,             setRooms]            = useState([])
  const [route,             setCurrentRoute]     = useState(null)
  const [selected,          setSelected]         = useState(null)
  const [loading,           setLoading]          = useState(true)
  const [emergencyMode,     setEmergencyMode]    = useState(false)
  const [emergencyMessage,  setEmergencyMessage] = useState('Building hazard detected')
  const [isDemoMode,        setIsDemoMode]       = useState(false)
  const [demoAlertRoom,     setDemoAlertRoom]    = useState(null)
  const [lastUpdate,        setLastUpdate]       = useState(null)
  const [activeLayers,      setActiveLayers]     = useState(new Set(['Heat', 'Route', 'Sensors', 'Blocked']))

  const toggleLayer = (layer) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(layer) ? next.delete(layer) : next.add(layer)
      return next
    })
  }

  useEffect(() => {
    async function load() {
      try {
        const [b, r, rt] = await Promise.all([
          api.getBuilding(), api.getRooms(), api.getCurrentRoute(),
        ])
        setBuilding(b)
        setRooms(r.rooms || [])
        setCurrentRoute(rt)
      } catch {
        setIsDemoMode(true)
        setCurrentRoute(DEMO_ROUTE)
        setRooms([
          { room_id: 'main_lobby',        name: 'Main Lobby & Reception',    current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'icu',               name: 'ICU (4 Beds)',              current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'operation_theater', name: 'Operating Theatre (OT)',    current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'waiting_area',      name: 'Waiting Area',              current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'pharmacy',          name: 'Pharmacy',                  current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'general_ward',      name: 'General Ward (6 Beds)',     current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'emergency_dept',    name: 'Emergency Department',      current_hazard_level: 'NORMAL', demo_data: true },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handleRoomStatus = (e) => {
      const data = e.detail?.data ?? e.detail ?? {}
      const { room_id, hazard_level, current_hazard_level } = data
      const level = hazard_level || current_hazard_level
      if (!room_id || !level) return
      setRooms(prev => prev.map(r =>
        r.room_id === room_id ? { ...r, current_hazard_level: level } : r
      ))
      if (level === 'CRITICAL' || level === 'HIGH_RISK') {
        setEmergencyMode(true)
        setEmergencyMessage(`Hazard detected in room ${room_id.replace(/_/g, ' ')}`)
      }
      setLastUpdate(new Date().toISOString())
    }
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail
      const incoming = data?.route || data
      if (incoming?.status) {
        setCurrentRoute(incoming)
        setLastUpdate(new Date().toISOString())
      }
    }
    wsEventBus.addEventListener('room_status_changed', handleRoomStatus)
    wsEventBus.addEventListener('route_updated',       handleRouteUpdate)
    return () => {
      wsEventBus.removeEventListener('room_status_changed', handleRoomStatus)
      wsEventBus.removeEventListener('route_updated',       handleRouteUpdate)
    }
  }, [])

  const roomMap = Object.fromEntries((rooms || []).map(r => [r.room_id, r]))
  const selectedRoomData = selected ? roomMap[selected] : null
  const noValidRoute = route?.status === 'NO_VALID_ROUTE' || route?.status === 'NO_AVAILABLE_EXIT'

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Emergency banner */}
      <EmergencyBanner
        active={emergencyMode}
        message={emergencyMessage}
        exitId={route?.exit_id || 'nearest exit'}
      />

      {/* Page header */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--ink-900)',
        fontSize: 28,
        fontWeight: 700,
        marginBottom: 0,
      }}>
        Live Map
      </h2>

      {/* Layer toggle bar — neumorphic pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        {['Heat', 'Route', 'Sensors', 'Blocked', 'IDS'].map(layer => {
          const isActive = activeLayers.has(layer)
          return (
            <button
              key={layer}
              onClick={() => toggleLayer(layer)}
              aria-pressed={isActive}
              style={{
                background: 'var(--bg-raised)',
                boxShadow: isActive ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
                color: isActive ? 'var(--orange-500)' : 'var(--ink-600)',
                borderRadius: 20,
                padding: '6px 14px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 200ms ease',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {LAYER_EMOJI[layer]} {layer}
            </button>
          )
        })}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Left column: map + route strip */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Map */}
          <div className="glass-card" style={{
            padding: 16,
            border: emergencyMode ? '2px solid var(--red-600)' : undefined,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Scan line on data update */}
            {lastUpdate && (
              <div
                key={lastUpdate}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  height: 2,
                  width: '100%',
                  background: 'var(--orange-500)',
                  transformOrigin: 'left center',
                  animation: 'scanLine 0.8s ease-out forwards',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
                aria-hidden="true"
              />
            )}
            {loading
              ? <LoadingSkeleton type="map" height={480} />
              : (
                <BuildingMap2D
                  building={building}
                  rooms={rooms}
                  route={activeLayers.has('Route') ? route : null}
                  onRoomSelect={setSelected}
                  selectedRoom={selected}
                  showRoute={activeLayers.has('Route')}
                  showBlocked={activeLayers.has('Blocked')}
                  style={{ height: 480 }}
                />
              )}
          </div>

          {/* No valid route banner */}
          {noValidRoute && (
            <div className="glass-card" style={{
              background: 'rgba(214,40,40,0.08)',
              border: '1px solid var(--red-600)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 24, color: 'var(--red-600)' }}>✕</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--red-600)' }}>
                NO VALID EVACUATION ROUTE
              </span>
            </div>
          )}

          {/* Route summary strip */}
          {route && route.status !== 'NO_ROUTE_CALCULATED' && !noValidRoute && (
            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusPill
                  status={route.status === 'ROUTE_FOUND' ? 'ROUTE_FOUND' : 'NO_VALID_ROUTE'}
                  label={route.status?.replace(/_/g, ' ')}
                />
                {route.exit_id && (
                  <span style={{ color: 'var(--ink-900)', fontWeight: 600, fontSize: 14 }}>
                    → {route.exit_id}
                  </span>
                )}
                {route.algorithm && (
                  <span style={{
                    padding: '2px 8px',
                    background: 'var(--orange-100)',
                    color: 'var(--orange-600)',
                    borderRadius: '100px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {route.algorithm}
                  </span>
                )}
                {route.total_cost != null && (
                  <span className="tabular" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-600)', fontSize: 13 }}>
                    {route.total_cost} m
                  </span>
                )}
                {route.calculated_at && (
                  <span className="tabular" style={{ color: 'var(--ink-400)', fontSize: 11, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {new Date(route.calculated_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: rooms list + selected detail + demo */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Rooms list */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--ink-900)',
              marginBottom: 10,
            }}>
              Rooms
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rooms.map(r => (
                <div
                  key={r.room_id}
                  onClick={() => setSelected(r.room_id)}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelected(r.room_id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: selected === r.room_id ? 'var(--orange-100)' : 'transparent',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => { if (selected !== r.room_id) e.currentTarget.style.background = 'rgba(255,106,26,0.05)' }}
                  onMouseLeave={e => { if (selected !== r.room_id) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 12, color: 'var(--ink-900)' }}>{r.name}</span>
                  <StatusPill level={r.current_hazard_level || 'UNKNOWN'} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Selected room detail */}
          {selectedRoomData && (
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--ink-900)',
                  margin: 0,
                }}>
                  {selectedRoomData.name}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close room detail"
                  style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                >×</button>
              </div>

              <StatusPill level={selectedRoomData.current_hazard_level || 'UNKNOWN'} size="lg" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, fontSize: 12 }}>
                {[
                  ['Room ID',      selectedRoomData.room_id],
                  ['Data Quality', selectedRoomData.data_quality_status || '—'],
                  ['Last Updated', selectedRoomData.last_updated_at
                    ? new Date(selectedRoomData.last_updated_at).toLocaleTimeString()
                    : '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ color: 'var(--ink-400)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k}</div>
                    <div style={{ color: 'var(--ink-600)', fontFamily: k === 'Room ID' ? 'var(--font-mono)' : 'var(--font-sans)' }}>{v}</div>
                  </div>
                ))}
              </div>

              {route?.node_ids?.includes(selected) && (
                <div style={{
                  marginTop: 10,
                  padding: '6px 10px',
                  background: 'rgba(255,106,26,0.08)',
                  border: '1px solid var(--orange-500)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--orange-500)',
                  fontWeight: 600,
                }}>
                  ✓ On active evacuation route
                </div>
              )}
            </div>
          )}

          {/* Demo mode */}
          {isDemoMode && (
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  background: 'var(--orange-500)',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  🔬 DEMO MODE
                </span>
              </div>
              <button
                onClick={() => {
                  setDemoAlertRoom('operation_theater')
                  setEmergencyMode(true)
                  setEmergencyMessage('Hazard detected in Operating Theatre')
                  setRooms(prev => prev.map(r =>
                    r.room_id === 'operation_theater' ? { ...r, current_hazard_level: 'CRITICAL' } : r
                  ))
                  setCurrentRoute({
                    ...DEMO_ROUTE,
                    hazard_state_snapshot: ['operation_theater'],
                    calculated_at: new Date().toISOString(),
                  })
                  setLastUpdate(new Date().toISOString())
                  wsEventBus.dispatchEvent(new CustomEvent('room_status_changed', {
                    detail: { room_id: 'operation_theater', hazard_level: 'CRITICAL' }
                  }))
                }}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  background: 'var(--orange-500)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                Simulate Alert
              </button>
              {demoAlertRoom && (
                <button
                  onClick={() => {
                    setDemoAlertRoom(null)
                    setEmergencyMode(false)
                    setRooms(prev => prev.map(r => ({ ...r, current_hazard_level: 'NORMAL' })))
                    setCurrentRoute({ ...DEMO_ROUTE, hazard_state_snapshot: [], calculated_at: new Date().toISOString() })
                    setLastUpdate(new Date().toISOString())
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'var(--bg-raised)',
                    color: 'var(--ink-600)',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    boxShadow: 'var(--neo-raised-sm)',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
