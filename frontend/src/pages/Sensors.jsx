import React, { useEffect, useRef, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const STATUS_LEVEL = {
  active:   'NORMAL',
  inactive: 'WARNING',
  stale:    'STALE',
  error:    'CRITICAL',
  offline:  'OFFLINE',
  unknown:  'UNKNOWN',
}

function freshnessColor(lastSeen) {
  if (!lastSeen) return 'var(--ink-400)'
  const age = Date.now() - new Date(lastSeen).getTime()
  if (age < 30_000)  return '#2E8B57'
  if (age < 120_000) return '#F5A400'
  return '#D62828'
}

// unit_config / values arrive as objects, e.g. { smoke: 'ppm', temperature: 'degC' }
function formatPairs(obj, sep = ': ') {
  if (obj == null) return null
  if (typeof obj !== 'object') return String(obj)
  return Object.entries(obj).map(([k, v]) => `${k}${sep}${v}`).join(', ')
}

function freshnessWidth(lastSeen) {
  if (!lastSeen) return 10
  const age = Date.now() - new Date(lastSeen).getTime()
  return Math.min(100, Math.max(5, 100 - Math.floor(age / 2000)))
}

export default function Sensors() {
  const [sensors,  setSensors]  = useState([])
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [readings, setReadings] = useState(null)   // null = loading / unavailable
  const [readingsNote, setReadingsNote] = useState('')
  const selectedIdRef = useRef(null)

  useEffect(() => {
    api.getSensors()
      .then(d => setSensors((d.sensors || []).map(s => ({
        ...s,
        latest_value: s.latest_value ?? formatPairs(s.latest_reading?.values, ' '),
      }))))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onReading = (e) => {
      const d = e.detail?.data ?? e.detail ?? {}  // WebSocket envelope: {event_type, data, timestamp}
      const { sensor_id, status, values } = d
      if (!sensor_id) return
      const seen = d.last_seen_at || d.received_at || d.timestamp
      if (values && sensor_id === selectedIdRef.current) {
        setReadings(prev => [
          { id: d.message_id || seen, timestamp: d.timestamp || seen, values, validation_status: d.validation_status },
          ...(prev || []),
        ].slice(0, 10))
      }
      setSensors(prev => prev.map(s =>
        s.sensor_id === sensor_id
          ? {
              ...s,
              status: status || s.status,
              last_seen_at: seen || s.last_seen_at,
              latest_value: values ? formatPairs(values, ' ') : s.latest_value,
            }
          : s
      ))
    }
    
    wsEventBus.addEventListener('sensor_reading_updated', onReading)
    wsEventBus.addEventListener('sensor_status_changed',  onReading)
    return () => {
      wsEventBus.removeEventListener('sensor_reading_updated', onReading)
      wsEventBus.removeEventListener('sensor_status_changed',  onReading)
    }
  }, [])

  // Recent readings for the sensor shown in the detail panel
  useEffect(() => {
    const id = selected?.sensor_id || null
    selectedIdRef.current = id
    setReadings(null)
    setReadingsNote('')
    if (!id) return
    let cancelled = false
    api.getSensorReadings(id, 10)
      .then(d => {
        if (cancelled) return
        if (d.demo_data) setReadingsNote('Database not connected — recent readings are unavailable.')
        setReadings(d.readings || [])
      })
      .catch(() => { if (!cancelled) { setReadingsNote('Could not load recent readings.'); setReadings([]) } })
    return () => { cancelled = true }
  }, [selected?.sensor_id])

  // Detail panel shows the live row, not the snapshot taken when it was clicked
  const current = selected ? (sensors.find(s => s.sensor_id === selected.sensor_id) || selected) : null

  const filtered = sensors.filter(s =>
    !filter ||
    s.sensor_id?.toLowerCase().includes(filter.toLowerCase()) ||
    s.room_id?.toLowerCase().includes(filter.toLowerCase()) ||
    s.sensor_type?.toLowerCase().includes(filter.toLowerCase())
  )

  const online  = sensors.filter(s => s.status === 'active').length
  const stale   = sensors.filter(s => s.status === 'stale').length
  const offline = sensors.filter(s => ['inactive', 'error', 'offline'].includes(s.status)).length

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Count strip */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-mono)' }}>{sensors.length}</div>
        </div>
        <div style={{ width: 1, background: 'var(--border-subtle)', alignSelf: 'stretch' }} />
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Online</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-600)', fontFamily: 'var(--font-mono)' }}>{online}</div>
        </div>
        <div style={{ width: 1, background: 'var(--border-subtle)', alignSelf: 'stretch' }} />
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Stale</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber-500)', fontFamily: 'var(--font-mono)' }}>{stale}</div>
        </div>
        <div style={{ width: 1, background: 'var(--border-subtle)', alignSelf: 'stretch' }} />
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Offline</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700, color: 'var(--red-600)', fontFamily: 'var(--font-mono)' }}>{offline}</div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Filter input — neumorphic */}
        <input
          type="search"
          placeholder="Search sensors…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Search sensors"
          style={{
            background: 'var(--bg-inset)',
            boxShadow: 'var(--neo-inset)',
            border: 'none',
            outline: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            color: 'var(--ink-900)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            width: 220,
          }}
          onFocus={e => e.currentTarget.style.outline = '2px solid var(--orange-500)'}
          onBlur={e => e.currentTarget.style.outline = 'none'}
        />
      </div>

      {/* Table */}
      {loading ? <LoadingSkeleton type="table" rows={6} /> : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} role="table">
            <thead>
              <tr>
                {['Sensor ID', 'Type', 'Room', 'Latest Value', 'Unit', 'Last Seen', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'var(--ink-400)',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.10em',
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--ink-400)', fontFamily: 'var(--font-sans)' }}>
                    No sensors found
                  </td>
                </tr>
              ) : filtered.map(s => {
                const latestValue = s.latest_value != null ? String(s.latest_value) : '—'
                const frWidth = freshnessWidth(s.last_seen_at)
                const frColor = freshnessColor(s.last_seen_at)
                const isStale   = s.status === 'stale'
                const isOffline = ['inactive', 'error', 'offline'].includes(s.status)
                const rowBorder = isOffline
                  ? '3px solid var(--red-600)'
                  : isStale
                  ? '3px solid var(--amber-500)'
                  : '3px solid transparent'
                const isSelected = selected?.sensor_id === s.sensor_id

                return (
                  <tr
                    key={s.sensor_id}
                    onClick={() => setSelected(s)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(s)}
                    aria-selected={isSelected}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'var(--orange-100)' : 'transparent',
                      borderLeft: rowBorder,
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,106,26,0.04)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--ink-900)', fontSize: 13, fontWeight: 500 }}>
                      {s.sensor_id}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-600)' }}>
                      {s.sensor_type || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-600)' }}>
                      {s.room_id || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-900)' }} className="tabular">
                      {latestValue}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--ink-400)', fontSize: 11 }}>
                      {formatPairs(s.unit_config) || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="tabular" style={{ color: 'var(--ink-400)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
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
                      <StatusPill status={STATUS_LEVEL[s.status] || 'UNKNOWN'} label={s.status || 'unknown'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {current && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', margin: 0 }}>
              {current.sensor_id}
            </h3>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close sensor detail"
              style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
            >×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 13 }}>
            {[
              ['Type',      current.sensor_type],
              ['Room',      current.room_id],
              ['Status',    current.status],
              ['Unit',      formatPairs(current.unit_config)],
              ['Last Seen', current.last_seen_at ? new Date(current.last_seen_at).toLocaleTimeString() : '—'],
              ['Latest Value', current.latest_value != null ? String(current.latest_value) : null],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
                <div style={{ color: 'var(--ink-900)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>

          {/* Recent readings */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Recent readings
            </div>
            {readings === null ? (
              <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>Loading…</div>
            ) : readings.length === 0 ? (
              <div style={{ padding: 12, background: 'var(--bg-inset)', borderRadius: 6, fontSize: 12, color: 'var(--ink-400)', fontStyle: 'italic' }}>
                {readingsNote || 'No readings received yet.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {readings.map((r, i) => (
                    <tr key={r.id ?? i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="tabular" style={{ padding: '6px 8px', color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : '—'}
                      </td>
                      <td className="tabular" style={{ padding: '6px 8px', color: 'var(--ink-900)' }}>
                        {formatPairs(r.values, ' ') || '—'}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink-400)', textAlign: 'right' }}>
                        {r.validation_status || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
