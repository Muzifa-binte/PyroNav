import React, { useState } from 'react'

const SCENARIOS = [
  { id: 'normal',      label: 'Normal Conditions',        description: 'All rooms within configured normal thresholds.' },
  { id: 'smoke_ot',    label: 'Smoke — Operation Theater', description: 'Rising smoke and temperature in the OT room.' },
  { id: 'blocked',     label: 'Blocked Corridor',          description: 'Corridor 1 becomes unavailable, route recalculates.' },
  { id: 'stale',       label: 'Sensor Goes Stale',         description: 'SMOKE-OT-01 stops reporting; room state becomes UNKNOWN.' },
  { id: 'invalid_msg', label: 'Invalid Message',            description: 'Malformed sensor message sent to ingestion adapter.' },
]

export default function Simulation() {
  const [active,    setActive]    = useState(null)
  const [scenario,  setScenario]  = useState(SCENARIOS[0])
  const [log,       setLog]       = useState([])
  const [showReset, setShowReset] = useState(false)

  const addLog = (msg) => setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }])

  const handleStart = () => {
    setActive(scenario)
    addLog(`▶ Started scenario: ${scenario.label}`)
    addLog('ℹ Simulation events will appear here once MQTT simulator is connected.')
  }

  const handleStop = () => {
    addLog(`■ Stopped scenario: ${active?.label}`)
    setActive(null)
  }

  const handleReset = () => {
    setShowReset(false)
    setActive(null)
    setLog([{ time: new Date().toLocaleTimeString(), msg: '↺ Scenario reset to idle.' }])
  }

  return (
    <div>
      {/* Simulation banner */}
      {active && (
        <div className="sim-banner" role="alert">
          ⚗ SIMULATION MODE — TEST DATA — not live sensor readings
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-4)', marginTop: active ? 'var(--space-4)' : 0 }}>
        {/* Scenario selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="label">Select Scenario</div>
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => !active && setScenario(s)}
              disabled={!!active}
              style={{
                textAlign: 'left', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                background: scenario.id === s.id ? 'rgba(105,183,255,0.1)' : 'var(--surface-base)',
                border: scenario.id === s.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', cursor: active ? 'not-allowed' : 'pointer',
                opacity: active && scenario.id !== s.id ? 0.4 : 1,
              }}
            >
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.description}</div>
            </button>
          ))}
        </div>

        {/* Controls + log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Controls */}
          <div className="card">
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Scenario Controls</div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{scenario.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scenario.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {!active ? (
                <button
                  onClick={handleStart}
                  style={{ padding: '8px 20px', background: 'rgba(67,197,158,0.15)', border: '1px solid var(--status-normal)', borderRadius: 'var(--radius-sm)', color: 'var(--status-normal)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  ▶ Start
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  style={{ padding: '8px 20px', background: 'rgba(255,93,108,0.15)', border: '1px solid var(--status-critical)', borderRadius: 'var(--radius-sm)', color: 'var(--status-critical)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  ■ Stop
                </button>
              )}
              <button
                onClick={() => setShowReset(true)}
                style={{ padding: '8px 20px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}
              >
                ↺ Reset
              </button>
            </div>

            {/* Reset confirm */}
            {showReset && (
              <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(245,190,85,0.1)', border: '1px solid var(--status-warning)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 13, color: 'var(--status-warning)', marginBottom: 'var(--space-2)' }}>⚠ Reset will clear all scenario state. Confirm?</div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button onClick={handleReset} style={{ padding: '4px 14px', background: 'var(--status-warning)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Confirm Reset</button>
                  <button onClick={() => setShowReset(false)} style={{ padding: '4px 14px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Event log */}
          <div className="card" style={{ flex: 1 }}>
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Event Log</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
              {log.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Start a scenario to see events here</div>
              ) : log.map((entry, i) => (
                <div key={i} style={{ color: 'var(--text-secondary)' }}>
                  <span className="tabular" style={{ color: 'var(--text-muted)', marginRight: 'var(--space-2)' }}>{entry.time}</span>
                  {entry.msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
