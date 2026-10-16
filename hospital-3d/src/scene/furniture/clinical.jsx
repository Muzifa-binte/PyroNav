/**
 * Clinical furniture. Convention for every piece: origin = centre of its
 * footprint on the floor, front faces +z, back (headboard, wall side) faces −z.
 */
import { B, C, Cx, Panel, Sph } from '../primitives'
import { ecgTexture } from '../textures'

const CASTERS = (hw, hl) => [[-hw, -hl], [hw, -hl], [-hw, hl], [hw, hl]]

/** Electric hospital bed, 0.95 × 2.1 m, head at −z. */
export function HospitalBed({ sheet = '#8FC1EC', ...props }) {
  return (
    <group {...props}>
      {CASTERS(0.36, 0.86).map(([x, z], i) => <Sph key={i} at={[x, 0.06, z]} r={0.06} m="rubber" low />)}
      <B at={[0, 0.1, 0]} s={[0.8, 0.07, 1.8]} m="steelDark" />
      <B at={[0, 0.17, -0.55]} s={[0.14, 0.24, 0.14]} m="steel" />
      <B at={[0, 0.17, 0.55]} s={[0.14, 0.24, 0.14]} m="steel" />
      <B at={[0, 0.41, 0]} s={[0.95, 0.06, 2.0]} m="white" />
      <B at={[0, 0.47, 0.02]} s={[0.88, 0.15, 1.92]} m="mattress" />
      <B at={[0, 0.62, 0.3]} s={[0.92, 0.04, 1.22]} m={sheet} />
      <B at={[0, 0.62, -0.68]} s={[0.62, 0.11, 0.36]} m="pillow" />
      <B at={[0, 0.4, -1.03]} s={[0.98, 0.66, 0.05]} m="bedPanel" />
      <B at={[0, 0.4, 1.03]} s={[0.98, 0.42, 0.05]} m="bedPanel" />
      <B at={[-0.5, 0.62, -0.42]} s={[0.03, 0.17, 0.82]} m="rail" />
      <B at={[0.5, 0.62, -0.42]} s={[0.03, 0.17, 0.82]} m="rail" />
    </group>
  )
}

/** Emergency stretcher / trolley, 0.7 × 2.0 m. */
export function Stretcher({ sheet = '#FFFFFF', ...props }) {
  return (
    <group {...props}>
      {CASTERS(0.27, 0.82).map(([x, z], i) => <Sph key={i} at={[x, 0.07, z]} r={0.07} m="rubber" low />)}
      <B at={[0, 0.12, 0]} s={[0.6, 0.05, 1.75]} m="steel" />
      <C at={[0, 0.17, 0]} r={0.08} h={0.5} m="chrome" />
      <B at={[0, 0.67, 0]} s={[0.7, 0.05, 1.95]} m="steel" />
      <B at={[0, 0.72, 0]} s={[0.64, 0.1, 1.88]} m={sheet} />
      <B at={[0, 0.82, -0.68]} s={[0.5, 0.09, 0.32]} m="pillow" />
      <B at={[-0.37, 0.75, 0]} s={[0.03, 0.18, 1.1]} m="rail" />
      <B at={[0.37, 0.75, 0]} s={[0.03, 0.18, 1.1]} m="rail" />
    </group>
  )
}

/** Patient monitor on a rolling pole, screen facing +z. */
export function PatientMonitor(props) {
  return (
    <group {...props}>
      <C at={[0, 0, 0]} r={0.26} h={0.04} m="steelDark" />
      <C at={[0, 0.04, 0]} r={0.02} h={1.15} m="chrome" />
      <B at={[0, 1.1, 0]} s={[0.44, 0.34, 0.09]} m="plasticDark" />
      <Panel at={[0, 1.27, 0.047]} size={[0.38, 0.26]} texture={ecgTexture()} />
    </group>
  )
}

/** Wall-mounted monitor on an arm (for walls behind beds); back at z = 0. */
export function WallMonitor(props) {
  return (
    <group {...props}>
      <B at={[0, 1.55, 0.03]} s={[0.12, 0.12, 0.06]} m="steelDark" />
      <B at={[0, 1.6, 0.15]} s={[0.05, 0.04, 0.22]} m="steel" />
      <B at={[0, 1.42, 0.28]} s={[0.44, 0.33, 0.07]} m="plasticDark" />
      <Panel at={[0, 1.585, 0.316]} size={[0.38, 0.26]} texture={ecgTexture()} />
    </group>
  )
}

export function IVStand({ bag = true, ...props }) {
  return (
    <group {...props}>
      {[0, 1.257, 2.513, 3.77, 5.026].map((a, i) => (
        <B key={i} at={[Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14]} s={[0.28, 0.025, 0.03]} rot={[0, -a, 0]} m="steelDark" />
      ))}
      <C at={[0, 0.05, 0]} r={0.014} h={1.95} m="chrome" />
      <B at={[0, 1.94, 0]} s={[0.34, 0.016, 0.016]} m="chrome" />
      {bag && <B at={[0.13, 1.62, 0]} s={[0.12, 0.24, 0.045]} m="ivBag" />}
      {bag && <C at={[0.13, 1.08, 0]} r={0.004} h={0.54} m="ivBag" />}
      <B at={[0, 0.95, 0.05]} s={[0.14, 0.18, 0.1]} m="plasticLight" />
    </group>
  )
}

export function BedsideCabinet({ top = 'woodLight', ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0.05, 0]} s={[0.46, 0.72, 0.45]} m="white" />
      <B at={[0, 0.77, 0]} s={[0.49, 0.03, 0.48]} m={top} />
      <B at={[0, 0.55, 0.226]} s={[0.4, 0.012, 0.004]} m="plasticGrey" />
      <B at={[0, 0.62, 0.228]} s={[0.12, 0.02, 0.01]} m="steel" />
      <B at={[0.08, 0.8, 0.02]} s={[0.07, 0.12, 0.07]} m="#A9D3F2" />
    </group>
  )
}

export function OverbedTable(props) {
  return (
    <group {...props}>
      <B at={[0.32, 0, 0]} s={[0.08, 0.04, 0.6]} m="steelDark" />
      <C at={[0.32, 0.04, 0]} r={0.025} h={0.78} m="chrome" />
      <B at={[0.05, 0.82, 0]} s={[0.7, 0.03, 0.4]} m="woodLight" />
    </group>
  )
}

/** Privacy curtain on a ceiling rail, running along local x. */
export function Curtain({ length = 2, height = 1.95, color = 'curtain', open = 0, ...props }) {
  const drawn = length * (1 - open)
  return (
    <group {...props}>
      <B at={[0, 2.42, 0]} s={[length, 0.03, 0.03]} m="steel" cast={false} />
      <B at={[-length / 2 + drawn / 2, 0.42, 0]} s={[drawn, height, 0.02]} m={color} />
    </group>
  )
}

export function Ventilator(props) {
  return (
    <group {...props}>
      {CASTERS(0.18, 0.18).map(([x, z], i) => <Sph key={i} at={[x, 0.04, z]} r={0.04} m="rubber" low />)}
      <B at={[0, 0.06, 0]} s={[0.42, 0.06, 0.42]} m="steelDark" />
      <C at={[0, 0.12, 0]} r={0.035} h={0.55} m="chrome" />
      <B at={[0, 0.67, 0]} s={[0.4, 0.48, 0.32]} m="plasticLight" />
      <B at={[0, 1.08, 0.02]} s={[0.36, 0.28, 0.06]} m="plasticDark" />
      <Panel at={[0, 1.22, 0.053]} size={[0.31, 0.22]} texture={ecgTexture()} />
      <Cx at={[-0.24, 0.85, 0.08]} r={0.03} len={0.12} m="#9FD3F5" />
    </group>
  )
}

/** Red emergency crash cart with defibrillator. */
export function CrashCart(props) {
  return (
    <group {...props}>
      {CASTERS(0.24, 0.17).map(([x, z], i) => <Sph key={i} at={[x, 0.05, z]} r={0.05} m="rubber" low />)}
      <B at={[0, 0.08, 0]} s={[0.62, 0.92, 0.44]} m="red" />
      {[0.25, 0.45, 0.65, 0.85].map((y) => <B key={y} at={[0, y, 0.222]} s={[0.56, 0.012, 0.004]} m="redDark" />)}
      <B at={[0, 1.0, 0]} s={[0.66, 0.03, 0.48]} m="steel" />
      <B at={[0.05, 1.03, 0]} s={[0.36, 0.16, 0.3]} m="yellow" />
      <B at={[0.05, 1.12, 0.151]} s={[0.18, 0.06, 0.004]} m="screenOff" />
    </group>
  )
}

export function Bassinet(props) {
  return (
    <group {...props}>
      {CASTERS(0.2, 0.3).map(([x, z], i) => <Sph key={i} at={[x, 0.04, z]} r={0.04} m="rubber" low />)}
      <B at={[0, 0.07, 0]} s={[0.46, 0.04, 0.68]} m="white" />
      <C at={[0, 0.1, 0]} r={0.04} h={0.55} m="steel" />
      <B at={[0, 0.65, 0]} s={[0.46, 0.04, 0.7]} m="white" />
      <B at={[0, 0.69, 0]} s={[0.44, 0.26, 0.68]} m="glass" />
      <B at={[0, 0.7, 0.08]} s={[0.36, 0.06, 0.4]} m="#F4C6D7" />
      <Sph at={[0, 0.76, -0.17]} r={0.07} m="#F2D3BC" low />
    </group>
  )
}

/** Radiant infant warmer (overhead heater glows). */
export function InfantWarmer(props) {
  return (
    <group {...props}>
      {CASTERS(0.3, 0.3).map(([x, z], i) => <Sph key={i} at={[x, 0.05, z]} r={0.05} m="rubber" low />)}
      <B at={[0, 0.08, 0]} s={[0.7, 0.75, 0.7]} m="plasticLight" />
      <B at={[0, 0.83, 0]} s={[0.78, 0.06, 0.62]} m="white" />
      <B at={[0, 0.89, 0]} s={[0.66, 0.16, 0.5]} m="glass" />
      <C at={[0, 0.83, -0.33]} r={0.04} h={1.1} m="steel" />
      <B at={[0, 1.93, -0.06]} s={[0.6, 0.12, 0.5]} m="plasticLight" />
      <B at={[0, 1.92, -0.06]} s={[0.5, 0.015, 0.4]} m="warmGlow" cast={false} />
      <B at={[0, 1.4, -0.29]} s={[0.3, 0.22, 0.06]} m="plasticDark" />
    </group>
  )
}

export function Wheelchair({ color = 'fabricBlue', ...props }) {
  return (
    <group {...props}>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.05]} rotation={[0, Math.PI / 2, 0]} scale={[0.6, 0.6, 0.6]} castShadow>
          <torusGeometry args={[0.5, 0.05, 8, 28]} />
          <meshStandardMaterial color="#3A3F47" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      <Sph at={[-0.22, 0.07, 0.42]} r={0.07} m="rubber" low />
      <Sph at={[0.22, 0.07, 0.42]} r={0.07} m="rubber" low />
      <B at={[0, 0.45, 0.12]} s={[0.46, 0.06, 0.44]} m={color} />
      <B at={[0, 0.5, -0.12]} s={[0.46, 0.45, 0.05]} m={color} />
      <B at={[-0.26, 0.45, 0.1]} s={[0.03, 0.03, 0.5]} m="chrome" />
      <B at={[0.26, 0.45, 0.1]} s={[0.03, 0.03, 0.5]} m="chrome" />
      <B at={[0, 0.13, 0.45]} s={[0.4, 0.02, 0.14]} m="steelDark" />
    </group>
  )
}

/** Medical gas / power bed-head panel on the wall; back at z = 0. */
export function BedHeadUnit({ width = 1.6, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 1.25, 0.05]} s={[width, 0.28, 0.1]} m="plasticLight" />
      <B at={[-width / 2 + 0.2, 1.33, 0.101]} s={[0.07, 0.07, 0.01]} m="green" />
      <B at={[-width / 2 + 0.32, 1.33, 0.101]} s={[0.07, 0.07, 0.01]} m="#1F2A44" />
      <B at={[-width / 2 + 0.44, 1.33, 0.101]} s={[0.07, 0.07, 0.01]} m="yellow" />
      <B at={[width / 2 - 0.3, 1.31, 0.101]} s={[0.3, 0.1, 0.01]} m="#F6F2E6" />
      <B at={[0, 1.58, 0.04]} s={[width * 0.6, 0.05, 0.08]} m="lampGlow" cast={false} />
    </group>
  )
}

export function HandSanitizer(props) {
  return (
    <group {...props}>
      <B at={[0, 1.1, 0.04]} s={[0.12, 0.22, 0.08]} m="white" />
      <B at={[0, 1.16, 0.081]} s={[0.07, 0.07, 0.004]} m="#3BA3E0" />
    </group>
  )
}
