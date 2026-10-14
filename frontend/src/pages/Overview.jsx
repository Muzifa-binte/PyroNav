import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MetricCard from '../components/MetricCard'
import BuildingMap2D from '../components/BuildingMap2D'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'

export default function Overview() {
  const navigate = useNavigate()
  const [rooms,    setRooms]    = useState([])
  const [building, setBuilding] = useState(null)
  const [route,    setRoute]    = useState(null)
  const [alerts,   setAlerts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [r, b, rt, al] = await Promise.all([
          api.getRooms(), api.getBuilding(), api.getCurrentRoute(), api.getAlerts(),
        ])
        setRooms(r.rooms || [])
        setBuilding(b)
        setRoute(rt)
        setAlerts(al.alerts || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const affectedRooms = rooms.filter(r => r.current_hazard_level !== 'NORMAL' && r.current_hazard_level !== 'UNKNOWN')
  const criticalRooms = rooms.filter(r => r.current_hazard_level === 'CRITICAL')
  const normalRooms   = rooms.filter(r => r.current_hazard_level === 'NORMAL')

  const buildingState = criticalRooms.length > 0 ? 'CRITICAL'
    : affectedRooms.length > 0 ? 'WARNING' : 'NORMAL'

  const ACCENT = {
    NORMAL:   '#38A169',
    WARNING:  '#D69E2E',
    CRITICAL: '#E53E3E',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Building Overview
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            PyroNav Demo Hospital — Ground Floor
          </p>
        </div>
        <div style={{
          padding: '6px 14px',
          borderRadius: 999,
          background: ACCENT[buildingState] + '18',
          border: `1px solid ${ACCENT[buildingState]}40`,
          color: ACCENT[buildingState],
          fontSize: 13, fontWeight: 700,
        }}>
          Building: {buildingState}
        </div>
      </div>

      {/* ── Metric cards row ─────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton lines={2} height={80} />
      ) : (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <MetricCard
            label="Building State"
            value={buildingState}
            sub={`${rooms.length} rooms monitored`}
            accent={ACCENT[buildingState]}
            icon="🏥"
          />
          <MetricCard
            label="Affected Rooms"
            value={affectedRooms.length}
            sub={`${criticalRooms.length} critical`}
            accent={affectedRooms.length > 0 ? '#D69E2E' : '#38A169'}
            icon="⚠️"
            onClick={() => navigate('/map')}
          />
          <MetricCard
            label="Active Alerts"
            value={alerts.length}
            sub={alerts.length === 0 ? 'No active alerts' : 'Requires attention'}
            accent={alerts.length > 0 ? '#E53E3E' : '#38A169'}
            icon="🔔"
            onClick={() => navigate('/alerts')}
          />
          <MetricCard
            label="Rooms Normal"
            value={normalRooms.length}
            sub={`of ${rooms.length} total rooms`}
            accent="#38A169"
            icon="✅"
          />
          <MetricCard
            label="Route Status"
            value={route?.status === 'ROUTE_FOUND' ? 'Active' : route?.status ? 'Issue' : 'None'}
            sub={route?.exit_id ? `→ ${route.exit_id}` : 'No route calculated'}
            accent={route?.status === 'ROUTE_FOUND' ? '#2EC4B6' : '#718096'}
            icon="🚪"
            onClick={() => navigate('/evacuation')}
          />
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Map preview */}
        <div style={{
          background: 'var(--surface-base)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          padding: 16,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Live Floor Plan</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click to open full map</div>
            </div>
            <button
              onClick={() => navigate('/map')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, var(--accent-primary), #F0883E)',
                border: 'none',
                color: '#fff',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(232,104,26,0.3)',
              }}
            >
              Full Map →
            </button>
          </div>
          {loading ? <LoadingSkeleton lines={5} height={24} /> : (
            <BuildingMap2D
              building={building}
              rooms={rooms}
              route={route}
              compact
              onRoomSelect={() => navigate('/map')}
            />
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quick route status */}
          <div style={{
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            padding: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>
              Evacuation Route
            </div>
            {route && route.status === 'ROUTE_FOUND' ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <StatusPill level="NORMAL" label="Route Found" size="sm" />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                    via {route.algorithm}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  → <strong>{route.exit_id}</strong>
                  {route.total_cost != null && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      ({route.total_cost} m)
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusPill level="UNKNOWN" label="No Route" size="sm" />
                <button
                  onClick={() => navigate('/evacuation')}
                  style={{
                    marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                    color: 'var(--accent-primary)', background: 'none',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  Calculate →
                </button>
              </div>
            )}
          </div>

          {/* Alerts */}
          <div style={{
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            padding: 16,
            flex: 1,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>
              Active Alerts
            </div>
            {loading ? <LoadingSkeleton lines={3} /> :
             error   ? <div className="error-state" style={{ padding: 12, fontSize: 12 }}>{error}</div> :
             alerts.length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 8,
                background: '#C6F6D5', color: '#276749', fontSize: 13, fontWeight: 500,
              }}>
                <span>✓</span> All systems normal — no active alerts
              </div>
            ) : alerts.slice(0, 4).map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 0',
                borderBottom: i < Math.min(alerts.length, 4) - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <StatusPill level={a.severity || a.hazard_level || 'UNKNOWN'} size="sm" />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.message || a.room_id || 'Event'}
                </span>
              </div>
            ))}
          </div>

          {/* Room states */}
          <div style={{
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            padding: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>
              Room States
            </div>
            {loading ? <LoadingSkeleton lines={5} /> :
              rooms.slice(0, 7).map((r, i) => (
                <div key={r.room_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0',
                  borderBottom: i < 6 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.name}</span>
                  <StatusPill level={r.current_hazard_level || 'UNKNOWN'} size="sm" />
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
