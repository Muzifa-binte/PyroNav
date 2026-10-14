import React, { useEffect, useState } from 'react'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

export default function Configuration() {
  const [rooms,   setRooms]   = useState([])
  const [sensors, setSensors] = useState([])
  const [exits,   setExits]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getRooms(), api.getSensors(), api.getExits()])
      .then(([r, s, e]) => {
        setRooms(r.rooms || [])
        setSensors(s.sensors || [])
        setExits(e.exits || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const Section = ({ title, children }) => (
    <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
      <div className="label" style={{ marginBottom: 'var(--space-3)' }}>{title}</div>
      {children}
    </div>
  )

  const Row = ({ cols }) => (
    <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
      {cols.map((c, i) => (
        <div key={i} style={{ flex: 1, color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{c}</div>
      ))}
    </div>
  )

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(105,183,255,0.08)', border: '1px solid var(--accent-primary)30', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
        ℹ Configuration is read-only in this release. Editing will be enabled once the backend supports save validation.
      </div>

      {loading ? <LoadingSkeleton lines={6} height={18} gap={12} /> : (
        <>
          <Section title="Rooms">
            <Row cols={['Room ID', 'Name', 'Hazard Level']} />
            {rooms.map(r => <Row key={r.room_id} cols={[r.room_id, r.name, r.current_hazard_level || '—']} />)}
          </Section>

          <Section title="Sensors">
            <Row cols={['Sensor ID', 'Type', 'Room', 'Status']} />
            {sensors.map(s => <Row key={s.sensor_id} cols={[s.sensor_id, s.sensor_type, s.room_id, s.status]} />)}
          </Section>

          <Section title="Exits">
            <Row cols={['Exit ID', 'Name', 'Available']} />
            {exits.map(e => <Row key={e.exit_id} cols={[e.exit_id, e.name || '—', e.available ? 'Yes' : 'No']} />)}
          </Section>
        </>
      )}
    </div>
  )
}
