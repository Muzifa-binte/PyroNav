import React, { useState } from 'react'
import SidebarNavigation from './SidebarNavigation'
import TopStatusBar from './TopStatusBar'
import { useWebSocket } from '../hooks/useWebSocket'

const shellStyle = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
  backgroundColor: 'var(--bg-canvas)',
}

const mainStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
}

const contentStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: 'var(--space-6)',
}

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { connectionState, lastUpdate } = useWebSocket()

  return (
    <div style={shellStyle}>
      <SidebarNavigation
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />
      <div style={mainStyle}>
        <TopStatusBar
          connectionState={connectionState}
          lastUpdate={lastUpdate}
        />
        <main style={contentStyle} id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
