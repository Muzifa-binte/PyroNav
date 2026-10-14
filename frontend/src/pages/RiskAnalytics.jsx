import React, { useEffect, useState } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

export default function RiskAnalytics() {
  const [rooms,   setRooms]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRooms().then(d => setRooms(d.rooms || [])).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-4)' }}>
      <div>
        <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Room Hazard State</div>
        {loading ? <LoadingSkeleton lines={5} height={20} gap={12} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {rooms.map(room => (
              <div
                key={room.room_id}
                className="card"
                onClick={() => setSelected(room)}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelected(room)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: selected?.room_id === room.room_id ? 'var(--surface-raised)' : 'var(--surface-base)' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{room.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Quality: {room.data_quality_status || '—'} · Updated: {room.last_updated_at ? new Date(room.last_updated_at).toLocaleTimeString() : '—'}
                  </div>
                </div>
                <StatusPill level={room.current_hazard_level || 'UNKNOWN'} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        {selected ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <StatusPill level={selected.current_hazard_level || 'UNKNOWN'} />
            </div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                ['Room ID',          selected.room_id],
                ['Data Quality',     selected.data_quality_status || '—'],
                ['Classification',   'Rule-based threshold (no ML model)'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ color: 'var(--text-primary)', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
              ML output unavailable — connect decision engine for contributing measurements and reason codes.
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true" style={{ fontSize: 28 }}>📊</span>
            <p>Select a room to see its risk state</p>
          </div>
        )}
      </div>
    </div>
  )
}
