/**
 * Incidents — history of every hazard the decision engine raised (ACTIVE and
 * RESOLVED hazard_events), newest first, with how long each one lasted and why.
 * Alerts shows what needs attention now; this page is the record.
 */
import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const FILTERS = ['ALL', 'ACTIVE', 'RESOLVED']

function formatDuration(ms) {
  if (ms == null || ms < 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ${s % 60} s`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) : '—'
}

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [demo,      setDemo]      = useState(false)
  const [filter,    setFilter]    = useState('ALL')
  const [now,       setNow]       = useState(Date.now())

  useEffect(() => {
    const load = () => api.getIncidents()
      .then(d => {
        setDemo(!!d.demo_data)
        setIncidents([...(d.alerts || [])].sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    load()
    // A hazard raised or cleared anywhere changes the record
    wsEventBus.addEventListener('hazard_event_created',  load)
    wsEventBus.addEventListener('hazard_event_resolved', load)
    // Running durations of active incidents
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      wsEventBus.removeEventListener('hazard_event_created',  load)
      wsEventBus.removeEventListener('hazard_event_resolved', load)
      clearInterval(tick)
    }
  }, [])

  const active   = incidents.filter(i => i.status === 'ACTIVE')
  const resolved = incidents.filter(i => i.status === 'RESOLVED')
  const durations = resolved
    .filter(i => i.resolved_at)
    .map(i => new Date(i.resolved_at) - new Date(i.detected_at))
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null
  const byRoom = incidents.reduce((acc, i) => ({ ...acc, [i.room_name || i.room_id]: (acc[i.room_name || i.room_id] || 0) + 1 }), {})
  const topRoom = Object.entries(byRoom).sort((a, b) => b[1] - a[1])[0]
  const shown = filter === 'ALL' ? incidents : incidents.filter(i => i.status === filter)

  const stat = (label, value, color = 'var(--ink-900)') => (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
  const divider = <div style={{ width: 1, background: 'var(--border-subtle)', alignSelf: 'stretch' }} />

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {stat('Incidents', incidents.length)}
        {divider}
        {stat('Active', active.length, active.length ? 'var(--red-600)' : 'var(--ink-900)')}
        {divider}
        {stat('Resolved', resolved.length, 'var(--green-600)')}
        {divider}
        {stat('Avg duration', formatDuration(avgDuration))}
        {divider}
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Most affected</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)' }}>
            {topRoom ? `${topRoom[0]} (${topRoom[1]})` : '—'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div role="group" aria-label="Filter incidents" style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                background: filter === f ? 'var(--orange-500)' : 'var(--bg-raised)',
                color: filter === f ? '#fff' : 'var(--ink-600)',
                boxShadow: filter === f ? 'none' : 'var(--neo-raised-sm)',
              }}
            >
              {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {/* Record */}
      {loading ? <LoadingSkeleton type="table" rows={6} /> : (
        <div className="glass-card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Status', 'Severity', 'Room', 'What happened', 'Detected', 'Resolved', 'Duration', 'Rules fired'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', color: 'var(--ink-400)', fontWeight: 700,
                    fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--ink-400)' }}>
                    {demo
                      ? 'Database not connected: the incident record is unavailable.'
                      : filter === 'ALL'
                      ? 'No incidents recorded yet. They appear here when the decision engine raises a hazard.'
                      : `No ${filter.toLowerCase()} incidents.`}
                  </td>
                </tr>
              ) : shown.map(i => {
                const isActive = i.status === 'ACTIVE'
                const end = isActive ? now : (i.resolved_at ? new Date(i.resolved_at).getTime() : null)
                return (
                  <tr key={i.event_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {isActive ? (
                        <span style={{ color: 'var(--red-600)', fontWeight: 700 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--red-600)', marginRight: 6, animation: 'valueBlink 1.2s ease-in-out infinite' }} />
                          Active
                        </span>
                      ) : (
                        <span style={{ color: 'var(--green-600)', fontWeight: 600 }}>✓ Resolved</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}><StatusPill level={i.hazard_level} /></td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-900)', fontWeight: 600 }}>{i.room_name || i.room_id}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-600)', minWidth: 220 }}>{i.message}</td>
                    <td className="tabular" style={{ padding: '12px 16px', color: 'var(--ink-600)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{formatTime(i.detected_at)}</td>
                    <td className="tabular" style={{ padding: '12px 16px', color: 'var(--ink-600)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{isActive ? '—' : formatTime(i.resolved_at)}</td>
                    <td className="tabular" style={{ padding: '12px 16px', color: isActive ? 'var(--red-600)' : 'var(--ink-600)', whiteSpace: 'nowrap' }}>
                      {formatDuration(end != null ? end - new Date(i.detected_at).getTime() : null)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(i.reason_codes || []).map(code => (
                          <span key={code} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-inset)', color: 'var(--ink-600)' }}>{code}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
