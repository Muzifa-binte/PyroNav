import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import Overview from './pages/Overview'
import LiveMap from './pages/LiveMap'
import Sensors from './pages/Sensors'
import Evacuation from './pages/Evacuation'
import Alerts from './pages/Alerts'
import NetworkSecurity from './pages/NetworkSecurity'
import RiskAnalytics from './pages/RiskAnalytics'
import Simulation from './pages/Simulation'
import Configuration from './pages/Configuration'

// ── Error boundary so crashes show a readable message, not a blank screen ──
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
          fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
        }}>
          <div style={{
            background: 'var(--bg-raised)',
            boxShadow: 'var(--neo-raised)',
            borderRadius: 'var(--radius-xl, 24px)',
            padding: 32,
            maxWidth: 520,
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <h2 style={{
              fontFamily: 'var(--font-display, Playfair Display, serif)',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--ink-900)',
              marginBottom: 8,
            }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 16 }}>
              PyroNav encountered an error. Check the browser console for details.
            </p>
            <pre style={{
              fontSize: 11,
              background: 'rgba(214,40,40,0.08)',
              color: 'var(--red-600)',
              padding: 12,
              borderRadius: 8,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              border: '1px solid rgba(214,40,40,0.25)',
            }}>
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                padding: '10px 24px',
                borderRadius: 8,
                background: 'var(--orange-500)',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          <Route path="/"            element={<Navigate to="/overview" replace />} />
          <Route path="/overview"    element={<Overview />} />
          <Route path="/map"         element={<LiveMap />} />
          <Route path="/sensors"     element={<Sensors />} />
          <Route path="/evacuation"  element={<Evacuation />} />
          <Route path="/alerts"      element={<Alerts />} />
          <Route path="/security"    element={<NetworkSecurity />} />
          <Route path="/risk"        element={<RiskAnalytics />} />
          <Route path="/simulation"  element={<Simulation />} />
          <Route path="/settings"    element={<Configuration />} />
        </Routes>
      </AppShell>
    </ErrorBoundary>
  )
}
