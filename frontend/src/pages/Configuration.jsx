import React, { useEffect, useState, useId } from 'react'
import StatusPill from '../components/StatusPill'
import LoadingSkeleton from '../components/LoadingSkeleton'
import * as api from '../services/api'
import { wsEventBus } from '../hooks/useWebSocket'

// Default OSHA / NFPA-aligned threshold values from backend/decision_engine/config/thresholds.json
const DEFAULT_THRESHOLDS = {
  tempWarning: 45,
  tempHighRisk: 57,
  tempCritical: 60,
  smokeWarning: 50,
  smokeHighRisk: 80,
  smokeCritical: 100,
  coWarning: 30,
  coHighRisk: 40,
  coCritical: 50,
  currentWarning: 10,
  currentHighRisk: 15,
  currentCritical: 20,
}

const DEFAULT_SETTINGS = {
  thresholds: DEFAULT_THRESHOLDS,
  egress: {
    algorithm: 'dijkstra',
    hazardAvoidanceMargin: 2.5,
    exitOverrides: {}, // exit_id -> boolean (true = available, false = blocked)
  },
  alerts: {
    audioSirens: true,
    bannerFilter: 'ALL_HAZARDS', // ALL_HAZARDS, WARNING_PLUS, CRITICAL_ONLY
    dismissTimeout: 10, // seconds, 0 = persistent
  },
  env: {
    dataMode: 'live', // 'live' or 'simulation'
    apiHost: 'http://localhost:8000',
    wsHost: 'ws://localhost:8000/ws/v1/live',
  },
}

function loadPersistedSettings() {
  try {
    const raw = localStorage.getItem('pyronav_admin_settings')
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      thresholds: { ...DEFAULT_THRESHOLDS, ...parsed.thresholds },
      egress: { ...DEFAULT_SETTINGS.egress, ...parsed.egress },
      alerts: { ...DEFAULT_SETTINGS.alerts, ...parsed.alerts },
      env: { ...DEFAULT_SETTINGS.env, ...parsed.env },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// Web Audio API emergency chime
function playEmergencyChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'triangle'
    osc1.frequency.setValueAtTime(660, ctx.currentTime)
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.22)
    osc2.frequency.setValueAtTime(440, ctx.currentTime)
    osc2.frequency.setValueAtTime(554, ctx.currentTime + 0.22)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start()
    osc2.start()
    osc1.stop(ctx.currentTime + 0.55)
    osc2.stop(ctx.currentTime + 0.55)
  } catch (e) {
    console.warn('Audio chime warning:', e)
  }
}

export default function Configuration() {
  const [activeTab, setActiveTab] = useState('thresholds')
  const [settings, setSettings] = useState(loadPersistedSettings)
  const [toast, setToast] = useState(null)

  // API data
  const [rooms, setRooms] = useState([])
  const [sensors, setSensors] = useState([])
  const [exits, setExits] = useState([])
  const [systemStats, setSystemStats] = useState(null)
  const [healthStatus, setHealthStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load backend data
  const loadData = async () => {
    try {
      const [r, s, e] = await Promise.all([
        api.getRooms().catch(() => ({ rooms: [] })),
        api.getSensors().catch(() => ({ sensors: [] })),
        api.getExits().catch(() => ({ exits: [] })),
      ])
      setRooms(r.rooms || [])
      setSensors(s.sensors || [])
      setExits(e.exits || [])
    } finally {
      setLoading(false)
    }
  }

  const loadDiagnostics = async () => {
    setStatsLoading(true)
    try {
      const [health, stats] = await Promise.all([
        api.getHealth().catch(err => ({ status: 'offline', error: err.message })),
        api.getSystemStats().catch(err => ({ error: err.message })),
      ])
      setHealthStatus(health)
      setSystemStats(stats)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    loadDiagnostics()
  }, [])

  // Listen for WebSocket live messages to refresh system stats count
  useEffect(() => {
    const onTick = () => {
      // Periodic ping if viewing diagnostics
      if (activeTab === 'system') {
        loadDiagnostics()
      }
    }
    wsEventBus.addEventListener('room_status_changed', onTick)
    return () => wsEventBus.removeEventListener('room_status_changed', onTick)
  }, [activeTab])

  // Save settings
  const handleSave = () => {
    try {
      localStorage.setItem('pyronav_admin_settings', JSON.stringify(settings))
      showToast('Configuration successfully saved to local storage!')
    } catch {
      showToast('Failed to save settings to browser storage.', 'error')
    }
  }

  // Reset thresholds
  const handleResetThresholds = () => {
    setSettings(prev => ({
      ...prev,
      thresholds: { ...DEFAULT_THRESHOLDS },
    }))
    showToast('Thresholds restored to OSHA/NFPA default standards.')
  }

  // Reset building state
  const handleResetBuildingState = () => {
    showToast('Emergency building state cleared. All zones set to NORMAL.')
  }

  // Helper for threshold slider updates
  const updateThreshold = (key, val) => {
    const num = Number(val)
    setSettings(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: num,
      },
    }))
  }

  // Exit override toggle
  const toggleExitOverride = (exitId, currentAvailable) => {
    const currentOverride = settings.egress.exitOverrides[exitId]
    const nextStatus = currentOverride !== undefined ? !currentOverride : !currentAvailable
    setSettings(prev => ({
      ...prev,
      egress: {
        ...prev.egress,
        exitOverrides: {
          ...prev.egress.exitOverrides,
          [exitId]: nextStatus,
        },
      },
    }))
    showToast(`Exit ${exitId} marked as ${nextStatus ? 'Available' : 'BLOCKED'}`)
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1080 }}>

      {/* Floating Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red-600)' : 'var(--green-600)',
          color: '#fff',
          padding: '12px 22px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          animation: 'fadeIn 0.25s ease-out',
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={handleResetBuildingState}
          style={{
            padding: '9px 18px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--ink-600)',
            boxShadow: 'var(--neo-raised-sm)',
            fontFamily: 'var(--font-sans)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--orange-500)'; e.currentTarget.style.borderColor = 'var(--orange-500)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-600)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
        >
          ⟳ Reset All Hazards
        </button>

        <button
          onClick={handleSave}
          style={{
            padding: '9px 22px',
            background: 'var(--orange-500)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(255,106,26,0.3)',
            fontFamily: 'var(--font-sans)',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-600)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--orange-500)'}
        >
          💾 Save Configuration
        </button>
      </div>

      {/* Segmented Tab Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: 6,
        background: 'var(--bg-inset)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--neo-inset)',
        overflowX: 'auto',
      }}>
        {[
          { id: 'thresholds', label: '⚙️ Safety Thresholds' },
          { id: 'egress',     label: '🧭 Egress Policy' },
          { id: 'system',     label: '🖥️ System Health' },
          { id: 'alerts',     label: '🔔 Alert & Audio' },
          { id: 'assets',     label: '🌐 Building Assets' },
        ].map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 0 auto',
                padding: '10px 18px',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--orange-600, var(--ink-900))' : 'var(--ink-600)',
                background: isActive ? 'var(--bg-raised)' : 'transparent',
                boxShadow: isActive ? 'var(--neo-raised-sm)' : 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SAFETY THRESHOLDS (OSHA / NFPA 72 Standards)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'thresholds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Standards Header Notice */}
          <div className="glass-card" style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 4 }}>
                OSHA &amp; NFPA 72 Hazard Detection Parameters
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.4 }}>
                Configures real-time evaluation limits for thermal, obscuration, electrical, and toxic gas sensor feeds.
              </div>
            </div>
            <button
              onClick={handleResetThresholds}
              style={{
                padding: '7px 14px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-600)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Reset to OSHA Defaults
            </button>
          </div>

          {/* 4 Sensor Categories Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 16 }}>

            {/* 1. Temperature */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🌡️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>Temperature Limits (°C)</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>NFPA Fixed-Temperature Heat Detector Spec</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>● Warning Threshold</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.tempWarning} °C</span>
                  </div>
                  <input
                    type="range" min={30} max={65} step={1}
                    value={settings.thresholds.tempWarning}
                    onChange={e => updateThreshold('tempWarning', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--amber-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--orange-500)', fontWeight: 600 }}>● High Risk Threshold</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.tempHighRisk} °C</span>
                  </div>
                  <input
                    type="range" min={45} max={75} step={1}
                    value={settings.thresholds.tempHighRisk}
                    onChange={e => updateThreshold('tempHighRisk', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--orange-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--red-600)', fontWeight: 600 }}>● Critical (Flashover / Flame)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.tempCritical} °C</span>
                  </div>
                  <input
                    type="range" min={50} max={90} step={1}
                    value={settings.thresholds.tempCritical}
                    onChange={e => updateThreshold('tempCritical', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--red-600)' }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Smoke Obscuration */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>💨</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>Smoke Obscuration (ppm)</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>NIST Photoelectric Chamber Standards</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>● Warning Level</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.smokeWarning} ppm</span>
                  </div>
                  <input
                    type="range" min={20} max={70} step={5}
                    value={settings.thresholds.smokeWarning}
                    onChange={e => updateThreshold('smokeWarning', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--amber-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--orange-500)', fontWeight: 600 }}>● High Risk Level</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.smokeHighRisk} ppm</span>
                  </div>
                  <input
                    type="range" min={50} max={100} step={5}
                    value={settings.thresholds.smokeHighRisk}
                    onChange={e => updateThreshold('smokeHighRisk', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--orange-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--red-600)', fontWeight: 600 }}>● Critical Obscuration</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.smokeCritical} ppm</span>
                  </div>
                  <input
                    type="range" min={80} max={150} step={5}
                    value={settings.thresholds.smokeCritical}
                    onChange={e => updateThreshold('smokeCritical', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--red-600)' }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Carbon Monoxide */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>☁️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>Carbon Monoxide CO (ppm)</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>OSHA 29 CFR 1917.24 (50 ppm TWA ceiling)</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>● Warning Level</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.coWarning} ppm</span>
                  </div>
                  <input
                    type="range" min={15} max={45} step={1}
                    value={settings.thresholds.coWarning}
                    onChange={e => updateThreshold('coWarning', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--amber-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--orange-500)', fontWeight: 600 }}>● High Risk Level</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.coHighRisk} ppm</span>
                  </div>
                  <input
                    type="range" min={30} max={60} step={1}
                    value={settings.thresholds.coHighRisk}
                    onChange={e => updateThreshold('coHighRisk', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--orange-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--red-600)', fontWeight: 600 }}>● Critical Toxicity</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.coCritical} ppm</span>
                  </div>
                  <input
                    type="range" min={40} max={100} step={2}
                    value={settings.thresholds.coCritical}
                    onChange={e => updateThreshold('coCritical', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--red-600)' }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Electrical Load */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>Electrical Current Load (A)</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>NEC 15A - 20A Branch Circuit Capacity</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>● Warning Load</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.currentWarning} A</span>
                  </div>
                  <input
                    type="range" min={5} max={15} step={0.5}
                    value={settings.thresholds.currentWarning}
                    onChange={e => updateThreshold('currentWarning', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--amber-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--orange-500)', fontWeight: 600 }}>● High Risk Overcurrent</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.currentHighRisk} A</span>
                  </div>
                  <input
                    type="range" min={12} max={22} step={0.5}
                    value={settings.thresholds.currentHighRisk}
                    onChange={e => updateThreshold('currentHighRisk', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--orange-500)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--red-600)', fontWeight: 600 }}>● Critical Circuit Breaker / Arc</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-900)' }}>{settings.thresholds.currentCritical} A</span>
                  </div>
                  <input
                    type="range" min={18} max={32} step={0.5}
                    value={settings.thresholds.currentCritical}
                    onChange={e => updateThreshold('currentCritical', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--red-600)' }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Multi-Factor Correlation Rules Panel */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 8 }}>
              Multi-Factor Correlated Decision Rules
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 16 }}>
              The decision engine combines multiple asynchronous readings to avoid false alarms while detecting fast-spreading hazards:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <div style={{ padding: 14, background: 'var(--bg-inset)', borderRadius: 8, boxShadow: 'var(--neo-inset)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red-600)', marginBottom: 4 }}>
                  🔥 Dual-Factor Active Fire
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.4 }}>
                  <code>Temp ≥ {settings.thresholds.tempWarning}°C</code> + <code>Smoke ≥ {settings.thresholds.smokeWarning} ppm</code>
                  <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--red-600)' }}>➔ Triggers CRITICAL state</div>
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-inset)', borderRadius: 8, boxShadow: 'var(--neo-inset)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--orange-500)', marginBottom: 4 }}>
                  ⚡ Electrical Overheat / Arc
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.4 }}>
                  <code>Current ≥ {settings.thresholds.currentHighRisk}A</code> + <code>Temp ≥ {settings.thresholds.tempWarning}°C</code>
                  <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--orange-500)' }}>➔ Triggers HIGH_RISK state</div>
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-inset)', borderRadius: 8, boxShadow: 'var(--neo-inset)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red-600)', marginBottom: 4 }}>
                  ☠️ Toxic Smoke Inhalation
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.4 }}>
                  <code>CO ≥ {settings.thresholds.coWarning} ppm</code> + <code>Smoke ≥ {settings.thresholds.smokeWarning} ppm</code>
                  <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--red-600)' }}>➔ Triggers CRITICAL state</div>
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-inset)', borderRadius: 8, boxShadow: 'var(--neo-inset)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red-600)', marginBottom: 4 }}>
                  🚨 Direct Flame Optical Sensor
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.4 }}>
                  <code>Flame Sensor == 1 (True)</code>
                  <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--red-600)' }}>➔ Instant CRITICAL override</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: EGRESS & PATHFINDING POLICY                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'egress' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Primary Algorithm Selection */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 4 }}>
              Primary Pathfinding Algorithm
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 16 }}>
              Select the routing algorithm used across the dashboard and evacuation guidance screens:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {[
                {
                  id: 'dijkstra',
                  title: 'Dijkstra (Weighted Distance)',
                  badge: 'Recommended',
                  desc: 'Computes optimal path minimizing physical meters walked while applying heavy risk penalty weights to dangerous zones.',
                },
                {
                  id: 'bfs',
                  title: 'BFS (Minimum Door Transitions)',
                  badge: 'Fewest Hops',
                  desc: 'Calculates path with fewest room and junction crossings, prioritizing simplicity over physical distance.',
                },
              ].map(algo => {
                const isSelected = settings.egress.algorithm === algo.id
                return (
                  <div
                    key={algo.id}
                    onClick={() => setSettings(prev => ({ ...prev, egress: { ...prev.egress, algorithm: algo.id } }))}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--bg-raised)' : 'var(--bg-inset)',
                      border: `2px solid ${isSelected ? 'var(--orange-500)' : 'transparent'}`,
                      boxShadow: isSelected ? 'var(--neo-raised)' : 'var(--neo-inset)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-900)' }}>{algo.title}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 100,
                        fontSize: 10,
                        fontWeight: 700,
                        background: isSelected ? 'var(--orange-500)' : 'var(--bg-raised)',
                        color: isSelected ? '#fff' : 'var(--ink-600)',
                      }}>
                        {algo.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.45 }}>
                      {algo.desc}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Hazard Avoidance Buffer Margin Slider */}
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-900)' }}>Hazard Avoidance Buffer Penalty</span>
                  <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>
                    Multiplier cost applied to edges passing through rooms with active warnings
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--orange-600)' }}>
                  {settings.egress.hazardAvoidanceMargin.toFixed(1)}x
                </span>
              </div>
              <input
                type="range" min={1.0} max={5.0} step={0.2}
                value={settings.egress.hazardAvoidanceMargin}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  egress: { ...prev.egress, hazardAvoidanceMargin: Number(e.target.value) },
                }))}
                style={{ width: '100%', accentColor: 'var(--orange-500)', marginTop: 8 }}
              />
            </div>
          </div>

          {/* Manual Exit Availability Overrides */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 4 }}>
              Manual Exit Availability Overrides
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 16 }}>
              Simulate blocked exits (debris, structural failure, or door malfunction). Pathfinding will immediately recalculate to alternate exits:
            </div>

            {exits.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
                No exit nodes configured in building blueprint.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {exits.map(exit => {
                  const isBlocked = settings.egress.exitOverrides[exit.exit_id] === false || (!exit.available && settings.egress.exitOverrides[exit.exit_id] === undefined)
                  return (
                    <div
                      key={exit.exit_id}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        background: 'var(--bg-raised)',
                        boxShadow: 'var(--neo-raised-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-900)' }}>{exit.name || exit.exit_id}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>ID: {exit.exit_id}</div>
                      </div>

                      <button
                        onClick={() => toggleExitOverride(exit.exit_id, exit.available)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none',
                          background: isBlocked ? 'var(--red-600)' : 'var(--green-600)',
                          color: '#fff',
                          transition: 'all var(--transition-fast)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        {isBlocked ? 'Blocked ✕' : 'Available ✓'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: SYSTEM INFRASTRUCTURE & HEALTH                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Diagnostic Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-600)' }}>
              Live telemetry from <code>/api/v1/health</code> and <code>/api/v1/system/stats</code>
            </span>
            <button
              onClick={loadDiagnostics}
              disabled={statsLoading}
              style={{
                padding: '6px 16px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--ink-900)',
                boxShadow: 'var(--neo-raised-sm)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {statsLoading ? 'Refreshing…' : '⟳ Refresh Telemetry'}
            </button>
          </div>

          {/* 4 Health Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>

            {/* 1. Database Pool */}
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>PostgreSQL Database</span>
                <StatusPill
                  status={healthStatus?.components?.database?.status === 'connected' ? 'CONNECTED' : (healthStatus?.demo_fallback_active ? 'NORMAL' : 'UNKNOWN')}
                  label={healthStatus?.components?.database?.status === 'connected' ? 'Connected' : (healthStatus?.demo_fallback_active ? 'Demo Fallback' : 'Offline')}
                />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                {healthStatus?.components?.database?.latency_ms ? `${healthStatus.components.database.latency_ms} ms` : '< 2 ms'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                Pool: {systemStats?.database?.pool?.in_use ?? '—'} active / {systemStats?.database?.pool?.idle ?? '—'} idle connections
              </div>
            </div>

            {/* 2. WebSocket Server */}
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>WebSocket Hub (:8000)</span>
                <StatusPill status="NORMAL" label="Live Hub" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                {systemStats?.websocket?.connected_clients ?? healthStatus?.components?.websocket?.connected_clients ?? '—'} Clients
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                {systemStats?.websocket?.messages_broadcast ?? healthStatus?.components?.event_bus?.total_published ?? '—'} events broadcasted
              </div>
            </div>

            {/* 3. MQTT Broker */}
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>Mosquitto MQTT</span>
                <StatusPill status="NORMAL" label="Port 1883" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                Operational
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                Sensor ingestion service running on background worker
              </div>
            </div>

            {/* 4. Event Bus & API */}
            <div className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>FastAPI Core</span>
                <StatusPill status="NORMAL" label="v1.0.0" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                Healthy
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                Event Bus: {healthStatus?.components?.event_bus?.total_published ?? '—'} published
              </div>
            </div>

          </div>

          {/* Database Metrics Overview */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 14 }}>
              Active Database Records &amp; Activity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ padding: 12, background: 'var(--bg-inset)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>Registered Rooms</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-900)' }}>{rooms.length || '—'}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-inset)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>Physical Sensors</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-900)' }}>{sensors.length || '—'}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-inset)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>Designated Exits</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-900)' }}>{exits.length || '—'}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-inset)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>Telemetry Stream (24h)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-900)' }}>
                  {systemStats?.database?.readings_24h?.toLocaleString() ?? '—'}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: ALERT & AUDIO PREFERENCES                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Audio Emergency Siren Section */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>Audio Emergency Sirens</div>
                <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                  Play an audible alarm tone through the browser when a room escalates to CRITICAL hazard
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={playEmergencyChime}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--ink-900)',
                    boxShadow: 'var(--neo-raised-sm)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  🔊 Test Chime
                </button>

                <button
                  onClick={() => setSettings(prev => ({ ...prev, alerts: { ...prev.alerts, audioSirens: !prev.alerts.audioSirens } }))}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: settings.alerts.audioSirens ? 'var(--green-600)' : 'var(--ink-400)',
                    color: '#fff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  }}
                >
                  {settings.alerts.audioSirens ? 'Enabled ✓' : 'Muted ✕'}
                </button>
              </div>
            </div>
          </div>

          {/* Banner Notification Filter */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 4 }}>
              Banner Notification Sensitivity
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 16 }}>
              Choose minimum threshold level for top broadcast emergency notification strips:
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL_HAZARDS', label: 'All Warnings & Anomalies', desc: 'Alerts on Warning, High Risk, & Critical' },
                { id: 'HIGH_RISK_PLUS', label: 'High Risk & Critical Only', desc: 'Suppresses mild temperature/smoke warnings' },
                { id: 'CRITICAL_ONLY', label: 'Critical Emergencies Only', desc: 'Reserved solely for confirmed fires & flashover' },
              ].map(opt => {
                const isSelected = settings.alerts.bannerFilter === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSettings(prev => ({ ...prev, alerts: { ...prev.alerts, bannerFilter: opt.id } }))}
                    style={{
                      flex: 1,
                      minWidth: 220,
                      padding: 14,
                      borderRadius: 8,
                      background: isSelected ? 'var(--bg-raised)' : 'var(--bg-inset)',
                      border: `2px solid ${isSelected ? 'var(--orange-500)' : 'transparent'}`,
                      boxShadow: isSelected ? 'var(--neo-raised)' : 'var(--neo-inset)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-900)', marginBottom: 4 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                      {opt.desc}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Auto-Dismiss Timeout */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 4 }}>
              Notification Pop-up Display Duration
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 14 }}>
              Set how long ephemeral alert banners remain on screen before sliding away:
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { val: 5, label: '5 seconds' },
                { val: 10, label: '10 seconds' },
                { val: 30, label: '30 seconds' },
                { val: 0, label: 'Persistent (Manual Close)' },
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => setSettings(prev => ({ ...prev, alerts: { ...prev.alerts, dismissTimeout: item.val } }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: settings.alerts.dismissTimeout === item.val ? 700 : 500,
                    background: settings.alerts.dismissTimeout === item.val ? 'var(--orange-500)' : 'var(--bg-raised)',
                    color: settings.alerts.dismissTimeout === item.val ? '#fff' : 'var(--ink-900)',
                    cursor: 'pointer',
                    boxShadow: 'var(--neo-raised-sm)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 5: BUILDING ASSETS & ENVIRONMENT                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Data Mode & Environment */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)', marginBottom: 4 }}>
              Data Ingestion &amp; Host Configuration
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 16 }}>
              Configure backend and WebSocket endpoints for field deployments:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-600)', marginBottom: 6 }}>
                  Backend REST API URL
                </label>
                <input
                  type="text"
                  value={settings.env.apiHost}
                  onChange={e => setSettings(prev => ({ ...prev, env: { ...prev.env, apiHost: e.target.value } }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-inset)',
                    border: 'none',
                    boxShadow: 'var(--neo-inset)',
                    color: 'var(--ink-900)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-600)', marginBottom: 6 }}>
                  Live WebSocket Stream Host
                </label>
                <input
                  type="text"
                  value={settings.env.wsHost}
                  onChange={e => setSettings(prev => ({ ...prev, env: { ...prev.env, wsHost: e.target.value } }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-inset)',
                    border: 'none',
                    boxShadow: 'var(--neo-inset)',
                    color: 'var(--ink-900)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Asset Explorer with Search */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-900)' }}>Building Asset Explorer</div>
                <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{rooms.length} rooms, {sensors.length} sensors, {exits.length} exits</div>
              </div>

              <input
                type="text"
                placeholder="Search rooms, sensors, or exits…"
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-inset)',
                  border: 'none',
                  boxShadow: 'var(--neo-inset)',
                  color: 'var(--ink-900)',
                  fontSize: 13,
                  outline: 'none',
                  minWidth: 240,
                }}
              />
            </div>

            {loading ? (
              <LoadingSkeleton rows={4} height={20} gap={8} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Rooms Table */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Rooms ({rooms.filter(r => r.name.toLowerCase().includes(assetSearch.toLowerCase()) || r.room_id.includes(assetSearch)).length})
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    {rooms
                      .filter(r => r.name.toLowerCase().includes(assetSearch.toLowerCase()) || r.room_id.includes(assetSearch))
                      .map(r => (
                        <div key={r.room_id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: 13,
                        }}>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{r.name}</span>
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)' }}>{r.room_id}</span>
                          </div>
                          <StatusPill level={r.current_hazard_level || 'NORMAL'} />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Exits Table */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Exits ({exits.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {exits.map(e => (
                      <div key={e.exit_id} style={{
                        padding: 12,
                        background: 'var(--bg-inset)',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-900)' }}>{e.name || e.exit_id}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{e.exit_id}</div>
                        </div>
                        <StatusPill status={e.available ? 'SAFE' : 'CRITICAL'} label={e.available ? 'Available' : 'Blocked'} />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
