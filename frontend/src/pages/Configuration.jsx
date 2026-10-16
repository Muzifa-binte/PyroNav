import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

// Neumorphic input style — warm ivory tokens
const NEO_INPUT = {
  background: 'var(--bg-inset)',
  boxShadow: 'var(--neo-inset)',
  border: 'none',
  borderRadius: 8,
  color: 'var(--ink-900)',
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
      color: 'var(--ink-400)',
      padding: '14px 20px 10px',
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-sans)',
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
      borderBottom: '1px solid var(--border-subtle)',
      fontSize: 13,
      fontFamily: 'var(--font-sans)',
    }}>
      {cols.map((c, i) => (
        <div key={i} style={{ flex: 1, color: i === 0 ? 'var(--ink-900)' : 'var(--ink-600)' }}>
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
      color: 'var(--ink-400)',
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-sans)',
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

      {/* Header */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 700,
        color: 'var(--ink-900)',
        margin: 0,
      }}>
        Configuration
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 0 }}>System settings and mappings</p>

      {/* Read-only notice — warm ivory */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(47,111,222,0.06)',
        border: '1px solid rgba(47,111,222,0.2)',
        borderRadius: 8,
        fontSize: 13,
        color: 'var(--ink-600)',
        fontFamily: 'var(--font-sans)',
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
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
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
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                No sensor data available
              </div>
            ) : sensors.map(s => (
              <DataRow key={s.sensor_id} cols={[
                s.sensor_id,
                s.sensor_type,
                s.room_id,
                <StatusPill key="pill" status={s.status === 'active' ? 'NORMAL' : 'UNKNOWN'} label={s.status || '—'} />,
                // unit_config arrives as an object, e.g. { smoke: 'ppm', temperature: 'degC' }
                (s.unit_config && typeof s.unit_config === 'object'
                  ? Object.entries(s.unit_config).map(([k, v]) => `${k}: ${v}`).join(', ')
                  : s.unit_config) || '—',
              ]} />
            ))}
          </div>

          {/* Exits */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <SectionHeader title="Exits" />
            <HeaderRow cols={['Exit ID', 'Name', 'Available']} />
            {exits.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                No exit data available
              </div>
            ) : exits.map(e => (
              <DataRow key={e.exit_id} cols={[
                e.exit_id,
                e.name || '—',
                <StatusPill key="pill"
                  status={e.available ? 'SAFE' : 'CRITICAL'}
                  label={e.available ? 'Available' : 'Unavailable'}
                />,
              ]} />
            ))}
          </div>

          {/* Thresholds (placeholder) — glass-card */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-400)', marginBottom: 14, fontFamily: 'var(--font-sans)' }}>
              Thresholds &amp; Route Policy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Smoke Warning Threshold', value: '—' },
                { label: 'Temperature Critical (°C)', value: '—' },
                { label: 'CO Warning (ppm)', value: '—' },
                { label: 'Stale Data Timeout (s)', value: '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-400)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>
                    {label}
                  </label>
                  <input
                    readOnly
                    value={value}
                    style={{ ...NEO_INPUT, cursor: 'default' }}
                    aria-label={label}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-400)', fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>
              Configure thresholds via the backend API. Editing is not yet available in this release.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
