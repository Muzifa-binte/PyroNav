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

export default function App() {
  return (
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
  )
}
