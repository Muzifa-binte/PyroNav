import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

const STATUS_LEVEL = { active: 'NORMAL', inactive: 'WARNING', stale: 'WARNING', error: 'CRITICAL' }

export default function Sensors() {
  const [sensors, setSensors] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSensors().then(d => setSensors(d.sensors || [])).finally(() => setLoading(false))
  }, [])

  const filtered = sensors.filter(s =>
    !filter ||
    s.sensor_id.toLowerCase().includes(filter.toLowerCase()) ||
    s.room_id.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-4)' }}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Search sensors…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Search sensors"
            style={{
              flex: 1, background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)', padding: '6px 12px', color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} sensors</span>
        </div>

        {/* Table */}
        {loading ? <LoadingSkeleton lines={5} height={20} gap={12} /> : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} role="table">
              <thead>
                <tr style={{ background: 'var(--surface-raised)' }}>
                  {['Sensor', 'Type', 'Room', 'Status', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>No sensors found</td></tr>
                ) : filtered.map(s => (
                  <tr
                    key={s.sensor_id}
                    onClick={() => setSelected(s)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(s)}
                    aria-selected={selected?.sensor_id === s.sensor_id}
                    style={{
                      cursor: 'pointer',
                      background: selected?.sensor_id === s.sensor_id ? 'var(--surface-raised)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-primary)', fontWeight: 500 }}>{s.sensor_id}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{s.sensor_type}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{s.room_id}</td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <StatusPill level={STATUS_LEVEL[s.status] || 'UNKNOWN'} label={s.status} size="sm" />
                    </td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 12 }} className="tabular">
                      {s.last_seen_at ? new Date(s.last_seen_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <div className="card">
        {selected ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>{selected.sensor_id}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: 13 }}>
              {[['Type', selected.sensor_type], ['Room', selected.room_id], ['Status', selected.status]].map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</dt>
                  <dd style={{ color: 'var(--text-primary)' }}>{v || '—'}</dd>
                </React.Fragment>
              ))}
            </dl>
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
              Connect to PostgreSQL to see recent readings and sparklines.
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true" style={{ fontSize: 28 }}>📡</span>
            <p>Select a sensor to inspect its readings</p>
          </div>
        )}
      </div>
    </div>
  )
}
