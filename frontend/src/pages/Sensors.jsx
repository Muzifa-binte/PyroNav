import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const STATUS_LEVEL = {
  active:   'normal',
  inactive: 'warning',
  stale:    'warning',
  error:    'critical',
  offline:  'critical',
  unknown:  'unknown',
}

function freshnessColor(lastSeen) {
  if (!lastSeen) return 'var(--status-unknown)'
  const age = Date.now() - new Date(lastSeen).getTime()
  if (age < 30_000)  return 'var(--status-normal)'
  if (age < 120_000) return 'var(--status-warning)'
  return 'var(--status-critical)'
}

function freshnessWidth(lastSeen) {
  if (!lastSeen) return 10
  const age = Date.now() - new Date(lastSeen).getTime()
  const pct = Math.max(5, 100 - Math.floor(age / 2000))
  return Math.min(100, pct)
}

export default function Sensors() {
  const [sensors,  setSensors]  = useState([])
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.getSensors().then(d => setSensors(d.sensors || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onReading = (e) => {
      const { sensor_id, status, last_seen_at } = e.detail || {}
      if (!sensor_id) return
      setSensors(prev => prev.map(s =>
        s.sensor_id === sensor_id ? { ...s, status: status || s.status, last_seen_at: last_seen_at || s.last_seen_at } : s
      ))
    }
    wsEventBus.addEventListener('sensor_reading_updated', onReading)
    wsEventBus.addEventListener('sensor_status_changed', onReading)
    return () => {
      wsEventBus.removeEventListener('sensor_reading_updated', onReading)
      wsEventBus.removeEventListener('sensor_status_changed', onReading)
    }
  }, [])

  const filtered = sensors.filter(s =>
    !filter ||
    s.sensor_id?.toLowerCase().includes(filter.toLowerCase()) ||
    s.room_id?.toLowerCase().includes(filter.toLowerCase()) ||
    s.sensor_type?.toLowerCase().includes(filter.toLowerCase())
  )

  const online  = sensors.filter(s => s.status === 'active').length
  const stale   = sensors.filter(s => s.status === 'stale').length
  const offline = sensors.filter(s => s.status === 'inactive' || s.status === 'error' || s.status === 'offline').length

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Sensors & Monitoring
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Measurement and data quality
        </p>
      </div>

      {/* Count pills */}
      <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }} className="tabular">{sensors.length}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total</span>
        </div>
        <div style={{ width: 1, background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--status-normal)' }} className="tabular">{online}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Online</span>
        </div>
        <div style={{ width: 1, background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--status-warning)' }} className="tabular">{stale}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stale</span>
        </div>
        <div style={{ width: 1, background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--status-critical)' }} className="tabular">{offline}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Offline</span>
        </div>

        {/* Filter input */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="search"
            placeholder="Search sensors…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Search sensors"
            style={{
              background: 'var(--surface-inset)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              width: 220,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} sensors</span>
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingSkeleton type="table" rows={6} /> : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} role="table">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Sensor ID', 'Type', 'Room', 'Latest Value', 'Unit', 'Last Seen', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No sensors found
                  </td>
                </tr>
              ) : filtered.map(s => {
                const latestValue = s.latest_value != null ? String(s.latest_value) : '—'
                const frWidth = freshnessWidth(s.last_seen_at)
                const frColor = freshnessColor(s.last_seen_at)
                return (
                  <tr
                    key={s.sensor_id}
                    onClick={() => setSelected(s)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(s)}
                    aria-selected={selected?.sensor_id === s.sensor_id}
                    style={{
                      cursor: 'pointer',
                      background: selected?.sensor_id === s.sensor_id
                        ? 'rgba(105,183,255,0.06)'
                        : 'transparent',
                      borderBottom: '1px solid var(--border-glass)',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={e => {
                      if (selected?.sensor_id !== s.sensor_id) {
                        e.currentTarget.style.background = 'rgba(105,183,255,0.04)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (selected?.sensor_id !== s.sensor_id) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {s.sensor_id}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {s.sensor_type || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {s.room_id || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }} className="tabular">
                      {latestValue}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {s.unit_config || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="tabular" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {s.last_seen_at ? new Date(s.last_seen_at).toLocaleTimeString() : '—'}
                      </div>
                      <div style={{
                        height: 3,
                        borderRadius: 2,
                        marginTop: 4,
                        width: `${frWidth}%`,
                        background: frColor,
                        transition: 'width 0.5s ease, background 0.5s ease',
                      }} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusPill status={STATUS_LEVEL[s.status] || 'unknown'} label={s.status || 'unknown'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {selected.sensor_id}
            </h3>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
              aria-label="Close sensor detail"
            >×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 13 }}>
            {[
              ['Type',    selected.sensor_type],
              ['Room',    selected.room_id],
              ['Status',  selected.status],
              ['Unit',    selected.unit_config],
              ['Last Seen', selected.last_seen_at ? new Date(selected.last_seen_at).toLocaleTimeString() : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
                <div style={{ color: 'var(--text-primary)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}>
            Connect to PostgreSQL to see recent readings and sparklines.
          </div>
        </div>
      )}
    </div>
  )
}
