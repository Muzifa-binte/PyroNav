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
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F0F4F8', fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
            padding: 32, maxWidth: 520, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A202C', marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: '#4A5568', marginBottom: 16 }}>
              PyroNav encountered an error. Check the browser console for details.
            </p>
            <pre style={{
              fontSize: 11, background: '#FED7D7', color: '#9B2C2C',
              padding: 12, borderRadius: 8, overflowX: 'auto', whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16, padding: '8px 20px', borderRadius: 8,
                background: '#E8681A', border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
