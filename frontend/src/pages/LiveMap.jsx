import React, { useEffect, useState } from 'react'
import BuildingMap2D from '../components/BuildingMap2D'
import MapLegend from '../components/MapLegend'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

export default function LiveMap() {
  const [building, setBuilding] = useState(null)
  const [rooms, setRooms] = useState([])
  const [route, setRoute] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const roomMap = Object.fromEntries((rooms || []).map(r => [r.room_id, r]))
  const selectedRoomData = selected ? roomMap[selected] : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-4)', height: '100%' }}>
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

        {/* Route summary */}
        {route && (
          <div className="card" style={{ fontSize: 13 }}>
            <div className="label" style={{ marginBottom: 'var(--space-2)' }}>Route Summary</div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Status</div>
                <StatusPill level={route.status === 'ROUTE_FOUND' ? 'NORMAL' : 'CRITICAL'}
                            label={route.status?.replace(/_/g, ' ')} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Destination</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{route.exit_id || '—'}</div>
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
      <div className="card">
        {selectedRoomData ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>{selectedRoomData.name}</h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close room detail"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
              >×</button>
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div className="label" style={{ marginBottom: 4 }}>Hazard Level</div>
              <StatusPill level={selectedRoomData.current_hazard_level || 'UNKNOWN'} />
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div className="label" style={{ marginBottom: 4 }}>Data Quality</div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selectedRoomData.data_quality_status || '—'}
              </span>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 4 }}>Last Updated</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }} className="tabular">
                {selectedRoomData.last_updated_at
                  ? new Date(selectedRoomData.last_updated_at).toLocaleTimeString()
                  : '—'}
              </span>
            </div>
            {selectedRoomData.demo_data && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)' }}>
                ℹ Demo data — connect to backend for live readings
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true" style={{ fontSize: 32 }}>👆</span>
            <p>Select a room on the map to view its details</p>
          </div>
        )}
      </div>
    </div>
  )
}
