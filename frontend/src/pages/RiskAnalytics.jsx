/**
 * Risk Analytics — PyroNav
 *
 * Genuine analytical dashboard, differentiated from the Heat Map:
 *   Heat Map  → WHERE:  spatial view, room colours on a floor plan
 *   Risk Analytics → HOW BAD: numerical risk scores, threshold gauges, trends
 *
 * Layout:
 *   Row 1 ── Top-3 "Highest Risk" spotlight cards  (full width)
 *   Row 2 ── Hazard distribution bar chart (left)  +  Sensor health summary (right)
 *   Row 3 ── Room list (left, scrollable)           +  Room detail panel (right, sticky)
 *              └ sensor threshold gauges when a room is selected
 */
import React, { useEffect, useState, useMemo } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// ── Thresholds (mirrors backend/decision_engine/config/thresholds.json) ───────
const THR = {
  smoke:       { warning: 50,  high: 80,  critical: 100, max: 150, unit: 'ppm',   label: 'Smoke'       },
  temperature: { warning: 45,  high: 60,  critical: 75,  max: 100, unit: '°C',    label: 'Temperature' },
  co:          { warning: 35,  high: 100, critical: 200, max: 250, unit: 'ppm',   label: 'CO'          },
  current:     { warning: 15,  high: 20,  critical: 25,  max: 30,  unit: 'A',     label: 'Current'     },
}

const SENSOR_TYPE_MAP = {
  temperature: 'temperature', smoke_heat: 'smoke', co: 'co', electrical: 'current', current: 'current',
}

// Normalize sensor from either live API (sensor_type, status: 'active') or demo (type, status: 'OPERATIONAL')
function normalizeSensor(s) {
  return {
    ...s,
    type:   s.type || s.sensor_type,
    value:  s.value ?? s.latest_reading?.values?.smoke
         ?? s.latest_reading?.values?.temperature
         ?? s.latest_reading?.values?.co_level
         ?? s.latest_reading?.values?.current
         ?? null,
    // normalize status to uppercase for consistent checks
    status: (() => {
      const raw = (s.status || '').toLowerCase()
      if (raw === 'active')   return 'OPERATIONAL'
      if (raw === 'inactive') return 'OFFLINE'
      if (raw === 'error')    return 'FAILED'
      if (raw === 'stale')    return 'STALE'
      return s.status || 'UNKNOWN'   // already uppercase from demo data
    })(),
  }
}

const HAZARD_COLOR = {
  NORMAL:    '#10B981',
  WARNING:   '#FBBF24',
  HIGH_RISK: '#F97316',
  CRITICAL:  '#EF4444',
  UNKNOWN:   '#94A3B8',
}

const HAZARD_BG = {
  NORMAL:    'rgba(16,185,129,0.08)',
  WARNING:   'rgba(251,191,36,0.10)',
  HIGH_RISK: 'rgba(249,115,22,0.10)',
  CRITICAL:  'rgba(239,68,68,0.10)',
  UNKNOWN:   'rgba(148,163,184,0.08)',
}

const HAZARD_ORDER = { CRITICAL: 4, HIGH_RISK: 3, WARNING: 2, NORMAL: 1, UNKNOWN: 0 }

// ── Demo sensor data (same as LiveMap so Risk Analytics works offline too) ────
const DEMO_SENSORS = [
  { sensor_id: 'TEMP-ICU-01',    room_id: 'icu',               type: 'temperature', status: 'OPERATIONAL', value: 68,  unit: 'degC' },
  { sensor_id: 'SMOKE-ICU-01',   room_id: 'icu',               type: 'smoke_heat',  status: 'OPERATIONAL', value: 120, unit: 'ppm'  },
  { sensor_id: 'CO-ICU-01',      room_id: 'icu',               type: 'co',          status: 'OPERATIONAL', value: 45,  unit: 'ppm'  },
  { sensor_id: 'ELEC-ICU-01',    room_id: 'icu',               type: 'electrical',  status: 'OPERATIONAL', value: 15.5,unit: 'A'    },
  { sensor_id: 'TEMP-OT-01',     room_id: 'operation_theater', type: 'temperature', status: 'OPERATIONAL', value: 58,  unit: 'degC' },
  { sensor_id: 'SMOKE-OT-01',    room_id: 'operation_theater', type: 'smoke_heat',  status: 'OPERATIONAL', value: 85,  unit: 'ppm'  },
  { sensor_id: 'ELEC-OT-01',     room_id: 'operation_theater', type: 'electrical',  status: 'OPERATIONAL', value: 8.2, unit: 'A'    },
  { sensor_id: 'CO-ED-01',       room_id: 'emergency_dept',    type: 'co',          status: 'OPERATIONAL', value: 78,  unit: 'ppm'  },
  { sensor_id: 'TEMP-ED-01',     room_id: 'emergency_dept',    type: 'temperature', status: 'OPERATIONAL', value: 65,  unit: 'degC' },
  { sensor_id: 'SMOKE-ED-01',    room_id: 'emergency_dept',    type: 'smoke_heat',  status: 'OFFLINE',     value: null,unit: 'ppm'  },
  { sensor_id: 'ELEC-ED-01',     room_id: 'emergency_dept',    type: 'electrical',  status: 'FAILED',      value: null,unit: 'A'    },
  { sensor_id: 'TEMP-GW-01',     room_id: 'general_ward',      type: 'temperature', status: 'OPERATIONAL', value: 55,  unit: 'degC' },
  { sensor_id: 'SMOKE-GW-01',    room_id: 'general_ward',      type: 'smoke_heat',  status: 'OPERATIONAL', value: 95,  unit: 'ppm'  },
  { sensor_id: 'CO-GW-01',       room_id: 'general_ward',      type: 'co',          status: 'OPERATIONAL', value: 52,  unit: 'ppm'  },
  { sensor_id: 'TEMP-MAT-01',    room_id: 'maternity_ward',    type: 'temperature', status: 'OPERATIONAL', value: 48,  unit: 'degC' },
  { sensor_id: 'SMOKE-MAT-01',   room_id: 'maternity_ward',    type: 'smoke_heat',  status: 'OPERATIONAL', value: 88,  unit: 'ppm'  },
  { sensor_id: 'CO-PHARM-01',    room_id: 'pharmacy',          type: 'co',          status: 'OPERATIONAL', value: 55,  unit: 'ppm'  },
  { sensor_id: 'SMOKE-PHARM-01', room_id: 'pharmacy',          type: 'smoke_heat',  status: 'FAILED',      value: null,unit: 'ppm'  },
  { sensor_id: 'SMOKE-WAIT-01',  room_id: 'waiting_area',      type: 'smoke_heat',  status: 'OPERATIONAL', value: 62,  unit: 'ppm'  },
  { sensor_id: 'SMOKE-ISO-01',   room_id: 'isolation_room',    type: 'smoke_heat',  status: 'OPERATIONAL', value: 58,  unit: 'ppm'  },
  { sensor_id: 'ELEC-ISO-01',    room_id: 'isolation_room',    type: 'electrical',  status: 'OPERATIONAL', value: 18.5,unit: 'A'    },
  { sensor_id: 'SMOKE-LAB-01',   room_id: 'lab',               type: 'smoke_heat',  status: 'OPERATIONAL', value: 68,  unit: 'ppm'  },
  { sensor_id: 'CO-LAB-01',      room_id: 'lab',               type: 'co',          status: 'OPERATIONAL', value: 42,  unit: 'ppm'  },
  { sensor_id: 'TEMP-LOBBY-01',  room_id: 'main_lobby',        type: 'temperature', status: 'OPERATIONAL', value: 22.5,unit: 'degC' },
  { sensor_id: 'SMOKE-LOBBY-01', room_id: 'main_lobby',        type: 'smoke_heat',  status: 'OPERATIONAL', value: 8,   unit: 'ppm'  },
  { sensor_id: 'TEMP-PR-01',     room_id: 'patient_room',      type: 'temperature', status: 'OPERATIONAL', value: 23.2,unit: 'degC' },
  { sensor_id: 'TEMP-RAD-01',    room_id: 'radiology',         type: 'temperature', status: 'OPERATIONAL', value: 21.5,unit: 'degC' },
  { sensor_id: 'TEMP-CAF-01',    room_id: 'cafeteria',         type: 'temperature', status: 'OPERATIONAL', value: 26,  unit: 'degC' },
  { sensor_id: 'TEMP-ADM-01',    room_id: 'administration',    type: 'temperature', status: 'OPERATIONAL', value: 22,  unit: 'degC' },
  { sensor_id: 'TEMP-BB-01',     room_id: 'blood_bank',        type: 'temperature', status: 'OPERATIONAL', value: 4,   unit: 'degC' },
  { sensor_id: 'TEMP-REC-01',    room_id: 'records',           type: 'temperature', status: 'FAILED',      value: null,unit: 'degC' },
  { sensor_id: 'SMOKE-REC-01',   room_id: 'records',           type: 'smoke_heat',  status: 'FAILED',      value: null,unit: 'ppm'  },
]

const DEMO_ROOMS = [
  { room_id: 'icu',               name: 'ICU (4 Beds)',            current_hazard_level: 'CRITICAL'  },
  { room_id: 'operation_theater', name: 'Operating Theatre (OT)',  current_hazard_level: 'HIGH_RISK' },
  { room_id: 'emergency_dept',    name: 'Emergency Department',    current_hazard_level: 'CRITICAL'  },
  { room_id: 'general_ward',      name: 'General Ward (6 Beds)',   current_hazard_level: 'HIGH_RISK' },
  { room_id: 'maternity_ward',    name: 'Maternity Ward (4 Beds)', current_hazard_level: 'HIGH_RISK' },
  { room_id: 'pharmacy',          name: 'Pharmacy',                current_hazard_level: 'WARNING'   },
  { room_id: 'waiting_area',      name: 'Waiting Area',            current_hazard_level: 'WARNING'   },
  { room_id: 'isolation_room',    name: 'Isolation Room',          current_hazard_level: 'WARNING'   },
  { room_id: 'lab',               name: 'Lab',                     current_hazard_level: 'WARNING'   },
  { room_id: 'main_lobby',        name: 'Main Lobby & Reception',  current_hazard_level: 'NORMAL'    },
  { room_id: 'patient_room',      name: 'Patient Room (2 Beds)',   current_hazard_level: 'NORMAL'    },
  { room_id: 'radiology',         name: 'Radiology (X-Ray)',       current_hazard_level: 'NORMAL'    },
  { room_id: 'cafeteria',         name: 'Cafeteria',               current_hazard_level: 'NORMAL'    },
  { room_id: 'administration',    name: 'Administration',          current_hazard_level: 'NORMAL'    },
  { room_id: 'blood_bank',        name: 'Blood Bank',              current_hazard_level: 'NORMAL'    },
  { room_id: 'records',           name: 'Records',                 current_hazard_level: 'UNKNOWN'   },
]

// ── Risk score: 0-100 calculated from how far each sensor is above its threshold
function calcRiskScore(sensors = []) {
  if (!sensors.length) return 0
  let totalScore = 0
  let scoredCount = 0

  sensors.forEach(s => {
    if (s.value == null || s.status === 'FAILED' || s.status === 'OFFLINE') {
      // Failed sensor adds uncertainty penalty
      totalScore += 30
      scoredCount++
      return
    }
    const key = SENSOR_TYPE_MAP[s.type]
    const thr = THR[key]
    if (!thr) return

    const val = parseFloat(s.value)
    let score = 0
    if (val >= thr.critical)     score = 80 + Math.min(20, ((val - thr.critical) / (thr.max - thr.critical)) * 20)
    else if (val >= thr.high)    score = 55 + ((val - thr.high) / (thr.critical - thr.high)) * 25
    else if (val >= thr.warning) score = 25 + ((val - thr.warning) / (thr.high - thr.warning)) * 30
    else                          score = Math.max(0, (val / thr.warning) * 25)

    totalScore += score
    scoredCount++
  })

  return scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0
}

function getRiskColor(score) {
  if (score >= 70) return '#EF4444'
  if (score >= 50) return '#F97316'
  if (score >= 25) return '#FBBF24'
  return '#10B981'
}

function getRiskLabel(score) {
  if (score >= 70) return 'Critical'
  if (score >= 50) return 'High Risk'
  if (score >= 25) return 'Warning'
  return 'Normal'
}

// ── Sensor threshold gauge bar ────────────────────────────────────────────────
function ThresholdGauge({ sensor }) {
  const key = SENSOR_TYPE_MAP[sensor.type]
  const thr = THR[key]
  if (!thr) return null

  const isFailed  = sensor.status === 'FAILED' || sensor.status === 'OFFLINE'
  const val       = isFailed ? null : parseFloat(sensor.value)
  const pct       = isFailed ? 0 : Math.min(100, (val / thr.max) * 100)

  const barColor  = isFailed
    ? '#94A3B8'
    : val >= thr.critical ? '#EF4444'
    : val >= thr.high     ? '#F97316'
    : val >= thr.warning  ? '#FBBF24'
    : '#10B981'

  // Marker positions as % of max
  const warnPct = (thr.warning / thr.max) * 100
  const highPct = (thr.high    / thr.max) * 100
  const critPct = (thr.critical/ thr.max) * 100

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {thr.label}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: isFailed ? '#94A3B8' : barColor,
          fontFamily: 'var(--font-mono)',
        }}>
          {isFailed ? `${sensor.status}` : `${val} ${thr.unit}`}
        </span>
      </div>

      {/* Track */}
      <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'var(--bg-inset)', overflow: 'visible' }}>
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: isFailed
            ? 'repeating-linear-gradient(45deg,#94A3B840,#94A3B840 4px,transparent 4px,transparent 8px)'
            : `linear-gradient(90deg, #10B981 0%, #FBBF24 ${warnPct}%, #F97316 ${highPct}%, #EF4444 ${critPct}%)`,
          borderRadius: 5,
          transition: 'width 0.5s ease',
          clipPath: `inset(0 0 0 0 round 5px)`,
        }} />

        {/* Threshold markers */}
        {[warnPct, highPct, critPct].map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${p}%`,
            top: -3, bottom: -3,
            width: 2,
            background: ['#FBBF24','#F97316','#EF4444'][i],
            opacity: 0.8,
            borderRadius: 1,
          }} />
        ))}
      </div>

      {/* Threshold labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: 'var(--ink-400)' }}>
        <span>0</span>
        <span style={{ position: 'absolute', left: `${warnPct}%`, transform: 'translateX(-50%)', color: '#FBBF24', fontWeight: 600 }}>
          {thr.warning}
        </span>
        <span>{thr.max} {thr.unit}</span>
      </div>
    </div>
  )
}

// ── Risk score donut ───────────────────────────────────────────────────────────
function RiskDonut({ score, size = 80 }) {
  const r   = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const fill  = (score / 100) * circ
  const color = getRiskColor(score)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-inset)" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
      <text
        x={size/2} y={size/2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight={700}
        fill={color}
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`, fontFamily: 'var(--font-sans)' }}
      >
        {score}
      </text>
    </svg>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RiskAnalytics() {
  const [rooms,    setRooms]    = useState([])
  const [sensors,  setSensors]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [sortBy,   setSortBy]   = useState('risk') // 'risk' | 'name' | 'level'

  useEffect(() => {
    async function load() {
      try {
        const [r, s] = await Promise.all([api.getRooms(), api.getSensors()])
        const normalizedSensors = (s.sensors || []).map(normalizeSensor)
        setRooms(r.rooms || [])
        setSensors(normalizedSensors)
      } catch {
        setIsDemoMode(true)
        const withSensors = DEMO_ROOMS.map(room => ({
          ...room,
          sensors: DEMO_SENSORS.filter(s => s.room_id === room.room_id).map(normalizeSensor),
        }))
        setRooms(withSensors)
        setSensors(DEMO_SENSORS.map(normalizeSensor))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const onRoomStatus = (e) => {
      const { room_id, hazard_level, current_hazard_level } = e.detail?.data ?? e.detail ?? {}
      const level = hazard_level || current_hazard_level
      if (!room_id || !level) return
      setRooms(prev => prev.map(r =>
        r.room_id === room_id ? { ...r, current_hazard_level: level } : r
      ))
      if (selected?.room_id === room_id)
        setSelected(prev => prev ? { ...prev, current_hazard_level: level } : prev)
    }
    wsEventBus.addEventListener('room_status_changed', onRoomStatus)
    return () => wsEventBus.removeEventListener('room_status_changed', onRoomStatus)
  }, [selected])

  // Attach sensor data to each room
  const roomsWithSensors = useMemo(() => rooms.map(r => ({
    ...r,
    sensors: r.sensors || sensors.filter(s => s.room_id === r.room_id),
  })), [rooms, sensors])

  // Calculate risk scores
  const roomsScored = useMemo(() =>
    roomsWithSensors.map(r => ({
      ...r,
      riskScore: calcRiskScore(r.sensors),
    })).sort((a, b) => {
      if (sortBy === 'risk')  return b.riskScore - a.riskScore
      if (sortBy === 'level') return (HAZARD_ORDER[b.current_hazard_level] || 0) - (HAZARD_ORDER[a.current_hazard_level] || 0)
      return a.name.localeCompare(b.name)
    }),
  [roomsWithSensors, sortBy])

  // Stats
  const counts = useMemo(() => ({
    CRITICAL:  roomsScored.filter(r => r.current_hazard_level === 'CRITICAL').length,
    HIGH_RISK: roomsScored.filter(r => r.current_hazard_level === 'HIGH_RISK').length,
    WARNING:   roomsScored.filter(r => r.current_hazard_level === 'WARNING').length,
    NORMAL:    roomsScored.filter(r => r.current_hazard_level === 'NORMAL').length,
    UNKNOWN:   roomsScored.filter(r => r.current_hazard_level === 'UNKNOWN').length,
  }), [roomsScored])

  const allSensors    = isDemoMode ? DEMO_SENSORS : sensors
  const failedSensors = allSensors.filter(s => s.status === 'FAILED' || s.status === 'OFFLINE')
  const staleSensors  = allSensors.filter(s => s.status === 'STALE')
  const top3          = roomsScored.slice(0, 3)
  const maxBar        = Math.max(...Object.values(counts), 1)

  const selectedFull  = selected ? roomsScored.find(r => r.room_id === selected.room_id) : null

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{
        padding: '20px 24px',
        background: 'var(--bg-raised)',
        borderRadius: 16,
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--neo-raised-sm)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48,
          background: 'linear-gradient(135deg,#EF4444 0%,#F97316 100%)',
          borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24, boxShadow: 'var(--neo-raised)',
        }}>📈</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', margin: 0, marginBottom: 4 }}>
            Risk Analytics
          </h1>
          <p style={{ color: 'var(--ink-400)', fontSize: 13, margin: 0 }}>
            Numerical hazard scoring · Sensor threshold analysis · Room-level risk breakdown
          </p>
        </div>
        {isDemoMode && (
          <div style={{ padding: '6px 14px', background: 'rgba(255,106,26,0.1)', border: '1px solid rgba(255,106,26,0.3)', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--orange-600)' }}>
            🔬 Demo Mode
          </div>
        )}
      </div>

      {loading ? <LoadingSkeleton rows={4} height={80} gap={12} /> : (<>

      {/* ── Row 1: Top-3 Highest Risk spotlight cards ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          🔺 Highest Risk Rooms Right Now
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {top3.map((room, idx) => {
            const col   = HAZARD_COLOR[room.current_hazard_level] || HAZARD_COLOR.UNKNOWN
            const label = ['1st', '2nd', '3rd'][idx]
            const activeSensors  = (room.sensors || []).filter(s => s.value != null && s.status === 'OPERATIONAL')
            const failedCount    = (room.sensors || []).filter(s => s.status === 'FAILED' || s.status === 'OFFLINE').length
            return (
              <div
                key={room.room_id}
                onClick={() => setSelected(room)}
                style={{
                  padding: '18px 20px',
                  background: HAZARD_BG[room.current_hazard_level] || 'var(--bg-raised)',
                  border: `2px solid ${col}40`,
                  borderRadius: 14,
                  cursor: 'pointer',
                  boxShadow: `0 4px 20px ${col}20`,
                  display: 'flex', gap: 16, alignItems: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${col}35` }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 20px ${col}20` }}
              >
                <RiskDonut score={room.riskScore} size={70} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: col, background: `${col}18`, padding: '2px 8px', borderRadius: 10 }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {room.current_hazard_level?.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {room.name}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-500)' }}>
                    <span>📡 {activeSensors.length} active</span>
                    {failedCount > 0 && <span style={{ color: '#EF4444' }}>⚠️ {failedCount} failed</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Row 2: Distribution chart + Sensor health ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Distribution bar chart */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>
                Room Status Distribution
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{roomsScored.length} rooms monitored</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { level: 'CRITICAL',  label: 'Critical'  },
              { level: 'HIGH_RISK', label: 'High Risk' },
              { level: 'WARNING',   label: 'Warning'   },
              { level: 'NORMAL',    label: 'Normal'    },
              { level: 'UNKNOWN',   label: 'Unknown'   },
            ].map(({ level, label }) => {
              const count = counts[level] || 0
              const pct   = Math.round((count / (roomsScored.length || 1)) * 100)
              const barW  = (count / maxBar) * 100
              const col   = HAZARD_COLOR[level]
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 70, fontSize: 11, fontWeight: 600, color: col, textAlign: 'right', flexShrink: 0 }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, height: 22, background: 'var(--bg-inset)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', width: `${barW}%`,
                      background: `linear-gradient(90deg, ${col}CC, ${col})`,
                      borderRadius: 4,
                      transition: 'width 0.5s ease',
                      display: 'flex', alignItems: 'center', paddingLeft: 8,
                    }}>
                      {count > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{count}</span>
                      )}
                    </div>
                    {count === 0 && (
                      <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-400)' }}>0</span>
                    )}
                  </div>
                  <div style={{ width: 36, fontSize: 11, color: 'var(--ink-400)', flexShrink: 0 }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sensor health summary */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>📡</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>
                Sensor Health Overview
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{allSensors.length} sensors across {roomsScored.length} rooms</div>
            </div>
          </div>

          {/* Big number tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Operational', count: allSensors.filter(s => s.status === 'OPERATIONAL').length, color: '#10B981', icon: '✅' },
              { label: 'Failed',      count: failedSensors.filter(s => s.status === 'FAILED').length,   color: '#EF4444', icon: '❌' },
              { label: 'Offline',     count: failedSensors.filter(s => s.status === 'OFFLINE').length,  color: '#F97316', icon: '📵' },
              { label: 'Stale',       count: staleSensors.length,                                        color: '#FBBF24', icon: '⏱️' },
            ].map(({ label, count, color, icon }) => (
              <div key={label} style={{
                padding: '12px 14px',
                background: `${color}0D`,
                border: `1px solid ${color}30`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-sans)', lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Rooms with degraded coverage */}
          {(() => {
            const degraded = roomsScored.filter(r =>
              (r.sensors || []).some(s => s.status === 'FAILED' || s.status === 'OFFLINE')
            )
            if (!degraded.length) return (
              <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, textAlign: 'center', padding: '8px 0' }}>
                ✅ All rooms have full sensor coverage
              </div>
            )
            return (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  ⚠️ Degraded Coverage ({degraded.length} rooms)
                </div>
                {degraded.map(r => {
                  const failed = (r.sensors || []).filter(s => s.status === 'FAILED' || s.status === 'OFFLINE')
                  return (
                    <div key={r.room_id} onClick={() => setSelected(r)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-700)', fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>{failed.length} sensor{failed.length > 1 ? 's' : ''} down</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Row 3: Room list + Detail panel ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Room list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Sort bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-400)', fontWeight: 600 }}>Sort by:</span>
            {[['risk','Risk Score'],['level','Hazard Level'],['name','Name']].map(([val, lbl]) => (
              <button key={val} onClick={() => setSortBy(val)} style={{
                padding: '5px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: sortBy === val ? 'var(--orange-500)' : 'var(--bg-raised)',
                color: sortBy === val ? '#fff' : 'var(--ink-600)',
                boxShadow: sortBy === val ? 'none' : 'var(--neo-raised-sm)',
                transition: 'all 0.15s',
              }}>{lbl}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roomsScored.map(room => {
              const col       = HAZARD_COLOR[room.current_hazard_level] || HAZARD_COLOR.UNKNOWN
              const isSelected = selected?.room_id === room.room_id
              const failedCnt = (room.sensors || []).filter(s => s.status === 'FAILED' || s.status === 'OFFLINE').length

              return (
                <div
                  key={room.room_id}
                  className="glass-card"
                  onClick={() => setSelected(isSelected ? null : room)}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelected(isSelected ? null : room)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px',
                    borderLeft: `4px solid ${col}`,
                    background: isSelected ? `${col}10` : undefined,
                    transition: 'all 0.15s',
                    outline: isSelected ? `2px solid ${col}40` : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-inset)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
                >
                  {/* Risk donut */}
                  <RiskDonut score={room.riskScore} size={44} />

                  {/* Room info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-900)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {room.name}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: 'var(--ink-400)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{room.room_id}</span>
                      {failedCnt > 0 && <span style={{ color: '#EF4444', fontWeight: 600 }}>⚠️ {failedCnt} sensor{failedCnt > 1 ? 's' : ''} down</span>}
                    </div>
                  </div>

                  {/* Hazard pill */}
                  <StatusPill level={room.current_hazard_level || 'UNKNOWN'} />

                  {/* Risk score label */}
                  <div style={{
                    minWidth: 64, textAlign: 'right',
                    fontSize: 11, fontWeight: 700,
                    color: getRiskColor(room.riskScore),
                  }}>
                    Score {room.riskScore}
                    <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-400)' }}>
                      {getRiskLabel(room.riskScore)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ width: 340, flexShrink: 0, position: 'sticky', top: 16 }}>
          {selectedFull ? (
            <div className="glass-card" style={{ padding: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink-900)', margin: 0, marginBottom: 4 }}>
                    {selectedFull.name}
                  </h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)' }}>
                    {selectedFull.room_id}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
              </div>

              {/* Score + level */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--bg-inset)', borderRadius: 12 }}>
                <RiskDonut score={selectedFull.riskScore} size={72} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk Score</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: getRiskColor(selectedFull.riskScore), fontFamily: 'var(--font-sans)', lineHeight: 1 }}>
                    {selectedFull.riskScore} <span style={{ fontSize: 14, fontWeight: 400 }}>/ 100</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <StatusPill level={selectedFull.current_hazard_level || 'UNKNOWN'} />
                  </div>
                </div>
              </div>

              {/* Key facts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[
                  ['Classification', 'Rule-based threshold'],
                  ['Data Quality',   selectedFull.data_quality_status || 'FRESH'],
                  ['Sensors',        `${(selectedFull.sensors||[]).filter(s=>s.status==='OPERATIONAL').length} / ${(selectedFull.sensors||[]).length} operational`],
                  ['Last Updated',   selectedFull.last_updated_at ? new Date(selectedFull.last_updated_at).toLocaleTimeString() : 'Demo data'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-400)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
                    <span style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Threshold gauges */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                  📏 Sensor Readings vs Thresholds
                </div>
                {(selectedFull.sensors || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-400)', fontStyle: 'italic' }}>
                    No sensor data available for this room.
                  </div>
                ) : (
                  (selectedFull.sensors || []).map(sensor => (
                    <ThresholdGauge key={sensor.sensor_id} sensor={sensor} />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 8 }}>Select a room</div>
              <div style={{ fontSize: 13, color: 'var(--ink-400)', lineHeight: 1.5 }}>
                Click any room in the list or the top risk cards to see detailed threshold gauges and risk breakdown.
              </div>
            </div>
          )}
        </div>
      </div>

      </>)}

      {/* Disclaimer */}
      <p style={{ fontSize: 11, color: 'var(--ink-400)', textAlign: 'center', fontStyle: 'italic', paddingBottom: 8 }}>
        Risk scores are calculated from OSHA/NFPA-derived demonstration thresholds · Academic prototype only
      </p>
    </div>
  )
}
