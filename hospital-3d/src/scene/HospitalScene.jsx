/**
 * 3D scene root: canvas, lights, camera controls and the hospital itself.
 */
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BUILDING_BOUNDS, ROOM_BY_ID } from '../data/hospitalLayout'
import { SENSOR_BY_ID } from '../data/sensorRegistry'
import { useSimStore } from '../state/useSimStore'
import Building from './Building'
import Exterior from './Exterior'
import RoomFurniture from './RoomFurniture'
import HazardEffects from './sensors/HazardEffects'
import SensorDevices from './sensors/SensorDevices'

const CENTER = new THREE.Vector3(
  (BUILDING_BOUNDS.minX + BUILDING_BOUNDS.maxX) / 2, 0, (BUILDING_BOUNDS.minZ + BUILDING_BOUNDS.maxZ) / 2 + 1,
)
const VIEWS = {
  overview: { target: CENTER.clone().add(new THREE.Vector3(0, 0, 3)), position: CENTER.clone().add(new THREE.Vector3(4, 60, 62)) },
  top: { target: CENTER.clone(), position: CENTER.clone().add(new THREE.Vector3(0, 92, 0.01)) },
}

function goalFor(request) {
  if (!request) return null
  if (VIEWS[request.kind]) return VIEWS[request.kind]
  if (request.kind === 'room') {
    const r = ROOM_BY_ID[request.id]
    if (!r) return null
    const size = Math.max(r.w, r.d)
    const target = new THREE.Vector3(r.cx, 0.8, r.cz)
    return { target, position: target.clone().add(new THREE.Vector3(size * 0.25, size * 0.9 + 6, size * 0.75 + 5)) }
  }
  if (request.kind === 'sensor') {
    const s = SENSOR_BY_ID[request.id]
    if (!s) return null
    const target = new THREE.Vector3(s.position[0], Math.min(s.position[1], 2.2), s.position[2])
    return { target, position: target.clone().add(new THREE.Vector3(2.5, 5.5, 6.5)) }
  }
  return null
}

/** Smoothly flies the camera to the requested view; any user drag cancels it. */
function CameraRig() {
  const controls = useThree((s) => s.controls)
  const camera = useThree((s) => s.camera)
  const request = useSimStore((s) => s.focusRequest)
  const anim = useRef(null)

  useEffect(() => {
    const goal = goalFor(request)
    if (!goal || !controls) return
    anim.current = {
      fromPos: camera.position.clone(), fromTarget: controls.target.clone(),
      toPos: goal.position.clone(), toTarget: goal.target.clone(), t: 0,
    }
  }, [request, controls, camera])

  useEffect(() => {
    if (!controls) return undefined
    const cancel = () => { anim.current = null }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame((_, delta) => {
    const a = anim.current
    if (!a || !controls) return
    a.t = Math.min(1, a.t + delta / 1.1)
    const k = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2
    camera.position.lerpVectors(a.fromPos, a.toPos, k)
    controls.target.lerpVectors(a.fromTarget, a.toTarget, k)
    controls.update()
    if (a.t >= 1) anim.current = null
  })
  return null
}

/** Static scene → render the shadow map only when geometry changes. */
function ShadowUpdater() {
  const gl = useThree((s) => s.gl)
  const wallMode = useSimStore((s) => s.wallMode)
  const frames = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    frames.current = 0
  }, [gl, wallMode])
  useFrame(() => {
    if (frames.current < 3) {
      gl.shadowMap.needsUpdate = true
      frames.current++
    }
  })
  return null
}

function Lights() {
  const sun = useRef()
  useEffect(() => {
    if (sun.current) sun.current.target.position.copy(CENTER)
    sun.current?.target.updateMatrixWorld()
  }, [])
  return (
    <>
      <hemisphereLight args={['#EAF2FF', '#B9B0A2', 0.85]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={sun}
        position={[CENTER.x + 38, 62, CENTER.z + 30]}
        intensity={2.4}
        color="#FFF6EA"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-near={10}
        shadow-camera-far={180}
      />
      <directionalLight position={[CENTER.x - 40, 30, CENTER.z - 25]} intensity={0.45} color="#DCE8FF" />
    </>
  )
}

export default function HospitalScene() {
  const clearSelection = useSimStore((s) => s.clearSelection)
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 38, near: 0.5, far: 600, position: VIEWS.overview.position.toArray() }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
      onPointerMissed={(e) => { if (e.button === 0 && e.target?.tagName === 'CANVAS') clearSelection() }}
    >
      <color attach="background" args={['#DCE6F2']} />
      <fog attach="fog" args={['#DCE6F2', 150, 330]} />
      <Lights />
      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={1.6} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
          <Lightformer intensity={0.8} position={[30, 6, 10]} rotation-y={-Math.PI / 2} scale={[20, 6, 1]} color="#FFF1DC" />
          <Lightformer intensity={0.6} position={[-30, 6, -10]} rotation-y={Math.PI / 2} scale={[20, 6, 1]} color="#DCEBFF" />
        </Environment>
      </Suspense>
      <Building />
      <RoomFurniture />
      <SensorDevices />
      <HazardEffects />
      <Exterior />
      <OrbitControls
        makeDefault
        target={VIEWS.overview.target.toArray()}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.06}
        minDistance={3}
        maxDistance={170}
        screenSpacePanning
      />
      <CameraRig />
      <ShadowUpdater />
    </Canvas>
  )
}
