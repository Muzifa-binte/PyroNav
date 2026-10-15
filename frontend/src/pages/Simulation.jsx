import React, { useState } from 'react'

const SCENARIOS = [
  { id: 'normal',      label: 'Normal Conditions',         description: 'All rooms within configured normal thresholds.' },
  { id: 'smoke_ot',    label: 'Smoke — Operation Theater', description: 'Rising smoke and temperature in the OT room.' },
  { id: 'blocked',     label: 'Blocked Corridor',          description: 'Corridor 1 becomes unavailable, route recalculates.' },
  { id: 'stale',       label: 'Sensor Goes Stale',         description: 'SMOKE-OT-01 stops reporting; room state becomes UNKNOWN.' },
  { id: 'invalid_msg', label: 'Invalid Message',            description: 'Malformed sensor message sent to ingestion adapter.' },
]

// Warm ivory log colors — no dark blues
const LOG_COLORS = {
  '▶': '#2E8B57',
  '■': '#D62828',
  '↺': '#F5A400',
  'ℹ': '#2F6FDE',
  '✓': '#2E8B57',
  '⚠': '#F5A400',
  '✕': '#D62828',
}

function LogEntry({ time, msg }) {
  const prefix = msg[0]
  const color = LOG_COLORS[prefix] || 'var(--ink-600)'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '3px 0' }}>
      <span style={{ color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {time}
      </span>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-word' }}>
        {msg}
      </span>
    </div>
  )
}

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
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 26,
        fontWeight: 700,
        color: 'var(--ink-900)',
        margin: 0,
      }}>
        Simulation / Developer
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 0 }}>Controlled test scenarios</p>

      {/* Active simulation banner */}
      {active && (
        <div role="alert" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '10px 24px',
          background: 'rgba(245,164,0,0.10)',
          border: '1px solid var(--amber-500)',
          borderRadius: 8,
          color: 'var(--amber-500)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ fontSize: 16 }}>⚗</span>
          SIMULATION MODE — TEST DATA — not live sensor readings
          <span style={{ marginLeft: 12, fontWeight: 400, fontSize: 12, color: 'var(--amber-500)', opacity: 0.75 }}>
            {active.label}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

        {/* Scenario selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-400)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>
            Select Scenario
          </div>
          {SCENARIOS.map(s => {
            const isActive = scenario.id === s.id
            return (
              <button
                key={s.id}
                onClick={() => !active && setScenario(s)}
                disabled={!!active}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--bg-raised)',
                  boxShadow: isActive ? 'var(--neo-inset)' : 'var(--neo-raised-sm)',
                  border: 'none',
                  color: isActive ? 'var(--orange-500)' : 'var(--ink-900)',
                  cursor: active ? 'not-allowed' : 'pointer',
                  opacity: active && !isActive ? 0.5 : 1,
                  transition: 'all var(--transition-fast)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', lineHeight: 1.4 }}>{s.description}</div>
              </button>
            )
          })}
        </div>

        {/* Controls + log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Scenario controls — glass-card */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-400)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
              Scenario Controls
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-900)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>{scenario.label}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', fontFamily: 'var(--font-sans)' }}>{scenario.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!active ? (
                /* Primary action — flat orange */
                <button
                  onClick={handleStart}
                  style={{
                    padding: '8px 22px',
                    background: 'var(--orange-500)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-600)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--orange-500)'}
                >
                  ▶ Start
                </button>
              ) : (
                /* Stop — flat red */
                <button
                  onClick={handleStop}
                  style={{
                    padding: '8px 22px',
                    background: 'var(--red-600)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  ■ Stop
                </button>
              )}
              {/* Reset — neumorphic */}
              <button
                onClick={() => setShowReset(true)}
                style={{
                  padding: '8px 22px',
                  background: 'var(--bg-raised)',
                  boxShadow: 'var(--neo-raised-sm)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'var(--amber-500)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)',
                }}
              >
                ↺ Reset
              </button>
            </div>

            {/* Reset confirm */}
            {showReset && (
              <div style={{
                marginTop: 14,
                padding: 14,
                background: 'rgba(245,164,0,0.08)',
                border: '1px solid var(--amber-500)',
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 13, color: 'var(--amber-500)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                  ⚠ Reset will clear all scenario state. Confirm?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '5px 16px',
                      background: 'var(--amber-500)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowReset(false)}
                    style={{
                      padding: '5px 16px',
                      background: 'var(--bg-raised)',
                      boxShadow: 'var(--neo-raised-sm)',
                      border: 'none',
                      borderRadius: 6,
                      color: 'var(--ink-600)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Event log — glass-card with warm bg */}
          <div className="glass-card" style={{ flex: 1, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-400)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
              Event Log
            </div>
            <div style={{
              background: 'var(--bg-inset)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              padding: 16,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              maxHeight: 300,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              boxShadow: 'var(--neo-inset)',
            }}>
              {log.length === 0 ? (
                <div style={{ color: 'var(--ink-400)', fontSize: 11 }}>
                  Start a scenario to see events here
                </div>
              ) : log.map((entry, i) => (
                <LogEntry key={i} time={entry.time} msg={entry.msg} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
