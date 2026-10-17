/**
 * Simulation — controlled test scenarios that run through the REAL pipeline:
 * POST /system/simulate/reading publishes MQTT readings (exactly like the 3D app),
 * then ingestion → decision engine → WebSocket. The log shows each step coming back.
 */
import React, { useEffect, useRef, useState } from 'react'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// Smoke/heat ramp: values the decision engine classifies as NORMAL → … → CRITICAL
const FIRE_RAMP = [
  { smoke: 20,  temperature: 26 },
  { smoke: 55,  temperature: 38 },
  { smoke: 85,  temperature: 52 },
  { smoke: 110, temperature: 64 },
  { smoke: 150, temperature: 82 },
]

const SCENARIOS = [
  {
    id: 'normal', label: 'Normal Conditions',
    description: 'Every sensor sends its normal (baseline) reading; all rooms return to NORMAL.',
    rooms: [],
  },
  {
    id: 'fire_ot', label: 'Fire — Operating Theatre',
    description: 'Smoke and temperature rise in the OT step by step: WARNING → HIGH_RISK → CRITICAL.',
    rooms: ['operation_theater'],
  },
  {
    id: 'fire_route', label: 'Fire on the Evacuation Route',
    description: 'A route is calculated from the Patient Room, then the Operating Theatre on that route catches fire: the route is recalculated around it.',
    rooms: ['operation_theater', 'patient_room'],
  },
  {
    id: 'co_lab', label: 'CO Leak — Lab',
    description: 'Carbon monoxide from the lab gas burners climbs past 35, 100 and 200 ppm.',
    rooms: ['lab'],
  },
  {
    id: 'overload_icu', label: 'Electrical Overload — ICU',
    description: 'The ICU life-support circuit (rated 32 A) climbs to 80 % and then 100 % of its rating.',
    rooms: ['icu'],
  },
  {
    id: 'stale', label: 'Sensor Goes Silent',
    description: 'SMOKE-REC-01 (Records) sends one reading and then nothing: stale after 60 s, room UNKNOWN after 5 min. Needs the 3D app closed.',
    rooms: ['records'],
  },
  {
    id: 'invalid_msg', label: 'Invalid Message',
    description: 'A malformed reading (non-numeric values) is published; the ingestion validator must reject it.',
    rooms: [],
  },
]

const LOG_COLORS = {
  '▶': '#2E8B57', '■': '#D62828', '↺': '#F5A400', 'ℹ': '#2F6FDE',
  '✓': '#2E8B57', '⚠': '#F5A400', '✕': '#D62828', '→': 'var(--ink-600)', '🔥': '#D62828',
}

function LogEntry({ time, msg }) {
  const color = LOG_COLORS[[...msg][0]] || 'var(--ink-600)'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '3px 0' }}>
      <span style={{ color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</span>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-word' }}>{msg}</span>
    </div>
  )
}

const fmt = (values) => values ? Object.entries(values).map(([k, v]) => `${k} ${v}`).join(', ') : 'baseline'

export default function Simulation() {
  const [active,    setActive]    = useState(null)
  const [scenario,  setScenario]  = useState(SCENARIOS[0])
  const [log,       setLog]       = useState([])
  const [showReset, setShowReset] = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [live3dApp, setLive3dApp] = useState(false)
  // Per run: cancellation, pending timers, our message ids, rooms to watch, sensors touched
  const run = useRef({ cancelled: true, timers: [], sent: new Set(), rooms: new Set() })
  const touched = useRef(new Set())   // sensors changed since the last Reset (across runs)
  const logEnd = useRef(null)

  const addLog = (msg) => setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }])

  useEffect(() => { logEnd.current?.scrollIntoView({ block: 'nearest' }) }, [log])

  // Is the 3D app sending? Its periodic re-send would overwrite simulated readings.
  useEffect(() => {
    const check = () => api.getSensorReadings({ limit: 5 })
      .then(d => setLive3dApp((d.readings || []).some(r =>
        String(r.message_id || '').startsWith('h3d-') &&
        Date.now() - new Date(r.received_at || r.timestamp).getTime() < 20000)))
      .catch(() => {})
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [])

  // What came back through the pipeline for this run
  useEffect(() => {
    const data = (e) => e.detail?.data ?? e.detail ?? {}
    const onReading = (e) => {
      const d = data(e)
      // Simulated readings carry "sim-" ids (POST /system/simulate/reading)
      if (String(d.message_id || '').startsWith('sim-') || run.current.sent.has(d.message_id)) {
        addLog(`✓ Ingested ${d.sensor_id} (${fmt(d.values)})`)
      }
    }
    const onRoom = (e) => {
      const d = data(e)
      if (run.current.rooms.has(d.room_id)) {
        addLog(`⚠ Decision engine: ${d.room_id} ${d.previous_level || '?'} → ${d.hazard_level}`)
      }
    }
    const onHazard = (e) => {
      const d = data(e)
      if (run.current.rooms.has(d.room_id)) addLog(`🔥 Hazard event created: ${d.room_id} ${d.hazard_level} (${(d.reason_codes || []).join(', ')})`)
    }
    const onResolved = (e) => {
      const d = data(e)
      if (run.current.rooms.has(d.room_id)) addLog(`✓ Hazard event resolved: ${d.room_id}`)
    }
    const onRoute = (e) => {
      const d = data(e)
      const r = d.route || d
      if (run.current.rooms.size && r?.status) {
        addLog(`↺ Route recalculated: ${r.status === 'ROUTE_FOUND' ? (r.node_ids || []).join(' → ') : r.status}`)
      }
    }
    const events = [
      ['sensor_reading_updated', onReading], ['room_status_changed', onRoom],
      ['hazard_event_created', onHazard], ['hazard_event_resolved', onResolved], ['route_updated', onRoute],
    ]
    events.forEach(([n, h]) => wsEventBus.addEventListener(n, h))
    return () => events.forEach(([n, h]) => wsEventBus.removeEventListener(n, h))
  }, [])

  // Stop pending steps when leaving the page
  useEffect(() => () => { run.current.cancelled = true; run.current.timers.forEach(clearTimeout) }, [])

  const wait = (ms) => new Promise(resolve => run.current.timers.push(setTimeout(resolve, ms)))

  const send = async (sensorId, values = null, invalid = false) => {
    if (values || invalid) touched.current.add(sensorId)
    // Logged before the request: the pipeline's answer (WebSocket) usually
    // arrives before the HTTP reply does
    addLog(`→ Sent ${sensorId}: ${invalid ? 'MALFORMED values' : fmt(values)}`)
    try {
      const r = await api.simulateReading(sensorId, values, invalid)
      run.current.sent.add(r.message_id)
      return r
    } catch (err) {
      addLog(`✕ ${sensorId}: ${err.message}`)
      throw err
    }
  }

  const ramp = async (sensorIds, steps, gapMs = 3000) => {
    for (const values of steps) {
      if (run.current.cancelled) return
      for (const id of sensorIds) await send(id, values)
      await wait(gapMs)
    }
  }

  const SCENARIO_RUNNERS = {
    normal: async () => {
      const { sensors = [] } = await api.getSensors()
      addLog(`ℹ Sending the baseline reading of all ${sensors.length} sensors…`)
      for (const s of sensors) {
        if (run.current.cancelled) return
        run.current.rooms.add(s.room_id)
        await send(s.sensor_id)
      }
    },
    fire_ot: () => ramp(['SMOKE-OT-01', 'SMOKE-OT-02'], FIRE_RAMP),
    fire_route: async () => {
      const route = await api.calculateRoute('patient_room', 'dijkstra')
      addLog(`ℹ Route from Patient Room: ${(route.node_ids || []).join(' → ') || route.status}`)
      await wait(1500)
      if (run.current.cancelled) return
      addLog('ℹ Fire breaks out in the Operating Theatre, which is on that route…')
      await send('SMOKE-OT-01', { smoke: 150, temperature: 82 })
      await send('SMOKE-OT-02', { smoke: 150, temperature: 82 })
    },
    co_lab: () => ramp(['CO-LAB-01'], [{ co: 20 }, { co: 45 }, { co: 120 }, { co: 230 }]),
    overload_icu: () => ramp(['CUR-ICU-01'], [{ current: 20 }, { current: 27 }, { current: 34 }]),
    stale: async () => {
      await send('SMOKE-REC-01')
      addLog('ℹ No more readings will be sent. Watching the sensor age…')
      while (!run.current.cancelled) {
        await wait(10000)
        if (run.current.cancelled) return
        const s = await api.getSensor('SMOKE-REC-01').catch(() => null)
        const age = s?.last_seen_at ? Math.round((Date.now() - new Date(s.last_seen_at).getTime()) / 1000) : null
        addLog(`ℹ SMOKE-REC-01 last reading ${age ?? '?'} s ago → ${age > 300 ? 'offline (room UNKNOWN)' : age > 60 ? 'STALE' : 'fresh'}`)
        if (age > 300) return
      }
    },
    invalid_msg: async () => {
      const before = (await api.getHealth()).components?.mqtt || {}
      await send('SMOKE-OT-01', null, true)
      await wait(1500)
      const after = (await api.getHealth()).components?.mqtt || {}
      const delta = (k) => (after[k] || 0) - (before[k] || 0)
      if (delta('rejected') + delta('invalid') > 0) {
        addLog(`✓ Ingestion rejected it (rejected +${delta('rejected')}, invalid +${delta('invalid')}); nothing was stored`)
        if (after.last_error) addLog(`ℹ Validator: ${after.last_error}`)
      } else {
        addLog('⚠ The ingestion counters did not change: is MQTT ingestion running? (GET /api/v1/health → mqtt)')
      }
    },
  }

  const cancelRun = () => {
    run.current.cancelled = true
    run.current.timers.forEach(clearTimeout)
  }

  const handleStart = async () => {
    run.current = { cancelled: false, timers: [], sent: new Set(), rooms: new Set(scenario.rooms) }
    setActive(scenario)
    addLog(`▶ Started scenario: ${scenario.label}`)
    if (live3dApp) addLog('⚠ The 3D app is sending: its periodic report will overwrite these readings within 15 s')
    try {
      await SCENARIO_RUNNERS[scenario.id]()
      if (!run.current.cancelled) addLog(`■ Scenario finished: ${scenario.label}. Use Reset to return its sensors to normal.`)
    } catch {
      addLog('✕ Scenario stopped: the API did not accept a reading (is the backend running with ENABLE_DEV_ENDPOINTS=true?)')
    } finally {
      run.current.cancelled = true
      setActive(null)
    }
  }

  const handleStop = () => {
    cancelRun()
    addLog(`■ Stopped scenario: ${active?.label}`)
    setActive(null)
  }

  const handleReset = async () => {
    setShowReset(false)
    cancelRun()
    setActive(null)
    const changed = [...touched.current]
    setLog([{ time: new Date().toLocaleTimeString(), msg: '↺ Reset: sending normal readings for the sensors the simulations changed…' }])
    setBusy(true)
    const rooms = new Set(SCENARIOS.flatMap(s => s.rooms))
    run.current = { cancelled: false, timers: [], sent: new Set(), rooms }
    try {
      for (const id of changed) await send(id)
      touched.current.clear()
      addLog(changed.length ? `✓ ${changed.length} sensor(s) back to normal.` : 'ℹ Nothing to reset.')
    } catch {
      addLog('✕ Reset incomplete: the API did not accept a reading.')
    } finally {
      run.current.cancelled = true
      setBusy(false)
    }
  }

  const controlsDisabled = busy

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Active simulation banner */}
      {active && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: '10px 24px', background: 'rgba(245,164,0,0.10)', border: '1px solid var(--amber-500)',
          borderRadius: 8, color: 'var(--amber-500)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
          fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ fontSize: 16 }}>⚗</span>
          SIMULATION MODE — TEST DATA — not live sensor readings
          <span style={{ marginLeft: 12, fontWeight: 400, fontSize: 12, opacity: 0.75 }}>{active.label}</span>
        </div>
      )}

      {live3dApp && !active && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-sans)',
          background: 'rgba(47,111,222,0.08)', border: '1px solid rgba(47,111,222,0.35)', color: 'var(--ink-600)',
        }}>
          ℹ The 3D app is sending readings. It re-sends its own slider values every 15 s, which overwrites simulated
          readings. Close it, or set <strong>Periodic</strong> to 0 in its Settings tab, while you run a simulation.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 16 }}>

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
                aria-pressed={isActive}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-raised)',
                  boxShadow: isActive ? 'var(--neo-inset)' : 'var(--neo-raised-sm)', border: 'none',
                  color: isActive ? 'var(--orange-500)' : 'var(--ink-900)',
                  cursor: active ? 'not-allowed' : 'pointer', opacity: active && !isActive ? 0.5 : 1,
                  transition: 'all var(--transition-fast)', fontFamily: 'var(--font-sans)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', lineHeight: 1.4 }}>{s.description}</div>
              </button>
            )
          })}
        </div>

        {/* Controls + log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

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
                <button
                  onClick={handleStart}
                  disabled={controlsDisabled}
                  style={{
                    padding: '8px 22px', background: 'var(--orange-500)', border: 'none', borderRadius: 8,
                    color: '#fff', cursor: controlsDisabled ? 'wait' : 'pointer', fontWeight: 700, fontSize: 13,
                    fontFamily: 'var(--font-sans)', transition: 'background var(--transition-fast)',
                    opacity: controlsDisabled ? 0.6 : 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-600)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--orange-500)'}
                >
                  ▶ Start
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  style={{
                    padding: '8px 22px', background: 'var(--red-600)', border: 'none', borderRadius: 8,
                    color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-sans)',
                  }}
                >
                  ■ Stop
                </button>
              )}
              <button
                onClick={() => setShowReset(true)}
                disabled={controlsDisabled}
                style={{
                  padding: '8px 22px', background: 'var(--bg-raised)', boxShadow: 'var(--neo-raised-sm)',
                  border: 'none', borderRadius: 8, color: 'var(--amber-500)', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'var(--font-sans)', fontWeight: 600, transition: 'all var(--transition-fast)',
                }}
              >
                ↺ Reset
              </button>
            </div>

            {showReset && (
              <div style={{ marginTop: 14, padding: 14, background: 'rgba(245,164,0,0.08)', border: '1px solid var(--amber-500)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--amber-500)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                  ⚠ Reset stops the scenario and sends normal readings for every sensor it changed. Confirm?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleReset}
                    style={{ padding: '5px 16px', background: 'var(--amber-500)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-sans)' }}
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowReset(false)}
                    style={{ padding: '5px 16px', background: 'var(--bg-raised)', boxShadow: 'var(--neo-raised-sm)', border: 'none', borderRadius: 6, color: 'var(--ink-600)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ flex: 1, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-400)', fontFamily: 'var(--font-sans)' }}>
                Event Log
              </div>
              {log.length > 0 && !active && (
                <button
                  onClick={() => setLog([])}
                  style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-sans)' }}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{
              background: 'var(--bg-inset)', borderRadius: 8, border: '1px solid var(--border-subtle)',
              padding: 16, fontFamily: 'var(--font-mono)', fontSize: 12, maxHeight: 360, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 2, boxShadow: 'var(--neo-inset)',
            }}>
              {log.length === 0 ? (
                <div style={{ color: 'var(--ink-400)', fontSize: 11 }}>
                  Start a scenario: each reading it sends, the ingestion, the decision engine's verdict and any route change appear here.
                </div>
              ) : log.map((entry, i) => (
                <LogEntry key={i} time={entry.time} msg={entry.msg} />
              ))}
              <div ref={logEnd} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
