import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

export default function Alerts() {
  const [alerts,  setAlerts]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('ALL')

  useEffect(() => {
    api.getAlerts('ACTIVE').then(d => setAlerts(d.alerts || [])).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => (a.severity || a.hazard_level) === filter)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-4)' }}>
      <div>
        {/* Filter strip */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {['ALL', 'CRITICAL', 'HIGH_RISK', 'WARNING', 'NORMAL'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 12px',
              background: filter === f ? 'rgba(105,183,255,0.15)' : 'var(--surface-base)',
              border: filter === f ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: filter === f ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12, fontWeight: filter === f ? 600 : 400,
            }}>
              {f.replace('_', ' ')}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            {filtered.length} events
          </span>
        </div>

        {loading ? <LoadingSkeleton lines={5} height={20} gap={12} /> : filtered.length === 0 ? (
          <div className="empty-state card">
            <span aria-hidden="true" style={{ fontSize: 32 }}>✓</span>
            <p>No {filter !== 'ALL' ? filter.toLowerCase().replace('_', ' ') : 'active'} alerts</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-raised)' }}>
                  {['Severity', 'Event', 'Room', 'Time', 'Status'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={a.event_id || a.notification_id || i}
                    onClick={() => setSelected(a)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(a)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', background: selected === a ? 'var(--surface-raised)' : 'transparent' }}
                  >
                    <td style={{ padding: 'var(--space-3)' }}>
                      <StatusPill level={a.severity || a.hazard_level || 'UNKNOWN'} size="sm" />
                    </td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-primary)' }}>{a.message || 'Hazard event'}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{a.room_id || '—'}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 12 }} className="tabular">
                      {a.created_at || a.detected_at ? new Date(a.created_at || a.detected_at).toLocaleTimeString() : '—'}
                    </td>
                    <td style={{ padding: 'var(--space-3)', fontSize: 12, color: 'var(--text-secondary)' }}>{a.status || 'ACTIVE'}</td>
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
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Alert Detail</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <StatusPill level={selected.severity || selected.hazard_level || 'UNKNOWN'} />
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 13 }}>
              {[
                ['Room',    selected.room_id],
                ['Message', selected.message || '—'],
                ['Status',  selected.status  || 'ACTIVE'],
                ['Event ID', (selected.event_id || selected.notification_id || '').slice(0, 8) + '…'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ color: 'var(--text-primary)', marginTop: 2 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true" style={{ fontSize: 28 }}>🔔</span>
            <p>Select an alert to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
