import React, { useState, useEffect } from 'react'
import '../styles/tokens.css'
import '../styles/global.css'
import SidebarNavigation from './SidebarNavigation'
import TopStatusBar from './TopStatusBar'
import EmergencyBanner from './EmergencyBanner'
import { useWebSocket, wsEventBus } from '../hooks/useWebSocket'
import { Outlet } from 'react-router-dom'

export const EmergencyContext = React.createContext(false)

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const { connectionState, lastUpdate } = useWebSocket()

  useEffect(() => {
    const handleRoomStatus = (e) => {
      const data = e.detail?.data ?? e.detail ?? {}
      const level = data.hazard_level || data.current_hazard_level
      if (level === 'CRITICAL') {
        setEmergencyMode(true)
      }
    }
    wsEventBus.addEventListener('room_status_changed', handleRoomStatus)
    return () => wsEventBus.removeEventListener('room_status_changed', handleRoomStatus)
  }, [])

  return (
    <EmergencyContext.Provider value={emergencyMode}>
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: emergencyMode
            ? 'radial-gradient(circle, rgba(255,106,26,0.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,178,122,0.14) 0%, transparent 70%)',
          top: -100,
          left: -100,
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(40px)',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: emergencyMode
            ? 'radial-gradient(circle, rgba(214,40,40,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,106,26,0.10) 0%, transparent 70%)',
          bottom: -100,
          right: -100,
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(40px)',
        }} />

        {/* Main layout */}
        <div style={{
          position: 'relative',
          display: 'flex',
          height: '100vh',
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
            position: 'relative',
          }}>
            <TopStatusBar
              connectionState={connectionState}
              lastUpdate={lastUpdate}
            />

            <EmergencyBanner
              active={emergencyMode}
              message="Building hazard detected"
              exitId="nearest exit"
            />

            <main
              style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
              id="main-content"
            >
              {children || <Outlet />}
            </main>
          </div>
        </div>
      </div>
    </EmergencyContext.Provider>
  )
}
