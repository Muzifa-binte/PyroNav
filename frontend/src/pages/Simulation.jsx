import React, { useState } from 'react'

const SCENARIOS = [
  { id: 'normal',      label: 'Normal Conditions',         description: 'All rooms within configured normal thresholds.' },
  { id: 'smoke_ot',    label: 'Smoke — Operation Theater', description: 'Rising smoke and temperature in the OT room.' },
  { id: 'blocked',     label: 'Blocked Corridor',          description: 'Corridor 1 becomes unavailable, route recalculates.' },
  { id: 'stale',       label: 'Sensor Goes Stale',         description: 'SMOKE-OT-01 stops reporting; room state becomes UNKNOWN.' },
  { id: 'invalid_msg', label: 'Invalid Message',            description: 'Malformed sensor message sent to ingestion adapter.' },
]

const LOG_COLORS = {
  '▶': '#43C59E',
  '■': '#FF5D6C',
  '↺': '#F5BE55',
  'ℹ': '#8BA8FF',
  '✓': '#43C59E',
  '⚠': '#F5BE55',
  '✕': '#FF5D6C',
}

function LogEntry({ time, msg }) {
  const prefix = msg[0]
  const color = LOG_COLORS[prefix] || '#4A5878'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '3px 0' }}>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {time}
      </span>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-word' }}>
        {msg}
      </span>
    </div>
  )
}

export default function Simulation() {
  const [active,     setActive]     = useState(null)
  const [scenario,   setScenario]   = useState(SCENARIOS[0])
  const [log,        setLog]        = useState([])
  const [showReset,  setShowReset]  = useState(false)

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

      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Simulation / Developer
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Controlled test scenarios
        </p>
      </div>

      {/* Persistent simulation banner */}
      {active && (
        <div role="alert" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '10px 24px',
          background: 'rgba(245,190,85,0.08)',
          border: '1px solid #F5BE55',
          borderRadius: 'var(--radius-sm)',
          color: '#F5BE55',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.04em',
          animation: 'fadeInUp 0.3s ease',
        }}>
          <span style={{ fontSize: 16 }}>⚗</span>
          SIMULATION MODE — TEST DATA — not live sensor readings
          <span style={{ marginLeft: 12, fontWeight: 400, fontSize: 12, color: '#F5BE55' + 'BB' }}>
            {active.label}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

        {/* Scenario selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Select Scenario
          </div>
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => !active && setScenario(s)}
              disabled={!!active}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: scenario.id === s.id
                  ? 'rgba(105,183,255,0.12)'
                  : 'rgba(255,255,255,0.03)',
                border: scenario.id === s.id
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                cursor: active ? 'not-allowed' : 'pointer',
                opacity: active && scenario.id !== s.id ? 0.4 : 1,
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: scenario.id === s.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {s.description}
              </div>
            </button>
          ))}
        </div>

        {/* Controls + log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Scenario controls */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Scenario Controls
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                {scenario.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scenario.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!active ? (
                <button
                  onClick={handleStart}
                  style={{
                    padding: '8px 22px',
                    background: 'rgba(67,197,158,0.15)',
                    border: '1px solid var(--status-normal)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--status-normal)',
                    cursor: 'pointer',
                    fontWeight: 600, fontSize: 13,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  ▶ Start
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  style={{
                    padding: '8px 22px',
                    background: 'rgba(255,93,108,0.15)',
                    border: '1px solid var(--status-critical)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--status-critical)',
                    cursor: 'pointer',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  ■ Stop
                </button>
              )}
              <button
                onClick={() => setShowReset(true)}
                style={{
                  padding: '8px 22px',
                  background: 'rgba(245,190,85,0.10)',
                  border: '1px solid var(--status-warning)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--status-warning)',
                  cursor: 'pointer', fontSize: 13,
                  transition: 'all var(--transition-fast)',
                }}
              >
                ↺ Reset
              </button>
            </div>

            {/* Reset confirm */}
            {showReset && (
              <div style={{
                marginTop: 14, padding: 14,
                background: 'rgba(245,190,85,0.08)',
                border: '1px solid var(--status-warning)',
                borderRadius: 'var(--radius-sm)',
                animation: 'fadeInUp 0.2s ease',
              }}>
                <div style={{ fontSize: 13, color: 'var(--status-warning)', marginBottom: 10 }}>
                  ⚠ Reset will clear all scenario state. Confirm?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '5px 16px',
                      background: 'var(--status-warning)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: '#000',
                      cursor: 'pointer',
                      fontWeight: 700, fontSize: 12,
                    }}
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowReset(false)}
                    style={{
                      padding: '5px 16px',
                      background: 'transparent',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Event log */}
          <div className="glass-card" style={{ flex: 1, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Event Log
            </div>
            <div style={{
              background: '#080E1A',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)',
              padding: 16,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              maxHeight: 300,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              {log.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
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
