/**
 * PyroNav API service — thin wrapper around fetch.
 * All calls go through Vite's proxy (/api → localhost:8000).
 */

const BASE = '/api/v1'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.detail || err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Health ─────────────────────────────────────────────────
export const getHealth = () => request('/health')

// ── Building & rooms ───────────────────────────────────────
export const getBuilding = () => request('/building')
export const getRooms    = () => request('/rooms')
export const getRoom     = (id) => request(`/rooms/${id}`)
export const getRoomDetails = (id) => request(`/rooms/${id}`)

// ── Sensors ────────────────────────────────────────────────
export const getSensors        = () => request('/sensors')
export const getSensor         = (id) => request(`/sensors/${id}`)
export const getSensorReadings = (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.sensor_id) queryParams.append('sensor_id', params.sensor_id)
  if (params.room_id) queryParams.append('room_id', params.room_id)
  if (params.limit) queryParams.append('limit', params.limit)
  return request(`/sensors/readings?${queryParams.toString()}`)
}

// ── Routes ─────────────────────────────────────────────────
export const calculateRoute = (originRoomId, algorithm = 'dijkstra', targetExitId = null) =>
  request('/routes/calculate', {
    method: 'POST',
    body: JSON.stringify({ origin_room_id: originRoomId, algorithm, target_exit_id: targetExitId }),
  })

/**
 * Calculate BOTH Dijkstra and BFS routes simultaneously for comparison.
 * Returns { dijkstra: RouteResult, bfs: RouteResult, origin_room_id, calculated_at }
 */
export const compareRoutes = (originRoomId, targetExitId = null) =>
  request('/routes/compare', {
    method: 'POST',
    body: JSON.stringify({ origin_room_id: originRoomId, target_exit_id: targetExitId }),
  })

export const getCurrentRoute = () => request('/routes/current')
export const getExits        = () => request('/exits')

// ── Alerts ─────────────────────────────────────────────────
export const getAlerts          = (status = 'ACTIVE') => request(`/alerts?status=${status}`)
export const getSecurityEvents  = (limit = 50) => request(`/security/events?limit=${limit}`)
export const getNotifications   = (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.status) queryParams.append('status', params.status)
  if (params.room_id) queryParams.append('room_id', params.room_id)
  if (params.since) queryParams.append('since', params.since)
  const queryString = queryParams.toString()
  return request(`/notifications${queryString ? '?' + queryString : ''}`)
}

// ── System ─────────────────────────────────────────────────
export const getSystemStats     = () => request('/system/stats')
export const getWebSocketStats  = () => request('/system/websocket/stats')
