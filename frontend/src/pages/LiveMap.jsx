import React, { useEffect, useState } from 'react'
import BuildingHeatmap from '../components/BuildingHeatmap'
import LoadingSkeleton from '../components/LoadingSkeleton'
import RoomAnalysisPanel from '../components/RoomAnalysisPanel'
import EmergencyBanner from '../components/EmergencyBanner'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

const DEMO_ROUTE = {
  route_id: 'demo-route-001',
  origin_node_id: 'main_lobby',
  exit_id: 'EXIT-NW',
  node_ids: ['main_lobby', 'waiting_area', 'pharmacy', 'icu', 'EXIT-NW'],
  status: 'ROUTE_FOUND',
  total_cost: 31.0,
  algorithm: 'dijkstra',
  hazard_state_snapshot: [],
  calculated_at: new Date().toISOString(),
}

// Mock sensor data for demo/testing - COMPREHENSIVE HAZARD SCENARIOS
// 40+ sensors with varied readings to test Decision Engine threshold combinations
const DEMO_SENSORS = [
  // ═══════════════════════════════════════════════════════════════════
  // ICU - CRITICAL HAZARD (High smoke + High temp = Fire detected!)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-ICU-01', room_id: 'icu', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 5000).toISOString(), value: 68, unit: 'degC' }, // HIGH TEMP
  { sensor_id: 'SMOKE-ICU-01', room_id: 'icu', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 6000).toISOString(), value: 120, unit: 'ppm' }, // CRITICAL SMOKE
  { sensor_id: 'ELEC-ICU-01', room_id: 'icu', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 8000).toISOString(), value: 15.5, unit: 'A' }, // HIGH CURRENT
  { sensor_id: 'CO-ICU-01', room_id: 'icu', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 7000).toISOString(), value: 45, unit: 'ppm' }, // Elevated CO
  
  // ═══════════════════════════════════════════════════════════════════
  // Operation Theater - HIGH RISK (Elevated smoke + Normal temp)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-OT-01', room_id: 'operation_theater', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 10000).toISOString(), value: 58, unit: 'degC' }, // Elevated
  { sensor_id: 'SMOKE-OT-01', room_id: 'operation_theater', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 12000).toISOString(), value: 85, unit: 'ppm' }, // HIGH SMOKE
  { sensor_id: 'FLAME-OT-01', room_id: 'operation_theater', type: 'flame', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 11000).toISOString(), value: 1, unit: 'bool' }, // FLAME DETECTED
  { sensor_id: 'ELEC-OT-01', room_id: 'operation_theater', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 9000).toISOString(), value: 8.2, unit: 'A' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Pharmacy - WARNING (Failed sensor + Moderate smoke)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-PHARM-01', room_id: 'pharmacy', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 15000).toISOString(), value: 28, unit: 'degC' },
  { sensor_id: 'SMOKE-PHARM-01', room_id: 'pharmacy', type: 'smoke_heat', status: 'FAILED', last_reading_at: new Date(Date.now() - 300000).toISOString(), value: null, unit: 'ppm' }, // FAILED - Can't detect hazard!
  { sensor_id: 'ELEC-PHARM-01', room_id: 'pharmacy', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 13000).toISOString(), value: 6.5, unit: 'A' },
  { sensor_id: 'CO-PHARM-01', room_id: 'pharmacy', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 14000).toISOString(), value: 55, unit: 'ppm' }, // WARNING LEVEL CO
  
  // ═══════════════════════════════════════════════════════════════════
  // Waiting Area - WARNING (Moderate smoke from nearby fire)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-WAIT-01', room_id: 'waiting_area', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 8000).toISOString(), value: 32, unit: 'degC' },
  { sensor_id: 'SMOKE-WAIT-01', room_id: 'waiting_area', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 9000).toISOString(), value: 62, unit: 'ppm' }, // WARNING SMOKE
  { sensor_id: 'CO-WAIT-01', room_id: 'waiting_area', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 10000).toISOString(), value: 38, unit: 'ppm' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Main Lobby - NORMAL (All readings safe)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-LOBBY-01', room_id: 'main_lobby', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 12000).toISOString(), value: 22.5, unit: 'degC' },
  { sensor_id: 'SMOKE-LOBBY-01', room_id: 'main_lobby', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 11000).toISOString(), value: 8, unit: 'ppm' },
  { sensor_id: 'CO-LOBBY-01', room_id: 'main_lobby', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 13000).toISOString(), value: 5, unit: 'ppm' },
  { sensor_id: 'ELEC-LOBBY-01', room_id: 'main_lobby', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 14000).toISOString(), value: 4.2, unit: 'A' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Emergency Dept - CRITICAL (Multiple sensors offline during emergency!)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-ED-01', room_id: 'emergency_dept', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 5000).toISOString(), value: 65, unit: 'degC' }, // CRITICAL TEMP
  { sensor_id: 'SMOKE-ED-01', room_id: 'emergency_dept', type: 'smoke_heat', status: 'OFFLINE', last_reading_at: new Date(Date.now() - 600000).toISOString(), value: null, unit: 'ppm' }, // OFFLINE
  { sensor_id: 'ELEC-ED-01', room_id: 'emergency_dept', type: 'electrical', status: 'FAILED', last_reading_at: new Date(Date.now() - 400000).toISOString(), value: null, unit: 'A' }, // FAILED
  { sensor_id: 'CO-ED-01', room_id: 'emergency_dept', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 6000).toISOString(), value: 78, unit: 'ppm' }, // CRITICAL CO
  
  // ═══════════════════════════════════════════════════════════════════
  // General Ward - HIGH RISK (Fire spreading from ICU)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-GW-01', room_id: 'general_ward', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 7000).toISOString(), value: 55, unit: 'degC' }, // HIGH
  { sensor_id: 'SMOKE-GW-01', room_id: 'general_ward', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 8000).toISOString(), value: 95, unit: 'ppm' }, // HIGH SMOKE
  { sensor_id: 'ELEC-GW-01', room_id: 'general_ward', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 9000).toISOString(), value: 12.8, unit: 'A' },
  { sensor_id: 'CO-GW-01', room_id: 'general_ward', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 10000).toISOString(), value: 52, unit: 'ppm' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Isolation Room - WARNING (Electrical issue + Elevated temp)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-ISO-01', room_id: 'isolation_room', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 11000).toISOString(), value: 42, unit: 'degC' }, // Elevated
  { sensor_id: 'SMOKE-ISO-01', room_id: 'isolation_room', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 12000).toISOString(), value: 58, unit: 'ppm' }, // WARNING
  { sensor_id: 'ELEC-ISO-01', room_id: 'isolation_room', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 10000).toISOString(), value: 18.5, unit: 'A' }, // OVERLOAD
  
  // ═══════════════════════════════════════════════════════════════════
  // Patient Room - NORMAL (All safe)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-PR-01', room_id: 'patient_room', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 13000).toISOString(), value: 23.2, unit: 'degC' },
  { sensor_id: 'SMOKE-PR-01', room_id: 'patient_room', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 14000).toISOString(), value: 12, unit: 'ppm' },
  { sensor_id: 'ELEC-PR-01', room_id: 'patient_room', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 15000).toISOString(), value: 3.8, unit: 'A' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Radiology - NORMAL (Safe)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-RAD-01', room_id: 'radiology', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 16000).toISOString(), value: 21.5, unit: 'degC' },
  { sensor_id: 'SMOKE-RAD-01', room_id: 'radiology', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 17000).toISOString(), value: 10, unit: 'ppm' },
  { sensor_id: 'ELEC-RAD-01', room_id: 'radiology', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 18000).toISOString(), value: 7.2, unit: 'A' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Lab - WARNING (Chemical smoke detected)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-LAB-01', room_id: 'lab', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 12000).toISOString(), value: 35, unit: 'degC' },
  { sensor_id: 'SMOKE-LAB-01', room_id: 'lab', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 13000).toISOString(), value: 68, unit: 'ppm' }, // WARNING
  { sensor_id: 'ELEC-LAB-01', room_id: 'lab', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 14000).toISOString(), value: 5.8, unit: 'A' },
  { sensor_id: 'CO-LAB-01', room_id: 'lab', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 15000).toISOString(), value: 42, unit: 'ppm' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Cafeteria - NORMAL (Safe, busy area)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-CAF-01', room_id: 'cafeteria', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 19000).toISOString(), value: 26.0, unit: 'degC' },
  { sensor_id: 'SMOKE-CAF-01', room_id: 'cafeteria', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 20000).toISOString(), value: 18, unit: 'ppm' },
  { sensor_id: 'CO-CAF-01', room_id: 'cafeteria', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 21000).toISOString(), value: 12, unit: 'ppm' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Administration - NORMAL (Office area, safe)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-ADM-01', room_id: 'administration', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 22000).toISOString(), value: 22.0, unit: 'degC' },
  { sensor_id: 'SMOKE-ADM-01', room_id: 'administration', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 23000).toISOString(), value: 9, unit: 'ppm' },
  { sensor_id: 'ELEC-ADM-01', room_id: 'administration', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 24000).toISOString(), value: 3.2, unit: 'A' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Maternity Ward - HIGH RISK (Smoke from adjacent General Ward)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-MAT-01', room_id: 'maternity_ward', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 7000).toISOString(), value: 48, unit: 'degC' }, // HIGH
  { sensor_id: 'SMOKE-MAT-01', room_id: 'maternity_ward', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 8000).toISOString(), value: 88, unit: 'ppm' }, // HIGH
  { sensor_id: 'CO-MAT-01', room_id: 'maternity_ward', type: 'co', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 9000).toISOString(), value: 46, unit: 'ppm' },
  { sensor_id: 'ELEC-MAT-01', room_id: 'maternity_ward', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 10000).toISOString(), value: 6.5, unit: 'A' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Blood Bank - NORMAL (Cold storage, all systems operational)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-BB-01', room_id: 'blood_bank', type: 'temperature', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 25000).toISOString(), value: 4.0, unit: 'degC' }, // Proper cold storage
  { sensor_id: 'SMOKE-BB-01', room_id: 'blood_bank', type: 'smoke_heat', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 26000).toISOString(), value: 6, unit: 'ppm' },
  { sensor_id: 'ELEC-BB-01', room_id: 'blood_bank', type: 'electrical', status: 'OPERATIONAL', last_reading_at: new Date(Date.now() - 27000).toISOString(), value: 2.8, unit: 'A' },
  
  // ═══════════════════════════════════════════════════════════════════
  // Records - FAILED SENSORS (Old room with maintenance issues)
  // ═══════════════════════════════════════════════════════════════════
  { sensor_id: 'TEMP-REC-01', room_id: 'records', type: 'temperature', status: 'FAILED', last_reading_at: new Date(Date.now() - 800000).toISOString(), value: null, unit: 'degC' }, // FAILED
  { sensor_id: 'SMOKE-REC-01', room_id: 'records', type: 'smoke_heat', status: 'FAILED', last_reading_at: new Date(Date.now() - 900000).toISOString(), value: null, unit: 'ppm' }, // FAILED
]

const LAYER_EMOJI = { Fire: '🔥', Sensors: '📡', Blocked: '🚫', IDS: '🛡️' }

export default function LiveMap() {
  const [building, setBuilding] = useState(null)
  const [rooms, setRooms] = useState([])
  const [route, setCurrentRoute] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [emergencyMessage, setEmergencyMessage] = useState('Building hazard detected')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [activeLayers, setActiveLayers] = useState(new Set(['Fire', 'Sensors', 'Blocked']))

  const toggleLayer = (layer) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(layer) ? next.delete(layer) : next.add(layer)
      return next
    })
  }

  useEffect(() => {
    async function load() {
      try {
        const [b, r, rt] = await Promise.all([
          api.getBuilding(), api.getRooms(), api.getCurrentRoute(),
        ])
        setBuilding(b)
        setRooms(r.rooms || [])
        setCurrentRoute(rt)
        
        // Load alerts
        try {
          const alertsData = await api.getNotifications({ status: 'ACTIVE' })
          setAlerts(alertsData.notifications || [])
        } catch (e) {
          console.warn('Failed to load alerts:', e)
        }
      } catch {
        setIsDemoMode(true)
        setCurrentRoute(DEMO_ROUTE)
        
        // Demo rooms with REALISTIC HAZARD LEVELS based on sensor readings
        // Hazard levels determined by Decision Engine threshold combinations
        const demoRooms = [
          { room_id: 'icu',               name: 'ICU (4 Beds)',              current_hazard_level: 'CRITICAL' },      // Temp 68°C + Smoke 120ppm + CO 45ppm = FIRE!
          { room_id: 'operation_theater', name: 'Operating Theatre (OT)',    current_hazard_level: 'HIGH_RISK' },     // Smoke 85ppm + Temp 58°C + Flame detected
          { room_id: 'emergency_dept',    name: 'Emergency Department',      current_hazard_level: 'CRITICAL' },      // Temp 65°C + CO 78ppm + 2 sensors failed
          { room_id: 'general_ward',      name: 'General Ward (6 Beds)',     current_hazard_level: 'HIGH_RISK' },     // Smoke 95ppm + Temp 55°C
          { room_id: 'maternity_ward',    name: 'Maternity Ward (4 Beds)',   current_hazard_level: 'HIGH_RISK' },     // Smoke 88ppm + Temp 48°C
          { room_id: 'pharmacy',          name: 'Pharmacy',                  current_hazard_level: 'WARNING' },       // CO 55ppm + 1 sensor failed
          { room_id: 'waiting_area',      name: 'Waiting Area',              current_hazard_level: 'WARNING' },       // Smoke 62ppm + Temp 32°C
          { room_id: 'isolation_room',    name: 'Isolation Room',            current_hazard_level: 'WARNING' },       // Smoke 58ppm + Electrical 18.5A
          { room_id: 'lab',               name: 'Lab',                       current_hazard_level: 'WARNING' },       // Smoke 68ppm + CO 42ppm
          { room_id: 'main_lobby',        name: 'Main Lobby & Reception',    current_hazard_level: 'NORMAL' },        // All readings safe
          { room_id: 'patient_room',      name: 'Patient Room (2 Beds)',     current_hazard_level: 'NORMAL' },        // All safe
          { room_id: 'radiology',         name: 'Radiology (X-Ray)',         current_hazard_level: 'NORMAL' },        // All safe
          { room_id: 'cafeteria',         name: 'Cafeteria',                 current_hazard_level: 'NORMAL' },        // All safe
          { room_id: 'administration',    name: 'Administration',            current_hazard_level: 'NORMAL' },        // All safe
          { room_id: 'blood_bank',        name: 'Blood Bank',                current_hazard_level: 'NORMAL' },        // All safe
          { room_id: 'records',           name: 'Records',                   current_hazard_level: 'UNKNOWN' },       // Both sensors FAILED - can't determine
        ]
        
        // Attach sensors to rooms
        demoRooms.forEach(room => {
          room.sensors = DEMO_SENSORS.filter(s => s.room_id === room.room_id)
        })
        
        setRooms(demoRooms)
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
      if (level === 'CRITICAL' || level === 'HIGH_RISK') {
        setEmergencyMode(true)
        setEmergencyMessage(`Hazard detected in room ${room_id.replace(/_/g, ' ')}`)
      }
      setLastUpdate(new Date().toISOString())
    }
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail
      const incoming = data?.route || data
      if (incoming?.status) {
        setCurrentRoute(incoming)
        setLastUpdate(new Date().toISOString())
      }
    }
    const handleNotification = (e) => {
      const notification = e.detail?.data ?? e.detail
      if (notification) {
        setAlerts(prev => [notification, ...prev].slice(0, 10))
      }
    }
    wsEventBus.addEventListener('room_status_changed', handleRoomStatus)
    wsEventBus.addEventListener('route_updated', handleRouteUpdate)
    wsEventBus.addEventListener('notification_created', handleNotification)
    return () => {
      wsEventBus.removeEventListener('room_status_changed', handleRoomStatus)
      wsEventBus.removeEventListener('route_updated', handleRouteUpdate)
      wsEventBus.removeEventListener('notification_created', handleNotification)
    }
  }, [])

  const roomMap = Object.fromEntries((rooms || []).map(r => [r.room_id, r]))
  const selectedRoomData = selected ? roomMap[selected] : null
  const noValidRoute = route?.status === 'NO_VALID_ROUTE' || route?.status === 'NO_AVAILABLE_EXIT'

  return (
    <div className="page-content" style={{ 
      padding: '20px 24px', 
      maxWidth: '100%',
      background: 'var(--bg-base)',
      minHeight: '100vh',
    }}>
      
      {/* Emergency Banner */}
      <EmergencyBanner
        active={emergencyMode}
        message={emergencyMessage}
        exitId={route?.exit_id || 'nearest exit'}
      />

      {/* Header with gradient accent */}
      <div style={{ 
        marginBottom: 20,
        padding: '20px 24px',
        background: 'var(--bg-raised)',
        borderRadius: 16,
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--neo-raised-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            background: 'var(--orange-500)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: 'var(--neo-raised)',
          }}>
            🗺️
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--ink-900)',
              margin: 0,
              marginBottom: 4,
            }}>
              Heat Map
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
                background: 'var(--orange-500)',
                display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              Real-time 2D situational awareness
            </p>
          </div>
        </div>
      </div>

      {/* Layer toggle bar - Enhanced filter system (Route removed - see Evacuation page) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['Fire', 'Sensors', 'Blocked', 'IDS'].map(layer => {
          const isActive = activeLayers.has(layer)
          return (
            <button
              key={layer}
              onClick={() => toggleLayer(layer)}
              aria-pressed={isActive}
              style={{
                background: isActive 
                  ? 'var(--orange-100)'
                  : 'var(--bg-raised)',
                boxShadow: isActive ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
                color: isActive ? 'var(--orange-600)' : 'var(--ink-600)',
                borderRadius: 20,
                padding: '8px 16px',
                border: isActive ? '1.5px solid var(--orange-300)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 200ms ease',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.background = 'var(--bg-inset)'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.background = 'var(--bg-raised)'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              {LAYER_EMOJI[layer]} {layer}
            </button>
          )
        })}
      </div>

      {/* Main Content - More space for map */}
      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 200px)', minHeight: '600px' }}>
        
        {/* Left: Map - Maximized */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="glass-card" style={{
            padding: 16,
            position: 'relative',
            background: 'var(--glass-bg)',
            border: emergencyMode ? '3px solid #EF4444' : '2px solid var(--glass-border)',
            boxShadow: 'var(--neo-raised)',
            borderRadius: 16,
            overflow: 'visible',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}>
            {/* Scan line on data update */}
            {lastUpdate && (
              <div
                key={lastUpdate}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  height: 3,
                  width: '100%',
                  background: 'linear-gradient(90deg, transparent 0%, var(--orange-500) 50%, transparent 100%)',
                  transformOrigin: 'left center',
                  animation: 'scanLine 0.8s ease-out forwards',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
                aria-hidden="true"
              />
            )}

            {/* Loading state or map - Maximized */}
            {loading ? (
              <LoadingSkeleton type="map" height="100%" />
            ) : (
              <div style={{
                background: 'var(--map-canvas-bg)',
                borderRadius: 12,
                padding: 8,
                boxShadow: '0 0 0 1px var(--border-glass) inset',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
              }}>
                <BuildingHeatmap
                  building={building}
                  rooms={rooms}
                  route={null}
                  onRoomSelect={setSelected}
                  selectedRoom={selected}
                  showRoute={false}
                  showSensors={activeLayers.has('Sensors')}
                  showIDS={activeLayers.has('IDS')}
                  showFire={activeLayers.has('Fire')}
                  showBlocked={activeLayers.has('Blocked')}
                  style={{ flex: 1, minHeight: 0, width: '100%', height: '100%' }}
                />
              </div>
            )}

            {/* Map footer stats - Positioned at bottom */}
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'var(--bg-inset)',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>
                    Total Rooms
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>
                    {rooms.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>
                    Critical
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#EF4444' }}>
                    {rooms.filter(r => r.current_hazard_level === 'CRITICAL').length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>
                    Normal
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22C55E' }}>
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
                color: '#22C55E',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22C55E',
                  animation: 'pulse 2s infinite',
                }} />
                LIVE
              </div>
            </div>
          </div>

          {/* No valid route banner */}
          {noValidRoute && (
            <div className="glass-card" style={{
              marginTop: 16,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              padding: '16px 20px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ fontSize: 32 }}>⚠️</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>
                  No Valid Evacuation Route
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>
                  All exits may be blocked or inaccessible. Contact emergency services immediately.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Active Alerts */}
          {alerts.length > 0 && (
            <div className="glass-card" style={{ 
              padding: 18,
              background: 'var(--glass-bg)',
              border: '2px solid rgba(239, 68, 68, 0.2)',
              boxShadow: 'var(--neo-raised)',
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
                    boxShadow: 'var(--neo-raised-sm)',
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
                      color: 'var(--ink-400)',
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
                      ? 'rgba(239,68,68,0.12)'
                      : 'rgba(245,158,11,0.12)',
                    border: `2px solid ${alert.severity === 'CRITICAL' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    boxShadow: 'var(--neo-raised-sm)',
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
            background: 'var(--glass-bg)',
            border: '2px solid var(--glass-border)',
            boxShadow: 'var(--neo-raised)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32,
                height: 32,
                background: 'var(--ink-600)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                boxShadow: 'var(--neo-raised-sm)',
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

            {/* Filter Guide */}
            {activeLayers.size > 0 && (
              <div style={{ marginBottom: 16, padding: '12px', background: 'var(--orange-100)', borderRadius: 8, border: '1px solid var(--orange-300)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-700)', marginBottom: 8, letterSpacing: '0.05em' }}>
                  🎛️ ACTIVE FILTERS
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-600)', lineHeight: 1.5 }}>
                  {activeLayers.has('Fire') && '🔥 Hazard levels shown\n'}
                  {activeLayers.has('Sensors') && '📡 Sensor health indicators\n'}
                  {activeLayers.has('IDS') && '🛡️ Cyber threat zones\n'}
                  {activeLayers.has('Blocked') && '🚫 Blocked areas marked'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--ink-400)', marginTop: 8, fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                  💡 For evacuation routes, visit the Evacuation page
                </div>
              </div>
            )}

            {/* Heatmap Intensity - CLASSIC GRADIENT */}
            <div style={{ marginBottom: 16 }}>
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
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 20%, #FBBF24 40%, #F97316 60%, #DC2626 80%, #991B1B 100%)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.3)',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.25) 100%)',
                }} />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingX: 4 }}>
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

            {/* Risk Level - BEAUTIFUL CLASSIC GRADIENTS */}
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
                  { gradient: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)', label: 'Normal (Safe)', icon: '✅', shadow: 'rgba(16, 185, 129, 0.5)' },
                  { gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)', label: 'Caution', icon: '⚡', shadow: 'rgba(251, 191, 36, 0.5)' },
                  { gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)', label: 'High Risk', icon: '⚠️', shadow: 'rgba(249, 115, 22, 0.5)' },
                  { gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)', label: 'Critical', icon: '🔥', shadow: 'rgba(239, 68, 68, 0.5)' },
                  { gradient: 'linear-gradient(135deg, #94A3B8 0%, #64748B 50%, #475569 100%)', label: 'No Data', icon: '❓', shadow: 'rgba(148, 163, 184, 0.5)' },
                ].map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10,
                    padding: '6px 8px',
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: 6,
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.boxShadow = `0 4px 12px ${item.shadow}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}>
                    <div style={{
                      width: 44,
                      height: 28,
                      background: item.gradient,
                      borderRadius: 6,
                      boxShadow: `0 4px 12px ${item.shadow}, inset 0 1px 2px rgba(255, 255, 255, 0.4)`,
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                      }} />
                    </div>
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
                  setEmergencyMode(true)
                  setEmergencyMessage('Fire detected in operation_theater')
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
                  setEmergencyMode(false)
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
        
        @keyframes scanLine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
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
          borderRadius: 4px;
        }
        
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #94A3B8 0%, #64748B 100%);
          borderRadius: 4px;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #64748B 0%, #475569 100%);
        }
      `}</style>
    </div>
  )
}
