import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const HAZARD_COLOR = {
  NORMAL:    '#43C59E',
  WARNING:   '#F5BE55',
  HIGH_RISK: '#FF8A4C',
  CRITICAL:  '#FF5D6C',
  UNKNOWN:   '#9AA7BA',
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
      const { room_id, hazard_level, current_hazard_level } = e.detail || {}
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

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Risk Analytics
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Room state and hazard assessment
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

        {/* Room list */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
            Room Hazard State
          </div>
          {loading ? <LoadingSkeleton type="table" rows={5} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rooms.map(room => {
                const level = room.current_hazard_level || 'UNKNOWN'
                const col   = HAZARD_COLOR[level] || '#9AA7BA'
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
                      borderLeft: `3px solid ${col}`,
                      background: selected?.room_id === room.room_id
                        ? 'rgba(105,183,255,0.06)'
                        : 'var(--glass-bg)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {room.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Quality: {room.data_quality_status || '—'} · Updated: {room.last_updated_at
                          ? new Date(room.last_updated_at).toLocaleTimeString()
                          : '—'}
                      </div>
                    </div>
                    <StatusPill level={level} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="glass-card" style={{ padding: 20, height: 'fit-content', position: 'sticky', top: 16 }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selected.name}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
                  aria-label="Close detail"
                >×</button>
              </div>

              {/* Large state label */}
              <div style={{
                padding: 16,
                background: 'var(--surface-inset)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${HAZARD_COLOR[selected.current_hazard_level] || '#9AA7BA'}33`,
                marginBottom: 16,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Current State</div>
                <StatusPill level={selected.current_hazard_level || 'UNKNOWN'} size="lg" />
                <div style={{
                  marginTop: 10,
                  fontSize: 22,
                  fontWeight: 900,
                  color: HAZARD_COLOR[selected.current_hazard_level] || '#9AA7BA',
                  letterSpacing: '-0.02em',
                }}>
                  {selected.current_hazard_level || 'UNKNOWN'}
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                {[
                  ['Room ID',        selected.room_id],
                  ['Data Quality',   selected.data_quality_status || '—'],
                  ['Classification', 'Rule-based threshold'],
                  ['Last Updated',   selected.last_updated_at
                    ? new Date(selected.last_updated_at).toLocaleTimeString()
                    : '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Freshness indicator */}
              <div style={{
                marginTop: 16,
                padding: 12,
                background: 'var(--surface-inset)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--text-muted)',
                border: '1px solid var(--border-glass)',
              }}>
                ML output unavailable — connect decision engine for contributing measurements and reason codes.
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 32 }}>📊</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select a room to see its risk state</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
