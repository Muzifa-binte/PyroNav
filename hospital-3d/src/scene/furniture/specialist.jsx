/**
 * Department equipment: operating theatre, radiology, laboratory, pharmacy,
 * blood bank. Same convention: origin on the floor, front = +z.
 */
import { useMemo } from 'react'
import { WALL_H } from '../../data/hospitalLayout'
import { B, BoxInstances, C, Panel, rng, Sph } from '../primitives'
import { desktopTexture, ecgTexture, xrayTexture } from '../textures'

// ── Operating theatre ────────────────────────────────────────────────────────

/** Operating table, long axis along z. */
export function OperatingTable(props) {
  return (
    <group {...props}>
      <B at={[0, 0, 0.3]} s={[0.62, 0.1, 0.9]} m="steelDark" />
      <C at={[0, 0.1, 0.3]} r={0.14} h={0.7} m="chrome" />
      <B at={[0, 0.78, 0]} s={[0.56, 0.08, 1.95]} m="steel" />
      <B at={[0, 0.86, 0]} s={[0.54, 0.07, 1.9]} m="#1F3B4D" />
      <B at={[0, 0.93, 0.25]} s={[0.56, 0.02, 1.2]} m="surgicalGreen" />
      <B at={[0, 0.86, -1.08]} s={[0.3, 0.07, 0.26]} m="#1F3B4D" />
      <B at={[-0.55, 0.82, -0.25]} s={[0.55, 0.05, 0.16]} m="#1F3B4D" />
    </group>
  )
}

/** Ceiling-mounted twin surgical light; position = point under the mount. */
export function SurgicalLight(props) {
  const head = (x, z, tilt) => (
    <group position={[x, 2.05, z]} rotation={[tilt, 0, 0]}>
      <C at={[0, 0, 0]} r={0.34} h={0.12} m="white" />
      <mesh position={[0, -0.002, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.56, 0.56, 1]}>
        <circleGeometry args={[0.5, 24]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFF7E6" emissiveIntensity={2.2} />
      </mesh>
      <C at={[0, 0.12, 0]} r={0.05} h={0.12} m="steel" />
    </group>
  )
  return (
    <group {...props}>
      <C at={[0, WALL_H - 0.15, 0]} r={0.16} h={0.15} m="white" />
      <C at={[0, 2.35, 0]} r={0.035} h={WALL_H - 2.5} m="steel" />
      <B at={[0, 2.3, 0]} s={[0.08, 0.06, 1.1]} m="steel" />
      <C at={[0, 2.18, -0.52]} r={0.025} h={0.14} m="steel" />
      <C at={[0, 2.18, 0.52]} r={0.025} h={0.14} m="steel" />
      {head(0, -0.55, 0.25)}
      {head(0, 0.55, -0.25)}
    </group>
  )
}

export function AnesthesiaMachine(props) {
  return (
    <group {...props}>
      {[[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]].map(([x, z], i) => (
        <Sph key={i} at={[x, 0.05, z]} r={0.05} m="rubber" low />
      ))}
      <B at={[0, 0.08, 0]} s={[0.75, 0.82, 0.56]} m="plasticLight" />
      <B at={[0, 0.9, 0.02]} s={[0.78, 0.04, 0.6]} m="steel" />
      <B at={[0, 0.94, -0.12]} s={[0.66, 0.42, 0.32]} m="white" />
      <B at={[-0.18, 1.0, 0.09]} s={[0.12, 0.2, 0.1]} m="#F2C230" />
      <B at={[0.0, 1.0, 0.09]} s={[0.12, 0.2, 0.1]} m="#6FB7F2" />
      <B at={[0.05, 1.42, -0.08]} s={[0.5, 0.36, 0.06]} m="plasticDark" />
      <Panel at={[0.05, 1.6, -0.047]} size={[0.44, 0.29]} texture={ecgTexture()} />
      <C at={[-0.42, 0.1, -0.15]} r={0.07} h={0.75} m="green" />
      <C at={[-0.42, 0.1, 0.05]} r={0.07} h={0.75} m="white" />
      <Sph at={[0.32, 1.12, 0.12]} r={0.07} m="#2D3A4A" low />
    </group>
  )
}

export function InstrumentTrolley({ drape = true, ...props }) {
  const tools = useMemo(() => {
    const r = rng(7)
    return Array.from({ length: 9 }, (_, i) => ({
      p: [-0.28 + (i % 5) * 0.14, 0.92, -0.12 + Math.floor(i / 5) * 0.2], s: [0.03, 0.015, 0.16 + r() * 0.08],
      c: '#D8DEE6', ry: (r() - 0.5) * 0.4,
    }))
  }, [])
  return (
    <group {...props}>
      {[[-0.38, -0.22], [0.38, -0.22], [-0.38, 0.22], [0.38, 0.22]].map(([x, z], i) => (
        <C key={i} at={[x, 0.05, z]} r={0.015} h={0.85} m="chrome" />
      ))}
      <B at={[0, 0.3, 0]} s={[0.8, 0.02, 0.5]} m="steel" />
      <B at={[0, 0.88, 0]} s={[0.82, 0.025, 0.52]} m="steel" />
      {drape && <B at={[0, 0.905, 0]} s={[0.84, 0.008, 0.54]} m="surgicalGreen" />}
      <BoxInstances items={tools} />
    </group>
  )
}

/** Steel scrub trough with 2 taps, against a wall (back at −z). */
export function ScrubSink({ length = 1.8, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[length, 0.85, 0.55]} m="steel" />
      <B at={[0, 0.78, 0.02]} s={[length - 0.12, 0.08, 0.42]} m="chrome" />
      {[-length / 4, length / 4].map((x) => (
        <group key={x}>
          <C at={[x, 0.86, -0.2]} r={0.02} h={0.32} m="chrome" />
          <B at={[x, 1.15, -0.2]} s={[0.03, 0.03, 0.2]} m="chrome" />
        </group>
      ))}
      <B at={[0, 1.2, -0.26]} s={[length, 0.5, 0.02]} m="#E2E8EE" />
    </group>
  )
}

export function StorageCabinet({ width = 1.2, height = 1.9, glassFront = false, color = 'white', ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[width, height, 0.5]} m={color} />
      <B at={[0, 0.06, 0.252]} s={[width - 0.08, height - 0.12, 0.01]} m={glassFront ? 'glass' : 'offWhite'} />
      <B at={[0, height * 0.5, 0.256]} s={[0.012, height - 0.2, 0.004]} m="plasticGrey" />
      <B at={[-0.06, height * 0.55, 0.262]} s={[0.02, 0.18, 0.02]} m="steel" />
      <B at={[0.06, height * 0.55, 0.262]} s={[0.02, 0.18, 0.02]} m="steel" />
    </group>
  )
}

// ── Radiology ────────────────────────────────────────────────────────────────

/** X-ray table (long axis z) with a floor-to-ceiling tube stand on its −x side. */
export function XRayUnit(props) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.66, 0.68, 1.2]} m="plasticLight" />
      <B at={[0, 0.68, 0]} s={[0.8, 0.08, 2.3]} m="cream" />
      <B at={[0, 0.76, 0.1]} s={[0.7, 0.03, 1.6]} m="#DCE7F2" />
      <B at={[-0.85, 0, -0.1]} s={[0.12, 0.05, 2.2]} m="steelDark" />
      <B at={[-0.85, 0.05, 0.25]} s={[0.24, 2.0, 0.24]} m="plasticLight" />
      <B at={[-0.48, 1.65, 0.25]} s={[0.8, 0.14, 0.2]} m="plasticLight" />
      <B at={[-0.05, 1.45, 0.25]} s={[0.42, 0.3, 0.36]} m="white" />
      <B at={[-0.05, 1.3, 0.25]} s={[0.28, 0.15, 0.28]} m="plasticDark" />
      <Panel at={[-0.05, 1.6, 0.431]} size={[0.16, 0.08]} texture={desktopTexture()} />
    </group>
  )
}

export function WallBucky(props) {
  return (
    <group {...props}>
      <B at={[0, 0, 0.06]} s={[0.36, 2.0, 0.12]} m="plasticLight" />
      <B at={[0, 1.0, 0.18]} s={[0.55, 0.55, 0.13]} m="white" />
      <Panel at={[0, 1.27, 0.246]} size={[0.38, 0.45]} texture={xrayTexture()} />
    </group>
  )
}

/** Control console behind a lead-glass screen (screen along x at z = −0.6). */
export function RadiologyConsole(props) {
  return (
    <group {...props}>
      <B at={[0, 0, -0.65]} s={[1.6, 0.9, 0.06]} m="steelDark" />
      <B at={[0, 0.9, -0.65]} s={[1.6, 1.15, 0.04]} m="leadGlass" />
      <B at={[0, 0, 0]} s={[1.4, 0.74, 0.7]} m="white" />
      <B at={[0, 0.74, 0]} s={[1.45, 0.03, 0.72]} m="counter" />
      <Computer at={[-0.35, 0.77, -0.1]} />
      <Computer at={[0.35, 0.77, -0.1]} />
      <OfficeChairMini position={[0, 0, 0.7]} rotation={[0, Math.PI, 0]} />
    </group>
  )
}

// ── Laboratory ───────────────────────────────────────────────────────────────

const LAB_COLORS = ['#E86A5C', '#F2C230', '#6FB7F2', '#7BD389', '#B48CF2', '#FFFFFF']

/** Laboratory bench with cabinets, epoxy top and a reagent shelf; back at −z. */
export function LabBench({ length = 3, shelf = true, island = false, seed = 3, ...props }) {
  const items = useMemo(() => {
    const r = rng(seed)
    const out = []
    const n = Math.floor(length * 3)
    for (let i = 0; i < n; i++) {
      const x = -length / 2 + 0.2 + (i / n) * (length - 0.4)
      if (shelf) out.push({ p: [x, 1.53, -0.2], s: [0.08, 0.12 + r() * 0.1, 0.08], c: LAB_COLORS[Math.floor(r() * 6)] })
      if (r() > 0.55) out.push({ p: [x + 0.05, 0.92, 0.05 + r() * 0.15], s: [0.07, 0.1 + r() * 0.08, 0.07], c: '#D9EEF7' })
    }
    return out
  }, [length, shelf, seed])
  const depth = island ? 1.2 : 0.7
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[length, 0.86, depth - 0.05]} m="white" />
      {Array.from({ length: Math.floor(length / 0.6) }, (_, i) => (
        <B key={i} at={[-length / 2 + 0.3 + i * 0.6, 0.08, (depth - 0.05) / 2 + 0.002]} s={[0.012, 0.7, 0.004]} m="plasticGrey" />
      ))}
      <B at={[0, 0.86, 0]} s={[length + 0.04, 0.04, depth]} m="epoxy" />
      {shelf && !island && (
        <>
          <B at={[-length / 2 + 0.05, 0.9, -0.25]} s={[0.04, 0.75, 0.04]} m="steel" />
          <B at={[length / 2 - 0.05, 0.9, -0.25]} s={[0.04, 0.75, 0.04]} m="steel" />
          <B at={[0, 1.5, -0.2]} s={[length, 0.03, 0.3]} m="woodLight" />
        </>
      )}
      <BoxInstances items={items} />
    </group>
  )
}

export function Microscope(props) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.2, 0.04, 0.26]} m="plasticLight" />
      <B at={[0, 0.04, -0.08]} s={[0.07, 0.28, 0.07]} m="plasticLight" />
      <B at={[0, 0.14, 0.02]} s={[0.15, 0.02, 0.13]} m="steelDark" />
      <C at={[0, 0.22, 0.0]} r={0.025} h={0.14} m="black" rotation={[0.5, 0, 0]} />
      <C at={[0, 0.32, -0.05]} r={0.02} h={0.08} m="black" />
    </group>
  )
}

export function Centrifuge(props) {
  return (
    <group {...props}>
      <C at={[0, 0, 0]} r={0.2} h={0.26} m="white" />
      <C at={[0, 0.26, 0]} r={0.17} h={0.03} m="plasticGrey" />
      <B at={[0, 0.06, 0.19]} s={[0.12, 0.06, 0.02]} m="screenOff" />
    </group>
  )
}

/** Fume hood (glass sash) with a duct to the ceiling; back at −z. */
export function FumeHood({ width = 1.5, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[width, 0.86, 0.8]} m="white" />
      <B at={[0, 0.86, 0]} s={[width, 0.04, 0.8]} m="epoxy" />
      <B at={[-width / 2 + 0.04, 0.9, 0]} s={[0.08, 1.25, 0.8]} m="white" />
      <B at={[width / 2 - 0.04, 0.9, 0]} s={[0.08, 1.25, 0.8]} m="white" />
      <B at={[0, 0.9, -0.37]} s={[width, 1.25, 0.06]} m="#DDE4EA" />
      <B at={[0, 2.15, 0]} s={[width, 0.35, 0.8]} m="white" />
      <B at={[0, 1.15, 0.38]} s={[width - 0.16, 0.95, 0.02]} m="glass" />
      <C at={[0, 2.5, -0.1]} r={0.15} h={WALL_H - 2.5} m="steel" />
    </group>
  )
}

// ── Refrigeration (pharmacy, lab, blood bank) ────────────────────────────────

/** Upright medical refrigerator with glass door; contents = meds | blood | samples. */
export function MedFridge({ contents = 'meds', width = 0.7, height = 1.9, ...props }) {
  const items = useMemo(() => {
    const r = rng(width * 100 + height * 10 + contents.length)
    const out = []
    for (let shelf = 0; shelf < 5; shelf++) {
      const y = 0.2 + shelf * ((height - 0.4) / 5)
      for (let i = 0; i < 5; i++) {
        const c = contents === 'blood' ? (r() > 0.25 ? '#A3121C' : '#E9C46A')
          : contents === 'samples' ? ['#F2C230', '#6FB7F2', '#E86A5C'][Math.floor(r() * 3)]
            : ['#FFFFFF', '#9FD3F5', '#F6C177', '#B7E4C7'][Math.floor(r() * 4)]
        out.push({ p: [-width / 2 + 0.1 + i * ((width - 0.2) / 4), y, 0.02], s: [0.09, 0.16, 0.18], c })
      }
    }
    return out
  }, [contents, width, height])
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[width, height, 0.72]} m="white" />
      <B at={[0, 0.12, 0.05]} s={[width - 0.08, height - 0.3, 0.6]} m="#EEF4F8" cast={false} />
      <BoxInstances items={items} />
      <B at={[0, 0.1, 0.362]} s={[width - 0.04, height - 0.25, 0.02]} m="glassDoor" />
      <B at={[width / 2 - 0.06, height * 0.45, 0.38]} s={[0.025, 0.4, 0.03]} m="steel" />
      <B at={[0, height - 0.13, 0.362]} s={[0.16, 0.06, 0.004]} m="#0B3D2E" />
    </group>
  )
}

/** Chest freezer (plasma). */
export function ChestFreezer({ width = 1.3, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[width, 0.85, 0.7]} m="white" />
      <B at={[0, 0.85, 0]} s={[width + 0.02, 0.05, 0.72]} m="plasticLight" />
      <B at={[0, 0.7, 0.355]} s={[width * 0.4, 0.04, 0.03]} m="steel" />
      <B at={[width / 2 - 0.2, 0.55, 0.352]} s={[0.16, 0.06, 0.004]} m="#0B3D2E" />
    </group>
  )
}

/** Pharmacy / archive shelving, both faces stocked; runs along x. */
export function Shelving({ length = 3, height = 2.1, depth = 0.5, levels = 5, seed = 1,
                           palette = ['#F6F8FA', '#9FD3F5', '#F6C177', '#E86A5C', '#B7E4C7', '#C9B6F2'],
                           itemDepth = 0.18, doubleSided = true, ...props }) {
  const items = useMemo(() => {
    const r = rng(seed)
    const out = []
    const sides = doubleSided ? [-1, 1] : [1]
    for (let lv = 0; lv < levels; lv++) {
      const y = 0.12 + lv * ((height - 0.2) / levels) + 0.03
      for (const side of sides) {
        let x = -length / 2 + 0.06
        while (x < length / 2 - 0.12) {
          const w = 0.06 + r() * 0.12
          if (r() > 0.12) {
            out.push({ p: [x + w / 2, y, side * (depth / 4)], s: [w * 0.9, 0.12 + r() * 0.16, itemDepth],
                       c: palette[Math.floor(r() * palette.length)] })
          }
          x += w
        }
      }
    }
    return out
  }, [length, height, depth, levels, seed, palette, itemDepth, doubleSided])
  return (
    <group {...props}>
      {[-length / 2, length / 2].map((x) => <B key={x} at={[x, 0, 0]} s={[0.04, height, depth]} m="steel" />)}
      {Array.from({ length: levels + 1 }, (_, lv) => (
        <B key={lv} at={[0, 0.12 + lv * ((height - 0.2) / levels), 0]} s={[length, 0.025, depth]} m="plasticLight" />
      ))}
      <B at={[0, 0, 0]} s={[length, 0.1, depth - 0.04]} m="steelDark" />
      <BoxInstances items={items} />
    </group>
  )
}

// ── Small shared items (also used by general furniture) ─────────────────────

export function Computer({ at = [0, 0, 0], rotY = 0 }) {
  return (
    <group position={at} rotation={[0, rotY, 0]}>
      <B at={[0, 0, 0]} s={[0.2, 0.015, 0.16]} m="plasticDark" />
      <B at={[0, 0.015, 0]} s={[0.04, 0.16, 0.04]} m="plasticDark" />
      <B at={[0, 0.16, 0.01]} s={[0.52, 0.32, 0.03]} m="black" />
      <Panel at={[0, 0.32, 0.026]} size={[0.48, 0.28]} texture={desktopTexture()} />
      <B at={[0, 0, 0.26]} s={[0.42, 0.015, 0.14]} m="plasticGrey" />
      <B at={[0.32, 0, 0.27]} s={[0.06, 0.02, 0.1]} m="plasticGrey" />
    </group>
  )
}

export function OfficeChairMini(props) {
  return (
    <group {...props}>
      {[0, 1.257, 2.513, 3.77, 5.026].map((a, i) => (
        <B key={i} at={[Math.cos(a) * 0.17, 0.03, Math.sin(a) * 0.17]} s={[0.32, 0.03, 0.04]} rot={[0, -a, 0]} m="black" />
      ))}
      <C at={[0, 0.05, 0]} r={0.025} h={0.38} m="chrome" />
      <B at={[0, 0.43, 0]} s={[0.48, 0.07, 0.46]} m="leather" />
      <B at={[0, 0.55, -0.22]} s={[0.44, 0.5, 0.06]} m="leather" />
    </group>
  )
}

