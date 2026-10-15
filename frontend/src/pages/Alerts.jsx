import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// Spec Section 3.2 palette
const SEV_COLOR = {
  CRITICAL: '#D62828',
  HIGH_RISK: '#FF6A1A',
  WARNING: '#F5A400',
  NORMAL: '#2E8B57',
  UNKNOWN: '#8B7F76',
}

const SEV_ICON = {
  CRITICAL: '🔥',
  HIGH_RISK: '🔥',
  WARNING: '⚠️',
  NORMAL: '✓',
  UNKNOWN: '?',
}

function timeAgo(isoString) {
  if (!isoString) return '—'
  const diff = Date.now() - new Date(isoString).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const FILTERS = ['all', 'critical', 'warning', 'normal']

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    api.getAlerts('ACTIVE').then(d => setAlerts(d.alerts || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onHazardEvent = (e) => {
      const ev = e.detail
      if (ev) setAlerts(prev => [ev, ...prev])
    }
    wsEventBus.addEventListener('hazard_event_created', onHazardEvent)
    return () => wsEventBus.removeEventListener('hazard_event_created', onHazardEvent)
  }, [])

  const filtered = filter === 'all'
    ? alerts
    : alerts.filter(a => (a.severity || a.hazard_level || '').toLowerCase() === filter ||
        (filter === 'warning' && (a.severity || a.hazard_level) === 'HIGH_RISK'))

  const criticalCount = alerts.filter(a => (a.severity || a.hazard_level) === 'CRITICAL').length
  const warningCount  = alerts.filter(a => ['WARNING', 'HIGH_RISK'].includes(a.severity || a.hazard_level)).length
  const totalActive   = alerts.filter(a => a.status !== 'RESOLVED').length

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
        Alerts &amp; Incidents
      </h2>

      {/* Summary grid — 3 glass-cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="glass-card" style={{ padding: 16, borderLeft: '4px solid var(--red-600)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Critical Active</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--red-600)', fontFamily: 'var(--font-mono)' }}>{criticalCount}</div>
        </div>
        <div className="glass-card" style={{ padding: 16, borderLeft: '4px solid var(--amber-500)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Warning Active</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--amber-500)', fontFamily: 'var(--font-mono)' }}>{warningCount}</div>
        </div>
        <div className="glass-card" style={{ padding: 16, borderLeft: '4px solid var(--blue-600)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Total Unresolved</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--blue-600)', fontFamily: 'var(--font-mono)' }}>{totalActive}</div>
        </div>
      </div>

      {/* Filter pills — neumorphic */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const isActive = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                background: 'var(--bg-raised)',
                boxShadow: isActive ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
                color: isActive ? 'var(--orange-500)' : 'var(--ink-600)',
                border: 'none',
                borderRadius: 20,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-400)', alignSelf: 'center', fontFamily: 'var(--font-sans)' }}>
          {filtered.length} events
        </span>
      </div>

      {/* Alert list */}
      {loading ? <LoadingSkeleton type="table" rows={5} /> :
       filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ color: 'var(--green-600)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            No {filter !== 'all' ? filter : 'active'} alerts
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((a, i) => {
            const sev = a.severity || a.hazard_level || 'UNKNOWN'
            const col = SEV_COLOR[sev] || SEV_COLOR.UNKNOWN
            const icon = SEV_ICON[sev] || '?'
            const isExpanded = selected === a

            return (
              <div
                key={a.event_id || a.notification_id || i}
                className="glass-card"
                onClick={() => setSelected(isExpanded ? null : a)}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelected(isExpanded ? null : a)}
                style={{
                  padding: '14px 20px',
                  borderLeft: `4px solid ${col}`,
                  cursor: 'pointer',
                  marginBottom: 0,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <StatusPill status={sev} label={sev.replace('_', ' ')} />
                  <span style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 600 }}>
                    {(a.room_id || '—').replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-400)', marginLeft: 'auto' }}>
                    {timeAgo(a.detected_at || a.created_at)}
                  </span>
                </div>

                {/* Message */}
                <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExpanded ? 'normal' : 'nowrap' }}>
                  {a.message || a.description || 'Hazard event'}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                      {[
                        ['Event ID',  ((a.event_id || a.notification_id || '').toString().slice(0, 12) + '…')],
                        ['Source',    a.source || 'sensor/rule'],
                        ['Reason',    (a.reason_codes || []).join(', ') || '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k}</div>
                          <div style={{ color: 'var(--ink-600)' }}>{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                    {a.status !== 'RESOLVED' && (
                      <button
                        style={{
                          marginTop: 12,
                          padding: '8px 20px',
                          background: 'var(--orange-500)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: 'var(--font-sans)',
                        }}
                        onClick={e => { e.stopPropagation() }}
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
