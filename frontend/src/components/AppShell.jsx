import React, { useState } from 'react'
import '../styles/tokens.css'
import '../styles/global.css'
import SidebarNavigation from './SidebarNavigation'
import TopStatusBar from './TopStatusBar'
import { useWebSocket } from '../hooks/useWebSocket'

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { connectionState, lastUpdate } = useWebSocket()

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #F1F5F9 0%, #E8EEF5 50%, #E2E8F0 100%)',
    }}>
      {/* Subtle classic ambient glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.05) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} aria-hidden="true" />

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
        zIndex: 1,
      }}>
        <TopStatusBar
          connectionState={connectionState}
          lastUpdate={lastUpdate}
        />
        <main
          style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
