/**
 * General furniture: offices, seating, reception, cafeteria and kitchen.
 * Origin on the floor, front = +z.
 */
import { B, C, Panel, Sph } from '../primitives'
import { tvTexture } from '../textures'
import { Computer, OfficeChairMini } from './specialist'

export { Computer, OfficeChairMini as OfficeChair }

export function Chair({ color = 'fabricBlue', ...props }) {
  return (
    <group {...props}>
      {[[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].map(([x, z], i) => (
        <B key={i} at={[x, 0, z]} s={[0.03, 0.44, 0.03]} m="steelDark" />
      ))}
      <B at={[0, 0.44, 0]} s={[0.44, 0.05, 0.44]} m={color} />
      <B at={[0, 0.49, -0.2]} s={[0.44, 0.42, 0.04]} m={color} />
    </group>
  )
}

export function Armchair({ color = 'fabricTeal', ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.78, 0.42, 0.74]} m={color} />
      <B at={[0, 0.42, -0.3]} s={[0.78, 0.45, 0.14]} m={color} />
      <B at={[-0.34, 0.42, 0.02]} s={[0.1, 0.2, 0.7]} m={color} />
      <B at={[0.34, 0.42, 0.02]} s={[0.1, 0.2, 0.7]} m={color} />
    </group>
  )
}

/** Row of linked waiting seats along x. */
export function WaitingSeats({ n = 4, color = 'fabricBlue', ...props }) {
  const pitch = 0.58
  const len = n * pitch
  return (
    <group {...props}>
      <B at={[0, 0.3, 0]} s={[len, 0.05, 0.08]} m="steelDark" />
      {[-len / 2 + 0.15, len / 2 - 0.15].map((x) => <B key={x} at={[x, 0, 0]} s={[0.05, 0.32, 0.45]} m="steelDark" />)}
      {Array.from({ length: n }, (_, i) => {
        const x = -len / 2 + pitch / 2 + i * pitch
        return (
          <group key={i}>
            <B at={[x, 0.4, 0.04]} s={[0.5, 0.07, 0.46]} m={color} />
            <B at={[x, 0.47, -0.2]} s={[0.5, 0.48, 0.06]} m={color} />
          </group>
        )
      })}
    </group>
  )
}

export function Bench({ length = 1.8, ...props }) {
  return (
    <group {...props}>
      <B at={[-length / 2 + 0.12, 0, 0]} s={[0.05, 0.42, 0.4]} m="steelDark" />
      <B at={[length / 2 - 0.12, 0, 0]} s={[0.05, 0.42, 0.4]} m="steelDark" />
      <B at={[0, 0.42, 0]} s={[length, 0.05, 0.42]} m="wood" />
    </group>
  )
}

export function Desk({ width = 1.4, depth = 0.7, computer = true, ...props }) {
  return (
    <group {...props}>
      <B at={[-width / 2 + 0.03, 0, 0]} s={[0.04, 0.72, depth - 0.04]} m="plasticGrey" />
      <B at={[width / 2 - 0.25, 0, 0]} s={[0.45, 0.72, depth - 0.04]} m="white" />
      <B at={[width / 2 - 0.25, 0.5, depth / 2 - 0.018]} s={[0.4, 0.01, 0.004]} m="plasticGrey" />
      <B at={[0, 0.06, -depth / 2 + 0.04]} s={[width - 0.08, 0.5, 0.02]} m="plasticGrey" />
      <B at={[0, 0.72, 0]} s={[width, 0.035, depth]} m="woodLight" />
      {computer && <Computer at={[-0.1, 0.755, -0.12]} />}
    </group>
  )
}

export function FilingCabinet({ drawers = 4, ...props }) {
  const h = 0.33 * drawers
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.47, h, 0.62]} m="plasticGrey" />
      {Array.from({ length: drawers }, (_, i) => (
        <group key={i}>
          <B at={[0, 0.03 + i * 0.33, 0.311]} s={[0.43, 0.28, 0.01]} m="#B5BFCB" />
          <B at={[0, 0.2 + i * 0.33, 0.32]} s={[0.14, 0.02, 0.02]} m="steel" />
        </group>
      ))}
    </group>
  )
}

export function MeetingTable({ length = 2.2, width = 1.0, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.6, 0.7, 0.3]} m="steelDark" />
      <B at={[0, 0.7, 0]} s={[length, 0.04, width]} m="woodLight" />
      {[-0.65, 0, 0.65].map((x) => (
        <group key={x}>
          <OfficeChairMini position={[x, 0, -width / 2 - 0.35]} />
          <OfficeChairMini position={[x, 0, width / 2 + 0.35]} rotation={[0, Math.PI, 0]} />
        </group>
      ))}
    </group>
  )
}

export function Printer(props) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.6, 0.65, 0.55]} m="plasticLight" />
      <B at={[0, 0.65, 0]} s={[0.55, 0.32, 0.5]} m="white" />
      <B at={[0.15, 0.97, 0.12]} s={[0.18, 0.02, 0.1]} m="screenOff" />
    </group>
  )
}

export function Plant({ size = 1, ...props }) {
  const s = size
  return (
    <group {...props}>
      <C at={[0, 0, 0]} r={0.2 * s} h={0.42 * s} m="terracotta" />
      <C at={[0, 0.42 * s, 0]} r={0.18 * s} h={0.02} m="soil" />
      <C at={[0, 0.42 * s, 0]} r={0.025 * s} h={0.35 * s} m="woodDark" />
      <Sph at={[0, 0.95 * s, 0]} r={0.32 * s} m="plant" low />
      <Sph at={[0.17 * s, 0.82 * s, 0.08 * s]} r={0.22 * s} m="plantLight" low />
      <Sph at={[-0.16 * s, 0.86 * s, -0.06 * s]} r={0.24 * s} m="plantDark" low />
      <Sph at={[0.02 * s, 1.18 * s, -0.04 * s]} r={0.2 * s} m="plantLight" low />
    </group>
  )
}

/** Wall TV / information screen; back at z = 0. */
export function TvScreen({ width = 1.3, y = 1.9, ...props }) {
  const h = width * 0.5625
  return (
    <group {...props}>
      <B at={[0, y - h / 2, 0.03]} s={[width + 0.06, h + 0.06, 0.05]} m="black" />
      <Panel at={[0, y, 0.057]} size={[width, h]} texture={tvTexture()} />
    </group>
  )
}

export function WaterDispenser(props) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.34, 1.0, 0.34]} m="white" />
      <C at={[0, 1.0, 0]} r={0.14} h={0.42} m="#9FD3F5" />
      <B at={[0, 0.72, 0.172]} s={[0.12, 0.08, 0.02]} m="#3BA3E0" />
    </group>
  )
}

export function CoffeeTable({ size = [1.0, 0.55], ...props }) {
  return (
    <group {...props}>
      <C at={[0, 0, 0]} r={0.06} h={0.38} m="steelDark" />
      <B at={[0, 0.38, 0]} s={[size[0], 0.03, size[1]]} m="woodLight" />
      <B at={[0.2, 0.41, 0.05]} s={[0.24, 0.015, 0.3]} m="#F6C177" />
    </group>
  )
}

/** Reception counter: raised front transaction ledge, desk behind (staff side = −z). */
export function ReceptionDesk({ width = 3.6, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0.25]} s={[width, 1.1, 0.12]} m="woodLight" />
      <B at={[0, 1.1, 0.28]} s={[width + 0.1, 0.04, 0.34]} m="counter" />
      <B at={[0, 0.02, 0.32]} s={[width - 0.2, 0.06, 0.02]} m="lampGlow" cast={false} />
      <B at={[-width / 2 - 0.04, 0, -0.2]} s={[0.12, 1.1, 1.0]} m="woodLight" />
      <B at={[width / 2 + 0.04, 0, -0.2]} s={[0.12, 1.1, 1.0]} m="woodLight" />
      <B at={[0, 0.72, -0.12]} s={[width, 0.035, 0.6]} m="counter" />
      <Computer at={[-width / 4, 0.755, 0.0]} rotY={Math.PI} />
      <Computer at={[width / 4, 0.755, 0.0]} rotY={Math.PI} />
      <OfficeChairMini position={[-width / 4, 0, -0.75]} />
      <OfficeChairMini position={[width / 4, 0, -0.75]} />
      {/* receptionist */}
      <C at={[-width / 4, 0.48, -0.75]} r={0.17} h={0.62} m="#3A6FD8" />
      <Sph at={[-width / 4, 1.22, -0.75]} r={0.12} m="#E8C4A2" />
    </group>
  )
}

export function DiningSet({ chairs = 4, color = 'fabricTeal', ...props }) {
  const spots = [[0, -0.62, 0], [0, 0.62, Math.PI], [-0.62, 0, Math.PI / 2], [0.62, 0, -Math.PI / 2]].slice(0, chairs)
  return (
    <group {...props}>
      <C at={[0, 0, 0]} r={0.25} h={0.03} m="steelDark" />
      <C at={[0, 0.03, 0]} r={0.04} h={0.7} m="steelDark" />
      <B at={[0, 0.73, 0]} s={[0.9, 0.035, 0.9]} m="woodLight" />
      <B at={[0.15, 0.765, 0.1]} s={[0.22, 0.01, 0.16]} m="white" />
      {spots.map(([x, z, r], i) => <Chair key={i} position={[x, 0, z]} rotation={[0, r, 0]} color={color} />)}
    </group>
  )
}

/** Kitchen line against a wall (back at −z): range, prep, sink, hood. */
export function KitchenLine({ length = 6, ...props }) {
  const cell = length / 5
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[length, 0.88, 0.75]} m="steel" />
      <B at={[0, 0.88, 0]} s={[length + 0.02, 0.04, 0.78]} m="chrome" />
      {/* gas range with burners */}
      {[[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.15], [0.18, 0.15]].map(([x, z], i) => (
        <C key={i} at={[-length / 2 + cell * 0.6 + x, 0.92, z]} r={0.09} h={0.02} m="black" />
      ))}
      <B at={[-length / 2 + cell * 0.6, 0.94, 0.15]} s={[0.36, 0.14, 0.26]} m="steelDark" />
      {/* sink */}
      <B at={[-length / 2 + cell * 2.5, 0.86, 0]} s={[0.7, 0.05, 0.5]} m="steelDark" />
      <C at={[-length / 2 + cell * 2.5, 0.92, -0.3]} r={0.02} h={0.3} m="chrome" />
      {/* hood */}
      <B at={[-length / 2 + cell * 1.1, 2.0, -0.05]} s={[cell * 2.2, 0.45, 0.8]} m="steel" />
      <B at={[-length / 2 + cell * 1.1, 2.45, -0.2]} s={[0.4, 0.55, 0.4]} m="steel" />
      {/* backsplash */}
      <B at={[0, 0.92, -0.36]} s={[length, 0.7, 0.02]} m="#E6ECF1" />
      {/* pots */}
      <C at={[-length / 2 + cell * 0.42, 0.94, -0.12]} r={0.13} h={0.18} m="chrome" />
      <C at={[-length / 2 + cell * 0.78, 0.94, 0.15]} r={0.1} h={0.12} m="chrome" />
    </group>
  )
}

/** Serving counter with sneeze guard and food pans. */
export function ServingCounter({ length = 5, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[length, 0.9, 0.7]} m="steel" />
      <B at={[0, 0.9, 0]} s={[length, 0.04, 0.72]} m="counter" />
      {Array.from({ length: Math.floor(length / 0.6) }, (_, i) => (
        <B key={i} at={[-length / 2 + 0.35 + i * 0.6, 0.9, -0.05]} s={[0.5, 0.06, 0.32]}
           m={['#E9C46A', '#E76F51', '#90BE6D', '#F4A261'][i % 4]} />
      ))}
      <B at={[0, 1.25, 0.05]} s={[length, 0.02, 0.4]} m="glass" />
      {[-length / 2 + 0.05, length / 2 - 0.05].map((x) => <B key={x} at={[x, 0.94, 0.2]} s={[0.03, 0.33, 0.03]} m="chrome" />)}
      <B at={[0, 0.85, 0.42]} s={[length, 0.03, 0.18]} m="chrome" />
    </group>
  )
}

export function Fridge({ width = 0.8, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[width, 2.0, 0.72]} m="steel" />
      <B at={[0, 1.25, 0.362]} s={[width - 0.04, 0.008, 0.004]} m="steelDark" />
      <B at={[-width / 2 + 0.08, 0.7, 0.38]} s={[0.025, 0.9, 0.03]} m="chrome" />
    </group>
  )
}

export function VendingMachine({ color = '#D7322E', ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.9, 1.9, 0.8]} m={color} />
      <B at={[-0.1, 0.55, 0.401]} s={[0.6, 1.2, 0.01]} m="glass" />
      {Array.from({ length: 5 }, (_, i) => (
        <B key={i} at={[-0.1, 0.62 + i * 0.23, 0.25]} s={[0.56, 0.16, 0.25]} m={['#F2C230', '#6FB7F2', '#7BD389', '#F4A261', '#E86A5C'][i]} />
      ))}
      <B at={[0.33, 1.1, 0.401]} s={[0.14, 0.3, 0.01]} m="screenOff" />
    </group>
  )
}

export function Sofa({ length = 2, color = 'fabricGrey', ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[length, 0.42, 0.85]} m={color} />
      <B at={[0, 0.42, -0.34]} s={[length, 0.42, 0.17]} m={color} />
      <B at={[-length / 2 + 0.07, 0.42, 0]} s={[0.14, 0.2, 0.85]} m={color} />
      <B at={[length / 2 - 0.07, 0.42, 0]} s={[0.14, 0.2, 0.85]} m={color} />
    </group>
  )
}

export function Wardrobe({ width = 1.0, ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[width, 2.0, 0.58]} m="woodLight" />
      <B at={[0, 0.05, 0.292]} s={[0.01, 1.9, 0.004]} m="woodDark" />
      <B at={[-0.05, 1.0, 0.3]} s={[0.02, 0.2, 0.02]} m="steel" />
      <B at={[0.05, 1.0, 0.3]} s={[0.02, 0.2, 0.02]} m="steel" />
    </group>
  )
}

export function ServerRack(props) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[0.6, 2.0, 0.9]} m="black" />
      {Array.from({ length: 8 }, (_, i) => (
        <B key={i} at={[0, 0.2 + i * 0.21, 0.451]} s={[0.5, 0.15, 0.004]} m="plasticDark" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <B key={`l${i}`} at={[0.18, 0.27 + i * 0.21, 0.455]} s={[0.03, 0.02, 0.004]} m={i % 3 ? 'green' : 'orange'} />
      ))}
    </group>
  )
}

/** Simple stylised person (standing or seated). */
export function Person({ shirt = '#3A6FD8', skin = '#E8C4A2', seated = false, ...props }) {
  const base = seated ? 0.45 : 0
  return (
    <group {...props}>
      {!seated && <B at={[-0.08, 0, 0]} s={[0.12, 0.82, 0.14]} m="#2F3B52" />}
      {!seated && <B at={[0.08, 0, 0]} s={[0.12, 0.82, 0.14]} m="#2F3B52" />}
      {seated && <B at={[0, 0.45, 0.12]} s={[0.32, 0.13, 0.4]} m="#2F3B52" />}
      <C at={[0, base + (seated ? 0.1 : 0.8), 0]} r={0.18} h={0.62} m={shirt} />
      <Sph at={[0, base + (seated ? 0.86 : 1.56), 0]} r={0.12} m={skin} />
    </group>
  )
}
