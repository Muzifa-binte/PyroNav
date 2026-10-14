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
      background: 'linear-gradient(135deg, #EDF1FB 0%, #E4E9F7 50%, #EBF0FA 100%)',
    }}>
      {/* Animated background orbs */}
      <div className="bg-animated" aria-hidden="true">
        {/* Orb 1 — pearl blue, top-left */}
        <div style={{
          position: 'absolute',
          top: '-20%', left: '-10%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(180,210,255,0.45) 0%, rgba(200,230,255,0.25) 40%, transparent 70%)',
          animation: 'float1 28s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Orb 2 — lavender, bottom-right */}
        <div style={{
          position: 'absolute',
          top: '60%', right: '-15%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,185,255,0.40) 0%, transparent 70%)',
          animation: 'float2 22s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Orb 3 — mint, bottom-center */}
        <div style={{
          position: 'absolute',
          bottom: '-10%', left: '30%',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160,230,210,0.30) 0%, transparent 70%)',
          animation: 'float3 32s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Orb 4 — peach, mid-right */}
        <div style={{
          position: 'absolute',
          top: '20%', right: '20%',
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,210,200,0.25) 0%, transparent 70%)',
          animation: 'float4 18s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Orb 5 — white, center-left */}
        <div style={{
          position: 'absolute',
          left: '-5%', top: '40%',
          width: 350, height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 60%)',
          animationName: 'float3',
          animationDuration: '22s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
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
