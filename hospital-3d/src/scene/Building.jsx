/**
 * Building shell: floor slabs per room (click = select room), walls generated
 * from the plan (merged into a few draw calls), doors, room labels and the
 * Decision Engine hazard overlay.
 */
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  BUILDING_BOUNDS, buildWalls, DOOR_H, DOORS, px, pz, ROOMS, WALL_H,
} from '../data/hospitalLayout'
import { SENSORS_BY_ROOM } from '../data/sensorRegistry'
import { HAZARD_COLORS, HAZARD_LABELS } from '../data/sensorTypes'
import { useSimStore } from '../state/useSimStore'
import { fromCanvas, GEO, MAT, mat } from './primitives'

const CUTAWAY_H = 1.15

// ── Walls ────────────────────────────────────────────────────────────────────

function mergedBoxes(boxes) {
  if (!boxes.length) return null
  const geos = boxes.map(({ pos, size }) => new THREE.BoxGeometry(...size).translate(...pos))
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  return merged
}

function Walls({ height }) {
  const { interior, exterior, caps } = useMemo(() => {
    const boxes = buildWalls(height)
    const capBoxes = boxes
      .filter((b) => Math.abs(b.pos[1] + b.size[1] / 2 - height) < 1e-6)
      .map((b) => ({ pos: [b.pos[0], height + 0.015, b.pos[2]], size: [b.size[0], 0.03, b.size[2]] }))
    return {
      interior: mergedBoxes(boxes.filter((b) => !b.exterior)),
      exterior: mergedBoxes(boxes.filter((b) => b.exterior)),
      caps: mergedBoxes(capBoxes),
    }
  }, [height])
  return (
    <group>
      {interior && <mesh geometry={interior} material={MAT.wall} castShadow receiveShadow />}
      {exterior && <mesh geometry={exterior} material={MAT.wallExt} castShadow receiveShadow />}
      {caps && <mesh geometry={caps} material={MAT.wallCap} receiveShadow />}
    </group>
  )
}

// ── Doors ────────────────────────────────────────────────────────────────────

const LEAF_T = 0.045
const LEAF_H = DOOR_H - 0.1
const OPEN_ANGLE = (75 * Math.PI) / 180

function Leaf({ width, exit }) {
  return (
    <group>
      <mesh geometry={GEO.box} material={exit ? mat('#2E7D4F') : MAT.woodLight} position={[0, LEAF_H / 2, 0]}
            scale={[width, LEAF_H, LEAF_T]} castShadow />
      <mesh geometry={GEO.box} material={MAT.glass} position={[width * 0.1, 1.45, 0]}
            scale={[width * 0.3, 0.55, LEAF_T + 0.01]} />
      <mesh geometry={GEO.box} material={MAT.steel} position={[0, 0.15, 0]} scale={[width * 0.96, 0.25, LEAF_T + 0.008]} />
      <mesh geometry={GEO.box} material={exit ? MAT.yellow : MAT.steel} position={[0, 1.0, 0]}
            scale={[width * 0.8, exit ? 0.05 : 0.03, LEAF_T + 0.05]} />
    </group>
  )
}

function Door({ door }) {
  const x = px(door.at[0])
  const z = pz(door.at[1])
  const horizontal = door.orient === 'h'
  const W = door.width
  const along = (offset) => (horizontal ? [x + offset, z] : [x, z + offset])
  const frameDepth = 0.34
  const frame = (
    <group>
      {[-W / 2, W / 2].map((o) => {
        const [fx, fz] = along(o)
        return (
          <mesh key={o} geometry={GEO.box} material={MAT.steelDark} position={[fx, DOOR_H / 2, fz]}
                scale={horizontal ? [0.05, DOOR_H, frameDepth] : [frameDepth, DOOR_H, 0.05]} castShadow />
        )
      })}
      <mesh geometry={GEO.box} material={MAT.steelDark} position={[x, DOOR_H + 0.025, z]}
            scale={horizontal ? [W + 0.1, 0.05, frameDepth] : [frameDepth, 0.05, W + 0.1]} />
    </group>
  )

  if (door.kind === 'opening') return null
  if (door.kind === 'sliding') {
    const pw = W * 0.3
    return (
      <group>
        {frame}
        {[-1, 1].map((s) => {
          const [gx, gz] = along(s * (W / 2 - pw / 2 - 0.03))
          return (
            <mesh key={s} geometry={GEO.box} material={MAT.glassDoor} position={[gx, DOOR_H / 2, gz]}
                  scale={horizontal ? [pw, DOOR_H - 0.05, 0.04] : [0.04, DOOR_H - 0.05, pw]} />
          )
        })}
      </group>
    )
  }
  const exit = door.kind === 'exit'
  const leaves = door.kind === 'double'
    ? [{ sign: 1, off: -W / 2, w: W / 2 - 0.03 }, { sign: -1, off: W / 2, w: W / 2 - 0.03 }]
    : door.hinge === 'end'
      ? [{ sign: -1, off: W / 2, w: W - 0.06 }]
      : [{ sign: 1, off: -W / 2, w: W - 0.06 }]
  return (
    <group>
      {frame}
      {leaves.map((l, i) => {
        const [hx, hz] = along(l.off)
        return <SimpleLeaf key={i} horizontal={horizontal} hx={hx} hz={hz} width={l.w} sign={l.sign}
                           open={door.open} exit={exit} />
      })}
    </group>
  )
}

/**
 * Leaf hinged at (hx, hz). Closed, it runs from the hinge along +axis (sign 1)
 * or −axis (sign −1) of its wall; it is drawn opened ~75° towards `open`.
 */
function SimpleLeaf({ horizontal, hx, hz, width, sign, open, exit }) {
  const c = Math.cos(OPEN_ANGLE)
  const s = Math.sin(OPEN_ANGLE)
  const dx = horizontal ? sign * c : (open === 'e' ? 1 : -1) * s
  const dz = horizontal ? (open === 's' ? 1 : -1) * s : sign * c
  // rotation about y that turns local +x into the opened direction (dx, dz)
  const rotY = Math.atan2(-dz, dx)
  return (
    <group position={[hx, 0, hz]} rotation={[0, rotY, 0]}>
      <group position={[width / 2, 0, 0]}>
        <Leaf width={width} exit={exit} />
      </group>
    </group>
  )
}

function Doors({ visible }) {
  return <group visible={visible}>{DOORS.map((d) => <Door key={d.id} door={d} />)}</group>
}

// ── Floors, selection, hazard overlay ────────────────────────────────────────

const overlayGeo = new THREE.PlaneGeometry(1, 1)

function HazardOverlay({ room }) {
  const level = useSimStore((s) => s.hazards[room.room_id]?.level)
  const ref = useRef()
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false,
  }), [])
  const alarm = level === 'WARNING' || level === 'HIGH_RISK' || level === 'CRITICAL'
  useFrame(({ clock }) => {
    if (!ref.current || !alarm) return
    const base = level === 'CRITICAL' ? 0.5 : level === 'HIGH_RISK' ? 0.42 : 0.34
    const pulse = level === 'CRITICAL' ? 0.22 * Math.sin(clock.elapsedTime * 5) : 0.06 * Math.sin(clock.elapsedTime * 2.5)
    ref.current.material.opacity = base + pulse
  })
  if (!alarm) return null
  material.color.set(HAZARD_COLORS[level])
  return (
    <mesh ref={ref} geometry={overlayGeo} material={material} position={[room.cx, 0.012, room.cz]}
          rotation={[-Math.PI / 2, 0, 0]} scale={[room.w - 0.05, room.d - 0.05, 1]} renderOrder={2} />
  )
}

const outlineMat = new THREE.MeshBasicMaterial({ color: '#2F7CF6', toneMapped: false })
const hoverMat = new THREE.MeshBasicMaterial({ color: '#8DB8FF', toneMapped: false, transparent: true, opacity: 0.8 })

function Outline({ room, material, y = 0.02, t = 0.12 }) {
  const { x1, x2, z1, z2, w, d } = room
  return (
    <group>
      <mesh geometry={GEO.box} material={material} position={[(x1 + x2) / 2, y, z1 + t / 2]} scale={[w, 0.02, t]} />
      <mesh geometry={GEO.box} material={material} position={[(x1 + x2) / 2, y, z2 - t / 2]} scale={[w, 0.02, t]} />
      <mesh geometry={GEO.box} material={material} position={[x1 + t / 2, y, (z1 + z2) / 2]} scale={[t, 0.02, d]} />
      <mesh geometry={GEO.box} material={material} position={[x2 - t / 2, y, (z1 + z2) / 2]} scale={[t, 0.02, d]} />
    </group>
  )
}

function Floor({ room }) {
  const selectRoom = useSimStore((s) => s.selectRoom)
  const setHoveredRoom = useSimStore((s) => s.setHoveredRoom)
  const selected = useSimStore((s) => s.selectedRoomId === room.room_id)
  const hovered = useSimStore((s) => s.hoveredRoomId === room.room_id)
  return (
    <group>
      <mesh geometry={GEO.box} material={mat(room.floor)} position={[room.cx, -0.025, room.cz]}
            scale={[room.w, 0.05, room.d]} receiveShadow
            onClick={(e) => { if (e.delta > 4 || !fromCanvas(e)) return; e.stopPropagation(); selectRoom(room.room_id) }}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredRoom(room.room_id) }}
            onPointerOut={() => setHoveredRoom(null)} />
      <HazardOverlay room={room} />
      {(selected || hovered) && <Outline room={room} material={selected ? outlineMat : hoverMat} />}
    </group>
  )
}

// ── Labels ───────────────────────────────────────────────────────────────────

function RoomLabel({ room, y }) {
  const hazard = useSimStore((s) => s.hazards[room.room_id]?.level)
  const selected = useSimStore((s) => s.selectedRoomId === room.room_id)
  const selectRoom = useSimStore((s) => s.selectRoom)
  const minor = room.kind === 'corridor' || room.kind === 'stairwell'
  const count = SENSORS_BY_ROOM[room.room_id]?.length || 0
  return (
    <Html position={[room.cx, y, room.cz]} center zIndexRange={[20, 0]}>
      <button type="button" className={`room-label${minor ? ' minor' : ''}${selected ? ' selected' : ''}`}
              onClick={() => selectRoom(room.room_id)} title={`${room.name} — ${room.room_id}`}>
        <span className="room-label-name">{room.name}</span>
        <span className="room-label-meta">
          <code>{room.room_id}</code> · {count} sensor{count === 1 ? '' : 's'}
        </span>
        {hazard && hazard !== 'UNKNOWN' && (
          <span className="room-label-hazard" style={{ background: HAZARD_COLORS[hazard] }}>{HAZARD_LABELS[hazard]}</span>
        )}
      </button>
    </Html>
  )
}

// ── Assembly ─────────────────────────────────────────────────────────────────

const Slab = memo(function Slab() {
  const b = BUILDING_BOUNDS
  const w = b.maxX - b.minX + 0.6
  const d = b.maxZ - b.minZ + 0.6
  return (
    <mesh geometry={GEO.box} material={MAT.slab} position={[(b.minX + b.maxX) / 2, -0.225, (b.minZ + b.maxZ) / 2]}
          scale={[w, 0.35, d]} receiveShadow castShadow />
  )
})

export default function Building() {
  const wallMode = useSimStore((s) => s.wallMode)
  const showLabels = useSimStore((s) => s.showLabels)
  const height = wallMode === 'cutaway' ? CUTAWAY_H : WALL_H
  return (
    <group>
      <Slab />
      {ROOMS.map((r) => <Floor key={r.room_id} room={r} />)}
      <Walls height={height} />
      <Doors visible={wallMode !== 'cutaway'} />
      {showLabels && ROOMS.map((r) => (
        <RoomLabel key={r.room_id} room={r} y={(r.kind === 'corridor' ? 0.3 : height + 0.5)} />
      ))}
    </group>
  )
}

