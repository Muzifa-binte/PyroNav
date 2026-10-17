import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'
import { describeRule, loadThresholds, readingLevel } from '../utils/hazard'

// Spec Section 3.1 palette — warm ivory tokens
const HAZARD_COLOR = {
  NORMAL:    '#2E8B57',
  WARNING:   '#F5A400',
  HIGH_RISK: '#FF6A1A',
  CRITICAL:  '#D62828',
  UNKNOWN:   '#8B7F76',
}

// Which sensor type measures what (shared-contracts/hazard-levels.json)
const MEASUREMENT_TYPE = { smoke: 'smoke_heat', temperature: 'smoke_heat', co: 'co', current: 'current' }
const MEASUREMENT_LABEL = { smoke: 'Smoke', temperature: 'Temperature', co: 'Carbon monoxide', current: 'Current' }

/**
 * Why a room has its level: the measurements the decision engine evaluated
 * (GET /rooms/{id} → latest_readings, worst value per measurement) and the
 * rules that fired (active hazard event → reason_codes).
 */
function RoomEvidence({ roomId, level, thresholds, ratedBySensor }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () => api.getRoomDetails(roomId)
      .then(d => { if (!cancelled) setDetail(d) })
      .catch(() => { if (!cancelled) setDetail({ error: true }) })
    load()
    const timer = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [roomId, level])

  const box = { marginTop: 16, background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', padding: 12 }
  const heading = { fontSize: 10, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'var(--font-sans)' }

  if (!detail) return <div style={{ ...box, fontSize: 12, color: 'var(--ink-400)' }}>Loading measurements…</div>
  if (detail.error || detail.demo_data) {
    return <div style={{ ...box, fontSize: 12, color: 'var(--ink-400)' }}>Measurements unavailable (database not connected).</div>
  }

  const measurements = Object.entries(detail.latest_readings || {})
  const event = (detail.active_events || [])[0]

  return (
    <>
      <div style={box}>
        <div style={heading}>Contributing measurements</div>
        {measurements.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>No readings received from this room yet.</div>
        ) : measurements.map(([field, m]) => {
          const mLevel = readingLevel(thresholds, MEASUREMENT_TYPE[field], { [field]: m.value },
                                      ratedBySensor[m.sensor_id], field)
          const color = HAZARD_COLOR[mLevel] || 'var(--ink-900)'
          return (
            <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 12 }}>
              <div>
                <div style={{ color: 'var(--ink-900)', fontWeight: 600 }}>{MEASUREMENT_LABEL[field] || field}</div>
                <div style={{ color: 'var(--ink-400)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{m.sensor_id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="tabular" style={{ color, fontWeight: 700 }}>{m.value} {m.unit || ''}</div>
                <div style={{ fontSize: 10, color }}>{mLevel || '—'}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={box}>
        <div style={heading}>Why this level</div>
        {event ? (
          <>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.5 }}>
              {(event.reason_codes || []).map(code => (
                <li key={code}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-900)' }}>{code}</span>
                  {' — '}{describeRule(thresholds, code)}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 6 }}>
              Since {new Date(event.detected_at).toLocaleTimeString()}
              {event.source_sensor_ids?.length ? ` · sensors ${event.source_sensor_ids.join(', ')}` : ''}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>
            {level === 'NORMAL' ? 'All measurements are within the decision engine thresholds.'
              : level === 'UNKNOWN' ? 'No recent readings: the room cannot be classified.'
              : 'No active hazard event.'}
          </div>
        )}
      </div>
    </>
  )
}

export default function RiskAnalytics() {
  const [rooms,    setRooms]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [thresholds, setThresholds] = useState(null)       // the decision engine's rules
  const [ratedBySensor, setRatedBySensor] = useState({})   // current thresholds scale with these

  useEffect(() => {
    api.getRooms().then(d => setRooms(d.rooms || [])).finally(() => setLoading(false))
    loadThresholds().then(setThresholds).catch(() => {})
    api.getSensors()
      .then(d => setRatedBySensor(Object.fromEntries(
        (d.sensors || []).map(s => [s.sensor_id, s.metadata?.rated_current_a])
      )))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onRoomStatus = (e) => {
      const { room_id, hazard_level, current_hazard_level } = e.detail?.data ?? e.detail ?? {}  // WebSocket envelope: {event_type, data, timestamp}
      const level = hazard_level || current_hazard_level
      if (!room_id || !level) return
      setRooms(prev => prev.map(r =>
        r.room_id === room_id ? { ...r, current_hazard_level: level } : r
      ))
      if (selected?.room_id === room_id) {
        setSelected(prev => prev ? { ...prev, current_hazard_level: level } : prev)
      }
    }
    wsEventBus.addEventListener('room_status_changed', onRoomStatus)
    return () => wsEventBus.removeEventListener('room_status_changed', onRoomStatus)
  }, [selected])

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left: scrollable room list */}
        <div style={{ flex: 1, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {loading ? <LoadingSkeleton type="table" rows={5} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rooms.map(room => {
                const level = room.current_hazard_level || 'UNKNOWN'
                const col   = HAZARD_COLOR[level] || HAZARD_COLOR.UNKNOWN
                const isSelected = selected?.room_id === room.room_id
                return (
                  <div
                    key={room.room_id}
                    className="glass-card"
                    onClick={() => setSelected(room)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(room)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 16px',
                      borderLeft: `4px solid ${col}`,
                      background: isSelected ? 'var(--orange-100)' : undefined,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-900)', marginBottom: 2 }}>
                        {room.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                        {room.room_id} · {room.last_updated_at
                          ? new Date(room.last_updated_at).toLocaleTimeString()
                          : 'No data'}
                      </div>
                    </div>
                    <StatusPill level={level} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: sticky detail panel */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <div className="glass-card" style={{ padding: 20, position: 'sticky', top: 16, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            {selected ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 20,
                    color: 'var(--ink-900)',
                    margin: 0,
                    lineHeight: 1.2,
                  }}>
                    {selected.name}
                  </h3>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close detail"
                    style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
                  >×</button>
                </div>

                {/* State box */}
                <div style={{
                  background: 'var(--bg-inset)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  textAlign: 'center',
                  marginBottom: 16,
                }}>
                  <StatusPill level={selected.current_hazard_level || 'UNKNOWN'} size="lg" />
                  <div style={{
                    marginTop: 8,
                    fontSize: 20,
                    fontWeight: 700,
                    color: HAZARD_COLOR[selected.current_hazard_level] || HAZARD_COLOR.UNKNOWN,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {selected.current_hazard_level || 'UNKNOWN'}
                  </div>
                </div>

                {/* Key/value rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['Room ID',        selected.room_id],
                    ['Data Quality',   selected.data_quality_status || '—'],
                    ['Classification', 'Rule-based threshold'],
                    ['Last Updated',   selected.last_updated_at
                      ? new Date(selected.last_updated_at).toLocaleTimeString()
                      : '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--ink-400)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-sans)' }}>{k}</span>
                      <span style={{ color: 'var(--ink-600)', textAlign: 'right', fontFamily: k === 'Room ID' ? 'var(--font-mono)' : 'var(--font-sans)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Measurements and fired rules from the decision engine */}
                <RoomEvidence
                  roomId={selected.room_id}
                  level={selected.current_hazard_level || 'UNKNOWN'}
                  thresholds={thresholds}
                  ratedBySensor={ratedBySensor}
                />
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>📊</span>
                <p style={{ color: 'var(--ink-400)', fontSize: 13, fontFamily: 'var(--font-sans)', margin: 0 }}>
                  Select a room to see its risk state
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
