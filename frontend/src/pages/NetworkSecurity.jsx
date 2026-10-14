import React, { useEffect, useState } from 'react'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

export default function NetworkSecurity() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSecurityEvents().then(d => setEvents(d.events || [])).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {[
          { label: 'IDS Events', value: events.length, color: 'var(--status-info)' },
          { label: 'Invalid Messages', value: 0, color: 'var(--status-warning)' },
          { label: 'Suspicious Activity', value: 0, color: 'var(--status-high)' },
        ].map(card => (
          <div key={card.label} className="card" style={{ flex: 1, minWidth: 140, borderLeft: `3px solid ${card.color}` }}>
            <div className="label">{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: card.color, marginTop: 'var(--space-2)' }} className="tabular">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)' }}>
          IDS Event Log
        </div>
        {loading ? (
          <div style={{ padding: 'var(--space-4)' }}><LoadingSkeleton lines={4} /></div>
        ) : events.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <span aria-hidden="true" style={{ fontSize: 32 }}>🛡</span>
            <p>No IDS events recorded</p>
            <p style={{ fontSize: 12 }}>Connect the IDS module to see events here</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-raised)' }}>
                {['Time', 'Category', 'Source', 'Description', 'Severity'].map(h => (
                  <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={e.event_id || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 12 }} className="tabular">
                    {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{e.category || '—'}</td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>{e.source || '—'}</td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--text-primary)' }}>{e.description || '—'}</td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)' }}>{e.severity || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
        ℹ "Invalid reading/message" = validation failed. "Suspicious activity" = configured rule matched. "Confirmed malicious" = only when evidence and implementation support the claim. No decorative security graphics are shown.
      </div>
    </div>
  )
}
