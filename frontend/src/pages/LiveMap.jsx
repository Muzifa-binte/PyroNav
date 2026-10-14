import React, { useEffect, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const HAZARD_COLOR = {
  NORMAL:    'var(--status-normal)',
  WARNING:   'var(--status-warning)',
  HIGH_RISK: 'var(--status-high)',
  CRITICAL:  'var(--status-critical)',
  UNKNOWN:   'var(--status-unknown)',
}

export default function LiveMap() {
  const [building, setBuilding] = useState(null)
  const [rooms,    setRooms]    = useState([])
  const [route,    setRoute]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [b, r, rt] = await Promise.all([
          api.getBuilding(), api.getRooms(), api.getCurrentRoute(),
        ])
        setBuilding(b)
        setRooms(r.rooms || [])
        setRoute(rt)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handleRoomStatus = (e) => {
      const { room_id, hazard_level, current_hazard_level } = e.detail?.data ?? e.detail ?? {}  // WebSocket envelope: {event_type, data, timestamp}
      const level = hazard_level || current_hazard_level
      if (!room_id || !level) return
      setRooms(prev => prev.map(r =>
        r.room_id === room_id ? { ...r, current_hazard_level: level } : r
      ))
    }
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail  // WebSocket envelope: {event_type, data, timestamp}
      const incoming = data?.route || data
      if (incoming?.status) setRoute(incoming)
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

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Live Map
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Situational awareness — 2D floor plan
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selected ? '1fr 320px' : '1fr',
        gap: 16,
        position: 'relative',
      }}>
        {/* Map area */}
        <div style={{ position: 'relative' }}>
          <div className="glass-card" style={{ padding: 16 }}>
            {loading ? <LoadingSkeleton type="map" height={500} /> : (
              <BuildingMap2D
                building={building}
                rooms={rooms}
                route={route}
                onRoomSelect={setSelected}
                selectedRoom={selected}
              />
            )}
          </div>

          {/* Route summary strip */}
          {route && route.status !== 'NO_ROUTE_CALCULATED' && (
            <div className="glass-card" style={{ padding: '12px 20px', marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
                  <StatusPill
                    status={route.status === 'ROUTE_FOUND' ? 'normal' : 'critical'}
                    label={route.status?.replace(/_/g, ' ')}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Destination</div>
                  <div style={{ color: 'var(--status-normal)', fontWeight: 600 }}>{route.exit_id || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Algorithm</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{route.algorithm || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Cost</div>
                  <div className="tabular" style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                    {route.total_cost != null ? `${route.total_cost} m` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Calculated</div>
                  <div className="tabular" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
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
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedRoomData.name}
                  </h3>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close room detail"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                  >×</button>
                </div>

                {/* Hazard level */}
                <div style={{
                  marginBottom: 16, padding: 12,
                  background: 'var(--surface-inset)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${HAZARD_COLOR[selectedRoomData.current_hazard_level] || 'var(--border-subtle)'}33`,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Hazard Level</div>
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
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* On route badge */}
                {route?.node_ids?.includes(selected) && (
                  <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'rgba(105,183,255,0.08)',
                    border: '1px solid var(--accent-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    color: 'var(--accent-primary)',
                  }}>
                    ✓ On active evacuation route
                  </div>
                )}

                {selectedRoomData.demo_data && (
                  <div style={{ marginTop: 12, padding: 8, background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}>
                    ℹ Demo data — connect to backend for live sensor readings
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Room Status
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
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
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.name}</span>
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
