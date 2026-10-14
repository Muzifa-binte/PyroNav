import React, { useEffect, useState } from 'react'
import LoadingSkeleton from '../components/LoadingSkeleton'
import StatusPill from '../components/StatusPill'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const SEV_COLOR = {
  HIGH:     '#FF5D6C',
  MEDIUM:   '#FF8A4C',
  LOW:      '#F5BE55',
  INFO:     '#8BA8FF',
  CRITICAL: '#FF5D6C',
  WARNING:  '#F5BE55',
  UNKNOWN:  '#9AA7BA',
}

const CAT_COLOR = {
  INVALID_MESSAGE:    '#FF8A4C',
  SUSPICIOUS_PATTERN: '#FF5D6C',
  UNKNOWN_DEVICE:     '#F5BE55',
  AUTH_FAILURE:       '#FF5D6C',
  default:            '#8BA8FF',
}

export default function NetworkSecurity() {
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.getSecurityEvents().then(d => setEvents(d.events || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onIDSEvent = (e) => {
      const ev = e.detail
      if (ev) setEvents(prev => [ev, ...prev.slice(0, 99)])
    }
    wsEventBus.addEventListener('ids_event_created', onIDSEvent)
    return () => wsEventBus.removeEventListener('ids_event_created', onIDSEvent)
  }, [])

  const invalidCount    = events.filter(e => e.category === 'INVALID_MESSAGE').length
  const suspiciousCount = events.filter(e => e.category === 'SUSPICIOUS_PATTERN').length
  const unknownDevices  = events.filter(e => e.category === 'UNKNOWN_DEVICE').length

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Network Security
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          IDS events and cyber-defence
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'IDS Events',       value: events.length, color: '#8BA8FF' },
          { label: 'Invalid Messages', value: invalidCount,  color: '#FF8A4C' },
          { label: 'Suspicious Activity', value: suspiciousCount, color: '#FF5D6C' },
        ].map(card => (
          <div key={card.label} className="glass-card" style={{ padding: 16, borderLeft: `3px solid ${card.color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }} className="tabular">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* IDS event table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-glass)', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
          IDS Event Log
        </div>

        {loading ? (
          <div style={{ padding: 20 }}><LoadingSkeleton type="table" rows={4} /></div>
        ) : events.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
            <div style={{ color: 'var(--text-muted)' }}>No IDS events recorded</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Connect the IDS module to see events here</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Time', 'Category', 'Source/Device', 'Severity', 'Reason', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-glass)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => {
                const catColor = CAT_COLOR[ev.category] || CAT_COLOR.default
                const sevStatus = (ev.severity || 'info').toLowerCase()
                return (
                  <tr
                    key={ev.event_id || i}
                    onClick={() => setSelected(selected === ev ? null : ev)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(selected === ev ? null : ev)}
                    style={{
                      borderBottom: '1px solid var(--border-glass)',
                      borderLeft: `3px solid ${catColor}`,
                      cursor: 'pointer',
                      background: selected === ev ? 'rgba(105,183,255,0.05)' : 'transparent',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={e => { if (selected !== ev) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (selected !== ev) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 11 }} className="tabular">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: catColor, fontWeight: 600 }}>
                      {ev.category || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {ev.source || '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <StatusPill status={sevStatus} label={ev.severity || 'INFO'} />
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.description || ev.reason || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {ev.status || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Language notice */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        color: 'var(--text-muted)',
        border: '1px solid var(--border-glass)',
      }}>
        ℹ "Invalid reading/message" = validation failed. "Suspicious activity" = configured rule matched. "Confirmed malicious" only shown when evidence supports the conclusion.
      </div>
    </div>
  )
}
