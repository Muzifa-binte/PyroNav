/**
 * Classify sensor readings exactly as Member 2's decision engine does, using the
 * engine's own rules (GET /api/v1/thresholds = decision_engine/config/thresholds.json),
 * so a dashboard never shows different limits than the engine applies.
 */
import * as api from '../services/api'

export const LEVEL_RANK = { UNKNOWN: 0, NORMAL: 1, WARNING: 2, HIGH_RISK: 3, CRITICAL: 4 }

// Row / value colours per level (match StatusPill)
export const LEVEL_STYLE = {
  WARNING:   { color: '#F5A400', tint: 'rgba(245,164,0,0.12)' },
  HIGH_RISK: { color: '#FF6A1A', tint: 'rgba(255,106,26,0.14)' },
  CRITICAL:  { color: '#D62828', tint: 'rgba(214,40,40,0.14)' },
}

let thresholdsPromise = null

/** The engine's rules, fetched once per page load. */
export function loadThresholds() {
  if (!thresholdsPromise) {
    thresholdsPromise = api.getThresholds().catch(err => {
      thresholdsPromise = null   // retry on the next call
      throw err
    })
  }
  return thresholdsPromise
}

function passes(value, condition, threshold) {
  switch (condition) {
    case '>=': return value >= threshold
    case '>':  return value > threshold
    case '<=': return value <= threshold
    case '<':  return value < threshold
    case '==': return value === threshold
    default:   return false
  }
}

// Current rules scale with the circuit's rating (threshold_ratio_of_rated)
function thresholdOf(rule, ratedCurrent) {
  return rule.threshold_ratio_of_rated != null && ratedCurrent
    ? rule.threshold_ratio_of_rated * ratedCurrent
    : rule.threshold
}

/**
 * Hazard level of one measurement (e.g. field "co" of a "co" sensor),
 * or of all its measurements when field is omitted. null without data.
 */
export function readingLevel(thresholds, sensorType, values, ratedCurrent, field = null) {
  if (!thresholds || !values) return null
  let level = 'NORMAL'
  for (const rule of thresholds.rules || []) {
    if (rule.sensor_type !== sensorType || (field && rule.field !== field)) continue
    const value = values[rule.field]
    if (typeof value !== 'number') continue
    if (passes(value, rule.condition, thresholdOf(rule, ratedCurrent))
        && LEVEL_RANK[rule.hazard_level] > LEVEL_RANK[level]) {
      level = rule.hazard_level
    }
  }
  if (field) return level
  // Combined rules (e.g. smoke AND temperature) on this sensor's own values
  for (const rule of thresholds.room_level_rules || []) {
    const met = Object.entries(rule.conditions || {}).every(([m, c]) => {
      const v = values[m]
      return typeof v === 'number' && (c.min == null || v >= c.min) && (c.max == null || v <= c.max)
    })
    if (met && LEVEL_RANK[rule.hazard_level] > LEVEL_RANK[level]) level = rule.hazard_level
  }
  return level
}

/** Hazard level of a sensor row from GET /sensors (values = its latest values). */
export function sensorLevel(thresholds, sensor, values) {
  return readingLevel(thresholds, sensor.sensor_type, values, sensor.metadata?.rated_current_a)
}

/** Human-readable text for a reason code such as "CO_HIGH_RISK". */
export function describeRule(thresholds, ruleId) {
  const rule = [...(thresholds?.rules || []), ...(thresholds?.room_level_rules || [])]
    .find(r => r.rule_id === ruleId)
  return rule?.description || ruleId
}

// Sensor types of the PyroNav hospital (same colours as the 3D app)
export const SENSOR_TYPES = {
  smoke_heat: { label: 'Smoke + heat detector',         icon: '💨', color: '#5B9BF5' },
  co:         { label: 'Carbon monoxide (CO) detector', icon: '☁️', color: '#A66CFF' },
  current:    { label: 'Circuit current monitor',       icon: '⚡', color: '#F5A623' },
}
