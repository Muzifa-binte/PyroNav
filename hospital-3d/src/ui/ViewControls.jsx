import { useState } from 'react'
import { CATEGORY_STYLE } from '../data/hospitalLayout'
import { HAZARD_COLORS, HAZARD_LABELS, LEVEL_COLORS, SENSOR_TYPES } from '../data/sensorTypes'
import { useSimStore } from '../state/useSimStore'

const LEGEND_CATEGORIES = ['critical_care', 'patient', 'ward', 'surgical', 'diagnostic', 'emergency',
                           'support', 'admin', 'public', 'food', 'circulation', 'stairs']

function Legend() {
  return (
    <div className="glass legend">
      <h4>Rooms</h4>
      <div className="legend-grid">
        {LEGEND_CATEGORIES.map((c) => (
          <span key={c} className="legend-item">
            <span className="swatch" style={{ background: CATEGORY_STYLE[c].floor }} />{CATEGORY_STYLE[c].label}
          </span>
        ))}
      </div>
      <h4>Sensors</h4>
      <div className="legend-grid">
        {Object.entries(SENSOR_TYPES).map(([k, t]) => (
          <span key={k} className="legend-item"><b style={{ color: t.color }}>{t.glyph}</b>{t.label}</span>
        ))}
      </div>
      <h4>Sensor LED (slider value, indicative)</h4>
      <div className="legend-grid">
        {Object.entries(LEVEL_COLORS).map(([k, c]) => (
          <span key={k} className="legend-item"><span className="dot" style={{ background: c }} />{k}</span>
        ))}
      </div>
      <h4>Room glow = Decision Engine verdict</h4>
      <div className="legend-grid">
        {['WARNING', 'HIGH_RISK', 'CRITICAL', 'UNKNOWN'].map((k) => (
          <span key={k} className="legend-item"><span className="swatch" style={{ background: HAZARD_COLORS[k] }} />{HAZARD_LABELS[k]}</span>
        ))}
      </div>
      <p className="legend-note">
        Green arrows = evacuation routes, red = extinguishers / call points, green signs = emergency exits.
      </p>
    </div>
  )
}

export default function ViewControls() {
  const requestView = useSimStore((s) => s.requestView)
  const selectedRoomId = useSimStore((s) => s.selectedRoomId)
  const selectRoom = useSimStore((s) => s.selectRoom)
  const wallMode = useSimStore((s) => s.wallMode)
  const setWallMode = useSimStore((s) => s.setWallMode)
  const showLabels = useSimStore((s) => s.showLabels)
  const toggleLabels = useSimStore((s) => s.toggleLabels)
  const showEffects = useSimStore((s) => s.showEffects)
  const toggleEffects = useSimStore((s) => s.toggleEffects)
  const [legend, setLegend] = useState(false)

  return (
    <div className="overlay view-controls">
      {legend && <Legend />}
      <div className="glass btn-row" role="toolbar" aria-label="View">
        <button type="button" className="tool-btn" onClick={() => requestView('overview')} title="Isometric overview">⌂ Overview</button>
        <button type="button" className="tool-btn" onClick={() => requestView('top')} title="Plan view from above">▦ Top</button>
        <button type="button" className="tool-btn" disabled={!selectedRoomId} onClick={() => selectRoom(selectedRoomId)}
                title="Fly to the selected room">◎ Focus room</button>
        <span style={{ width: 1, background: 'var(--border)', margin: '2px 3px' }} />
        <button type="button" className={`tool-btn${wallMode === 'cutaway' ? ' active' : ''}`}
                onClick={() => setWallMode(wallMode === 'cutaway' ? 'full' : 'cutaway')} title="Lower the walls to see inside">
          ▤ Cutaway
        </button>
        <button type="button" className={`tool-btn${showLabels ? ' active' : ''}`} onClick={toggleLabels}>Aa Labels</button>
        <button type="button" className={`tool-btn${showEffects ? ' active' : ''}`} onClick={toggleEffects}
                title="Smoke / fire / spark visuals driven by the sliders">🔥 Effects</button>
        <button type="button" className={`tool-btn${legend ? ' active' : ''}`} onClick={() => setLegend((v) => !v)}>ⓘ Legend</button>
      </div>
    </div>
  )
}
