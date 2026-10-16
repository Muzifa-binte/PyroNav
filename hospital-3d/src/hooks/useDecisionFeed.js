/**
 * Live feedback from the backend (Member 4's WebSocket, /ws/v1/live):
 *
 *   sensor_reading_updated → our reading was validated, stored and forwarded to
 *                            the Decision Engine ("ingested ✓" per message)
 *   room_status_changed    → the Decision Engine's verdict for a room (room glow)
 *   hazard_event_* / notification_created → shown in the message log
 *
 * Initial room states come from GET /api/v1/rooms. Read-only: this app never
 * writes to the API — readings go out over MQTT only.
 */
import { useEffect } from 'react'
import { CONFIG } from '../config'
import { publisher } from '../mqtt/publisher'
import { getSim, queueDelivery } from '../state/useSimStore'

const EVENTS = [
  'room_status_changed', 'sensor_reading_updated', 'hazard_event_created',
  'hazard_event_resolved', 'notification_created',
]

async function loadRoomStates() {
  try {
    const res = await fetch(`${CONFIG.api.base}/rooms`)
    if (!res.ok) return
    const body = await res.json()
    const hazards = {}
    for (const r of body.rooms || []) {
      hazards[r.room_id] = { level: r.current_hazard_level || 'UNKNOWN', previous: null, at: Date.now() }
    }
    getSim().setHazards(hazards, !!body.demo_data)
  } catch {
    /* API not running — the 3D app and MQTT publishing still work */
  }
}

function handle(msg) {
  const sim = getSim()
  const d = msg.data || {}
  switch (msg.event_type) {
    case 'sensor_reading_updated':
      if (d.message_id && publisher.isMine(d.message_id)) {
        queueDelivery({ type: 'ingested', sensorId: d.sensor_id, messageId: d.message_id, at: Date.now() })
      }
      break
    case 'room_status_changed':
      sim.setHazard(d.room_id, d.hazard_level, d.previous_level)
      sim.addLog({ kind: 'decision', eventType: msg.event_type, roomId: d.room_id,
                   level: d.hazard_level, previous: d.previous_level })
      break
    case 'hazard_event_created':
    case 'hazard_event_resolved':
    case 'notification_created':
      sim.addLog({ kind: 'decision', eventType: msg.event_type, roomId: d.room_id,
                   level: d.hazard_level || d.severity, text: d.message,
                   reasons: d.reason_codes })
      break
    default:
  }
}

export function useDecisionFeed() {
  useEffect(() => {
    let ws = null
    let timer = null
    let stopped = false

    const connect = () => {
      if (stopped) return
      getSim().setFeedStatus('connecting')
      const sep = CONFIG.api.ws.includes('?') ? '&' : '?'
      try {
        ws = new WebSocket(`${CONFIG.api.ws}${sep}client_id=hospital-3d&events=${EVENTS.join(',')}`)
      } catch {
        timer = setTimeout(connect, 4000)
        return
      }
      ws.onopen = () => {
        getSim().setFeedStatus('live')
        loadRoomStates()
      }
      ws.onmessage = (ev) => {
        try { handle(JSON.parse(ev.data)) } catch { /* ignore non-JSON frames */ }
      }
      ws.onclose = () => {
        if (stopped) return
        getSim().setFeedStatus('offline')
        timer = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      ws?.close()
    }
  }, [])
}
