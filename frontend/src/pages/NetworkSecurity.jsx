import React, { useEffect, useState } from 'react'
import LoadingSkeleton from '../components/LoadingSkeleton'
import StatusPill from '../components/StatusPill'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// Spec palette — all as CSS var references via inline style objects
// CAT_COLOR values are used as CSS custom property values via cssVar() below
const CAT_COLOR_VAR = {
  INVALID_MESSAGE:    'var(--orange-500)',
  SUSPICIOUS_PATTERN: 'var(--red-600)',
  UNKNOWN_DEVICE:     'var(--amber-500)',
  AUTH_FAILURE:       'var(--red-600)',
  IDS:                'var(--violet-600)',
  default:            'var(--violet-600)',
}

const SEV_STATUS = {
  HIGH:     'CRITICAL',
  MEDIUM:   'WARNING',
  LOW:      'NORMAL',
  INFO:     'INFO',
  CRITICAL: 'CRITICAL',
  WARNING:  'WARNING',
}

export default function NetworkSecurity() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState(null)

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

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 700,
        color: 'var(--ink-900)',
        margin: 0,
      }}>
        Network Security
      </h2>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="glass-card" style={{ flex: 1, padding: 16, borderLeft: '4px solid var(--violet-600)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>IDS Events</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--violet-600)', fontFamily: 'var(--font-mono)' }}>{events.length}</div>
        </div>
        <div className="glass-card" style={{ flex: 1, padding: 16, borderLeft: '4px solid var(--orange-500)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Invalid Messages</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--orange-500)', fontFamily: 'var(--font-mono)' }}>{invalidCount}</div>
        </div>
        <div className="glass-card" style={{ flex: 1, padding: 16, borderLeft: '4px solid var(--red-600)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Suspicious Sources</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--red-600)', fontFamily: 'var(--font-mono)' }}>{suspiciousCount}</div>
        </div>
      </div>

      {/* IDS event table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--ink-900)',
        }}>
          IDS Event Log
        </div>

        {loading ? (
          <div style={{ padding: 20 }}><LoadingSkeleton type="table" rows={4} /></div>
        ) : events.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
            <div style={{ color: 'var(--ink-400)', fontFamily: 'var(--font-sans)' }}>No IDS events recorded</div>
            <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>Connect the IDS module to see events here</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Time', 'Category', 'Source/Device', 'Severity', 'Reason', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    color: 'var(--ink-400)',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-subtle)',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => {
                const catColor = CAT_COLOR_VAR[ev.category] || CAT_COLOR_VAR.default
                const sevKey = SEV_STATUS[(ev.severity || 'INFO').toUpperCase()] || 'INFO'
                return (
                  <tr
                    key={ev.event_id || i}
                    onClick={() => setSelected(selected === ev ? null : ev)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(selected === ev ? null : ev)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft: `3px solid ${catColor}`,
                      cursor: 'pointer',
                      background: selected === ev ? 'rgba(255,106,26,0.04)' : 'transparent',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={e => { if (selected !== ev) e.currentTarget.style.background = 'rgba(255,106,26,0.03)' }}
                    onMouseLeave={e => { if (selected !== ev) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 16px', color: 'var(--ink-400)', fontSize: 11, fontFamily: 'var(--font-mono)' }} className="tabular">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: catColor, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                      {ev.category || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-600)' }}>
                      {ev.source || '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <StatusPill status={sevKey} label={ev.severity || 'INFO'} />
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-900)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
                      {ev.description || ev.reason || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-400)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                      {ev.status || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom notice */}
      <div style={{
        background: 'var(--bg-inset)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        fontSize: 12,
        fontStyle: 'italic',
        color: 'var(--ink-400)',
        fontFamily: 'var(--font-sans)',
      }}>
        ℹ "Invalid reading/message" = validation failed. "Suspicious activity" = configured rule matched. "Confirmed malicious" only shown when evidence supports the conclusion.
      </div>
    </div>
  )
}
