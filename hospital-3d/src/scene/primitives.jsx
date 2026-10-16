/**
 * Building blocks for the procedural hospital: shared geometries, a material
 * palette and bottom-anchored primitives, so ~2,000 furniture parts reuse a
 * handful of GPU buffers.
 *
 *   <B at={[x, y, z]} s={[w, h, d]} m="steel" />   box whose BOTTOM sits at y
 *   <C at={[x, y, z]} r={0.1} h={1} m="chrome" />  cylinder, bottom at y
 *   <Sph at={[x, y, z]} r={0.1} m="plant" />       sphere centred at the point
 *   m = palette key | '#hex' | THREE.Material
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
  cylLow: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 20),
  sphere: new THREE.SphereGeometry(0.5, 20, 14),
  sphereLow: new THREE.SphereGeometry(0.5, 10, 8),
  torus: new THREE.TorusGeometry(0.5, 0.06, 10, 32),
  plane: new THREE.PlaneGeometry(1, 1),
}

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...opts })
const glass = (color, opacity, opts = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, metalness: 0, transparent: true, opacity,
                                   depthWrite: false, ...opts })

export const MAT = {
  white: std('#F4F6F8'),
  offWhite: std('#E8ECF1'),
  cream: std('#F3EEE3'),
  wall: std('#F6F4EF', { roughness: 0.9 }),
  wallExt: std('#E3DDD2', { roughness: 0.95 }),
  wallCap: std('#3A4556', { roughness: 0.8 }),
  slab: std('#B9BEC5', { roughness: 0.95 }),
  steel: std('#B9C2CC', { metalness: 0.75, roughness: 0.32 }),
  steelDark: std('#59636F', { metalness: 0.6, roughness: 0.4 }),
  chrome: std('#E3E8EE', { metalness: 1, roughness: 0.16 }),
  black: std('#1E242C', { roughness: 0.5 }),
  rubber: std('#2A2E35', { roughness: 0.9 }),
  plasticDark: std('#2F3743', { roughness: 0.45 }),
  plasticGrey: std('#9AA4B1', { roughness: 0.5 }),
  plasticLight: std('#DCE2E9', { roughness: 0.45 }),
  mattress: std('#E7EDF3', { roughness: 0.85 }),
  pillow: std('#FFFFFF', { roughness: 0.9 }),
  bedPanel: std('#C9D6E3', { roughness: 0.5 }),
  rail: std('#AEB9C6', { metalness: 0.5, roughness: 0.35 }),
  wood: std('#B88A5F', { roughness: 0.7 }),
  woodLight: std('#D8B98F', { roughness: 0.7 }),
  woodDark: std('#7A5434', { roughness: 0.7 }),
  epoxy: std('#2C323C', { roughness: 0.35 }),
  counter: std('#E9E4DA', { roughness: 0.4 }),
  fabricBlue: std('#2F6FD0', { roughness: 0.85 }),
  fabricTeal: std('#1F9E93', { roughness: 0.85 }),
  fabricGrey: std('#6B7787', { roughness: 0.9 }),
  fabricRed: std('#C2413B', { roughness: 0.85 }),
  leather: std('#3B4452', { roughness: 0.55 }),
  teal: std('#0E7C74', { roughness: 0.5 }),
  surgicalGreen: std('#5FA889', { roughness: 0.8 }),
  red: std('#D7322E', { roughness: 0.45 }),
  redDark: std('#9B1C1C', { roughness: 0.5 }),
  yellow: std('#F2C230', { roughness: 0.5 }),
  green: std('#1E9E50', { roughness: 0.5 }),
  exitGreen: std('#13924A', { roughness: 0.4, emissive: '#0B6B33', emissiveIntensity: 0.35 }),
  orange: std('#F08A24', { roughness: 0.5 }),
  terracotta: std('#B5643C', { roughness: 0.8 }),
  plant: std('#2F8F4E', { roughness: 0.8 }),
  plantLight: std('#4CB86A', { roughness: 0.8 }),
  plantDark: std('#1F6B3A', { roughness: 0.8 }),
  soil: std('#4A3626', { roughness: 1 }),
  grass: std('#9CCB86', { roughness: 1 }),
  paving: std('#D9D6CF', { roughness: 0.95 }),
  asphalt: std('#5B6068', { roughness: 0.95 }),
  concrete: std('#C8C6C0', { roughness: 0.95 }),
  stairStep: std('#D2D5DA', { roughness: 0.8 }),
  nosing: std('#F2C230', { roughness: 0.6 }),
  leadGlass: glass('#B9D9C9', 0.35),
  glass: glass('#CFE6F5', 0.28),
  glassDoor: glass('#BFE0F2', 0.22),
  curtain: std('#9DD2E8', { roughness: 0.95, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
  curtainMint: std('#A9DCC8', { roughness: 0.95, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
  curtainPink: std('#EBC3DA', { roughness: 0.95, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
  ivBag: std('#E8F6FF', { roughness: 0.2, transparent: true, opacity: 0.7 }),
  lampGlow: new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF6E0', emissiveIntensity: 1.6 }),
  warmGlow: new THREE.MeshStandardMaterial({ color: '#FFB067', emissive: '#FF7A1A', emissiveIntensity: 1.4 }),
  bloodBag: std('#A3121C', { roughness: 0.35 }),
  screenOff: std('#11161E', { roughness: 0.2, metalness: 0.3 }),
}

const hexCache = new Map()
export function mat(m) {
  if (!m) return MAT.white
  if (m instanceof THREE.Material) return m
  if (MAT[m]) return MAT[m]
  if (typeof m === 'string' && m.startsWith('#')) {
    if (!hexCache.has(m)) hexCache.set(m, std(m))
    return hexCache.get(m)
  }
  return MAT.white
}

export function B({ at = [0, 0, 0], s = [1, 1, 1], m, rot, cast = true, receive = true, ...rest }) {
  return (
    <mesh geometry={GEO.box} material={mat(m)} position={[at[0], at[1] + s[1] / 2, at[2]]}
          scale={s} rotation={rot} castShadow={cast} receiveShadow={receive} {...rest} />
  )
}

export function C({ at = [0, 0, 0], r = 0.5, h = 1, m, low = false, cast = true, ...rest }) {
  return (
    <mesh geometry={low ? GEO.cylLow : GEO.cyl} material={mat(m)} position={[at[0], at[1] + h / 2, at[2]]}
          scale={[r * 2, h, r * 2]} castShadow={cast} receiveShadow {...rest} />
  )
}

/** Cylinder lying along the x axis (wheels, rails, pipes); centre at `at`. */
export function Cx({ at = [0, 0, 0], r = 0.5, len = 1, m, ...rest }) {
  return (
    <mesh geometry={GEO.cyl} material={mat(m)} position={at} rotation={[0, 0, Math.PI / 2]}
          scale={[r * 2, len, r * 2]} castShadow receiveShadow {...rest} />
  )
}

export function Sph({ at = [0, 0, 0], r = 0.5, m, low = false, scale, ...rest }) {
  return (
    <mesh geometry={low ? GEO.sphereLow : GEO.sphere} material={mat(m)} position={at}
          scale={scale || [r * 2, r * 2, r * 2]} castShadow receiveShadow {...rest} />
  )
}

/** Flat textured panel (screens, signs): MeshBasicMaterial = looks self-lit. */
export function Panel({ at = [0, 0, 0], size = [1, 1], texture, rot, color = '#FFFFFF', ...rest }) {
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, color, toneMapped: false }), [texture, color])
  return <mesh geometry={GEO.plane} material={material} position={at} scale={[size[0], size[1], 1]} rotation={rot} {...rest} />
}

const instanceMaterial = std('#FFFFFF', { roughness: 0.7 })

/**
 * Many small boxes in one draw call. items: [{ p:[x,y,z] (bottom), s:[w,h,d], c:'#hex', ry }]
 */
export function BoxInstances({ items, material = instanceMaterial, cast = false }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const color = new THREE.Color()
    items.forEach((it, i) => {
      e.set(0, it.ry || 0, 0)
      q.setFromEuler(e)
      m.compose(new THREE.Vector3(it.p[0], it.p[1] + it.s[1] / 2, it.p[2]), q, new THREE.Vector3(...it.s))
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, color.set(it.c || '#FFFFFF'))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[GEO.box, material, items.length]} castShadow={cast} receiveShadow
                   frustumCulled={false} />
  )
}

/** Deterministic pseudo-random numbers (stable furniture layouts between renders). */
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** True when a pointer event really hit the WebGL canvas (not an HTML label above it). */
export const fromCanvas = (e) => (e.nativeEvent?.target ?? e.target)?.tagName === 'CANVAS'
