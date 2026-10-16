import { useSimStore } from '../state/useSimStore'

const MQTT_STATE = {
  idle: ['#94A3B8', 'Idle'],
  connecting: ['#F5A623', 'Connecting…'],
  reconnecting: ['#F5A623', 'Reconnecting…'],
  connected: ['#22C987', 'Connected'],
  offline: ['#E84D6A', 'Offline'],
  error: ['#E84D6A', 'Error'],
}
const FEED_STATE = {
  idle: ['#94A3B8', 'Idle'],
  connecting: ['#F5A623', 'Connecting…'],
  live: ['#22C987', 'Live'],
  offline: ['#E84D6A', 'Offline'],
}

export default function TopBar() {
  const mqttStatus = useSimStore((s) => s.mqttStatus)
  const mqttUrl = useSimStore((s) => s.mqttUrl)
  const feedStatus = useSimStore((s) => s.feedStatus)
  const counters = useSimStore((s) => s.counters)
  const [mColor, mLabel] = MQTT_STATE[mqttStatus] || MQTT_STATE.idle
  const [fColor, fLabel] = FEED_STATE[feedStatus] || FEED_STATE.idle

  return (
    <div className="overlay topbar">
      <div className="glass brand">
        <div className="brand-logo" aria-hidden="true">🔥</div>
        <div>
          <div className="brand-title">PyroNav · 3D Hospital</div>
          <div className="brand-sub">Ground floor · sensor input for the Decision Engine</div>
        </div>
      </div>
      <div className="glass status-strip" role="status" aria-live="polite">
        <span className="chip" title={`MQTT broker (Mosquitto WebSocket listener): ${mqttUrl}`}>
          <span className={`dot${mqttStatus === 'connected' ? ' live' : ''}`} style={{ background: mColor }} />
          MQTT {mLabel} <small>{mqttUrl.replace(/^wss?:\/\//, '')}</small>
        </span>
        <span className="chip" title="WebSocket /ws/v1/live — confirmations and Decision Engine results">
          <span className={`dot${feedStatus === 'live' ? ' live' : ''}`} style={{ background: fColor }} />
          Decision feed {fLabel}
        </span>
        <span className="chip counter" title="Readings published · acknowledged by the broker (QoS 1) · stored and forwarded by sensor_ingestion">
          ↑ {counters.published} sent · {counters.acked} broker ✓ · {counters.ingested} ingested ✓
          {counters.failed > 0 && <b style={{ color: 'var(--critical)' }}> · {counters.failed} failed</b>}
        </span>
      </div>
    </div>
  )
}
