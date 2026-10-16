/**
 * useWebSocket — connects to PyroNav's live WebSocket endpoint via FastAPI.
 * Member 4 has implemented the WebSocket relay at /ws/v1/live that bridges
 * MQTT messages from Mosquitto to browser clients.
 * Returns { connectionState, lastUpdate, lastEvent } and exposes the
 * event via a global EventTarget so any component can subscribe without
 * prop-drilling.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

// Global event bus for WS messages — avoids prop drilling
export const wsEventBus = new EventTarget()

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const hostname = window.location.hostname
  // Connect to FastAPI WebSocket relay
  return `${protocol}://${hostname}:8000/ws/v1/live?client_id=frontend`
}

export function useWebSocket() {
  const [connectionState, setConnectionState] = useState('unknown')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    try {
      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        console.log('✅ WebSocket connected to FastAPI at ws://localhost:8000/ws/v1/live')
        setConnectionState('connected')
        setLastUpdate(new Date().toISOString())
      }

      ws.onmessage = (ev) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(ev.data)
          const timestamp = msg.timestamp || new Date().toISOString()
          setLastUpdate(timestamp)
          setLastEvent(msg)
          
          const eventType = msg.event_type || 'message'
          
          // Dispatch to subscribers
          wsEventBus.dispatchEvent(
            Object.assign(new Event(eventType), { detail: msg })
          )
          
          console.log('📨 WebSocket message received:', { eventType, msg })
        } catch (error) {
          console.warn('⚠️ Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        if (!mountedRef.current) return
        console.error('❌ WebSocket error:', error)
        setConnectionState('disconnected')
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        console.log('🔌 WebSocket connection closed')
        setConnectionState('disconnected')
        // Reconnect after 3 seconds
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
      setConnectionState('disconnected')
      reconnectTimer.current = setTimeout(connect, 5000)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connectionState, lastUpdate, lastEvent }
}
