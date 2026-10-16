import React, { useState, useEffect, createContext, useContext } from 'react'
import '../styles/tokens.css'
import '../styles/global.css'
import SidebarNavigation from './SidebarNavigation'
import TopStatusBar from './TopStatusBar'
import ThemeSwitcher from './ThemeSwitcher'
import EmergencyBanner from './EmergencyBanner'
import { useWebSocket, wsEventBus } from '../hooks/useWebSocket'

export const EmergencyContext = createContext(false)
export const useEmergency = () => useContext(EmergencyContext)

/*
  Background strategy — "material for glass":
  The warm ivory base (#F4EFE9) is just off-white. Glassmorphism only works when
  the blurred layer has something colourful behind it. We add exactly two orbs:
  - Top-left: a large peach-orange radial that drifts slowly (orbDrift1, 28s)
  - Bottom-right: a smaller apricot radial that drifts the other way (orbDrift2, 22s)
  Both stay under 14% opacity so they never compete with card content.
  In emergency mode they intensify to warm red-orange.
*/
const ORB_STYLES_NORMAL = {
  orb1: 'radial-gradient(ellipse 680px 520px at center, rgba(255,178,122,0.13) 0%, transparent 68%)',
  orb2: 'radial-gradient(ellipse 500px 400px at center, rgba(255,106,26,0.09)  0%, transparent 65%)',
}
const ORB_STYLES_EMERGENCY = {
  orb1: 'radial-gradient(ellipse 680px 520px at center, rgba(214,40,40,0.15)   0%, transparent 68%)',
  orb2: 'radial-gradient(ellipse 500px 400px at center, rgba(255,106,26,0.14)  0%, transparent 65%)',
}

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [emergencyMode, setEmergencyMode]       = useState(false)
  const [emergencyRoom, setEmergencyRoom]        = useState('building hazard detected')
  const [emergencyExit, setEmergencyExit]        = useState('nearest exit')
  const [alertCount,    setAlertCount]           = useState(0)
  const { connectionState, lastUpdate } = useWebSocket()

  useEffect(() => {
    const handleRoomStatus = (e) => {
      const data = e.detail?.data ?? e.detail ?? {}
      const level = data.hazard_level || data.current_hazard_level
      if (level === 'CRITICAL' || level === 'DANGER') {
        setEmergencyMode(true)
        if (data.room_id) setEmergencyRoom(data.room_id.replace(/_/g, ' '))
      }
    }
    const handleRouteUpdate = (e) => {
      const data = e.detail?.data ?? e.detail ?? {}
      const route = data?.route || data
      if (route?.exit_id) setEmergencyExit(route.exit_id)
    }
    const handleHazardEvent = () => setAlertCount(c => c + 1)
    wsEventBus.addEventListener('room_status_changed', handleRoomStatus)
    wsEventBus.addEventListener('route_updated',       handleRouteUpdate)
    wsEventBus.addEventListener('hazard_event_created', handleHazardEvent)
    return () => {
      wsEventBus.removeEventListener('room_status_changed', handleRoomStatus)
      wsEventBus.removeEventListener('route_updated',       handleRouteUpdate)
      wsEventBus.removeEventListener('hazard_event_created', handleHazardEvent)
    }
  }, [emergencyMode])

  const orbs = emergencyMode ? ORB_STYLES_EMERGENCY : ORB_STYLES_NORMAL

  return (
    <EmergencyContext.Provider value={emergencyMode}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'var(--bg-base)' }}>

        {/* ── Animated background layer ── */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>

          {/* Orb 1 — top-left, large, slow drift */}
          <div style={{
            position: 'absolute',
            width: 700, height: 700,
            top: -180, left: -120,
            borderRadius: '50%',
            background: orbs.orb1,
            animation: 'orbDrift1 28s ease-in-out infinite',
            willChange: 'transform',
            transition: 'background 1.5s ease',
          }} />

          {/* Orb 2 — bottom-right, medium, counter drift */}
          <div style={{
            position: 'absolute',
            width: 520, height: 520,
            bottom: -140, right: -80,
            borderRadius: '50%',
            background: orbs.orb2,
            animation: 'orbDrift2 22s ease-in-out infinite',
            willChange: 'transform',
            transition: 'background 1.5s ease',
          }} />

          {/* Dot grid — barely-there warm dots so glass has texture to blur */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,106,26,0.038) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />

        </div>

        {/* ── Main app shell ── */}
        <div style={{
          position: 'relative',
          display: 'flex',
          height: '100%',
          overflow: 'hidden',
          zIndex: 1,
        }}>
          <SidebarNavigation
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(c => !c)}
          />

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}>
            <TopStatusBar
              connectionState={connectionState}
              lastUpdate={lastUpdate}
              emergencyMode={emergencyMode}
              alertCount={alertCount}
            />

            <EmergencyBanner
              active={emergencyMode}
              message={emergencyRoom}
              exitId={emergencyExit}
              onDismiss={() => setEmergencyMode(false)}
            />

            <main
              style={{
                flex: 1,
                overflowY: 'auto',
                position: 'relative',
                background: emergencyMode ? 'rgba(214,40,40,0.018)' : 'transparent',
                transition: 'background 1.2s ease',
              }}
              id="main-content"
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </EmergencyContext.Provider>
  )
}
