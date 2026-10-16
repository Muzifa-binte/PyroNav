/**
 * The monitored sensors as 3D devices, placed from the registry.
 *
 *   smoke_heat → ceiling detector (the ceiling itself is hidden, a ghost tile marks it)
 *   co         → wall detector with a live LCD
 *   current    → electrical sub-panel with a current-transformer clamp and meter
 *
 * Click = select (opens its sliders), hover = tooltip with sensor_id / room_id.
 * LED + halo colour = the slider value against the indicative bands.
 */
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ROOM_BY_ID } from '../../data/hospitalLayout'
import { SENSORS } from '../../data/sensorRegistry'
import {
  fieldSpec, formatValue, LEVEL_COLORS, SENSOR_TYPES, sensorLevel,
} from '../../data/sensorTypes'
import { useSimStore } from '../../state/useSimStore'
import { B, C, fromCanvas, GEO, MAT, Panel } from '../primitives'
import { makeDisplay } from '../textures'

const SIZE = 1.7 // devices are drawn larger than life so they stay visible from the overview
const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

function useLevel(sensor) {
  const values = useSimStore((s) => s.values[sensor.sensor_id])
  return { values, level: sensorLevel(sensor, values) }
}

/** Status ring around a device; pulses when not normal. */
function Halo({ color, level, radius = 0.3, vertical = false, selected }) {
  const ref = useRef()
  const material = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }), [])
  material.color.set(selected ? '#2F7CF6' : color)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const alarm = level !== 'normal'
    const t = clock.elapsedTime * (level === 'critical' ? 6 : 3)
    ref.current.material.opacity = selected ? 0.95 : alarm ? 0.55 + 0.4 * Math.sin(t) : 0.45
    const s = alarm ? 1 + 0.12 * Math.sin(t) : 1
    ref.current.scale.set(radius * 2 * s, radius * 2 * s, radius * 2 * s)
  })
  return (
    <mesh ref={ref} geometry={GEO.torus} material={material} rotation={vertical ? [0, 0, 0] : [Math.PI / 2, 0, 0]} />
  )
}

function Led({ color, level, at }) {
  const ref = useRef()
  const material = useMemo(() => new THREE.MeshStandardMaterial({ emissiveIntensity: 2.5, toneMapped: false }), [])
  material.color.set(color)
  material.emissive.set(color)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const on = level === 'normal' ? Math.sin(clock.elapsedTime * 1.5) > 0.6 : Math.sin(clock.elapsedTime * 10) > 0
    ref.current.material.emissiveIntensity = on ? 2.5 : 0.25
  })
  return <mesh ref={ref} geometry={GEO.sphereLow} material={material} position={at} scale={[0.03, 0.03, 0.03]} />
}

function useDisplay(sensor, values, label, color) {
  const display = useMemo(() => makeDisplay(), [])
  const field = sensor.fields[0]
  const spec = fieldSpec(sensor, field)
  useEffect(() => {
    display.draw(label, formatValue(spec, values?.[field]), spec.unit, color)
  }, [display, label, spec, values, field, color])
  useEffect(() => () => display.tex.dispose(), [display])
  return display.tex
}

// ── Device models (local origin = mounting point, front = +z for wall units) ─

function SmokeDetector({ color, level, selected }) {
  return (
    <group scale={[SIZE, SIZE, SIZE]}>
      <B at={[0, -0.006, 0]} s={[0.42, 0.006, 0.42]} m="glass" cast={false} />
      <C at={[0, -0.035, 0]} r={0.12} h={0.035} m="white" cast={false} />
      <mesh geometry={GEO.sphere} material={MAT.white} position={[0, -0.035, 0]} scale={[0.19, 0.09, 0.19]} />
      <C at={[0, -0.09, 0]} r={0.03} h={0.012} m="plasticGrey" cast={false} />
      <Led color={color} level={level} at={[0.07, -0.065, 0.04]} />
      <group position={[0, -0.08, 0]}><Halo color={color} level={level} radius={0.2} selected={selected} /></group>
    </group>
  )
}

function CODetector({ sensor, values, color, level, selected }) {
  const tex = useDisplay(sensor, values, 'CO', color)
  return (
    <group scale={[SIZE * 0.8, SIZE * 0.8, SIZE * 0.8]}>
      <B at={[0, -0.12, 0.025]} s={[0.15, 0.24, 0.05]} m="white" />
      <Panel at={[0, 0.03, 0.052]} size={[0.12, 0.06]} texture={tex} />
      <B at={[0, -0.09, 0.051]} s={[0.1, 0.05, 0.002]} m="plasticGrey" />
      <Led color={color} level={level} at={[0.05, -0.04, 0.055]} />
      <group position={[0, 0, 0.06]}><Halo color={color} level={level} radius={0.2} vertical selected={selected} /></group>
    </group>
  )
}

function CurrentMonitor({ sensor, values, color, level, selected }) {
  const tex = useDisplay(sensor, values, 'I', color)
  return (
    <group>
      {/* sub-distribution board */}
      <B at={[0, -0.45, 0.07]} s={[0.55, 0.85, 0.14]} m="plasticLight" />
      <B at={[0, -0.42, 0.142]} s={[0.5, 0.78, 0.006]} m="#D9DEE5" />
      <mesh geometry={GEO.box} material={MAT.yellow} position={[-0.17, 0.27, 0.147]} scale={[0.09, 0.08, 0.004]} />
      {/* meter */}
      <B at={[0.1, 0.12, 0.15]} s={[0.24, 0.14, 0.03]} m="plasticDark" />
      <Panel at={[0.1, 0.19, 0.166]} size={[0.2, 0.1]} texture={tex} />
      <Led color={color} level={level} at={[0.24, 0.25, 0.17]} />
      {/* feed cable + CT clamp */}
      <C at={[-0.12, -1.25, 0.08]} r={0.018} h={0.8} m="black" />
      <mesh geometry={GEO.torus} material={MAT.orange} position={[-0.12, -0.62, 0.08]} rotation={[Math.PI / 2, 0, 0]}
            scale={[0.13, 0.13, 0.5]} />
      <group position={[0, -0.05, 0.16]}><Halo color={color} level={level} radius={0.42} vertical selected={selected} /></group>
    </group>
  )
}

// ── Sensor wrapper: interaction + tooltip ─────────────────────────────────────

function Tooltip({ sensor, values, level }) {
  const room = ROOM_BY_ID[sensor.room_id]
  return (
    <Html center position={[0, sensor.mount === 'ceiling' ? -0.75 : 0.5, 0]} zIndexRange={[28, 21]}
          style={{ pointerEvents: 'none' }}>
      <div className="sensor-tip">
        <div className="sensor-tip-head">
          <span className="dot" style={{ background: LEVEL_COLORS[level] }} />
          <b>{sensor.sensor_id}</b>
          <span className="type">{SENSOR_TYPES[sensor.sensor_type].short}</span>
        </div>
        <div className="sensor-tip-room">{room.name} · <code>{sensor.room_id}</code></div>
        <div className="sensor-tip-values">
          {sensor.fields.map((f) => {
            const spec = fieldSpec(sensor, f)
            return <span key={f}>{spec.label}: <b>{formatValue(spec, values?.[f])} {spec.unit}</b></span>
          })}
        </div>
      </div>
    </Html>
  )
}

function SensorDevice({ sensor }) {
  const { values, level } = useLevel(sensor)
  const selected = useSimStore((s) => s.selectedSensorId === sensor.sensor_id)
  const hovered = useSimStore((s) => s.hoveredSensorId === sensor.sensor_id)
  const selectSensor = useSimStore((s) => s.selectSensor)
  const setHovered = useSimStore((s) => s.setHoveredSensor)
  const color = LEVEL_COLORS[level]
  const ceiling = sensor.mount === 'ceiling'

  const handlers = {
    onClick: (e) => {
      if (e.delta > 4 || !fromCanvas(e)) return
      e.stopPropagation()
      selectSensor(sensor.sensor_id)
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      setHovered(sensor.sensor_id)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHovered(null)
      document.body.style.cursor = ''
    },
  }

  const props = { sensor, values, color, level, selected }
  return (
    <group position={sensor.position} rotation={[0, sensor.rotY, 0]}>
      {ceiling && <SmokeDetector {...props} />}
      {sensor.sensor_type === 'co' && <CODetector {...props} />}
      {sensor.sensor_type === 'current' && <CurrentMonitor {...props} />}
      {/* generous invisible hit target */}
      <mesh geometry={GEO.sphereLow} material={hitMaterial} position={[0, ceiling ? -0.15 : -0.1, ceiling ? 0 : 0.2]}
            scale={ceiling ? [1.0, 0.6, 1.0] : [0.8, 1.0, 0.6]} {...handlers} />
      {/* selected: light beam floor → device */}
      {selected && (
        <mesh geometry={GEO.cylLow} material={beamMaterial}
              position={[0, -(sensor.position[1]) / 2, ceiling ? 0 : 0.25]}
              scale={[0.5, sensor.position[1], 0.5]} />
      )}
      {(selected || hovered) && <Tooltip sensor={sensor} values={values} level={level} />}
    </group>
  )
}

const beamMaterial = new THREE.MeshBasicMaterial({ color: '#2F7CF6', transparent: true, opacity: 0.16, depthWrite: false })

function SensorDevices() {
  return SENSORS.map((s) => <SensorDevice key={s.sensor_id} sensor={s} />)
}

export default memo(SensorDevices)
