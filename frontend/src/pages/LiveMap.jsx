import React, { useEffect, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmergencyBanner from '../components/EmergencyBanner'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const HAZARD_COLOR = {
  NORMAL:    'var(--status-normal)',
  WARNING:   'var(--status-warning)',
  HIGH_RISK: 'var(--status-high)',
  CRITICAL:  'var(--status-critical)',
  UNKNOWN:   'var(--status-unknown)',
}

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

export default function LiveMap() {
  const [building,       setBuilding]       = useState(null)
  const [rooms,          setRooms]          = useState([])
  const [route,          setCurrentRoute]   = useState(null)
  const [selected,       setSelected]       = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [emergencyMode,  setEmergencyMode]  = useState(false)
  const [emergencyMessage, setEmergencyMessage] = useState('Building hazard detected')
  const [isDemoMode,     setIsDemoMode]     = useState(false)
  const [demoAlertRoom,  setDemoAlertRoom]  = useState(null)
  const [scanActive,     setScanActive]     = useState(false)
  const [layers, setLayers] = useState({ heat: true, route: true, sensors: true, blocked: true })

  // Trigger scan-line on route/room updates
  const triggerScan = () => {
    setScanActive(true)
    setTimeout(() => setScanActive(false), 1000)
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
        // Backend not available — enter demo mode
        setIsDemoMode(true)
        setCurrentRoute(DEMO_ROUTE)
        setRooms([
          { room_id: 'main_lobby', name: 'Main Lobby & Reception', current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'icu', name: 'ICU (4 Beds)', current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'operation_theater', name: 'Operating Theatre (OT)', current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'waiting_area', name: 'Waiting Area', current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'pharmacy', name: 'Pharmacy', current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'general_ward', name: 'General Ward (6 Beds)', current_hazard_level: 'NORMAL', demo_data: true },
          { room_id: 'emergency_dept', name: 'Emergency Department', current_hazard_level: 'NORMAL', demo_data: true },
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
      } else if (level === 'NORMAL') {
        // only clear if all rooms are now normal — handled below
      }
      triggerScan()
    }
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail
      const incoming = data?.route || data
      if (incoming?.status) {
        setCurrentRoute(incoming)
        triggerScan()
      }
    }
    wsEventBus.addEventListener('room_status_changed', handleRoomStatus)
    wsEventBus.addEventListener('route_updated', handleRouteUpdate)
    return () => {
      wsEventBus.removeEventListener('room_status_changed', handleRoomStatus)
      wsEventBus.removeEventListener('route_updated', handleRouteUpdate)
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
      <div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--ink-900)',
          letterSpacing: '-0.01em',
          fontFamily: 'Playfair Display, serif',
        }}>
          Live Map
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 2 }}>
          Situational awareness — 2D floor plan
        </p>
      </div>

      {/* Demo mode bar */}
      {isDemoMode && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
          <span style={{
            background: '#FF6A1A', color: '#fff', padding: '2px 10px',
            borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>DEMO MODE</span>
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
                node_ids: ['main_lobby', 'waiting_area', 'pharmacy', 'icu', 'EXIT-NW'],
                hazard_state_snapshot: ['operation_theater'],
                calculated_at: new Date().toISOString(),
              })
            }}
            style={{
              padding: '6px 14px', background: '#D62828', color: '#fff', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12,
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
              }}
              style={{
                padding: '6px 14px', background: 'var(--bg-raised)', color: 'var(--ink-600)',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                boxShadow: 'var(--neo-raised-sm)', fontWeight: 600, fontSize: 12,
              }}
            >Reset</button>
          )}
        </div>
      )}

      {/* No-route warning */}
      {noValidRoute && (
        <div style={{
          background: '#D62828', color: '#fff', padding: 24, borderRadius: 12,
          textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 4,
        }}>
          ⚠️ NO VALID EVACUATION ROUTE — All paths to exits are blocked
        </div>
      )}

      {/* Layer toggles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        {[['heat', 'Heat Layer'], ['route', 'Route'], ['sensors', 'Sensors'], ['blocked', 'Blocked']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setLayers(l => ({ ...l, [key]: !l[key] }))}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
              background: layers[key] ? 'var(--orange-500)' : 'var(--bg-raised)',
              color: layers[key] ? '#fff' : 'var(--ink-600)',
              boxShadow: layers[key] ? 'none' : 'var(--neo-raised-sm)',
            }}
          >{label}</button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selected ? '1fr 320px' : '1fr',
        gap: 16,
        position: 'relative',
      }}>
        {/* Map area */}
        <div style={{ position: 'relative' }}>
          <div
            className="glass-card"
            style={{
              padding: 16,
              border: emergencyMode ? '2px solid #D62828' : '1px solid var(--border-glass)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Scan line on data update */}
            {scanActive && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: '#FF6A1A',
                animation: 'scanLine 1s linear forwards',
                zIndex: 10,
              }} aria-hidden="true" />
            )}
            {loading ? <LoadingSkeleton type="map" height={500} /> : (
              <BuildingMap2D
                building={building}
                rooms={rooms}
                route={layers.route ? route : null}
                onRoomSelect={setSelected}
                selectedRoom={selected}
                showRoute={layers.route}
                showBlocked={layers.blocked}
              />
            )}
          </div>

          {/* Route summary strip */}
          {route && route.status !== 'NO_ROUTE_CALCULATED' && (
            <div className="glass-card" style={{ padding: '12px 20px', marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 4 }}>Status</div>
                  <StatusPill
                    status={route.status === 'ROUTE_FOUND' ? 'normal' : 'critical'}
                    label={route.status?.replace(/_/g, ' ')}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 4 }}>Destination</div>
                  <div style={{ color: 'var(--green-600)', fontWeight: 600 }}>{route.exit_id || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 4 }}>Algorithm</div>
                  <div style={{ color: 'var(--ink-600)', fontSize: 13 }}>{route.algorithm || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 4 }}>Cost</div>
                  <div className="tabular" style={{ color: 'var(--ink-900)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                    {route.total_cost != null ? `${route.total_cost} m` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 4 }}>Calculated</div>
                  <div className="tabular" style={{ color: 'var(--ink-600)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                    {route.calculated_at ? new Date(route.calculated_at).toLocaleTimeString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Room detail drawer */}
        {(
          <div className="glass-card" style={{ padding: 20, overflowY: 'auto' }}>
            {selectedRoomData ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'Playfair Display, serif' }}>
                    {selectedRoomData.name}
                  </h3>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close room detail"
                    style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                  >×</button>
                </div>

                {/* Hazard level */}
                <div style={{
                  marginBottom: 16, padding: 12,
                  background: 'var(--bg-inset)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--neo-inset)',
                  border: `1px solid ${HAZARD_COLOR[selectedRoomData.current_hazard_level] || 'var(--border-subtle)'}33`,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Hazard Level</div>
                  <StatusPill level={selectedRoomData.current_hazard_level || 'UNKNOWN'} />
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    ['Data Quality',  selectedRoomData.data_quality_status || '—'],
                    ['Room ID',       selectedRoomData.room_id],
                    ['Last Updated',  selectedRoomData.last_updated_at
                      ? new Date(selectedRoomData.last_updated_at).toLocaleTimeString()
                      : '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-600)', fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* On route badge */}
                {route?.node_ids?.includes(selected) && (
                  <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'rgba(255,106,26,0.08)',
                    border: '1px solid var(--orange-500)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    color: 'var(--orange-500)',
                  }}>
                    ✓ On active evacuation route
                  </div>
                )}

                {selectedRoomData.demo_data && (
                  <div style={{ marginTop: 12, padding: 8, background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--ink-400)', border: '1px solid var(--border-glass)' }}>
                    ℹ Demo data — connect to backend for live sensor readings
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-400)', marginBottom: 12 }}>
                  Room Status
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 12 }}>
                  Click any room on the map to inspect it
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-glass)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,106,26,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>{r.name}</span>
                      <StatusPill level={r.current_hazard_level || 'UNKNOWN'} size="sm" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
