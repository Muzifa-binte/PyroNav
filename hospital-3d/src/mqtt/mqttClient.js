/**
 * Thin wrapper around mqtt.js (MQTT over WebSockets → Mosquitto listener 9001).
 *
 * publish() resolves when the broker acknowledges the message (PUBACK, QoS 1),
 * so the UI can show "broker ✓" per reading. Reconnects every 2 s by itself.
 * A retained online/offline status (MQTT last will) is published on
 * pyronav/v1/clients/<client_id>/status for monitoring tools; the backend
 * ignores it.
 */
import mqtt from 'mqtt'
import { CONFIG } from '../config'

export class MqttLink {
  constructor(onStatus) {
    this.onStatus = onStatus
    this.client = null
    this.clientId = null
  }

  connect(url, { username, password } = {}) {
    this.disconnect()
    const clientId = `pyronav-hospital-3d-${Math.random().toString(16).slice(2, 8)}`
    const statusTopic = CONFIG.statusTopicTemplate.replace('{client_id}', clientId)
    this.clientId = clientId
    this.onStatus('connecting', null, clientId)

    let client
    try {
      client = mqtt.connect(url, {
        clientId,
        username,
        password,
        protocolVersion: 4, // MQTT 3.1.1 — what paho and Mosquitto default to
        clean: true,
        keepalive: 30,
        reconnectPeriod: 2000,
        connectTimeout: 6000,
        will: {
          topic: statusTopic,
          payload: JSON.stringify({ status: 'offline', client_id: clientId }),
          qos: 1,
          retain: true,
        },
      })
    } catch (err) {
      this.onStatus('error', err.message, clientId)
      return
    }
    this.client = client

    client.on('connect', () => {
      this.onStatus('connected', null, clientId)
      client.publish(statusTopic, JSON.stringify({ status: 'online', client_id: clientId, at: new Date().toISOString() }),
        { qos: 1, retain: true })
    })
    client.on('reconnect', () => this.onStatus('reconnecting', null, clientId))
    client.on('offline', () => this.onStatus('offline', null, clientId))
    client.on('error', (err) => this.onStatus('error', err?.message || String(err), clientId))
    client.on('close', () => {
      if (this.client === client && !client.connected) this.onStatus('offline', null, clientId)
    })
  }

  get connected() {
    return !!this.client?.connected
  }

  publish(topic, payload, qos = 1) {
    return new Promise((resolve, reject) => {
      if (!this.client) return reject(new Error('not connected'))
      this.client.publish(topic, payload, { qos, retain: false }, (err) => (err ? reject(err) : resolve()))
    })
  }

  disconnect() {
    const client = this.client
    if (!client) return
    this.client = null
    if (client.connected && this.clientId) {
      const statusTopic = CONFIG.statusTopicTemplate.replace('{client_id}', this.clientId)
      client.publish(statusTopic, JSON.stringify({ status: 'offline', client_id: this.clientId }), { qos: 0, retain: true })
    }
    client.end(true)
  }
}
