/**
 * Visual consequences of the slider values, so a change is obvious in 3D:
 *   smoke ≥ 40 ppm      → smoke rising and spreading under the ceiling
 *   temperature ≥ 55 °C → flames + flickering fire light below the detector
 *   current ≥ rated     → sparking at the electrical panel
 * Cosmetic only — the hazard verdict comes from the Decision Engine.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CEILING_Y } from '../../data/hospitalLayout'
import { SENSORS } from '../../data/sensorRegistry'
import { fieldSpec } from '../../data/sensorTypes'
import { useSimStore } from '../../state/useSimStore'
import { GEO } from '../primitives'
import { smokeSprite } from '../textures'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const N = 90
const RISE = 1.3 // m/s
const SPREAD = 0.9 // m/s along the ceiling

/** (Re)spawn a smoke puff; prewarm places it somewhere along its life so the plume starts developed. */
function spawn(p, top, prewarm) {
  p.life = 3.5 + Math.random() * 3.5
  p.age = prewarm ? Math.random() * p.life : 0
  const a = Math.random() * Math.PI * 2
  p.vx = Math.cos(a)
  p.vz = Math.sin(a)
  p.x = (Math.random() - 0.5) * 0.5
  p.z = (Math.random() - 0.5) * 0.5
  p.y = 0.3 + Math.random() * 0.3
  if (prewarm) {
    const rise = top - p.y
    const tTop = rise / RISE
    if (p.age < tTop) p.y += p.age * RISE
    else {
      p.y = top
      const d = (p.age - tTop) * SPREAD
      p.x += p.vx * d
      p.z += p.vz * d
    }
  }
}

/** Smoke rising from the source and spreading under the ceiling (camera-facing instanced quads). */
function SmokePlume({ position, intensity }) {
  const ref = useRef()
  const camera = useThree((s) => s.camera)
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity
  const top = CEILING_Y - position[1] - 0.3
  const particles = useMemo(() => Array.from({ length: N }, () => {
    const p = {}
    spawn(p, top, true)
    return p
  }), [top])
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    map: smokeSprite(), color: '#7C838D', transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false,
  }), [])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3() }), [])
  const dark = useMemo(() => new THREE.Color('#3B4048'), [])
  const light = useMemo(() => new THREE.Color('#B3B9C2'), [])

  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const dt = Math.min(delta, 0.25)
    const I = intensityRef.current
    const active = Math.floor(N * (0.35 + 0.65 * I))
    for (let i = 0; i < active; i++) {
      const p = particles[i]
      p.age += dt
      if (p.age > p.life) spawn(p, top, false)
      if (p.y < top) {
        p.y = Math.min(top, p.y + RISE * (0.6 + 0.6 * I) * dt)
        p.x += p.vx * 0.06 * dt
        p.z += p.vz * 0.06 * dt
      } else {
        p.x += p.vx * SPREAD * (0.6 + 0.6 * I) * dt
        p.z += p.vz * SPREAD * (0.6 + 0.6 * I) * dt
      }
      const size = (0.7 + (p.age / p.life) * 1.8) * (0.7 + 0.8 * I)
      tmp.m.compose(tmp.p.set(p.x, p.y, p.z), camera.quaternion, tmp.s.set(size, size, size))
      mesh.setMatrixAt(i, tmp.m)
    }
    mesh.count = active
    mesh.instanceMatrix.needsUpdate = true
    material.opacity = 0.28 + 0.45 * I
    material.color.copy(light).lerp(dark, I)
  })

  return (
    <instancedMesh ref={ref} args={[GEO.plane, material, N]} position={position} frustumCulled={false} renderOrder={5} />
  )
}

const flameMaterials = ['#FF4D00', '#FF8A00', '#FFD23F'].map((c) => new THREE.MeshBasicMaterial({
  color: c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
}))

function Flames({ position, intensity }) {
  const refs = useRef([])
  const flames = useMemo(() => [
    { x: 0, z: 0, r: 0.35, h: 1.3, m: 0 }, { x: 0.25, z: 0.1, r: 0.25, h: 0.95, m: 1 },
    { x: -0.22, z: -0.12, r: 0.25, h: 0.9, m: 1 }, { x: 0.05, z: -0.05, r: 0.16, h: 0.7, m: 2 },
    { x: -0.1, z: 0.22, r: 0.18, h: 0.65, m: 2 },
  ], [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const s = 0.5 + intensity
    flames.forEach((f, i) => {
      const m = refs.current[i]
      if (!m) return
      const k = 0.82 + 0.18 * Math.sin(t * (11 + i * 2.7) + i) + 0.08 * Math.sin(t * 23 + i)
      m.scale.set(f.r * 2 * s, f.h * s * k, f.r * 2 * s)
      m.position.y = (f.h * s * k) / 2
    })
  })
  return (
    <group position={position}>
      {flames.map((f, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }} geometry={GEO.cone} material={flameMaterials[f.m]}
              position={[f.x, f.h / 2, f.z]} renderOrder={6} />
      ))}
    </group>
  )
}

function Sparks({ position, intensity }) {
  const ref = useRef()
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#FFF3A0', toneMapped: false, transparent: true }), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const on = Math.sin(clock.elapsedTime * 37) + Math.sin(clock.elapsedTime * 23) > 0.6
    ref.current.visible = on
    ref.current.scale.setScalar(0.06 + 0.1 * intensity * Math.random())
  })
  return <mesh ref={ref} geometry={GEO.sphereLow} material={material} position={position} />
}

/** Fixed pool of fire lights (changing the number of lights would recompile every shader). */
const POOL = 2
function FireLights({ fires }) {
  const refs = useRef([])
  const firesRef = useRef(fires)
  firesRef.current = fires
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const top = [...firesRef.current].sort((a, b) => b.intensity - a.intensity).slice(0, POOL)
    for (let i = 0; i < POOL; i++) {
      const light = refs.current[i]
      if (!light) continue
      const f = top[i]
      if (!f) { light.intensity = 0; continue }
      light.position.set(f.position[0], 1.0, f.position[2])
      light.intensity = (14 + 5 * Math.sin(t * 13 + i) + 3 * Math.sin(t * 7.1 + i)) * (0.4 + f.intensity)
    }
  })
  return Array.from({ length: POOL }, (_, i) => (
    <pointLight key={i} ref={(el) => { refs.current[i] = el }} color="#FF7A1A" intensity={0} distance={11} decay={1.6} />
  ))
}

const SMOKE_SENSORS = SENSORS.filter((s) => s.sensor_type === 'smoke_heat')
const CURRENT_SENSORS = SENSORS.filter((s) => s.sensor_type === 'current')

export default function HazardEffects() {
  const values = useSimStore((s) => s.values)
  const show = useSimStore((s) => s.showEffects)

  const smoke = []
  const fires = []
  if (show) {
    for (const s of SMOKE_SENSORS) {
      const v = values[s.sensor_id] || {}
      const floor = [s.position[0], 0, s.position[2]]
      const si = clamp01(((v.smoke ?? 0) - 40) / 160)
      const ti = clamp01(((v.temperature ?? 0) - 55) / 70)
      if (si > 0) smoke.push({ id: s.sensor_id, position: floor, intensity: si })
      if (ti > 0) fires.push({ id: s.sensor_id, position: floor, intensity: ti })
    }
  }
  const sparks = show
    ? CURRENT_SENSORS.map((s) => {
      const rated = fieldSpec(s, 'current').rated
      const i = clamp01(((values[s.sensor_id]?.current ?? 0) - rated) / (rated * 0.5))
      const p = s.position
      const off = 0.25
      return i > 0 ? { id: s.sensor_id, intensity: i,
                       position: [p[0] + Math.sin(s.rotY) * off, p[1] - 0.45, p[2] + Math.cos(s.rotY) * off] } : null
    }).filter(Boolean)
    : []

  return (
    <group>
      {smoke.map((s) => <SmokePlume key={s.id} position={s.position} intensity={s.intensity} />)}
      {fires.map((f) => <Flames key={f.id} position={f.position} intensity={f.intensity} />)}
      {sparks.map((s) => <Sparks key={s.id} position={s.position} intensity={s.intensity} />)}
      <FireLights fires={fires} />
    </group>
  )
}
