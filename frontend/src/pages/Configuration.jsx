import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

const GLASS_INPUT = {
  background: 'var(--surface-inset)',
  border: '1px solid var(--border-glass)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '8px 12px',
  width: '100%',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'var(--font-sans)',
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--text-muted)',
      padding: '14px 20px 10px',
      borderBottom: '1px solid var(--border-glass)',
    }}>
      {title}
    </div>
  )
}

function DataRow({ cols }) {
  return (
    <div style={{
      display: 'flex',
      gap: 24,
      padding: '10px 20px',
      borderBottom: '1px solid var(--border-glass)',
      fontSize: 13,
    }}>
      {cols.map((c, i) => (
        <div key={i} style={{ flex: 1, color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {c ?? '—'}
        </div>
      ))}
    </div>
  )
}

function HeaderRow({ cols }) {
  return (
    <div style={{
      display: 'flex',
      gap: 24,
      padding: '10px 20px 8px',
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      borderBottom: '1px solid var(--border-glass)',
      background: 'rgba(255,255,255,0.01)',
    }}>
      {cols.map((c, i) => (
        <div key={i} style={{ flex: 1 }}>{c}</div>
      ))}
    </div>
  )
}

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

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Configuration
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          System settings and mappings
        </p>
      </div>

      {/* Read-only notice */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(105,183,255,0.06)',
        border: '1px solid rgba(105,183,255,0.2)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}>
        ℹ Configuration is read-only in this release. Editing will be enabled once the backend supports save validation.
      </div>

      {loading ? <LoadingSkeleton rows={6} height={18} gap={12} /> : (
        <>
          {/* Rooms */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Rooms" />
            <HeaderRow cols={['Room ID', 'Name', 'Hazard Level', 'Last Updated']} />
            {rooms.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No room data available
              </div>
            ) : rooms.map(r => (
              <DataRow key={r.room_id} cols={[
                r.room_id,
                r.name,
                <StatusPill key="pill" level={r.current_hazard_level || 'UNKNOWN'} />,
                r.last_updated_at ? new Date(r.last_updated_at).toLocaleTimeString() : '—',
              ]} />
            ))}
          </div>

          {/* Sensors */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Sensors" />
            <HeaderRow cols={['Sensor ID', 'Type', 'Room', 'Status', 'Units']} />
            {sensors.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No sensor data available
              </div>
            ) : sensors.map(s => (
              <DataRow key={s.sensor_id} cols={[
                s.sensor_id,
                s.sensor_type,
                s.room_id,
                <StatusPill key="pill" status={(s.status === 'active' ? 'normal' : 'unknown')} label={s.status || '—'} />,
                s.unit_config || '—',
              ]} />
            ))}
          </div>

          {/* Exits */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Exits" />
            <HeaderRow cols={['Exit ID', 'Name', 'Available']} />
            {exits.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No exit data available
              </div>
            ) : exits.map(e => (
              <DataRow key={e.exit_id} cols={[
                e.exit_id,
                e.name || '—',
                <StatusPill key="pill"
                  status={e.available ? 'normal' : 'critical'}
                  label={e.available ? 'Available' : 'Unavailable'}
                />,
              ]} />
            ))}
          </div>

          {/* Thresholds (placeholder) */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>
              Thresholds & Route Policy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Smoke Warning Threshold', value: '—' },
                { label: 'Temperature Critical (°C)', value: '—' },
                { label: 'CO Warning (ppm)', value: '—' },
                { label: 'Stale Data Timeout (s)', value: '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {label}
                  </label>
                  <input
                    readOnly
                    value={value}
                    style={{ ...GLASS_INPUT, cursor: 'default' }}
                    aria-label={label}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
              Configure thresholds via the backend API. Editing is not yet available in this release.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
