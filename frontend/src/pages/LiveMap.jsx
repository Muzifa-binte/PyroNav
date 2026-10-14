import React, { useEffect, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

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

  // Live room hazard updates via WebSocket
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

  const HAZARD_LEVEL_COLOR = {
    NORMAL:   'var(--status-normal)',
    WARNING:  'var(--status-warning)',
    HIGH_RISK:'var(--status-high)',
    CRITICAL: 'var(--status-critical)',
    UNKNOWN:  'var(--status-unknown)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-4)', height: '100%' }}>
      {/* Map area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {loading ? <LoadingSkeleton lines={6} height={30} /> : (
          <BuildingMap2D
            building={building}
            rooms={rooms}
            route={route}
            onRoomSelect={setSelected}
            selectedRoom={selected}
          />
        )}
        <MapLegend />

        {/* Route summary strip */}
        {route && route.status !== 'NO_ROUTE_CALCULATED' && (
          <div className="card" style={{ fontSize: 13 }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Active Route</div>
            <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Status</div>
                <StatusPill
                  level={route.status === 'ROUTE_FOUND' ? 'NORMAL' : 'CRITICAL'}
                  label={route.status?.replace(/_/g, ' ')}
                />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Destination</div>
                <div style={{ color: 'var(--status-normal)', fontWeight: 600 }}>{route.exit_id || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Algorithm</div>
                <div style={{ color: 'var(--text-secondary)' }}>{route.algorithm || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Cost</div>
                <div className="tabular" style={{ color: 'var(--text-primary)' }}>
                  {route.total_cost != null ? `${route.total_cost} m` : '—'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Calculated</div>
                <div className="tabular" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                  {route.calculated_at ? new Date(route.calculated_at).toLocaleTimeString() : '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right detail panel */}
      <div className="card" style={{ overflowY: 'auto' }}>
        {selectedRoomData ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{selectedRoomData.name}</h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close room detail"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
              >×</button>
            </div>

            {/* Hazard level */}
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', border: `1px solid ${HAZARD_LEVEL_COLOR[selectedRoomData.current_hazard_level] || 'var(--border-subtle)'}33` }}>
              <div className="label" style={{ marginBottom: 6 }}>Hazard Level</div>
              <StatusPill level={selectedRoomData.current_hazard_level || 'UNKNOWN'} />
            </div>

            {/* Data quality */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div className="label" style={{ marginBottom: 4 }}>Data Quality</div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selectedRoomData.data_quality_status || '—'}
              </span>
            </div>

            {/* Last updated */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div className="label" style={{ marginBottom: 4 }}>Last Updated</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }} className="tabular">
                {selectedRoomData.last_updated_at
                  ? new Date(selectedRoomData.last_updated_at).toLocaleTimeString()
                  : '—'}
              </span>
            </div>

            {/* On active route? */}
            {route?.node_ids?.includes(selected) && (
              <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'rgba(105,183,255,0.1)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent-primary)' }}>
                ✓ This room is on the active evacuation route
              </div>
            )}

            {selectedRoomData.demo_data && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)' }}>
                ℹ Demo data — connect to backend for live sensor readings
              </div>
            )}
          </>
        ) : (
          <>
            {/* Default panel: all rooms list */}
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Room Status</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Click any room on the map to inspect it
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rooms.map(r => (
                <div
                  key={r.room_id}
                  onClick={() => setSelected(r.room_id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '5px 6px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
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
    </div>
  )
}
