import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MetricCard from '../components/MetricCard'
import BuildingMap2D from '../components/BuildingMap2D'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

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
          api.getRooms(),
          api.getBuilding(),
          api.getCurrentRoute(),
          api.getAlerts(),
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

  const affectedRooms   = rooms.filter(r => r.current_hazard_level !== 'NORMAL' && r.current_hazard_level !== 'UNKNOWN')
  const criticalRooms   = rooms.filter(r => r.current_hazard_level === 'CRITICAL')
  const unknownRooms    = rooms.filter(r => r.current_hazard_level === 'UNKNOWN')

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <MetricCard
          label="Building State"
          value={criticalRooms.length > 0 ? 'CRITICAL' : affectedRooms.length > 0 ? 'WARNING' : 'NORMAL'}
          accent={criticalRooms.length > 0 ? 'var(--status-critical)' : affectedRooms.length > 0 ? 'var(--status-warning)' : 'var(--status-normal)'}
          icon="🏥"
        />
        <MetricCard
          label="Affected Rooms"
          value={affectedRooms.length}
          sub={`${criticalRooms.length} critical`}
          accent={affectedRooms.length > 0 ? 'var(--status-warning)' : 'var(--status-normal)'}
          icon="⚠"
          onClick={() => navigate('/map')}
        />
        <MetricCard
          label="Active Alerts"
          value={alerts.length}
          accent={alerts.length > 0 ? 'var(--status-critical)' : 'var(--status-normal)'}
          icon="🔔"
          onClick={() => navigate('/alerts')}
        />
        <MetricCard
          label="Route Status"
          value={route?.status || '—'}
          sub={route?.exit_id ? `→ ${route.exit_id}` : 'No route calculated'}
          accent={route?.status === 'ROUTE_FOUND' ? 'var(--status-normal)' : route?.status ? 'var(--status-critical)' : 'var(--status-unknown)'}
          icon="🚪"
          onClick={() => navigate('/evacuation')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-4)' }}>
        {/* Map preview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span className="label">Building Map</span>
            <button
              onClick={() => navigate('/map')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 12 }}
            >
              Open full map →
            </button>
          </div>
          {loading ? <LoadingSkeleton lines={4} height={20} /> : (
            <BuildingMap2D
              building={building}
              rooms={rooms}
              route={route}
              compact
              onRoomSelect={id => navigate('/map')}
            />
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Active alerts */}
          <div className="card">
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Active Alerts</div>
            {loading ? <LoadingSkeleton lines={3} /> :
             error   ? <div className="error-state">{error}</div> :
             alerts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active alerts — system normal</div>
            ) : alerts.slice(0, 5).map(a => (
              <div key={a.event_id || a.notification_id || Math.random()} style={{
                padding: 'var(--space-2) 0',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              }}>
                <StatusPill level={a.severity || a.hazard_level || 'UNKNOWN'} size="sm" />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.message || a.room_id || 'Event'}
                </span>
              </div>
            ))}
          </div>

          {/* Room states */}
          <div className="card" style={{ flex: 1 }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Room States</div>
            {loading ? <LoadingSkeleton lines={4} /> : rooms.slice(0, 6).map(r => (
              <div key={r.room_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--space-1) 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{r.name}</span>
                <StatusPill level={r.current_hazard_level || 'UNKNOWN'} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
