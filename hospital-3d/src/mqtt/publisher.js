/**
 * Sensor publisher — turns slider changes into MQTT readings.
 *
 *   slider drag    → at most one message per sensor per CONFIG.throttleMs, the
 *                    latest value always goes out (trailing send)
 *   slider release → immediate send of the final value
 *   periodic       → every N s all sensors re-send their current value, like
 *                    real devices, so the Decision Engine never sees stale data
 *   (re)connect    → one 'sync' report of every sensor
 *
 * Every message carries sensor_id + room_id + sensor_type (see messageBuilder).
 */
import { CONFIG } from '../config'
import { SENSOR_BY_ID, SENSORS } from '../data/sensorRegistry'
import { getSim, queueDelivery, useSimStore } from '../state/useSimStore'
import { buildReading, topicFor } from './messageBuilder'
import { MqttLink } from './mqttClient'

const MY_IDS_LIMIT = 5000

class SensorPublisher {
  constructor() {
    this.link = new MqttLink((status, error, clientId) => this._onStatus(status, error, clientId))
    this.lastSentAt = {}
    this.lastPayload = {}
    this.trailing = {}
    this.periodicTimer = null
    this.myIds = new Set()
    this.started = false
    this.lastError = null
    this.lastErrorAt = 0
  }

  start() {
    if (this.started) return
    this.started = true
    this.connect(getSim().mqttUrl)
    this.setPeriodic(getSim().periodicSeconds)
  }

  stop() {
    this.started = false
    clearInterval(this.periodicTimer)
    Object.values(this.trailing).forEach(clearTimeout)
    this.link.disconnect()
  }

  connect(url) {
    const { username, password } = CONFIG.mqtt
    this.link.connect(url, { username, password })
  }

  setPeriodic(seconds) {
    clearInterval(this.periodicTimer)
    this.periodicTimer = null
    if (seconds > 0) {
      this.periodicTimer = setInterval(() => this.publishMany(SENSORS.map((s) => s.sensor_id), 'periodic'), seconds * 1000)
    }
  }

  isMine(messageId) {
    return this.myIds.has(messageId)
  }

  // ── Slider hooks ───────────────────────────────────────────────────────────
  onSliderChange(sensorId) {
    const wait = CONFIG.throttleMs - (Date.now() - (this.lastSentAt[sensorId] || 0))
    if (wait <= 0) {
      clearTimeout(this.trailing[sensorId])
      this.trailing[sensorId] = null
      this.publish(sensorId, 'slider')
    } else if (!this.trailing[sensorId]) {
      this.trailing[sensorId] = setTimeout(() => {
        this.trailing[sensorId] = null
        this.publish(sensorId, 'slider')
      }, wait)
    }
  }

  onSliderCommit(sensorId, trigger = 'slider') {
    clearTimeout(this.trailing[sensorId])
    this.trailing[sensorId] = null
    this.publish(sensorId, trigger, { skipIfUnchanged: trigger === 'slider' })
  }

  // ── Publishing ─────────────────────────────────────────────────────────────
  _send(sensorId, trigger) {
    const sensor = SENSOR_BY_ID[sensorId]
    const values = getSim().values[sensorId]
    const message = buildReading(sensor, values, trigger)
    const topic = topicFor(sensor)
    const payload = JSON.stringify(message)
    this.lastSentAt[sensorId] = Date.now()
    this.lastPayload[sensorId] = JSON.stringify(message.values)
    this.myIds.add(message.message_id)
    if (this.myIds.size > MY_IDS_LIMIT) this.myIds.delete(this.myIds.values().next().value)

    queueDelivery({ type: 'sent', sensorId, messageId: message.message_id, trigger, at: Date.now() })
    this.link.publish(topic, payload, getSim().qos)
      .then(() => queueDelivery({ type: 'ack', sensorId, messageId: message.message_id }))
      .catch((err) => queueDelivery({ type: 'ack', sensorId, messageId: message.message_id, error: err.message }))
    return { message, topic }
  }

  publish(sensorId, trigger, { skipIfUnchanged = false } = {}) {
    const sim = getSim()
    if (skipIfUnchanged && this.lastPayload[sensorId] === JSON.stringify(roundedValues(sensorId, sim.values[sensorId]))) {
      return
    }
    if (!this.link.connected) {
      sim.addLog({ kind: 'error', sensorId, roomId: SENSOR_BY_ID[sensorId].room_id,
                   text: `Not sent — MQTT broker ${sim.mqttStatus} (${sim.mqttUrl})` })
      return
    }
    const { message, topic } = this._send(sensorId, trigger)
    sim.addLog({ kind: 'mqtt', messageId: message.message_id, sensorId, roomId: message.room_id,
                 topic, payload: message, trigger, brokerAck: false, ingested: false })
  }

  publishMany(sensorIds, trigger) {
    if (!this.link.connected || sensorIds.length === 0) return 0
    if (sensorIds.length === 1) {
      this.publish(sensorIds[0], trigger)
      return 1
    }
    const ids = sensorIds.map((id) => this._send(id, trigger).message.message_id)
    const rooms = new Set(sensorIds.map((id) => SENSOR_BY_ID[id].room_id))
    getSim().addLog({ kind: 'batch', trigger, count: ids.length, rooms: rooms.size,
                      messageIds: ids, ackCount: 0, ingestedCount: 0 })
    return ids.length
  }

  _onStatus(status, error, clientId) {
    const sim = getSim()
    const wasConnected = sim.mqttStatus === 'connected'
    sim.setMqttStatus(status, error)
    if (clientId) sim.setClientId(clientId)
    if (status === 'connected' && !wasConnected) {
      sim.addLog({ kind: 'info', text: `Connected to MQTT broker ${sim.mqttUrl} as ${clientId}` })
      // Give the Decision Engine the full current picture right away
      this.publishMany(SENSORS.map((s) => s.sensor_id), 'sync')
    } else if (status === 'error' && error) {
      // the client retries every 2 s — log a repeated error at most once a minute
      const now = Date.now()
      if (error !== this.lastError || now - this.lastErrorAt > 60000) {
        sim.addLog({ kind: 'error', text: `MQTT: ${error}` })
        this.lastError = error
        this.lastErrorAt = now
      }
    }
  }
}

function roundedValues(sensorId, values) {
  const sensor = SENSOR_BY_ID[sensorId]
  return buildReading(sensor, values, 'probe').values
}

export const publisher = new SensorPublisher()

// Keep the publisher in step with settings changed in the UI
useSimStore.subscribe((state, prev) => {
  if (!publisher.started) return
  if (state.mqttUrl !== prev.mqttUrl) publisher.connect(state.mqttUrl)
  if (state.periodicSeconds !== prev.periodicSeconds) publisher.setPeriodic(state.periodicSeconds)
})
