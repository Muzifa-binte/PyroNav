import { useState } from 'react'
import { CONFIG } from '../config'
import { SENSOR_BY_ID, SENSORS } from '../data/sensorRegistry'
import { buildReading, topicFor } from '../mqtt/messageBuilder'
import { publisher } from '../mqtt/publisher'
import { getSim, useSimStore } from '../state/useSimStore'
import { downloadBuildingConfig } from './exportBuilding'

const PERIODS = [0, 5, 10, 15, 30, 60]

export default function SettingsTab() {
  const mqttUrl = useSimStore((s) => s.mqttUrl)
  const setMqttUrl = useSimStore((s) => s.setMqttUrl)
  const mqttStatus = useSimStore((s) => s.mqttStatus)
  const mqttError = useSimStore((s) => s.mqttError)
  const clientId = useSimStore((s) => s.clientId)
  const qos = useSimStore((s) => s.qos)
  const setQos = useSimStore((s) => s.setQos)
  const periodicSeconds = useSimStore((s) => s.periodicSeconds)
  const setPeriodicSeconds = useSimStore((s) => s.setPeriodicSeconds)
  const feedStatus = useSimStore((s) => s.feedStatus)
  const resetSensors = useSimStore((s) => s.resetSensors)
  const [url, setUrl] = useState(mqttUrl)
  const example = SENSOR_BY_ID['SMOKE-OT-01'] || SENSORS[0]
  const all = SENSORS.map((s) => s.sensor_id)

  return (
    <>
      <div className="section-label">MQTT broker</div>
      <div className="form-row">
        <label htmlFor="broker">WebSocket URL (Mosquitto listener 9001)</label>
        <div className="inline">
          <input id="broker" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
          <button type="button" className="btn primary"
                  onClick={() => (url === mqttUrl ? publisher.connect(url) : setMqttUrl(url))}>Connect</button>
        </div>
        <span className="hint">
          Status: <b>{mqttStatus}</b>{mqttError ? ` — ${mqttError}` : ''}{clientId ? <> · client <code>{clientId}</code></> : null}
        </span>
      </div>
      <div className="form-row">
        <label htmlFor="qos">Quality of service</label>
        <select id="qos" value={qos} onChange={(e) => setQos(Number(e.target.value))}>
          <option value={1}>QoS 1 — broker acknowledges every reading (recommended)</option>
          <option value={0}>QoS 0 — fire and forget</option>
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="period">Periodic reporting</label>
        <select id="period" value={periodicSeconds} onChange={(e) => setPeriodicSeconds(Number(e.target.value))}>
          {PERIODS.map((p) => <option key={p} value={p}>{p === 0 ? 'Off — publish only on slider changes' : `Every ${p} s`}</option>)}
        </select>
        <span className="hint">
          Real sensors report continuously. The Decision Engine treats a sensor as stale after 60 s without data,
          so keep this on unless you want to test stale-data handling.
        </span>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <button type="button" className="btn" onClick={() => publisher.publishMany(all, 'manual')}>↑ Publish all {all.length} sensors</button>
        <button type="button" className="btn danger" onClick={() => { resetSensors(all); publisher.publishMany(all, 'reset') }}>
          ↺ Reset all to baseline
        </button>
      </div>

      <div className="section-label">Message contract</div>
      <dl className="kv">
        <dt>Topic</dt><dd>{CONFIG.topicTemplate}</dd>
        <dt>Example</dt><dd>{topicFor(example)}</dd>
        <dt>Schema</dt><dd>shared-contracts/sensor-message-schema.json</dd>
      </dl>
      <details style={{ marginTop: 6 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 12 }}>Example payload</summary>
        <pre className="log-entry" style={{ background: '#0F172A', color: '#D1E3FF', fontSize: 10.5, marginTop: 6, overflowX: 'auto' }}>
          {JSON.stringify(buildReading(example, getSim().values[example.sensor_id], 'slider'), null, 2)}
        </pre>
      </details>

      <div className="section-label">Decision Engine feedback</div>
      <dl className="kv">
        <dt>REST</dt><dd>{CONFIG.api.base}/rooms</dd>
        <dt>WebSocket</dt><dd>{CONFIG.api.ws}</dd>
        <dt>Status</dt><dd>{feedStatus}</dd>
      </dl>

      <div className="section-label">Building configuration</div>
      <p className="hint" style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Rooms, door connections, sensors and exits in metres (format of the Member 1 export task).
      </p>
      <button type="button" className="btn" onClick={downloadBuildingConfig}>⤓ Download building-config.json</button>
    </>
  )
}
