import React, { useEffect, useState } from 'react'
import StatusPill from './StatusPill'
import * as api from '../services/api'

/**
 * RoomAnalysisPanel - Detailed sensor analysis for selected room
 * Displays real-time sensor readings with trends and status
 */
export default function RoomAnalysisPanel({ roomId, roomData, onClose }) {
  const [sensorData, setSensorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!roomId) return
    
    async function fetchRoomDetails() {
      setLoading(true)
      try {
        const data = await api.getRoomDetails(roomId)
        setSensorData(data)
        
        // Fetch sensor history for trends
        try {
          const readings = await api.getSensorReadings({ room_id: roomId, limit: 10 })
          setHistory(readings.readings || [])
        } catch (e) {
          console.warn('Failed to load sensor history:', e)
        }
      } catch (error) {
        console.error('Failed to fetch room details:', error)
        // Use fallback mock data
        setSensorData({
          room_id: roomId,
          latest_readings: {},
          data_quality: 'FRESH'
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchRoomDetails()
    // Refresh every 3 seconds
    const interval = setInterval(fetchRoomDetails, 3000)
    return () => clearInterval(interval)
  }, [roomId])

  if (!roomId || !roomData) return null

  // Get time since last update
  const getTimeSince = (timestamp) => {
    if (!timestamp) return 'Never'
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 10) return `${seconds} sec ago`
    if (seconds < 60) return `${seconds} sec ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
    return `${Math.floor(seconds / 3600)} hr ago`
  }

  // Calculate trend from history
  const calculateTrend = (sensorType) => {
    if (!history || history.length < 2) return 'stable'
    
    const recentReadings = history
      .filter(r => r.values?.[sensorType] !== undefined)
      .slice(0, 5)
      .map(r => r.values[sensorType])
    
    if (recentReadings.length < 2) return 'stable'
    
    const latest = recentReadings[0]
    const previous = recentReadings[recentReadings.length - 1]
    const change = ((latest - previous) / previous) * 100
    
    if (change > 5) return 'rising'
    if (change < -5) return 'falling'
    return 'stable'
  }

  // Get sensor readings
  const readings = sensorData?.latest_readings || {}
  const temperature = readings.temperature
  const smoke = readings.smoke
  const current = readings.current
  const co = readings.co

  // Determine sensor status
  const getSensorStatus = () => {
    const dataQuality = sensorData?.data_quality
    if (dataQuality === 'STALE') return 'Stale'
    if (dataQuality === 'NO_DATA') return 'No Data'
    return 'Online'
  }

  const sensorStatus = getSensorStatus()
  const isOnline = sensorStatus === 'Online'

  // Get icon for room type
  const getRoomIcon = () => {
    const name = roomData.name?.toLowerCase() || ''
    if (name.includes('icu')) return '🏥'
    if (name.includes('isolation')) return '🚪'
    if (name.includes('patient')) return '🛏️'
    if (name.includes('operation') || name.includes('ot')) return '⚕️'
    if (name.includes('emergency')) return '🚨'
    if (name.includes('ward')) return '🛏️'
    if (name.includes('lab')) return '🔬'
    if (name.includes('pharmacy')) return '💊'
    if (name.includes('radiology') || name.includes('x-ray')) return '🩻'
    if (name.includes('cafeteria')) return '🍽️'
    if (name.includes('lobby')) return '🏛️'
    if (name.includes('waiting')) return '💺'
    return '🏥'
  }

  return (
    <div className="glass-card" style={{
      padding: 20,
      animation: 'slideInRight 0.3s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '2px solid var(--ink-100)',
      }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ink-900)',
            margin: 0,
            marginBottom: 4,
          }}>
            Selected Room
          </h3>
          <p style={{
            fontSize: 12,
            color: 'var(--ink-500)',
            margin: 0,
          }}>
            Real-time sensor analysis
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: 'var(--ink-400)',
            lineHeight: 1,
            padding: 0,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'var(--ink-100)'
            e.target.style.color = 'var(--ink-900)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none'
            e.target.style.color = 'var(--ink-400)'
          }}
        >
          ×
        </button>
      </div>

      {/* Room Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: 14,
        background: 'var(--bg-raised)',
        borderRadius: 10,
        boxShadow: 'var(--neo-inset)',
      }}>
        <div style={{
          fontSize: 32,
          background: 'linear-gradient(135deg, #60A5FA, #3B82F6)',
          borderRadius: 12,
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        }}>
          {getRoomIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--ink-900)',
            marginBottom: 6,
          }}>
            {roomData.name}
          </div>
          <StatusPill level={roomData.current_hazard_level || 'NORMAL'} size="md" />
        </div>
      </div>

      {/* Sensor Readings */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink-600)',
          letterSpacing: '0.05em',
          marginBottom: 12,
        }}>
          SENSOR READINGS
        </div>

        {/* Temperature */}
        {temperature && (
          <SensorReading
            icon="🌡️"
            label="Temperature"
            value={`${temperature.value}°C`}
            trend={calculateTrend('temperature')}
            iconColor="#EF4444"
            timestamp={temperature.timestamp}
            status={temperature.value >= 60 ? 'critical' : temperature.value >= 40 ? 'warning' : 'normal'}
          />
        )}

        {/* Smoke Level */}
        {smoke && (
          <SensorReading
            icon="💨"
            label="Smoke Level"
            value={smoke.value >= 100 ? 'High' : smoke.value >= 50 ? 'Medium' : 'Low'}
            trend={calculateTrend('smoke')}
            iconColor="#64748B"
            timestamp={smoke.timestamp}
            status={smoke.value >= 100 ? 'critical' : smoke.value >= 50 ? 'warning' : 'normal'}
          />
        )}

        {/* Electrical Load */}
        {current && (
          <SensorReading
            icon="⚡"
            label="Electrical Load"
            value="Normal"
            trend={calculateTrend('current')}
            iconColor="#F59E0B"
            timestamp={current.timestamp}
            status="normal"
          />
        )}

        {/* CO Level (if available) */}
        {co && (
          <SensorReading
            icon="☁️"
            label="CO Level"
            value={`${co.value} ppm`}
            trend={calculateTrend('co')}
            iconColor="#8B5CF6"
            timestamp={co.timestamp}
            status={co.value >= 50 ? 'critical' : co.value >= 30 ? 'warning' : 'normal'}
          />
        )}

        {/* No sensors message */}
        {!temperature && !smoke && !current && !co && (
          <div style={{
            padding: 16,
            background: 'var(--ink-50)',
            borderRadius: 8,
            textAlign: 'center',
            color: 'var(--ink-500)',
            fontSize: 13,
          }}>
            No sensor data available
          </div>
        )}
      </div>

      {/* Sensor Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
        border: `1.5px solid ${isOnline ? '#10B981' : '#EF4444'}`,
        borderRadius: 8,
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 24,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          📡
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ink-600)',
            marginBottom: 2,
          }}>
            Sensor Status
          </div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: isOnline ? '#10B981' : '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isOnline ? '#10B981' : '#EF4444',
              display: 'inline-block',
              animation: isOnline ? 'pulse 2s infinite' : 'none',
            }} />
            {sensorStatus}
          </div>
        </div>
      </div>

      {/* Last Update */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        background: 'var(--bg-raised)',
        borderRadius: 8,
        boxShadow: 'var(--neo-inset)',
      }}>
        <div style={{ fontSize: 20 }}>🕐</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ink-600)',
            marginBottom: 2,
          }}>
            Last Update
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink-900)',
          }}>
            {getTimeSince(
              temperature?.timestamp || 
              smoke?.timestamp || 
              current?.timestamp || 
              new Date().toISOString()
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
}

// ── Sensor Reading Component ────────────────────────────────────────────────
function SensorReading({ icon, label, value, trend, iconColor, timestamp, status }) {
  const getTrendIcon = () => {
    if (trend === 'rising') return '↑'
    if (trend === 'falling') return '↓'
    return '→'
  }

  const getTrendColor = () => {
    if (trend === 'rising') return '#EF4444'
    if (trend === 'falling') return '#10B981'
    return '#64748B'
  }

  const getSparkline = () => {
    // Simple trending line based on status
    if (trend === 'rising') {
      return (
        <svg width="60" height="24" style={{ marginLeft: 'auto' }}>
          <polyline
            points="0,20 15,18 30,14 45,10 60,4"
            fill="none"
            stroke={getTrendColor()}
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      )
    } else if (trend === 'falling') {
      return (
        <svg width="60" height="24" style={{ marginLeft: 'auto' }}>
          <polyline
            points="0,4 15,8 30,12 45,16 60,20"
            fill="none"
            stroke={getTrendColor()}
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      )
    } else {
      return (
        <svg width="60" height="24" style={{ marginLeft: 'auto' }}>
          <line
            x1="0" y1="12" x2="60" y2="12"
            stroke={getTrendColor()}
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      )
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      marginBottom: 10,
      background: 'var(--bg-raised)',
      borderRadius: 8,
      border: status === 'critical' ? '1.5px solid #EF4444' : 
              status === 'warning' ? '1.5px solid #F59E0B' : 
              '1px solid var(--ink-100)',
      boxShadow: 'var(--neo-inset)',
    }}>
      {/* Icon */}
      <div style={{
        fontSize: 24,
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: iconColor,
        borderRadius: 8,
        filter: 'saturate(0.7)',
      }}>
        {icon}
      </div>

      {/* Label & Value */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink-600)',
          marginBottom: 3,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: status === 'critical' ? '#EF4444' : 
                 status === 'warning' ? '#F59E0B' : 
                 'var(--ink-900)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {value}
          <span style={{
            fontSize: 14,
            color: getTrendColor(),
            fontWeight: 800,
          }}>
            {getTrendIcon()}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      {getSparkline()}
    </div>
  )
}
