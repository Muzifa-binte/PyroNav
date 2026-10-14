/**
 * useWebSocket — connects to PyroNav's live WebSocket endpoint.
 * Returns { connectionState, lastUpdate, lastEvent } and exposes the
 * event via a global EventTarget so any component can subscribe without
 * prop-drilling.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws/v1/live?client_id=frontend`

// Global event bus for WS messages — avoids prop drilling
export const wsEventBus = new EventTarget()

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
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnectionState('connected')
        setLastUpdate(new Date().toISOString())
      }

      ws.onmessage = (ev) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(ev.data)
          setLastUpdate(msg.timestamp || new Date().toISOString())
          setLastEvent(msg)
          // Dispatch to subscribers
          wsEventBus.dispatchEvent(
            Object.assign(new Event(msg.event_type || 'message'), { detail: msg })
          )
        } catch {
          // non-JSON frame — ignore
        }
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setConnectionState('disconnected')
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnectionState('disconnected')
        // Reconnect after 3 s
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    } catch {
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
