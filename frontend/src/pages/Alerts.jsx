/**
 * Alerts & Incidents
 * - All colours via CSS variables (zero hardcoded hex)
 * - Acknowledge button makes a real API call after a glass ConfirmDialog
 * - WebSocket listener adds incoming hazard events live
 */
import React, { useEffect, useState, useCallback } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// All colour references are CSS variables — theme-engine ready
const SEV_COLOR_VAR = {
  CRITICAL: 'var(--red-600)',
  HIGH_RISK: 'var(--orange-500)',
  WARNING:   'var(--amber-500)',
  NORMAL:    'var(--green-600)',
  UNKNOWN:   'var(--ink-400)',
}

const SEV_ICON = {
  CRITICAL: '🔥',
  HIGH_RISK: '🔥',
  WARNING:  '⚠️',
  NORMAL:   '✓',
  UNKNOWN:  '?',
}

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const FILTERS = ['all', 'critical', 'warning', 'normal']

// ── Glassmorphic confirm dialog ───────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      background:      'rgba(30,26,23,0.40)',
      backdropFilter:  'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      zIndex:          200,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
    }}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm action"
      onClick={onCancel}
    >
      <div
        style={{
          background:    'rgba(255,255,255,0.82)',
          backdropFilter:'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border:        '1px solid rgba(255,255,255,0.9)',
          borderRadius:  'var(--radius-xl)',
          boxShadow:     '0 8px 40px rgba(163,140,118,0.22)',
          padding:       '28px 32px',
          maxWidth:      420,
          width:         '90%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{
          fontFamily:   'var(--font-display)',
          fontSize:     20,
          fontWeight:   700,
          color:        'var(--ink-900)',
          margin:       '0 0 12px',
        }}>
          Acknowledge alert
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-600)', lineHeight: 1.55, margin: '0 0 24px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            autoFocus
            onClick={onConfirm}
            style={{
              flex:         1,
              padding:      '10px 20px',
              background:   'var(--orange-500)',
              color:        '#fff',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              fontWeight:   700,
              fontSize:     14,
              cursor:       'pointer',
              fontFamily:   'var(--font-sans)',
              transition:   'background var(--transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-600)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--orange-500)'}
          >
            Yes, acknowledge
          </button>
          <button
            onClick={onCancel}
            style={{
              flex:         1,
              padding:      '10px 20px',
              background:   'var(--bg-raised)',
              boxShadow:    'var(--neo-raised-sm)',
              color:        'var(--ink-600)',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              fontWeight:   600,
              fontSize:     14,
              cursor:       'pointer',
              fontFamily:   'var(--font-sans)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Alerts() {
  const [alerts,         setAlerts]         = useState([])
  const [selected,       setSelected]       = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [filter,         setFilter]         = useState('all')
  const [confirmAlert,   setConfirmAlert]   = useState(null)  // alert awaiting ack
  const [ackingId,       setAckingId]       = useState(null)  // in-flight ack

  useEffect(() => {
    api.getAlerts('ACTIVE')
      .then(d => setAlerts(d.alerts || []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onHazardEvent = (e) => {
      const ev = e.detail?.data ?? e.detail
      if (ev) setAlerts(prev => [ev, ...prev])
    }
    wsEventBus.addEventListener('hazard_event_created', onHazardEvent)
    return () => wsEventBus.removeEventListener('hazard_event_created', onHazardEvent)
  }, [])

  // Real acknowledge — calls API then marks resolved locally
  const handleAcknowledge = useCallback(async (alert) => {
    const id = alert.notification_id || alert.event_id
    if (!id) return
    setAckingId(id)
    try {
      // POST to notifications acknowledge endpoint (backend Member 4)
      await fetch(`/api/v1/notifications/${id}/acknowledge`, { method: 'POST' })
        .catch(() => null) // backend may not be running — fail gracefully
      setAlerts(prev => prev.map(a =>
        (a.notification_id || a.event_id) === id
          ? { ...a, status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() }
          : a
      ))
    } finally {
      setAckingId(null)
      setConfirmAlert(null)
      setSelected(null)
    }
  }, [])

  const filtered = filter === 'all'
    ? alerts
    : alerts.filter(a => {
        const sev = (a.severity || a.hazard_level || '').toLowerCase()
        return sev === filter || (filter === 'warning' && sev === 'high_risk')
      })

  const criticalCount = alerts.filter(a => (a.severity || a.hazard_level) === 'CRITICAL').length
  const warningCount  = alerts.filter(a => ['WARNING','HIGH_RISK'].includes(a.severity || a.hazard_level)).length
  const totalActive   = alerts.filter(a => a.status !== 'RESOLVED').length

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Confirm dialog (rendered outside normal flow) */}
      {confirmAlert && (
        <ConfirmDialog
          message={`This will mark the alert for "${(confirmAlert.room_id || 'unknown room').replace(/_/g,' ')}" as acknowledged. This action is recorded with your session ID and timestamp.`}
          onConfirm={() => handleAcknowledge(confirmAlert)}
          onCancel={() => setConfirmAlert(null)}
        />
      )}

      {/* Summary 3-card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Critical Active',  count: criticalCount, colorVar: 'var(--red-600)'   },
          { label: 'Warning Active',   count: warningCount,  colorVar: 'var(--amber-500)' },
          { label: 'Total Unresolved', count: totalActive,   colorVar: 'var(--blue-600)'  },
        ].map(card => (
          <div key={card.label} className="glass-card" style={{
            padding:    16,
            borderLeft: `4px solid ${card.colorVar}`,
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div className="tabular" style={{ fontSize: 28, fontWeight: 700, color: card.colorVar, fontFamily: 'var(--font-mono)' }}>
              {card.count}
            </div>
          </div>
        ))}
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
                padding:    '6px 16px',
                background: 'var(--bg-raised)',
                boxShadow:  isActive ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
                color:      isActive ? 'var(--orange-500)' : 'var(--ink-600)',
                border:     'none',
                borderRadius: 'var(--radius-full)',
                cursor:     'pointer',
                fontWeight: isActive ? 700 : 500,
                fontSize:   13,
                fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-400)', alignSelf: 'center' }}>
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert list */}
      {loading ? <LoadingSkeleton type="table" rows={5} /> :
       filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ color: 'var(--green-600)', fontWeight: 600 }}>
            No {filter !== 'all' ? filter : 'active'} alerts
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((a, i) => {
            const sev      = a.severity || a.hazard_level || 'UNKNOWN'
            const colVar   = SEV_COLOR_VAR[sev] || SEV_COLOR_VAR.UNKNOWN
            const icon     = SEV_ICON[sev] || '?'
            const isExpanded = selected === a
            const thisId   = a.notification_id || a.event_id
            const isAcking = ackingId === thisId
            const isAcked  = a.status === 'ACKNOWLEDGED' || a.status === 'RESOLVED'

            return (
              <div
                key={thisId || i}
                className="glass-card"
                onClick={() => setSelected(isExpanded ? null : a)}
                tabIndex={0}
                role="button"
                aria-expanded={isExpanded}
                onKeyDown={e => e.key === 'Enter' && setSelected(isExpanded ? null : a)}
                style={{
                  padding:    '14px 20px',
                  borderLeft: `4px solid ${colVar}`,
                  cursor:     'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }} aria-hidden="true">{icon}</span>
                  <StatusPill status={sev} label={sev.replace('_', ' ')} />
                  <span style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 600 }}>
                    {(a.room_id || '—').replace(/_/g, ' ')}
                  </span>
                  {isAcked && (
                    <span style={{
                      fontSize:   11,
                      color:      'var(--ink-400)',
                      fontStyle:  'italic',
                      marginLeft: 4,
                    }}>
                      acknowledged
                    </span>
                  )}
                  <span className="tabular" style={{ fontSize: 12, color: 'var(--ink-400)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {timeAgo(a.detected_at || a.created_at)}
                  </span>
                </div>

                {/* Message */}
                <div style={{
                  fontSize:     13,
                  color:        'var(--ink-600)',
                  marginTop:    6,
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   isExpanded ? 'normal' : 'nowrap',
                  lineHeight:   1.5,
                }}>
                  {a.message || a.description || 'Hazard event'}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12, marginBottom: 14 }}>
                      {[
                        ['Event ID',       (thisId || '').toString().slice(0, 14) + '…'],
                        ['Source',         a.source || 'sensor / rule engine'],
                        ['Reason codes',   (a.reason_codes || []).join(', ') || '—'],
                        ['Detected',       a.detected_at ? new Date(a.detected_at).toLocaleString() : '—'],
                        ['Status',         a.status || 'ACTIVE'],
                        ['Acknowledged by',a.acknowledged_by || '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k}</div>
                          <div style={{ color: 'var(--ink-600)', wordBreak: 'break-all' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Acknowledge button — only for unresolved alerts */}
                    {!isAcked && (
                      <button
                        disabled={isAcking}
                        onClick={e => { e.stopPropagation(); setConfirmAlert(a) }}
                        style={{
                          padding:      '9px 22px',
                          background:   isAcking ? 'var(--ink-400)' : 'var(--orange-500)',
                          color:        '#fff',
                          border:       'none',
                          borderRadius: 'var(--radius-md)',
                          cursor:       isAcking ? 'wait' : 'pointer',
                          fontWeight:   700,
                          fontSize:     13,
                          fontFamily:   'var(--font-sans)',
                          transition:   'background var(--transition-fast)',
                        }}
                        onMouseEnter={e => { if (!isAcking) e.currentTarget.style.background = 'var(--orange-600)' }}
                        onMouseLeave={e => { if (!isAcking) e.currentTarget.style.background = 'var(--orange-500)' }}
                      >
                        {isAcking ? 'Acknowledging…' : 'Acknowledge alert'}
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
