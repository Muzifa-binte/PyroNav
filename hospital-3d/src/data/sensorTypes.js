/**
 * Slider ranges and INDICATIVE colour bands per measurement.
 *
 * The bands only colour the sliders and the 3D status LEDs so you can see where
 * a value sits. The authoritative classification (NORMAL … CRITICAL) is made by
 * Member 2's Decision Engine and arrives back over the WebSocket as
 * room_status_changed — shown as the room glow and the room's hazard badge.
 * Smoke/temperature bands follow the threshold draft in docs/MEMBER-2-TASKS.md.
 */

export const FIELDS = {
  smoke: {
    label: 'Smoke', unit: 'ppm', min: 0, max: 300, step: 1, decimals: 0,
    bands: { warning: 50, high: 80, critical: 100 },
  },
  temperature: {
    label: 'Temperature', unit: '°C', min: 0, max: 200, step: 0.5, decimals: 1,
    bands: { warning: 40, high: 60, critical: 80 },
  },
  co: {
    label: 'Carbon monoxide', unit: 'ppm', min: 0, max: 500, step: 1, decimals: 0,
    bands: { warning: 35, high: 100, critical: 200 },
  },
  current: {
    // Range and bands are relative to the circuit's rated current (registry: rated_current_a)
    label: 'Current', unit: 'A', min: 0, max: null, step: 0.1, decimals: 1,
    relativeBands: { warning: 0.8, high: 1.0, critical: 1.25 },
  },
}

export const SENSOR_TYPES = {
  smoke_heat: { label: 'Smoke + heat detector', short: 'Smoke/Heat', color: '#5B9BF5', glyph: '◉' },
  co:         { label: 'Carbon-monoxide detector', short: 'CO',      color: '#A66CFF', glyph: '◆' },
  current:    { label: 'Circuit current monitor', short: 'Current',  color: '#F5A623', glyph: 'ϟ' },
}

export const LEVELS = ['normal', 'warning', 'high', 'critical']
export const LEVEL_COLORS = {
  normal: '#22C987', warning: '#F5A623', high: '#F56E3B', critical: '#E84D6A',
}

// Decision Engine hazard levels (shared-contracts/hazard-levels.json)
export const HAZARD_COLORS = {
  NORMAL: '#22C987', WARNING: '#F5A623', HIGH_RISK: '#F56E3B', CRITICAL: '#E84D6A', UNKNOWN: '#94A3B8',
}
export const HAZARD_LABELS = {
  NORMAL: 'Normal', WARNING: 'Warning', HIGH_RISK: 'High risk', CRITICAL: 'Critical', UNKNOWN: 'Unknown',
}

/** Slider spec for one measurement of one sensor. */
export function fieldSpec(sensor, field) {
  const base = FIELDS[field] || { label: field, unit: '', min: 0, max: 100, step: 1, decimals: 1, bands: {} }
  if (field !== 'current') return base
  const rated = sensor.rated_current_a || 20
  const r = base.relativeBands
  return {
    ...base,
    max: Math.round(rated * 2),
    bands: { warning: +(rated * r.warning).toFixed(1), high: rated, critical: +(rated * r.critical).toFixed(1) },
    rated,
  }
}

export function fieldsOf(sensor) {
  return Object.keys(sensor.unit_config || {})
}

export function levelOf(spec, value) {
  const b = spec.bands || {}
  if (b.critical != null && value >= b.critical) return 'critical'
  if (b.high != null && value >= b.high) return 'high'
  if (b.warning != null && value >= b.warning) return 'warning'
  return 'normal'
}

export function sensorLevel(sensor, values = {}) {
  let worst = 0
  for (const f of fieldsOf(sensor)) {
    const lvl = LEVELS.indexOf(levelOf(fieldSpec(sensor, f), values[f] ?? 0))
    if (lvl > worst) worst = lvl
  }
  return LEVELS[worst]
}

export function formatValue(spec, value) {
  return Number(value ?? 0).toFixed(spec.decimals ?? 1)
}

export function displayUnit(unit) {
  return unit === 'degC' ? '°C' : unit
}
