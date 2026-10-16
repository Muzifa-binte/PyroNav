import { useMemo, useState } from 'react'
import { ROOM_BY_ID, ROOMS } from '../data/hospitalLayout'
import { SENSORS, SENSORS_BY_ROOM } from '../data/sensorRegistry'
import { HAZARD_COLORS, HAZARD_LABELS, LEVEL_COLORS, sensorLevel } from '../data/sensorTypes'
import { publisher } from '../mqtt/publisher'
import { useSimStore } from '../state/useSimStore'
import SensorCard from './SensorCard'

const GROUPS = [
  { label: 'Clinical', categories: ['critical_care', 'patient', 'surgical', 'ward', 'emergency'] },
  { label: 'Diagnostic & support', categories: ['diagnostic', 'support', 'admin', 'food', 'public'] },
  { label: 'Corridors, halls & stairs', categories: ['circulation', 'stairs'] },
]

function HazardPill({ level }) {
  if (!level) return null
  return (
    <span className="pill" style={{ background: `${HAZARD_COLORS[level]}22`, color: HAZARD_COLORS[level],
                                    borderColor: `${HAZARD_COLORS[level]}55` }}>
      {HAZARD_LABELS[level]}
    </span>
  )
}

function Summary() {
  const hazards = useSimStore((s) => s.hazards)
  const feed = useSimStore((s) => s.feedStatus)
  const demo = useSimStore((s) => s.apiDemoData)
  const counts = { NORMAL: 0, WARNING: 0, HIGH_RISK: 0, CRITICAL: 0 }
  for (const r of ROOMS) {
    const l = hazards[r.room_id]?.level
    if (l in counts) counts[l]++
  }
  return (
    <>
      {feed !== 'live' && (
        <div className="notice info">
          Decision Engine feedback is offline. Sliders still publish to MQTT; start the PyroNav API to see the
          engine's verdict per room (room glow and badges).
        </div>
      )}
      {feed === 'live' && demo && (
        <div className="notice warn">The API is serving demo data (database unreachable) — room states may be stale.</div>
      )}
      <div className="summary">
        {Object.entries(counts).map(([k, n]) => (
          <div key={k} className="summary-cell" style={{ borderColor: n && k !== 'NORMAL' ? HAZARD_COLORS[k] : undefined }}>
            <b style={{ color: n && k !== 'NORMAL' ? HAZARD_COLORS[k] : undefined }}>{n}</b>
            <span>{HAZARD_LABELS[k]}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function RoomRow({ room }) {
  const selectRoom = useSimStore((s) => s.selectRoom)
  const hazard = useSimStore((s) => s.hazards[room.room_id]?.level)
  const values = useSimStore((s) => s.values)
  const sensors = SENSORS_BY_ROOM[room.room_id]
  const worst = sensors.reduce((acc, s) => {
    const l = sensorLevel(s, values[s.sensor_id])
    return ['normal', 'warning', 'high', 'critical'].indexOf(l) > ['normal', 'warning', 'high', 'critical'].indexOf(acc) ? l : acc
  }, 'normal')
  return (
    <button type="button" className="room-row" onClick={() => selectRoom(room.room_id)}>
      <span className="swatch" style={{ background: room.floor }} />
      <span style={{ minWidth: 0 }}>
        <div className="name">{room.name}</div>
        <div className="id">{room.room_id}</div>
      </span>
      <span className="right">
        {hazard && hazard !== 'NORMAL' && <HazardPill level={hazard} />}
        <span className="dot" title={`Highest slider level: ${worst}`} style={{ background: LEVEL_COLORS[worst] }} />
        {sensors.length}
      </span>
    </button>
  )
}

function RoomPicker() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return null
    const bySensor = new Set(SENSORS.filter((s) => s.sensor_id.toLowerCase().includes(q)).map((s) => s.room_id))
    return new Set(ROOMS.filter((r) => r.name.toLowerCase().includes(q) || r.room_id.includes(q) || bySensor.has(r.room_id))
      .map((r) => r.room_id))
  }, [q])
  return (
    <>
      <Summary />
      <input className="search" type="search" placeholder="Search room or sensor id (e.g. icu, SMOKE-OT-01)…"
             value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search rooms and sensors" />
      {GROUPS.map((g) => {
        const rooms = ROOMS.filter((r) => g.categories.includes(r.category) && (!matches || matches.has(r.room_id)))
        if (!rooms.length) return null
        return (
          <div key={g.label}>
            <div className="section-label">{g.label} · {rooms.length}</div>
            <div className="room-list">{rooms.map((r) => <RoomRow key={r.room_id} room={r} />)}</div>
          </div>
        )
      })}
      <p className="empty" style={{ padding: '14px 4px' }}>
        Tip: click a room or a sensor in the 3D view. Every room has a unique <code>room_id</code>; every sensor id is
        tied to exactly one room.
      </p>
    </>
  )
}

function RoomSensors({ roomId }) {
  const room = ROOM_BY_ID[roomId]
  const sensors = SENSORS_BY_ROOM[roomId]
  const clearSelection = useSimStore((s) => s.clearSelection)
  const resetSensors = useSimStore((s) => s.resetSensors)
  const hazard = useSimStore((s) => s.hazards[roomId])
  const ids = sensors.map((s) => s.sensor_id)
  return (
    <>
      <button type="button" className="back-btn" onClick={clearSelection}>← All rooms</button>
      <div className="room-head">
        <div className="room-head-top">
          <span className="swatch" style={{ background: room.floor, width: 16, height: 16, marginTop: 3 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{room.name}</h3>
            <div className="ids">room_id <code>{room.room_id}</code> · {room.kind} · {sensors.length} sensor{sensors.length > 1 ? 's' : ''}</div>
          </div>
          <div title="Decision Engine verdict (room_status_changed)">
            {hazard ? <HazardPill level={hazard.level} /> : <span className="pill muted">No verdict yet</span>}
          </div>
        </div>
        <p>{room.sensor_rationale}</p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => publisher.publishMany(ids, 'manual')}>↑ Send all</button>
          <button type="button" className="btn" onClick={() => { resetSensors(ids); publisher.publishMany(ids, 'reset') }}>
            ↺ Reset room
          </button>
        </div>
      </div>
      {sensors.map((s) => <SensorCard key={s.sensor_id} sensor={s} />)}
    </>
  )
}

export default function SensorsTab() {
  const selectedRoomId = useSimStore((s) => s.selectedRoomId)
  return selectedRoomId ? <RoomSensors roomId={selectedRoomId} /> : <RoomPicker />
}
