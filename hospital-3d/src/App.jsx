import { Component, useEffect } from 'react'
import { useDecisionFeed } from './hooks/useDecisionFeed'
import { publisher } from './mqtt/publisher'
import HospitalScene from './scene/HospitalScene'
import { useSimStore } from './state/useSimStore'
import ControlPanel from './ui/ControlPanel'
import TopBar from './ui/TopBar'
import ViewControls from './ui/ViewControls'

/** Keeps the sensor panel usable even if the 3D view fails (e.g. WebGL disabled). */
class SceneBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="empty" style={{ paddingTop: 140 }}>
        <b>3D view unavailable</b>
        <p style={{ marginTop: 6 }}>{this.state.error.message}</p>
        <p style={{ marginTop: 6 }}>The sensor controls on the right still publish over MQTT.</p>
      </div>
    )
  }
}

export default function App() {
  // MQTT publisher (sliders → Mosquitto) and Decision Engine feedback (WebSocket)
  useEffect(() => {
    publisher.start()
    return () => publisher.stop()
  }, [])
  useDecisionFeed()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') useSimStore.getState().clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <main className="viewport" aria-label="3D hospital model">
        <SceneBoundary>
          <HospitalScene />
        </SceneBoundary>
        <TopBar />
        <ViewControls />
      </main>
      <ControlPanel />
    </div>
  )
}
