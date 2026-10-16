import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// Spec Section 3.1 palette — warm ivory tokens
const HAZARD_COLOR = {
  NORMAL:    '#2E8B57',
  WARNING:   '#F5A400',
  HIGH_RISK: '#FF6A1A',
  CRITICAL:  '#D62828',
  UNKNOWN:   '#8B7F76',
}

export default function RiskAnalytics() {
  const [rooms,    setRooms]    = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.getRooms().then(d => setRooms(d.rooms || [])).finally(() => setLoading(false))
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
          <div className="glass-card" style={{ padding: 20, position: 'sticky', top: 16 }}>
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

                {/* Note box */}
                <div style={{
                  marginTop: 16,
                  background: 'var(--bg-inset)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                  fontSize: 12,
                  color: 'var(--ink-400)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}>
                  Connect decision engine for contributing measurements and reason codes.
                </div>
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
