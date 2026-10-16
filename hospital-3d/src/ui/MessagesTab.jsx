import { useState } from 'react'
import { ROOM_BY_ID } from '../data/hospitalLayout'
import { HAZARD_COLORS, HAZARD_LABELS } from '../data/sensorTypes'
import { useSimStore } from '../state/useSimStore'

const FILTERS = {
  all: () => true,
  mqtt: (e) => e.kind === 'mqtt' || e.kind === 'batch',
  decision: (e) => e.kind === 'decision',
  errors: (e) => e.kind === 'error' || e.error,
}
const EVENT_TEXT = {
  room_status_changed: 'Room status changed',
  hazard_event_created: 'Hazard event created',
  hazard_event_resolved: 'Hazard event resolved',
  notification_created: 'Notification',
}

const time = (at) => new Date(at).toLocaleTimeString([], { hour12: false })

function Entry({ e }) {
  if (e.kind === 'mqtt') {
    const values = Object.entries(e.payload.values).map(([k, v]) => `${k}=${v}${e.payload.units[k] ? ` ${e.payload.units[k]}` : ''}`)
    return (
      <div className="log-entry">
        <div className="log-top">
          <span className="log-time">{time(e.at)}</span>
          <span className="pill muted">{e.trigger}</span>
          <b className="mono">{e.sensorId}</b>
          <span>{values.join(' · ')}</span>
          <span style={{ marginLeft: 'auto' }}>
            {e.error ? <span className="step err">broker ✕</span> : e.brokerAck ? <span className="step ok">broker ✓</span> : <span className="step wait">…</span>}
            {' '}
            {e.ingested ? <span className="step ok">ingested ✓</span> : null}
          </span>
        </div>
        <div className="log-topic">{e.topic}</div>
        <details>
          <summary>Payload</summary>
          <pre>{JSON.stringify(e.payload, null, 2)}</pre>
        </details>
      </div>
    )
  }
  if (e.kind === 'batch') {
    return (
      <div className="log-entry">
        <div className="log-top">
          <span className="log-time">{time(e.at)}</span>
          <span className="pill muted">{e.trigger}</span>
          <span>{e.count} sensors in {e.rooms} rooms</span>
          <span style={{ marginLeft: 'auto' }}>
            <span className={`step ${e.ackCount === e.count ? 'ok' : 'wait'}`}>broker {e.ackCount}/{e.count}</span>{' '}
            {e.ingestedCount > 0 && <span className={`step ${e.ingestedCount === e.count ? 'ok' : 'wait'}`}>ingested {e.ingestedCount}/{e.count}</span>}
          </span>
        </div>
      </div>
    )
  }
  if (e.kind === 'decision') {
    const color = HAZARD_COLORS[e.level] || 'var(--accent)'
    return (
      <div className="log-entry decision" style={{ borderLeftColor: color }}>
        <div className="log-top">
          <span className="log-time">{time(e.at)}</span>
          <b>Decision Engine</b>
          <span>{EVENT_TEXT[e.eventType] || e.eventType}</span>
          {e.level && <span className="pill" style={{ background: `${color}22`, color }}>{HAZARD_LABELS[e.level] || e.level}</span>}
        </div>
        <div style={{ marginTop: 3 }}>
          {ROOM_BY_ID[e.roomId]?.name || e.roomId} <code>({e.roomId})</code>
          {e.previous && <> · was {HAZARD_LABELS[e.previous] || e.previous}</>}
          {e.text && <> — {e.text}</>}
          {e.reasons?.length ? <> · <code>{e.reasons.join(', ')}</code></> : null}
        </div>
      </div>
    )
  }
  return (
    <div className={`log-entry ${e.kind}`}>
      <span className="log-time">{time(e.at)}</span> {e.text}
      {e.sensorId && <> <code>{e.sensorId}</code></>}
    </div>
  )
}

export default function MessagesTab() {
  const log = useSimStore((s) => s.log)
  const clearLog = useSimStore((s) => s.clearLog)
  const [filter, setFilter] = useState('all')
  const entries = log.filter(FILTERS[filter])
  return (
    <>
      <div className="filters">
        {Object.keys(FILTERS).map((f) => (
          <button key={f} type="button" className={`filter${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'mqtt' ? 'MQTT' : f === 'decision' ? 'Decision Engine' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button type="button" className="btn" style={{ marginLeft: 'auto', padding: '3px 9px' }} onClick={clearLog}>Clear</button>
      </div>
      {entries.length === 0 ? (
        <div className="empty">No messages yet. Move a slider to publish a reading.</div>
      ) : (
        <div className="log">{entries.map((e) => <Entry key={e.id} e={e} />)}</div>
      )}
    </>
  )
}
