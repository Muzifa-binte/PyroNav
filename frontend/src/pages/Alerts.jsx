import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const SEV_COLOR = {
  CRITICAL: '#FF5D6C',
  HIGH_RISK: '#FF8A4C',
  WARNING: '#F5BE55',
  NORMAL: '#43C59E',
  UNKNOWN: '#9AA7BA',
}

const SEV_ICON = {
  CRITICAL: '⛔',
  HIGH_RISK: '⚠️',
  WARNING: '⚡',
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

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('ALL')

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

  const filtered = filter === 'ALL'
    ? alerts
    : alerts.filter(a => (a.severity || a.hazard_level) === filter)

  const criticalCount = alerts.filter(a => (a.severity || a.hazard_level) === 'CRITICAL').length
  const warningCount  = alerts.filter(a => (a.severity || a.hazard_level) === 'WARNING' || (a.severity || a.hazard_level) === 'HIGH_RISK').length
  const totalActive   = alerts.filter(a => a.status !== 'RESOLVED').length

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Alerts & Incidents
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Active and historical events
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Critical Active', count: criticalCount, color: '#FF5D6C' },
          { label: 'Warning Active',  count: warningCount,  color: '#F5BE55' },
          { label: 'Total Unresolved',count: totalActive,   color: '#8BA8FF' },
        ].map(card => (
          <div key={card.label} className="glass-card" style={{ padding: 16, borderLeft: `3px solid ${card.color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }} className="tabular">
              {card.count}
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['ALL', 'CRITICAL', 'HIGH_RISK', 'WARNING', 'NORMAL'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 14px',
              background: filter === f ? 'rgba(105,183,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: filter === f ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
              borderRadius: 99,
              color: filter === f ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: filter === f ? 600 : 400,
              transition: 'all var(--transition-fast)',
            }}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
          {filtered.length} events
        </span>
      </div>

      {/* Alert list */}
      {loading ? <LoadingSkeleton type="table" rows={5} /> :
       filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ color: 'var(--status-normal)', fontWeight: 600 }}>
            No {filter !== 'ALL' ? filter.toLowerCase().replace('_', ' ') : 'active'} alerts
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((a, i) => {
            const sev = a.severity || a.hazard_level || 'UNKNOWN'
            const col = SEV_COLOR[sev] || '#9AA7BA'
            const icon = SEV_ICON[sev] || '?'
            return (
              <div
                key={a.event_id || a.notification_id || i}
                className="glass-card"
                onClick={() => setSelected(selected === a ? null : a)}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelected(selected === a ? null : a)}
                style={{
                  padding: '14px 20px',
                  borderLeft: `4px solid ${col}`,
                  cursor: 'pointer',
                  background: selected === a ? 'rgba(105,183,255,0.06)' : undefined,
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <StatusPill status={sev.toLowerCase()} label={sev.replace('_', ' ')} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {a.room_id || '—'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {timeAgo(a.detected_at || a.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.message || a.description || 'Hazard event'}
                    </div>
                  </div>
                  <StatusPill status={(a.status || 'active').toLowerCase()} label={a.status || 'ACTIVE'} />
                </div>

                {/* Expanded detail */}
                {selected === a && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                      {[
                        ['Event ID', (a.event_id || a.notification_id || '').slice(0, 12) + '…'],
                        ['Source', a.source || 'sensor/rule'],
                        ['Reason', (a.reason_codes || []).join(', ') || '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>{v || '—'}</div>
                        </div>
                      ))}
                    </div>
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
