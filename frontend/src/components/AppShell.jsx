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
      background: 'var(--bg-canvas)',
    }}>
      {/* Animated background orbs */}
      <div className="bg-animated" aria-hidden="true">
        <div style={{
          position: 'absolute',
          top: '-20%', left: '-10%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(105,183,255,0.12) 0%, transparent 70%)',
          animation: 'float1 28s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '60%', right: '-15%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,168,255,0.10) 0%, transparent 70%)',
          animation: 'float2 22s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%', left: '30%',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,197,158,0.08) 0%, transparent 70%)',
          animation: 'float3 32s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '20%', right: '20%',
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,93,108,0.06) 0%, transparent 70%)',
          animation: 'float4 18s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      </div>

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
