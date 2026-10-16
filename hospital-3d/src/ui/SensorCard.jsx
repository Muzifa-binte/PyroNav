/**
 * Controls for one sensor: a slider (and exact number entry) per measurement.
 * Dragging publishes throttled readings over MQTT; releasing sends the final
 * value. The footer shows the delivery chain of the latest message.
 */
import { memo, useEffect, useRef, useState } from 'react'
import {
  fieldSpec, formatValue, LEVEL_COLORS, levelOf, SENSOR_TYPES, sensorLevel,
} from '../data/sensorTypes'
import { publisher } from '../mqtt/publisher'
import { useSimStore } from '../state/useSimStore'
import { useNow } from './useNow'

function trackGradient(spec) {
  const span = spec.max - spec.min
  const pct = (v) => `${Math.max(0, Math.min(100, ((v - spec.min) / span) * 100)).toFixed(1)}%`
  const b = spec.bands || {}
  const stops = [`${LEVEL_COLORS.normal} 0%`]
  if (b.warning != null) stops.push(`${LEVEL_COLORS.normal} ${pct(b.warning)}`, `${LEVEL_COLORS.warning} ${pct(b.warning)}`)
  if (b.high != null) stops.push(`${LEVEL_COLORS.warning} ${pct(b.high)}`, `${LEVEL_COLORS.high} ${pct(b.high)}`)
  if (b.critical != null) stops.push(`${LEVEL_COLORS.high} ${pct(b.critical)}`, `${LEVEL_COLORS.critical} ${pct(b.critical)}`)
  stops.push(`${LEVEL_COLORS.critical} 100%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

function Field({ sensor, field, value }) {
  const spec = fieldSpec(sensor, field)
  const setValue = useSimStore((s) => s.setValue)
  const [draft, setDraft] = useState(null)
  const level = levelOf(spec, value)
  const id = `${sensor.sensor_id}-${field}`

  const onSlide = (e) => {
    setValue(sensor.sensor_id, field, Number(e.target.value))
    publisher.onSliderChange(sensor.sensor_id)
  }
  const commit = () => publisher.onSliderCommit(sensor.sensor_id)
  const commitDraft = () => {
    if (draft == null) return
    const n = Number(draft)
    setDraft(null)
    if (!Number.isFinite(n)) return
    setValue(sensor.sensor_id, field, Math.max(spec.min, Math.min(spec.max, n)))
    publisher.onSliderCommit(sensor.sensor_id, 'manual')
  }

  return (
    <div className="field">
      <div className="field-top">
        <label className="field-label" htmlFor={id}>{spec.label}</label>
        <span className="field-level" style={{ color: LEVEL_COLORS[level] }}>{level}</span>
        <span className="field-value">
          <input
            aria-label={`${spec.label} value`}
            inputMode="decimal"
            value={draft ?? formatValue(spec, value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
          <span>{spec.unit}</span>
        </span>
      </div>
      <input
        id={id}
        className="range"
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value ?? spec.min}
        onChange={onSlide}
        onPointerUp={commit}
        onKeyUp={commit}
        onTouchEnd={commit}
        style={{ background: trackGradient(spec), '--thumb': LEVEL_COLORS[level] }}
      />
      <div className="scale">
        <span>{spec.min}</span>
        {spec.rated && <span>rated {spec.rated} A</span>}
        <span>{spec.max}</span>
      </div>
    </div>
  )
}

function ago(ms, now) {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
}

function Delivery({ sensorId }) {
  const d = useSimStore((s) => s.delivery[sensorId])
  const feed = useSimStore((s) => s.feedStatus)
  const mqtt = useSimStore((s) => s.mqttStatus)
  const now = useNow(1000)
  if (!d) return <span>Not sent yet</span>
  return (
    <>
      <span className="step" title={d.messageId}>↑ {d.trigger} {ago(d.sentAt, now)}</span>
      <span>→</span>
      {d.error ? <span className="step err">broker ✕</span>
        : d.brokerAck ? <span className="step ok">broker ✓</span>
          : <span className="step wait">{mqtt === 'connected' ? 'broker …' : 'queued'}</span>}
      <span>→</span>
      {d.ingestedAt ? <span className="step ok" title="Stored and forwarded to the Decision Engine">ingested ✓</span>
        : feed === 'live' ? <span className="step wait" title="Waiting for sensor_reading_updated on the WebSocket">ingest …</span>
          : <span className="step" title="Start the API with BACKGROUND_SERVICES=sensor_ingestion.service to confirm">ingest ?</span>}
    </>
  )
}

function SensorCard({ sensor }) {
  const values = useSimStore((s) => s.values[sensor.sensor_id])
  const selected = useSimStore((s) => s.selectedSensorId === sensor.sensor_id)
  const selectSensor = useSimStore((s) => s.selectSensor)
  const resetSensors = useSimStore((s) => s.resetSensors)
  const setHovered = useSimStore((s) => s.setHoveredSensor)
  const level = sensorLevel(sensor, values)
  const type = SENSOR_TYPES[sensor.sensor_type]
  const ref = useRef(null)

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <div ref={ref} className={`sensor-card${selected ? ' selected' : ''}`}
         onMouseEnter={() => setHovered(sensor.sensor_id)} onMouseLeave={() => setHovered(null)}>
      <div className="sensor-card-head">
        <span className="dot" style={{ background: LEVEL_COLORS[level] }} />
        <span className="sid">{sensor.sensor_id}</span>
        <span className="pill muted" style={{ color: type.color }}>{type.glyph} {type.short}</span>
        <span className="spacer" />
        <button type="button" className="icon-btn" title="Show in 3D" onClick={() => selectSensor(sensor.sensor_id, { focus: true })}>⌖</button>
        <button type="button" className="icon-btn" title="Reset to baseline and send"
                onClick={() => { resetSensors([sensor.sensor_id]); publisher.publish(sensor.sensor_id, 'reset') }}>↺</button>
      </div>
      <div className="sensor-purpose">{sensor.purpose} · {sensor.mount}</div>
      {sensor.fields.map((f) => <Field key={f} sensor={sensor} field={f} value={values?.[f]} />)}
      <div className="delivery">
        <Delivery sensorId={sensor.sensor_id} />
        <button type="button" className="btn" onClick={() => publisher.publish(sensor.sensor_id, 'manual')}>Send</button>
      </div>
    </div>
  )
}

export default memo(SensorCard)
