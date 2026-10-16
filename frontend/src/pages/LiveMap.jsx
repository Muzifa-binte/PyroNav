import React, { useEffect, useState } from 'react'
import BuildingHeatmap from '../components/BuildingHeatmap'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import RoomAnalysisPanel from '../components/RoomAnalysisPanel'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

export default function LiveMap() {
  const [building, setBuilding] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [b, r] = await Promise.all([
          api.getBuilding(), api.getRooms(),
        ])
        setBuilding(b)
        setRooms(r.rooms || [])
        
        // Load alerts
        try {
          const alertsData = await api.getNotifications({ status: 'ACTIVE' })
          setAlerts(alertsData.notifications || [])
        } catch (e) {
          console.warn('Failed to load alerts:', e)
        }
      } catch {
        setIsDemoMode(true)
        setRooms([
          { room_id: 'main_lobby',        name: 'Main Lobby & Reception',    current_hazard_level: 'NORMAL' },
          { room_id: 'icu',               name: 'ICU (4 Beds)',              current_hazard_level: 'NORMAL' },
          { room_id: 'isolation_room',    name: 'Isolation Room',            current_hazard_level: 'NORMAL' },
          { room_id: 'patient_room',      name: 'Patient Room (2 Beds)',     current_hazard_level: 'NORMAL' },
          { room_id: 'operation_theater', name: 'Operating Theatre (OT)',    current_hazard_level: 'NORMAL' },
          { room_id: 'waiting_area',      name: 'Waiting Area',              current_hazard_level: 'NORMAL' },
          { room_id: 'pharmacy',          name: 'Pharmacy',                  current_hazard_level: 'NORMAL' },
          { room_id: 'general_ward',      name: 'General Ward (6 Beds)',     current_hazard_level: 'NORMAL' },
          { room_id: 'emergency_dept',    name: 'Emergency Department',      current_hazard_level: 'NORMAL' },
          { room_id: 'radiology',         name: 'Radiology (X-Ray)',         current_hazard_level: 'NORMAL' },
          { room_id: 'lab',               name: 'Lab',                       current_hazard_level: 'NORMAL' },
          { room_id: 'cafeteria',         name: 'Cafeteria',                 current_hazard_level: 'NORMAL' },
          { room_id: 'administration',    name: 'Administration',            current_hazard_level: 'NORMAL' },
          { room_id: 'records',           name: 'Records',                   current_hazard_level: 'NORMAL' },
          { room_id: 'maternity_ward',    name: 'Maternity Ward (4 Beds)',   current_hazard_level: 'NORMAL' },
          { room_id: 'blood_bank',        name: 'Blood Bank',                current_hazard_level: 'NORMAL' },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handleRoomStatus = (e) => {
      const data = e.detail?.data ?? e.detail ?? {}
      const { room_id, hazard_level, current_hazard_level } = data
      const level = hazard_level || current_hazard_level
      if (!room_id || !level) return
      setRooms(prev => prev.map(r =>
        r.room_id === room_id ? { ...r, current_hazard_level: level } : r
      ))
      setLastUpdate(new Date().toISOString())
    }
    const handleNotification = (e) => {
      const notification = e.detail?.data ?? e.detail
      if (notification) {
        setAlerts(prev => [notification, ...prev].slice(0, 10))
      }
    }
    wsEventBus.addEventListener('room_status_changed', handleRoomStatus)
    wsEventBus.addEventListener('notification_created', handleNotification)
    return () => {
      wsEventBus.removeEventListener('room_status_changed', handleRoomStatus)
      wsEventBus.removeEventListener('notification_created', handleNotification)
    }
  }, [])

  const roomMap = Object.fromEntries((rooms || []).map(r => [r.room_id, r]))
  const selectedRoomData = selected ? roomMap[selected] : null

  return (
    <div className="page-content" style={{ 
      padding: '20px 24px', 
      maxWidth: '100%',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
      minHeight: '100vh',
    }}>
      
      {/* Header with gradient accent */}
      <div style={{ 
        marginBottom: 24,
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
        borderRadius: 16,
        border: '1px solid rgba(59, 130, 246, 0.15)',
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
          }}>
            🗺️
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1E293B 0%, #3B82F6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              marginBottom: 4,
            }}>
              Live Floor Map
            </h1>
            <p style={{
              color: 'var(--ink-600)',
              fontSize: 14,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
                display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              Real-time 2D situational awareness
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 20 }}>
        
        {/* Left: Map */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="glass-card" style={{
            padding: 24,
            position: 'relative',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '2px solid rgba(148, 163, 184, 0.15)',
            boxShadow: '0 10px 40px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {/* Map header badge */}
            <div style={{
              position: 'absolute',
              top: 16,
              left: 24,
              zIndex: 10,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              padding: '8px 16px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}>
              <span style={{ fontSize: 18 }}>🏥</span>
              <span style={{
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}>
                HOSPITAL GROUND FLOOR
              </span>
            </div>

            {/* Loading state or map */}
            {loading ? (
              <LoadingSkeleton type="map" height={600} />
            ) : (
              <div style={{
                background: '#F8FAFC',
                borderRadius: 12,
                padding: 16,
                boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.1) inset',
              }}>
                <BuildingHeatmap
                  building={building}
                  rooms={rooms}
                  route={null}
                  onRoomSelect={setSelected}
                  selectedRoom={selected}
                  showRoute={false}
                  style={{ height: 600 }}
                />
              </div>
            )}

            {/* Map footer stats */}
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'rgba(241, 245, 249, 0.6)',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 2 }}>
                    Total Rooms
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>
                    {rooms.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 2 }}>
                    Critical
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#EF4444' }}>
                    {rooms.filter(r => r.current_hazard_level === 'CRITICAL').length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 2 }}>
                    Normal
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>
                    {rooms.filter(r => r.current_hazard_level === 'NORMAL').length}
                  </div>
                </div>
              </div>
              <div style={{
                padding: '6px 12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10B981',
                  animation: 'pulse 2s infinite',
                }} />
                LIVE
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Active Alerts */}
          {alerts.length > 0 && (
            <div className="glass-card" style={{ 
              padding: 18,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)',
              border: '2px solid rgba(239, 68, 68, 0.2)',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  }}>
                    🚨
                  </div>
                  <div>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--ink-900)',
                      margin: 0,
                    }}>
                      Active Alerts
                    </h3>
                    <div style={{
                      fontSize: 11,
                      color: 'var(--ink-500)',
                      marginTop: 2,
                    }}>
                      {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} require attention
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflowY: 'auto' }}>
                {alerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} style={{
                    padding: 14,
                    background: alert.severity === 'CRITICAL' 
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.08) 100%)',
                    border: `2px solid ${alert.severity === 'CRITICAL' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      fontSize: 28,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    }}>
                      {alert.severity === 'CRITICAL' ? '🔥' : '⚠️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 13, 
                        fontWeight: 700, 
                        color: alert.severity === 'CRITICAL' ? '#DC2626' : '#D97706', 
                        marginBottom: 4,
                        letterSpacing: '0.02em',
                      }}>
                        {alert.severity === 'CRITICAL' ? '🔴 CRITICAL: Fire Detected' : '🟡 WARNING: High Temperature'}
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        color: 'var(--ink-700)', 
                        marginBottom: 6,
                        fontWeight: 600,
                      }}>
                        📍 {alert.room_id?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Room'}
                      </div>
                      <div style={{ 
                        fontSize: 10, 
                        color: 'var(--ink-500)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        🕐 {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Room Detail */}
          {selectedRoomData && (
            <RoomAnalysisPanel
              roomId={selected}
              roomData={selectedRoomData}
              onClose={() => setSelected(null)}
            />
          )}

          {/* Legend */}
          <div className="glass-card" style={{ 
            padding: 18,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '2px solid rgba(148, 163, 184, 0.15)',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                boxShadow: '0 4px 12px rgba(100, 116, 139, 0.3)',
              }}>
                📊
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--ink-900)',
                margin: 0,
              }}>
                Legend
              </h3>
            </div>

            {/* Risk Level */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: 'var(--ink-600)', 
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}>
                🎯 RISK LEVEL
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { color: '#10B981', label: 'Normal (Safe)', icon: '✅' },
                  { color: '#FBBF24', label: 'Caution', icon: '⚡' },
                  { color: '#F59E0B', label: 'High Risk', icon: '⚠️' },
                  { color: '#EF4444', label: 'Critical', icon: '🔥' },
                  { color: '#94A3B8', label: 'No Data', icon: '❓' },
                ].map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10,
                    padding: '6px 8px',
                    background: `${item.color}08`,
                    borderRadius: 6,
                    border: `1px solid ${item.color}30`,
                    transition: 'all 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${item.color}15`
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${item.color}08`
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}>
                    <div style={{
                      width: 36,
                      height: 24,
                      background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}CC 100%)`,
                      borderRadius: 4,
                      boxShadow: `0 2px 8px ${item.color}40`,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-900)', flex: 1 }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sensor Types */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: 'var(--ink-600)', 
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}>
                🔬 SENSOR TYPES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🌡️', label: 'Temperature Sensor', color: '#FF6A1A', gradient: 'linear-gradient(135deg, #FF6A1A 0%, #FF8C42 100%)' },
                  { icon: '💨', label: 'Smoke Sensor', color: '#666', gradient: 'linear-gradient(135deg, #666 0%, #888 100%)' },
                  { icon: '⚡', label: 'Electrical Sensor', color: '#FFB800', gradient: 'linear-gradient(135deg, #FFB800 0%, #FFC933 100%)' },
                  { icon: '🔥', label: 'Flame Sensor', color: '#9333EA', gradient: 'linear-gradient(135deg, #9333EA 0%, #A855F7 100%)' },
                ].map((sensor, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10,
                    padding: '6px 8px',
                    background: `${sensor.color}08`,
                    borderRadius: 6,
                    border: `1px solid ${sensor.color}30`,
                    transition: 'all 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${sensor.color}15`
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${sensor.color}08`
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      background: sensor.gradient,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      boxShadow: `0 4px 12px ${sensor.color}40`,
                    }}>
                      {sensor.icon}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-700)', fontWeight: 600 }}>
                      {sensor.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Intensity */}
            <div>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: 'var(--ink-600)', 
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}>
                🔥 HEATMAP INTENSITY
              </div>
              <div style={{
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(90deg, #60A5FA 0%, #FBBF24 50%, #EF4444 100%)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(255, 255, 255, 0.5) inset',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingX: 4 }}>
                <span style={{ 
                  fontSize: 10, 
                  color: 'var(--ink-500)', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  ❄️ Low
                </span>
                <span style={{ 
                  fontSize: 10, 
                  color: 'var(--ink-500)', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  High 🔥
                </span>
              </div>
              <div style={{ 
                fontSize: 10, 
                color: 'var(--ink-400)', 
                marginTop: 8, 
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '6px 8px',
                background: 'rgba(148, 163, 184, 0.08)',
                borderRadius: 6,
              }}>
                💚 No active heat sources detected
              </div>
            </div>
          </div>

          {/* Demo Controls */}
          {isDemoMode && (
            <div className="glass-card" style={{ 
              padding: 18, 
              background: 'linear-gradient(135deg, rgba(255,106,26,0.08) 0%, rgba(255,106,26,0.12) 100%)',
              border: '2px solid rgba(255,106,26,0.25)',
              boxShadow: '0 8px 32px rgba(255,106,26,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  padding: '6px 14px',
                  background: 'linear-gradient(135deg, #FF6A1A 0%, #FF8C42 100%)',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 4px 12px rgba(255,106,26,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  🔬 DEMO MODE
                </div>
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--ink-600)',
                marginBottom: 12,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 6,
                border: '1px solid rgba(255,106,26,0.2)',
              }}>
                Backend unavailable. Using simulated data for demonstration.
              </div>
              <button
                onClick={() => {
                  setRooms(prev => prev.map(r =>
                    r.room_id === 'operation_theater' ? { ...r, current_hazard_level: 'CRITICAL' } : r
                  ))
                  setAlerts([{
                    notification_id: 'demo-1',
                    severity: 'CRITICAL',
                    room_id: 'operation_theater',
                    message: 'Fire detected in Operating Theatre',
                    created_at: new Date().toISOString(),
                  }])
                  setLastUpdate(new Date().toISOString())
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 10,
                  boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(239,68,68,0.45)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(239,68,68,0.35)'
                }}
              >
                <span style={{ fontSize: 18 }}>🔥</span>
                Simulate Fire Alert
              </button>
              <button
                onClick={() => {
                  setRooms(prev => prev.map(r => ({ ...r, current_hazard_level: 'NORMAL' })))
                  setAlerts([])
                  setLastUpdate(new Date().toISOString())
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
                  color: 'var(--ink-700)',
                  border: '1.5px solid var(--ink-200)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)'
                  e.target.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                <span style={{ fontSize: 16 }}>🔄</span>
                Reset to Normal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .glass-card {
          animation: fadeInUp 0.5s ease-out;
        }
        
        /* Smooth scrollbar styling */
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        *::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 4px;
        }
        
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #94A3B8 0%, #64748B 100%);
          border-radius: 4px;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #64748B 0%, #475569 100%);
        }
      `}</style>
    </div>
  )
}
