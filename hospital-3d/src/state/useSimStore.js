/**
 * Application state (zustand).
 *
 *   values      current slider value of every sensor field
 *   delivery    per-sensor delivery chain of the last message:
 *               sent → broker PUBACK (QoS 1) → ingested (WebSocket echo)
 *   hazards     room hazard levels decided by the Decision Engine
 *   log         MQTT messages + Decision Engine events (newest first)
 */
import { create } from 'zustand'
import { CONFIG } from '../config'
import { baselineValues, SENSOR_BY_ID } from '../data/sensorRegistry'

const LOG_LIMIT = 250
let logSeq = 0

export const useSimStore = create((set, get) => ({
  // ── Sensor values ────────────────────────────────────────────────────────
  values: baselineValues(),
  setValue: (sensorId, field, value) =>
    set((s) => ({ values: { ...s.values, [sensorId]: { ...s.values[sensorId], [field]: value } } })),
  resetSensors: (sensorIds) =>
    set((s) => {
      const values = { ...s.values }
      for (const id of sensorIds) values[id] = { ...SENSOR_BY_ID[id].baseline }
      return { values }
    }),

  // ── Selection / view ─────────────────────────────────────────────────────
  selectedRoomId: null,
  selectedSensorId: null,
  hoveredSensorId: null,
  hoveredRoomId: null,
  focusRequest: null, // { kind: 'room'|'sensor'|'overview'|'top', id, nonce }
  wallMode: 'full', // full | cutaway
  showLabels: true,
  showEffects: true,
  selectRoom: (roomId, { focus = true } = {}) =>
    set({ selectedRoomId: roomId, selectedSensorId: null,
          ...(focus && roomId ? { focusRequest: { kind: 'room', id: roomId, nonce: Date.now() } } : {}) }),
  selectSensor: (sensorId, { focus = false } = {}) =>
    set({ selectedSensorId: sensorId, selectedRoomId: SENSOR_BY_ID[sensorId]?.room_id ?? null,
          ...(focus ? { focusRequest: { kind: 'sensor', id: sensorId, nonce: Date.now() } } : {}) }),
  clearSelection: () => set({ selectedRoomId: null, selectedSensorId: null }),
  setHoveredSensor: (id) => set({ hoveredSensorId: id }),
  setHoveredRoom: (id) => set({ hoveredRoomId: id }),
  requestView: (kind) => set({ focusRequest: { kind, nonce: Date.now() } }),
  setWallMode: (wallMode) => set({ wallMode }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleEffects: () => set((s) => ({ showEffects: !s.showEffects })),

  // ── MQTT ─────────────────────────────────────────────────────────────────
  mqttUrl: CONFIG.mqtt.url,
  mqttStatus: 'idle', // idle | connecting | connected | reconnecting | offline | error
  mqttError: null,
  clientId: null,
  qos: CONFIG.mqtt.qos,
  periodicSeconds: CONFIG.periodicSeconds,
  counters: { published: 0, acked: 0, ingested: 0, failed: 0 },
  delivery: {}, // sensorId → { messageId, sentAt, trigger, brokerAck, ingestedAt, error }
  setMqttUrl: (mqttUrl) => set({ mqttUrl }),
  setMqttStatus: (mqttStatus, mqttError = null) => set({ mqttStatus, mqttError }),
  setClientId: (clientId) => set({ clientId }),
  setQos: (qos) => set({ qos }),
  setPeriodicSeconds: (periodicSeconds) => set({ periodicSeconds }),

  /**
   * Apply a burst of delivery updates in ONE state change (the periodic report
   * sends every sensor at once). Update types:
   *   { type: 'sent', sensorId, messageId, trigger, at }
   *   { type: 'ack', sensorId, messageId, error? }       broker PUBACK (QoS 1)
   *   { type: 'ingested', sensorId, messageId, at }      backend stored + forwarded it
   */
  applyDelivery: (updates) =>
    set((s) => {
      const delivery = { ...s.delivery }
      const counters = { ...s.counters }
      const acked = new Map()
      const ingested = new Set()
      for (const u of updates) {
        const d = delivery[u.sensorId]
        if (u.type === 'sent') {
          counters.published++
          delivery[u.sensorId] = { messageId: u.messageId, sentAt: u.at, trigger: u.trigger,
                                   brokerAck: false, ingestedAt: null, error: null }
        } else if (u.type === 'ack') {
          if (u.error) counters.failed++; else counters.acked++
          acked.set(u.messageId, u.error || null)
          if (d && d.messageId === u.messageId) delivery[u.sensorId] = { ...d, brokerAck: !u.error, error: u.error || null }
        } else if (u.type === 'ingested') {
          counters.ingested++
          ingested.add(u.messageId)
          if (d && d.messageId === u.messageId) delivery[u.sensorId] = { ...d, ingestedAt: u.at }
        }
      }
      let log = s.log
      if (acked.size || ingested.size) {
        log = log.map((e) => {
          if (e.messageId && (acked.has(e.messageId) || ingested.has(e.messageId))) {
            const err = acked.get(e.messageId)
            return { ...e,
                     ...(acked.has(e.messageId) ? { brokerAck: !err, error: err } : {}),
                     ...(ingested.has(e.messageId) ? { ingested: true } : {}) }
          }
          if (e.messageIds) {
            let a = 0, i = 0
            for (const id of e.messageIds) { if (acked.has(id) && !acked.get(id)) a++; if (ingested.has(id)) i++ }
            if (a || i) return { ...e, ackCount: (e.ackCount || 0) + a, ingestedCount: (e.ingestedCount || 0) + i }
          }
          return e
        })
      }
      return { delivery, counters, log }
    }),

  // ── Decision Engine feed (WebSocket /ws/v1/live) ─────────────────────────
  feedStatus: 'idle', // idle | connecting | live | offline
  hazards: {}, // roomId → { level, previous, at }
  apiDemoData: false,
  setFeedStatus: (feedStatus) => set({ feedStatus }),
  setHazards: (hazards, apiDemoData = false) => set({ hazards, apiDemoData }),
  setHazard: (roomId, level, previous) =>
    set((s) => ({ hazards: { ...s.hazards, [roomId]: { level, previous, at: Date.now() } } })),

  // ── Log ──────────────────────────────────────────────────────────────────
  log: [],
  addLog: (entry) =>
    set((s) => ({ log: [{ id: ++logSeq, at: Date.now(), ...entry }, ...s.log].slice(0, LOG_LIMIT) })),
  clearLog: () => set({ log: [] }),
}))

export const getSim = () => useSimStore.getState()

// ── Batched delivery updates (flushed at most every 80 ms) ──────────────────
let pending = []
let flushTimer = null
export function queueDelivery(update) {
  pending.push(update)
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      const batch = pending
      pending = []
      flushTimer = null
      useSimStore.getState().applyDelivery(batch)
    }, 80)
  }
}
