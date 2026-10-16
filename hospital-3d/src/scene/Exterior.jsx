/**
 * Site around the building: lawn, paving, access road, parking, ambulance bay,
 * trees, the main-entrance porch (steps, canopy, planters) and the green
 * emergency-exit signs of the reference plan.
 */
import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { BUILDING_BOUNDS, DOORS, px, pz } from '../data/hospitalLayout'
import { PostSign } from './furniture/safety'
import { B, BoxInstances, C, GEO, MAT, Panel, rng, Sph } from './primitives'
import { canvasTexture } from './textures'

const b = BUILDING_BOUNDS
const ENTRANCE = DOORS.find((d) => d.id === 'EXIT-S')
const AMBULANCE_DOOR = DOORS.find((d) => d.id === 'D-ED-AMB')
const ROAD_Z = b.maxZ + 17
export const GROUND = -0.3 // building floor is at 0, on a 0.3 m plinth

function Car({ color = '#C9D3DD', ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0.25, 0]} s={[1.8, 0.6, 4.3]} m={color} />
      <B at={[0, 0.85, -0.2]} s={[1.6, 0.5, 2.3]} m={color} />
      <B at={[0, 0.88, -0.2]} s={[1.62, 0.4, 2.0]} m="glass" />
      {[[-0.85, -1.4], [0.85, -1.4], [-0.85, 1.4], [0.85, 1.4]].map(([x, z], i) => (
        <mesh key={i} geometry={GEO.cyl} material={MAT.rubber} position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]}
              scale={[0.66, 0.24, 0.66]} castShadow />
      ))}
    </group>
  )
}

function Ambulance(props) {
  const side = useMemo(() => canvasTexture('ambulance-side', 512, 160, (g, w, h) => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#D7322E'; g.fillRect(0, h * 0.55, w, h * 0.16)
    g.fillStyle = '#F2C230'; g.fillRect(0, h * 0.71, w, h * 0.06)
    g.fillStyle = '#D7322E'; g.font = 'bold 54px Inter, Arial, sans-serif'; g.fillText('AMBULANCE', 60, 70)
  }), [])
  return (
    <group {...props}>
      <B at={[0, 0.3, 0.6]} s={[2.2, 2.4, 4.4]} m="white" />
      <Panel at={[1.105, 1.5, 0.6]} size={[4.3, 1.3]} texture={side} rot={[0, Math.PI / 2, 0]} />
      <Panel at={[-1.105, 1.5, 0.6]} size={[4.3, 1.3]} texture={side} rot={[0, -Math.PI / 2, 0]} />
      <B at={[0, 0.3, -2.3]} s={[2.1, 1.5, 1.5]} m="white" />
      <B at={[0, 1.15, -2.95]} s={[1.9, 0.55, 0.1]} m="glass" />
      <B at={[0, 2.7, -1.2]} s={[1.4, 0.14, 0.3]} m="red" />
      <B at={[0, 2.7, -1.2]} s={[0.4, 0.15, 0.32]} m="#2F6FD0" />
      {[[-1.0, -2.1], [1.0, -2.1], [-1.0, 1.9], [1.0, 1.9]].map(([x, z], i) => (
        <mesh key={i} geometry={GEO.cyl} material={MAT.rubber} position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}
              scale={[0.76, 0.28, 0.76]} castShadow />
      ))}
    </group>
  )
}

function Tree({ size = 1, ...props }) {
  return (
    <group {...props} scale={[size, size, size]}>
      <C at={[0, 0, 0]} r={0.16} h={2.2} m="woodDark" low />
      <Sph at={[0, 3.0, 0]} r={1.5} m="plant" low />
      <Sph at={[0.8, 2.6, 0.4]} r={1.0} m="plantLight" low />
      <Sph at={[-0.7, 2.7, -0.3]} r={1.1} m="plantDark" low />
    </group>
  )
}

function Planter({ ...props }) {
  return (
    <group {...props}>
      <B at={[0, 0, 0]} s={[1.6, 0.55, 1.6]} m="concrete" />
      <B at={[0, 0.55, 0]} s={[1.45, 0.04, 1.45]} m="soil" />
      <Sph at={[-0.35, 0.95, -0.35]} r={0.45} m="plant" low />
      <Sph at={[0.35, 0.95, 0.35]} r={0.45} m="plantDark" low />
      <Sph at={[0.35, 0.92, -0.35]} r={0.4} m="plantLight" low />
      <Sph at={[-0.35, 0.92, 0.35]} r={0.4} m="plant" low />
    </group>
  )
}

function EntrancePorch() {
  const x = px(ENTRANCE.at[0])
  const z = pz(ENTRANCE.at[1])
  const width = 9.5
  const G = GROUND
  return (
    <group position={[x, 0, z]}>
      {/* landing level with the lobby floor, then two steps down to the drive */}
      <B at={[0, G, 2.2]} s={[width, -G, 4.4]} m="paving" />
      <B at={[0, G, 4.58]} s={[width - 2.6, 0.2, 0.36]} m="concrete" />
      <B at={[0, G, 4.94]} s={[width - 2.6, 0.1, 0.36]} m="concrete" />
      {/* accessible ramp on the east side */}
      <mesh geometry={GEO.box} material={MAT.concrete} position={[width / 2 - 0.65, G / 2 - 0.02, 5.4]}
            rotation={[-Math.atan2(-G, 2.2), 0, 0]} scale={[1.3, 0.06, 2.25]} receiveShadow />
      {/* canopy */}
      {[[-3.6, 0.6], [3.6, 0.6], [-3.6, 4.0], [3.6, 4.0]].map(([cx, cz], i) => (
        <C key={i} at={[cx, 0, cz]} r={0.13} h={3.4} m="white" />
      ))}
      <B at={[0, 3.4, 2.2]} s={[8.6, 0.12, 4.8]} m="glass" cast={false} />
      <B at={[0, 3.34, 0.6]} s={[8.6, 0.1, 0.16]} m="white" />
      <B at={[0, 3.34, 4.0]} s={[8.6, 0.1, 0.16]} m="white" />
      <B at={[-3.6, 3.34, 2.2]} s={[0.16, 0.1, 4.8]} m="white" />
      <B at={[3.6, 3.34, 2.2]} s={[0.16, 0.1, 4.8]} m="white" />
      <Planter position={[-4.0, G, 5.6]} />
      <Planter position={[4.4, G, 7.0]} />
      <PostSign position={[-1.8, G, 7.6]} text="MAIN ENTRANCE" icon="cross" bg="#1E5FAF" width={2.6} height={0.55} y={1.9} />
    </group>
  )
}

/** Exit landing with one step, outside an emergency exit (dir −1 north, +1 south). */
function ExitLanding({ door, dir }) {
  const x = px(door.at[0])
  const z = pz(door.at[1])
  return (
    <group>
      <B at={[x, GROUND, z + dir * 0.95]} s={[2.2, -GROUND, 1.9]} m="concrete" />
      <B at={[x, GROUND, z + dir * 2.08]} s={[2.2, 0.15, 0.36]} m="concrete" />
    </group>
  )
}

function AmbulanceBay() {
  const x = px(AMBULANCE_DOOR.at[0])
  const z = pz(AMBULANCE_DOOR.at[1])
  const stripes = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    p: [x - 2.6 + i * 1.05, GROUND + 0.004, z + 6.2], s: [0.35, 0.004, 6.0], c: '#E4C440', ry: 0.6,
  })), [x, z])
  return (
    <group>
      {/* ambulance loading dock, level with the ED floor */}
      <B at={[x, GROUND, z + 1.3]} s={[6.4, -GROUND, 2.6]} m="concrete" />
      <B at={[x, GROUND, z + 2.62]} s={[6.4, -GROUND - 0.02, 0.06]} m="yellow" />
      <B at={[x, GROUND + 0.001, z + 6.2]} s={[6.4, 0.004, 7.0]} m="asphalt" cast={false} />
      <BoxInstances items={stripes} />
      <B at={[x, 2.6, z + 2.0]} s={[6.6, 0.1, 4.2]} m="glass" cast={false} />
      <B at={[x, 2.55, z + 3.8]} s={[6.6, 0.12, 0.16]} m="white" />
      {[-3.0, 3.0].map((o) => <C key={o} at={[x + o, GROUND, z + 3.8]} r={0.1} h={2.9 - GROUND} m="white" />)}
      <Ambulance position={[x + 0.2, GROUND, z + 5.9]} />
      <PostSign position={[x + 4.8, GROUND, z + 2.0]} rotation={[0, -0.4, 0]} text="EMERGENCY" icon="cross" bg="#D7322E" width={2.2} />
    </group>
  )
}

function ExitSigns() {
  const spots = [
    { id: 'EXIT-NW', dz: -3.4, rot: Math.PI },
    { id: 'EXIT-NE', dz: -3.4, rot: Math.PI },
    { id: 'EXIT-SW', dz: 3.4, rot: 0 },
    { id: 'EXIT-SE', dz: 3.4, rot: 0 },
  ]
  return spots.map(({ id, dz, rot }) => {
    const d = DOORS.find((x) => x.id === id)
    return (
      <group key={id}>
        <ExitLanding door={d} dir={Math.sign(dz)} />
        <PostSign position={[px(d.at[0]) + 2.6, GROUND, pz(d.at[1]) + dz]} rotation={[0, rot, 0]}
                  text="EMERGENCY EXIT" width={2.4} height={0.5} y={2.0} />
      </group>
    )
  })
}

function Compass(props) {
  const tex = useMemo(() => canvasTexture('compass', 256, 256, (g, w) => {
    const c = w / 2
    g.clearRect(0, 0, w, w)
    g.strokeStyle = '#1E293B'; g.lineWidth = 6
    g.beginPath(); g.arc(c, c, 92, 0, Math.PI * 2); g.stroke()
    const star = (angle, color) => {
      g.save(); g.translate(c, c); g.rotate(angle); g.fillStyle = color
      g.beginPath(); g.moveTo(0, -88); g.lineTo(14, 0); g.lineTo(-14, 0); g.closePath(); g.fill(); g.restore()
    }
    ;[0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a, i) => star(a, i % 2 ? '#94A3B8' : '#0F172A'))
    g.fillStyle = '#0F172A'; g.font = 'bold 34px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('N', c, 18); g.fillText('S', c, w - 16); g.fillText('E', w - 16, c); g.fillText('W', 16, c)
  }), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), [tex])
  return <mesh geometry={GEO.plane} material={material} rotation={[-Math.PI / 2, 0, 0]} scale={[7, 7, 1]} {...props} />
}

function Parking() {
  const lines = useMemo(() => {
    const out = []
    for (let i = 0; i <= 10; i++) out.push({ p: [b.minX + 6 + i * 2.6, GROUND + 0.006, ROAD_Z + 7.5], s: [0.12, 0.004, 5.2], c: '#F4F4F4' })
    for (let i = 0; i <= 10; i++) out.push({ p: [b.maxX - 32 + i * 2.6, GROUND + 0.006, ROAD_Z + 7.5], s: [0.12, 0.004, 5.2], c: '#F4F4F4' })
    for (let x = b.minX - 30; x < b.maxX + 30; x += 6) out.push({ p: [x, GROUND + 0.006, ROAD_Z], s: [3, 0.004, 0.18], c: '#F2D04A' })
    return out
  }, [])
  const cars = [
    [b.minX + 7.3, '#C0392B'], [b.minX + 12.5, '#ECF0F1'], [b.minX + 15.1, '#2C3E50'], [b.minX + 22.9, '#2E86C1'],
    [b.maxX - 30.7, '#7F8C8D'], [b.maxX - 23, '#F5F5F5'], [b.maxX - 17.8, '#1E8449'], [b.maxX - 9.9, '#B9770E'],
  ]
  return (
    <group>
      <B at={[(b.minX + b.maxX) / 2, GROUND, ROAD_Z]} s={[b.maxX - b.minX + 80, 0.005, 9]} m="asphalt" cast={false} />
      <B at={[b.minX + 19, GROUND + 0.001, ROAD_Z + 7.5]} s={[30, 0.005, 7]} m="asphalt" cast={false} />
      <B at={[b.maxX - 19, GROUND + 0.001, ROAD_Z + 7.5]} s={[30, 0.005, 7]} m="asphalt" cast={false} />
      <B at={[px(ENTRANCE.at[0]), GROUND + 0.001, (b.maxZ + 7 + ROAD_Z) / 2]} s={[7, 0.005, ROAD_Z - b.maxZ - 7]} m="asphalt" cast={false} />
      <BoxInstances items={lines} />
      {cars.map(([x, color]) => <Car key={x} position={[x, GROUND, ROAD_Z + 7.5]} color={color} />)}
    </group>
  )
}

function Trees() {
  const spots = useMemo(() => {
    const r = rng(99)
    const out = []
    for (let x = b.minX - 6; x <= b.maxX + 6; x += 7.5) {
      out.push([x + r() * 2, b.minZ - 8 - r() * 3, 0.8 + r() * 0.5])
      if (Math.abs(x - px(ENTRANCE.at[0])) > 8 && Math.abs(x - px(AMBULANCE_DOOR.at[0])) > 6) {
        out.push([x + r() * 2, ROAD_Z - 7.5 + r(), 0.7 + r() * 0.3])
      }
    }
    for (let z = b.minZ - 2; z <= b.maxZ + 4; z += 7) {
      out.push([b.minX - 8 - r() * 3, z + r() * 2, 0.8 + r() * 0.5])
      out.push([b.maxX + 8 + r() * 3, z + r() * 2, 0.8 + r() * 0.5])
    }
    return out
  }, [])
  return spots.map(([x, z, s], i) => <Tree key={i} position={[x, GROUND, z]} size={s} />)
}

function Exterior() {
  const cx = (b.minX + b.maxX) / 2
  const cz = (b.minZ + b.maxZ) / 2
  return (
    <group>
      <mesh geometry={GEO.plane} material={MAT.grass} rotation={[-Math.PI / 2, 0, 0]} position={[cx, GROUND - 0.01, cz + 8]}
            scale={[260, 220, 1]} receiveShadow />
      <B at={[cx, GROUND - 0.012, cz + 1]} s={[b.maxX - b.minX + 9, 0.012, b.maxZ - b.minZ + 12]} m="paving" cast={false} />
      <Parking />
      <EntrancePorch />
      <AmbulanceBay />
      <ExitSigns />
      <Trees />
      <Compass position={[b.maxX + 9, GROUND + 0.01, b.minZ + 4]} />
    </group>
  )
}

export default memo(Exterior)
