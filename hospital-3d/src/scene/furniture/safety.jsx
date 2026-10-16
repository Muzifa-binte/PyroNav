/**
 * Fire-safety fixtures from the reference plan's legend: extinguishers, manual
 * call points, exit signs, evacuation arrows; plus corridor handrails and stairs.
 * Static scenery — the monitored sensors live in scene/sensors.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { B, C, mat, Panel } from '../primitives'
import { signTexture } from '../textures'

/** Wall-mounted extinguisher; back against the wall at z = 0. */
export function FireExtinguisher(props) {
  return (
    <group {...props}>
      <B at={[0, 0.95, 0.02]} s={[0.16, 0.1, 0.04]} m="steelDark" />
      <C at={[0, 0.55, 0.12]} r={0.085} h={0.48} m="red" />
      <C at={[0, 1.03, 0.12]} r={0.03} h={0.08} m="black" />
      <B at={[0.02, 1.1, 0.12]} s={[0.12, 0.025, 0.035]} m="black" />
      <B at={[0, 0.72, 0.205]} s={[0.1, 0.12, 0.004]} m="white" />
      <C at={[-0.08, 0.62, 0.15]} r={0.012} h={0.42} m="black" />
      <B at={[0, 1.55, 0.005]} s={[0.22, 0.22, 0.01]} m="red" />
    </group>
  )
}

/** Manual fire alarm call point (red break-glass box); back at z = 0. */
export function CallPoint(props) {
  return (
    <group {...props}>
      <B at={[0, 1.35, 0.03]} s={[0.12, 0.12, 0.06]} m="red" />
      <B at={[0, 1.37, 0.061]} s={[0.07, 0.07, 0.004]} m="white" />
      <C at={[0, 2.15, 0.06]} r={0.06} h={0.08} m="red" rotation={[Math.PI / 2, 0, 0]} />
    </group>
  )
}

/** Green illuminated exit sign; back at z = 0. */
export function ExitSign({ text = 'EXIT', width = 0.62, y = 2.45, ...props }) {
  const h = width / 4
  return (
    <group {...props}>
      <B at={[0, y - h / 2 - 0.02, 0.025]} s={[width + 0.04, h + 0.04, 0.05]} m="white" />
      <Panel at={[0, y, 0.052]} size={[width, h]} texture={signTexture(text)} />
    </group>
  )
}

/** Free-standing sign on two posts (outside the building). */
export function PostSign({ text, icon = 'run', bg = '#13924A', width = 2.0, height = 0.5, y = 1.7, ...props }) {
  return (
    <group {...props}>
      <C at={[-width / 2 + 0.1, 0, 0]} r={0.04} h={y + height / 2} m="steelDark" />
      <C at={[width / 2 - 0.1, 0, 0]} r={0.04} h={y + height / 2} m="steelDark" />
      <B at={[0, y - height / 2 - 0.03, 0]} s={[width + 0.06, height + 0.06, 0.06]} m="white" />
      <Panel at={[0, y, 0.032]} size={[width, height]} texture={signTexture(text, bg, '#FFFFFF', 512, 128, icon)} />
      <Panel at={[0, y, -0.032]} size={[width, height]} rot={[0, Math.PI, 0]}
             texture={signTexture(text, bg, '#FFFFFF', 512, 128, icon)} />
    </group>
  )
}

const arrowShape = (() => {
  const s = new THREE.Shape()
  s.moveTo(-0.6, -0.16)
  s.lineTo(0.15, -0.16)
  s.lineTo(0.15, -0.36)
  s.lineTo(0.6, 0)
  s.lineTo(0.15, 0.36)
  s.lineTo(0.15, 0.16)
  s.lineTo(-0.6, 0.16)
  s.closePath()
  return s
})()
const arrowGeometry = new THREE.ShapeGeometry(arrowShape)
const arrowMaterial = new THREE.MeshStandardMaterial({ color: '#16A34A', emissive: '#0E7A35', emissiveIntensity: 0.35,
                                                       roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })

/** Green evacuation arrow painted on the floor; dir in n|s|e|w (the way to go). */
export function FloorArrow({ dir = 'e', size = 1.4, ...props }) {
  const rotZ = { e: 0, n: Math.PI / 2, w: Math.PI, s: -Math.PI / 2 }[dir]
  return (
    <group {...props}>
      <mesh geometry={arrowGeometry} material={arrowMaterial} position={[0, 0.008, 0]}
            rotation={[-Math.PI / 2, 0, rotZ]} scale={[size, size, size]} receiveShadow />
    </group>
  )
}

/** Corridor handrail along local x at 0.9 m; back at z = 0. */
export function Handrail({ length = 4, ...props }) {
  const posts = Math.max(2, Math.ceil(length / 1.5) + 1)
  return (
    <group {...props}>
      <mesh position={[0, 0.9, 0.07]} rotation={[0, 0, Math.PI / 2]} castShadow material={mat('woodLight')}>
        <cylinderGeometry args={[0.025, 0.025, length, 10]} />
      </mesh>
      {Array.from({ length: posts }, (_, i) => (
        <B key={i} at={[-length / 2 + (i * length) / (posts - 1), 0.85, 0.035]} s={[0.03, 0.05, 0.07]} m="steel" />
      ))}
      <B at={[0, 0.25, 0.012]} s={[length, 0.15, 0.025]} m="#C9D3DD" cast={false} />
    </group>
  )
}

/**
 * Straight stair flight rising from local z = 0 towards −z (cut at `maxH`),
 * width along x, with a yellow nosing and a handrail on the open side.
 */
export function StairFlight({ width = 1.5, steps = 14, rise = 0.17, run = 0.28, ...props }) {
  const items = useMemo(() => Array.from({ length: steps }, (_, i) => i), [steps])
  return (
    <group {...props}>
      {items.map((i) => (
        <group key={i}>
          <B at={[0, 0, -i * run - run / 2]} s={[width, (i + 1) * rise, run]} m="stairStep" />
          <B at={[0, (i + 1) * rise - 0.006, -i * run - 0.03]} s={[width, 0.012, 0.05]} m="nosing" cast={false} />
        </group>
      ))}
      {/* stringer + rail on the +x side */}
      {items.filter((i) => i % 3 === 0).map((i) => (
        <C key={`p${i}`} at={[width / 2 - 0.05, (i + 1) * rise, -i * run - run / 2]} r={0.018} h={0.9} m="steel" />
      ))}
      <mesh position={[width / 2 - 0.05, 0.9 + (steps * rise) / 2, -(steps * run) / 2]}
            rotation={[Math.atan2(steps * rise, steps * run) + Math.PI / 2, 0, 0]} material={mat('steel')} castShadow>
        <cylinderGeometry args={[0.025, 0.025, Math.hypot(steps * rise, steps * run), 8]} />
      </mesh>
    </group>
  )
}
