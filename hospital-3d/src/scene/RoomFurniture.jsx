/**
 * Furniture and equipment per room, following the reference plan (4 ICU beds,
 * 2-bed patient room, 6-bed general ward, 4-bed maternity ward, OT table and
 * lamp, X-ray, lab, pharmacy, waiting chairs, reception, cafeteria …).
 *
 * Coordinates are room-local metres: x east from the room's west edge, z south
 * from its north edge (the group is placed at the room's north-west corner).
 * Door paths are kept clear for evacuation.
 */
import { memo } from 'react'
import { DOORS, px, pz, ROOMS, roomAt, solidSpans, wallThickness } from '../data/hospitalLayout'
import {
  Bassinet, BedHeadUnit, BedsideCabinet, CrashCart, Curtain, HandSanitizer, HospitalBed, InfantWarmer,
  IVStand, OverbedTable, PatientMonitor, Stretcher, Ventilator, Wheelchair,
} from './furniture/clinical'
import {
  Armchair, Bench, Chair, CoffeeTable, Computer, Desk, DiningSet, FilingCabinet, Fridge, KitchenLine,
  MeetingTable, OfficeChair, Person, Plant, Printer, ReceptionDesk, ServerRack, ServingCounter, Sofa,
  TvScreen, VendingMachine, WaitingSeats, WaterDispenser, Wardrobe,
} from './furniture/general'
import { CallPoint, ExitSign, FireExtinguisher, FloorArrow, Handrail, StairFlight } from './furniture/safety'
import {
  AnesthesiaMachine, Centrifuge, ChestFreezer, FumeHood, InstrumentTrolley, LabBench, MedFridge, Microscope,
  OperatingTable, RadiologyConsole, ScrubSink, Shelving, StorageCabinet, SurgicalLight, WallBucky, XRayUnit,
} from './furniture/specialist'
import { B, C } from './primitives'

const PI = Math.PI
const HALF = Math.PI / 2

/** Inner wall-face thickness of each side, measured at the side's midpoint. */
function inner(room) {
  const [x1, y1, x2, y2] = room.rect
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const t = (side, pos) => (room.hasWalls ? wallThickness(room, side, pos) : 0)
  return { n: t('n', mx), s: t('s', mx), w: t('w', my), e: t('e', my) }
}

/** Props that put a wall-mounted item (back at its z = 0) against a wall. */
function wall(room, t, side, along, off = 0) {
  switch (side) {
    case 'n': return { position: [along, 0, t.n + off], rotation: [0, 0, 0] }
    case 's': return { position: [along, 0, room.d - t.s - off], rotation: [0, PI, 0] }
    case 'w': return { position: [t.w + off, 0, along], rotation: [0, HALF, 0] }
    default:  return { position: [room.w - t.e - off, 0, along], rotation: [0, -HALF, 0] }
  }
}

// ── Clinical rooms ───────────────────────────────────────────────────────────

function BedBay({ x, z, head = 'n', vent = false, sheet, monitor = true }) {
  const rot = head === 'n' ? 0 : PI
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <HospitalBed position={[0, 0, 0]} sheet={sheet} />
      <BedHeadUnit position={[0, 0, -1.16]} width={1.5} />
      <BedsideCabinet position={[0.85, 0, -0.75]} />
      {monitor && <PatientMonitor position={[-0.8, 0, -0.65]} rotation={[0, 0.5, 0]} />}
      <IVStand position={[-0.75, 0, 0.15]} />
      {vent && <Ventilator position={[0.88, 0, 0.1]} rotation={[0, -0.6, 0]} />}
    </group>
  )
}

function ICU({ room, t }) {
  const xs = [1.95, 5.4, 8.85, 12.3]
  const z = t.n + 1.15
  return (
    <>
      {xs.map((x, i) => <BedBay key={x} x={x} z={z} vent={i % 2 === 0} sheet={['#8FC1EC', '#9DD3C8'][i % 2]} />)}
      {[3.68, 7.13, 10.58].map((x) => (
        <Curtain key={x} position={[x, 0, 1.85]} rotation={[0, HALF, 0]} length={3.3} open={0.25} />
      ))}
      {/* nurses' station facing the beds */}
      <B at={[7.15, 0, 6.85]} s={[4.2, 1.05, 0.12]} m="woodLight" />
      <B at={[7.15, 1.05, 6.85]} s={[4.3, 0.04, 0.3]} m="counter" />
      <Desk position={[6.1, 0, 7.25]} width={1.8} computer={false} />
      <Desk position={[8.2, 0, 7.25]} width={1.8} computer={false} />
      <Computer at={[6.0, 0.755, 7.1]} />
      <Computer at={[8.3, 0.755, 7.1]} />
      <OfficeChair position={[6.0, 0, 7.95]} rotation={[0, PI, 0]} />
      <OfficeChair position={[8.3, 0, 7.95]} rotation={[0, PI, 0]} />
      <Person position={[8.3, 0, 7.95]} seated shirt="#3E9B8F" rotation={[0, PI, 0]} />
      <CrashCart position={[13.3, 0, 7.8]} rotation={[0, -HALF, 0]} />
      <StorageCabinet {...wall(room, t, 'w', 6.6)} width={1.1} glassFront />
      <HandSanitizer {...wall(room, t, 's', 2.9)} />
      <FireExtinguisher {...wall(room, t, 's', 3.5)} />
    </>
  )
}

function Isolation({ room, t }) {
  return (
    <>
      <BedBay x={4.1} z={t.n + 1.15} vent sheet="#E5B8D8" />
      {/* HEPA / negative-pressure unit */}
      <B at={[7.45, 0, t.n + 0.35]} s={[0.7, 1.7, 0.55]} m="plasticLight" />
      {[0.4, 0.6, 0.8, 1.0, 1.2].map((y) => <B key={y} at={[7.45, y, t.n + 0.63]} s={[0.55, 0.03, 0.01]} m="plasticGrey" />)}
      {/* glass anteroom partition */}
      <B at={[2.8, 0, 6.35]} s={[5.6, 2.6, 0.05]} m="glass" cast={false} />
      <B at={[2.8, 2.6, 6.35]} s={[5.6, 0.06, 0.08]} m="steel" />
      <B at={[0.02, 0, 6.35]} s={[0.06, 2.6, 0.08]} m="steel" />
      <B at={[5.6, 0, 6.35]} s={[0.06, 2.6, 0.08]} m="steel" />
      <StorageCabinet {...wall(room, t, 'e', 7.8)} width={1.0} />
      <B at={[6.5, 0, room.d - t.s - 0.3]} s={[0.9, 0.85, 0.5]} m="white" />
      <B at={[6.5, 0.85, room.d - t.s - 0.3]} s={[0.92, 0.04, 0.52]} m="steel" />
      <Chair position={[6.4, 0, 3.6]} rotation={[0, -HALF - 0.4, 0]} color="fabricTeal" />
      <HandSanitizer {...wall(room, t, 's', 3.2)} />
    </>
  )
}

function PatientRoom({ room, t }) {
  return (
    <>
      {[3.6, 8.8].map((x, i) => (
        <group key={x}>
          <BedBay x={x} z={t.n + 1.15} monitor={i === 0} sheet={['#8FC1EC', '#F4C095'][i]} />
          <OverbedTable position={[x - 0.15, 0, 3.05]} />
          <Armchair position={[x - 1.35, 0, 2.7]} rotation={[0, HALF + 0.3, 0]} color="fabricTeal" />
        </group>
      ))}
      <Curtain position={[6.2, 0, 1.85]} rotation={[0, HALF, 0]} length={3.3} open={0.1} color="curtainMint" />
      <Wardrobe {...wall(room, t, 'e', 6.2)} />
      <Wardrobe {...wall(room, t, 'e', 7.3)} />
      <TvScreen {...wall(room, t, 's', 6.4)} width={1.1} y={1.8} />
      <HandSanitizer {...wall(room, t, 's', 3.0)} />
      <Plant position={[11.6, 0, 8.3]} size={0.8} />
    </>
  )
}

function OperatingTheatre({ room, t }) {
  const cx = 7.15
  const cz = 4.3
  return (
    <>
      <OperatingTable position={[cx, 0, cz]} rotation={[0, HALF, 0]} />
      <SurgicalLight position={[cx, 0, cz]} rotation={[0, HALF, 0]} />
      <AnesthesiaMachine position={[cx - 1.95, 0, cz]} rotation={[0, HALF, 0]} />
      <PatientMonitor position={[cx - 1.4, 0, cz - 1.25]} rotation={[0, HALF, 0]} />
      <IVStand position={[cx - 1.2, 0, cz + 1.0]} />
      <InstrumentTrolley position={[cx + 1.5, 0, cz - 1.25]} />
      <InstrumentTrolley position={[cx + 2.3, 0, cz + 1.1]} rotation={[0, 0.3, 0]} />
      <Ventilator position={[cx - 0.4, 0, cz + 1.55]} />
      <ScrubSink position={[11.6, 0, t.n + 0.3]} />
      <StorageCabinet {...wall(room, t, 'e', 3.2)} glassFront />
      <StorageCabinet {...wall(room, t, 'e', 4.5)} glassFront />
      <StorageCabinet {...wall(room, t, 'e', 5.8)} />
      <TvScreen {...wall(room, t, 'n', 4.6)} width={1.4} y={1.8} />
      <Person position={[cx + 0.2, 0, cz - 0.75]} shirt="#4F8F7A" />
      <Person position={[cx + 0.6, 0, cz + 0.75]} shirt="#4F8F7A" rotation={[0, PI, 0]} />
      <Person position={[cx - 1.3, 0, cz + 0.4]} shirt="#4F8F7A" seated rotation={[0, HALF, 0]} />
    </>
  )
}

function Radiology({ room, t }) {
  return (
    <>
      <XRayUnit position={[4.4, 0, 3.0]} rotation={[0, HALF, 0]} />
      <WallBucky {...wall(room, t, 'n', 8.6)} />
      <RadiologyConsole position={[2.1, 0, 6.85]} />
      <StorageCabinet {...wall(room, t, 'e', 1.5)} width={1.0} />
      <B at={[0.9, 0, 4.4]} s={[0.12, 1.6, 0.6]} m="steelDark" />
      {[0.8, 1.05, 1.3].map((y) => <B key={y} at={[1.0, y, 4.4]} s={[0.1, 0.45, 0.45]} m={['#2F6FD0', '#C2413B', '#1F9E93'][Math.round(y * 4) % 3]} />)}
      <HandSanitizer {...wall(room, t, 'e', 6.2)} />
    </>
  )
}

function Lab({ room, t }) {
  return (
    <>
      <LabBench position={[3.7, 0, t.n + 0.36]} length={6.6} seed={4} />
      <LabBench position={[t.w + 0.36, 0, 3.6]} rotation={[0, HALF, 0]} length={3.8} seed={9} />
      <LabBench position={[5.6, 0, 4.7]} length={4.0} island shelf={false} seed={11} />
      <Microscope position={[2.4, 0.9, t.n + 0.55]} />
      <Microscope position={[3.4, 0.9, t.n + 0.55]} />
      <Microscope position={[5.0, 0.9, 4.95]} />
      <Centrifuge position={[6.6, 0.9, 4.5]} />
      <Centrifuge position={[t.w + 0.4, 0.9, 2.6]} />
      <FumeHood position={[2.2, 0, room.d - t.s - 0.42]} rotation={[0, PI, 0]} />
      <MedFridge position={[4.4, 0, room.d - t.s - 0.37]} rotation={[0, PI, 0]} contents="samples" />
      <MedFridge position={[5.2, 0, room.d - t.s - 0.37]} rotation={[0, PI, 0]} contents="samples" />
      <StorageCabinet {...wall(room, t, 'e', 1.4)} width={1.0} glassFront />
      {[[4.2, 3.8], [5.6, 3.8], [7.0, 3.8], [4.9, 5.7], [6.4, 5.7]].map(([x, z]) => (
        <group key={`${x}${z}`}>
          <C at={[x, 0, z]} r={0.04} h={0.6} m="chrome" />
          <C at={[x, 0.6, z]} r={0.17} h={0.06} m="plasticDark" />
        </group>
      ))}
      <Person position={[5.6, 0, 3.75]} seated shirt="#FFFFFF" />
      <HandSanitizer {...wall(room, t, 'e', 3.9)} />
    </>
  )
}

function Pharmacy({ room, t }) {
  return (
    <>
      {/* dispensing counter facing the door */}
      <B at={[3.0, 0, 2.5]} s={[4.6, 1.0, 0.55]} m="woodLight" />
      <B at={[3.0, 1.0, 2.5]} s={[4.7, 0.04, 0.65]} m="counter" />
      <B at={[3.0, 1.04, 2.28]} s={[4.6, 0.9, 0.03]} m="glass" cast={false} />
      <Computer at={[1.9, 1.04, 2.62]} />
      <Computer at={[4.1, 1.04, 2.62]} />
      <OfficeChair position={[1.9, 0, 3.4]} rotation={[0, PI, 0]} />
      <OfficeChair position={[4.1, 0, 3.4]} rotation={[0, PI, 0]} />
      <Person position={[4.1, 0, 3.45]} shirt="#FFFFFF" />
      {[1.4, 3.6, 5.8].map((x, i) => (
        <Shelving key={x} position={[x, 0, 9.0]} rotation={[0, HALF, 0]} length={6.6} seed={20 + i} />
      ))}
      <MedFridge {...wall(room, t, 'w', 4.6, 0.37)} />
      <MedFridge {...wall(room, t, 'w', 5.4, 0.37)} />
      <StorageCabinet {...wall(room, t, 'e', 12.6)} width={1.0} />
      <StorageCabinet {...wall(room, t, 'e', 13.7)} width={1.0} />
      <Desk position={[5.6, 0, 13.6]} rotation={[0, PI, 0]} width={1.4} />
      <OfficeChair position={[5.5, 0, 12.85]} />
    </>
  )
}

function WaitingArea({ room, t }) {
  const rows = [3.4, 4.9, 6.4, 7.9, 9.4]
  return (
    <>
      <TvScreen {...wall(room, t, 'n', 9.6)} width={1.7} y={2.0} />
      <TvScreen {...wall(room, t, 'n', 3.0)} width={1.2} y={2.0} />
      {rows.map((z, i) => (
        <group key={z}>
          <WaitingSeats position={[3.2, 0, z]} rotation={[0, PI, 0]} n={5} color={i % 2 ? 'fabricBlue' : 'fabricTeal'} />
          <WaitingSeats position={[9.9, 0, z]} rotation={[0, PI, 0]} n={5} color={i % 2 ? 'fabricTeal' : 'fabricBlue'} />
        </group>
      ))}
      <Person position={[2.6, 0, 4.9]} seated shirt="#E07A5F" rotation={[0, PI, 0]} />
      <Person position={[10.5, 0, 6.4]} seated shirt="#81B29A" rotation={[0, PI, 0]} />
      <Person position={[3.8, 0, 7.9]} seated shirt="#F2CC8F" rotation={[0, PI, 0]} />
      {[[0.75, 0.9], [12.45, 0.9], [0.75, 13.7], [12.45, 13.7]].map(([x, z]) => <Plant key={`${x}${z}`} position={[x, 0, z]} />)}
      <WaterDispenser {...wall(room, t, 'w', 11.6, 0.2)} />
      <VendingMachine {...wall(room, t, 'e', 11.4, 0.42)} />
      <VendingMachine {...wall(room, t, 'e', 10.4, 0.42)} color="#2F6FD0" />
      <CoffeeTable position={[6.6, 0, 11.6]} />
      <Wheelchair position={[1.6, 0, 12.6]} rotation={[0, 0.3, 0]} />
      <FireExtinguisher {...wall(room, t, 'w', 7.0)} />
    </>
  )
}

function Administration({ room, t }) {
  return (
    <>
      {[1.9, 5.0, 8.1].map((x) => (
        <group key={x}>
          <Desk position={[x, 0, t.n + 0.4]} width={1.6} />
          <OfficeChair position={[x - 0.1, 0, t.n + 1.25]} rotation={[0, PI, 0]} />
        </group>
      ))}
      <Person position={[5.0, 0, t.n + 1.3]} seated shirt="#1F2A44" rotation={[0, PI, 0]} />
      <MeetingTable position={[5.2, 0, 5.1]} length={2.4} />
      <ServerRack {...wall(room, t, 'e', 1.2, 0.45)} />
      {[4.6, 5.1, 5.6].map((z) => <FilingCabinet key={z} {...wall(room, t, 'e', z, 0.31)} />)}
      <Printer {...wall(room, t, 'w', 2.6, 0.28)} />
      <Plant position={[9.2, 0, 7.4]} size={0.9} />
      <Sofa {...wall(room, t, 's', 7.9, 0.45)} length={1.8} />
    </>
  )
}

function Records({ room, t }) {
  return (
    <>
      {[1.25, 2.55, 3.85].map((z, i) => (
        <Shelving key={z} position={[6.0, 0, z]} length={6.0} height={2.2} seed={40 + i}
                  palette={['#E9D8A6', '#94A3B8', '#9FD3F5', '#F6C177', '#D6CCC2']} />
      ))}
      <Desk position={[1.4, 0, t.n + 0.4]} width={1.5} />
      <OfficeChair position={[1.35, 0, t.n + 1.2]} rotation={[0, PI, 0]} />
      <FilingCabinet {...wall(room, t, 'w', 3.4, 0.31)} />
      <FilingCabinet {...wall(room, t, 'w', 3.9, 0.31)} />
      <B at={[6.0, 0, 5.4]} s={[1.6, 0.8, 0.6]} m="steel" />
    </>
  )
}

function GeneralWard({ room, t }) {
  const xs = [4.3, 8.6, 12.9]
  return (
    <>
      {xs.map((x, i) => (
        <group key={x}>
          <BedBay x={x} z={t.n + 1.15} monitor={i === 1} sheet="#F4C095" />
          <BedBay x={x} z={room.d - t.s - 1.15} head="s" monitor={i === 2} sheet="#8FC1EC" />
        </group>
      ))}
      {[6.45, 10.75].map((x) => (
        <group key={x}>
          <Curtain position={[x, 0, 1.8]} rotation={[0, HALF, 0]} length={3.0} open={0.15} color="curtainPink" />
          <Curtain position={[x, 0, room.d - 1.8]} rotation={[0, HALF, 0]} length={3.0} open={0.15} color="curtainPink" />
        </group>
      ))}
      <Person position={[8.0, 0, 4.7]} shirt="#3E9B8F" />
      <B at={[14.6, 0, 4.75]} s={[0.6, 0.95, 0.9]} m="plasticLight" />
      <HandSanitizer {...wall(room, t, 'n', 1.2)} />
      <Wheelchair position={[1.3, 0, 8.3]} rotation={[0, HALF, 0]} />
    </>
  )
}

function MaternityWard({ room, t }) {
  const xs = [3.4, 6.9, 10.4, 13.9]
  return (
    <>
      {xs.map((x, i) => (
        <group key={x}>
          <BedBay x={x} z={room.d - t.s - 1.15} head="s" monitor={false} sheet={['#F4C6D7', '#C9E4F5'][i % 2]} />
          <Bassinet position={[x + 0.95, 0, room.d - 2.1]} rotation={[0, PI, 0]} />
        </group>
      ))}
      {[5.15, 8.65, 12.15].map((x) => (
        <Curtain key={x} position={[x, 0, room.d - 1.8]} rotation={[0, HALF, 0]} length={3.0} open={0.15} color="curtainPink" />
      ))}
      <InfantWarmer {...wall(room, t, 'n', 4.2, 0.4)} />
      <InfantWarmer {...wall(room, t, 'n', 11.6, 0.4)} />
      {[2.2, 6.0, 9.8, 13.6].map((x) => <Armchair key={x} {...wall(room, t, 'n', x, 0.45)} color="fabricTeal" />)}
      <Person position={[6.0, 0, 1.0]} seated shirt="#F2A6C2" />
      <Plant position={[1.0, 0, 0.9]} size={0.8} />
    </>
  )
}

// ── Public / support ─────────────────────────────────────────────────────────

function Cafeteria({ room, t }) {
  return (
    <>
      <KitchenLine position={[4.1, 0, t.n + 0.38]} length={7.0} />
      <Fridge position={[9.6, 0, t.n + 0.37]} />
      <Fridge position={[10.45, 0, t.n + 0.37]} width={0.8} />
      <ServingCounter position={[4.0, 0, 2.45]} length={6.0} />
      <Person position={[2.8, 0, 1.6]} shirt="#FFFFFF" />
      {[[2.0, 5.0], [4.7, 5.0], [2.0, 7.4], [4.7, 7.4], [11.3, 5.4]].map(([x, z], i) => (
        <DiningSet key={`${x}${z}`} position={[x, 0, z]} color={i % 2 ? 'fabricRed' : 'fabricTeal'} />
      ))}
      <Person position={[2.0, 0, 4.38]} seated shirt="#81B29A" />
      <Person position={[4.7, 0, 7.98]} seated shirt="#E07A5F" rotation={[0, PI, 0]} />
      <VendingMachine {...wall(room, t, 'e', 2.8, 0.42)} />
      <Plant position={[12.5, 0, 8.0]} />
      <FireExtinguisher {...wall(room, t, 'w', 3.6)} />
    </>
  )
}

function HallSouthWest({ room, t }) {
  return (
    <>
      <FloorArrow position={[4.2, 0, 5.1]} dir="e" />
      <Bench {...wall(room, t, 'w', 3.0, 0.25)} length={2.2} />
      <Bench {...wall(room, t, 'w', 6.4, 0.25)} length={2.2} />
      <Plant position={[7.5, 0, 0.9]} />
      <Plant position={[0.8, 0, 8.0]} size={0.9} />
      <Wheelchair position={[6.4, 0, 7.9]} rotation={[0, PI, 0]} />
      <Wheelchair position={[7.2, 0, 7.9]} rotation={[0, PI, 0]} color="fabricTeal" />
    </>
  )
}

function MainLobby({ room, t }) {
  return (
    <>
      <ReceptionDesk position={[11.0, 0, 3.3]} width={3.6} />
      <Person position={[10.6, 0, 4.4]} shirt="#C2413B" rotation={[0, PI, 0]} />
      <WaitingSeats position={[3.0, 0, 2.6]} n={5} color="fabricBlue" />
      <WaitingSeats position={[3.0, 0, 4.4]} n={5} color="fabricBlue" />
      <Person position={[2.4, 0, 2.62]} seated shirt="#F2CC8F" />
      {[[0.75, 0.9], [14.35, 0.9], [5.6, 7.9], [9.6, 7.9]].map(([x, z]) => <Plant key={`${x}${z}`} position={[x, 0, z]} size={1.1} />)}
      <TvScreen {...wall(room, t, 'w', 2.2)} width={1.3} y={1.9} />
      <FireExtinguisher {...wall(room, t, 's', 1.0)} />
      <FireExtinguisher {...wall(room, t, 's', 13.75)} />
      <WaterDispenser {...wall(room, t, 'e', 1.3, 0.2)} />
    </>
  )
}

function EmergencyDept({ room, t }) {
  return (
    <>
      <Stretcher position={[room.w - t.e - 1.15, 0, 1.6]} rotation={[0, -HALF, 0]} />
      <Stretcher position={[room.w - t.e - 1.15, 0, 4.1]} rotation={[0, -HALF, 0]} sheet="#C9E4F5" />
      <Curtain position={[room.w - 1.5, 0, 2.85]} length={2.6} open={0.1} color="curtainMint" />
      <Curtain position={[room.w - 1.5, 0, 5.35]} length={2.6} open={0.5} color="curtainMint" />
      <PatientMonitor position={[room.w - t.e - 0.35, 0, 0.75]} rotation={[0, -HALF, 0]} />
      <PatientMonitor position={[room.w - t.e - 0.35, 0, 3.25]} rotation={[0, -HALF, 0]} />
      <IVStand position={[room.w - 2.4, 0, 1.0]} />
      <CrashCart {...wall(room, t, 'w', 3.4, 0.24)} />
      <Desk position={[1.9, 0, 6.5]} width={1.6} />
      <OfficeChair position={[1.8, 0, 7.3]} rotation={[0, PI, 0]} />
      <Person position={[1.8, 0, 7.35]} seated shirt="#5B5FC7" rotation={[0, PI, 0]} />
      <Wheelchair position={[0.8, 0, 7.9]} rotation={[0, HALF, 0]} />
      <Person position={[4.6, 0, 3.0]} shirt="#5B5FC7" rotation={[0, HALF, 0]} />
    </>
  )
}

function HallSouthEast({ room, t }) {
  return (
    <>
      <FloorArrow position={[5.2, 0, 7.0]} dir="e" />
      <Bench {...wall(room, t, 'n', 5.6, 0.25)} length={2.4} />
      <Plant position={[9.4, 0, 0.9]} />
      <Plant position={[0.8, 0, 8.0]} size={0.9} />
      <Wheelchair position={[3.0, 0, 7.9]} rotation={[0, PI, 0]} />
      <FireExtinguisher {...wall(room, t, 's', 8.6)} />
    </>
  )
}

function BloodBank({ room, t }) {
  return (
    <>
      {[1.0, 1.9, 2.8].map((x) => <MedFridge key={x} position={[x, 0, t.n + 0.37]} width={0.85} contents="blood" />)}
      <ChestFreezer position={[4.9, 0, t.n + 0.37]} />
      <LabBench {...wall(room, t, 'e', 2.2, 0.36)} length={2.4} shelf={false} seed={60} />
      <Centrifuge position={[room.w - t.e - 0.45, 0.9, 1.5]} />
      <Computer at={[room.w - t.e - 0.4, 0.9, 2.7]} rotY={-HALF} />
      <Desk position={[2.6, 0, 5.4]} width={1.5} />
      <OfficeChair position={[2.5, 0, 6.2]} rotation={[0, PI, 0]} />
      <Person position={[room.w - t.e - 1.0, 0, 2.2]} shirt="#FFFFFF" rotation={[0, HALF, 0]} />
      <HandSanitizer {...wall(room, t, 'w', 5.8)} />
    </>
  )
}

// ── Stairwells ───────────────────────────────────────────────────────────────

function Stairwell({ room, t }) {
  const flight = { width: 1.5, steps: 16, rise: 0.18, run: 0.28 }
  switch (room.room_id) {
    case 'stair_nw':
      return (
        <>
          <StairFlight position={[t.w + 0.8, 0, 10.0]} {...flight} />
          <FireExtinguisher {...wall(room, t, 'e', 8.2)} />
        </>
      )
    case 'stair_ne':
      return (
        <>
          <group position={[room.w - t.e - 0.8, 0, 10.0]} scale={[-1, 1, 1]}><StairFlight {...flight} /></group>
          <FireExtinguisher {...wall(room, t, 'w', 8.2)} />
        </>
      )
    case 'stair_sw':
      return (
        <>
          <StairFlight position={[8.6, 0, room.d - t.s - 0.8]} rotation={[0, HALF, 0]} {...flight} />
          <FireExtinguisher {...wall(room, t, 'w', 1.6)} />
        </>
      )
    default:
      return (
        <group position={[3.6, 0, room.d - t.s - 0.8]} rotation={[0, -HALF, 0]} scale={[-1, 1, 1]}>
          <StairFlight {...flight} steps={11} />
        </group>
      )
  }
}

// ── Corridors: handrails, extinguishers, call points, evacuation arrows ─────

const CORRIDOR_FIXTURES = {
  corridor_north: {
    arrows: [[8.0, 'e'], [21.5, 'e'], [41.8, 'e']],
    extinguishers: [['s', 1.5], ['s', 35.1], ['n', 30.5]],
    callPoints: [['n', 48.1], ['s', 2.4]],
  },
  corridor_west: { arrows: [[3.6, 'n'], [10.5, 'n']], extinguishers: [['w', 11.3]], callPoints: [['e', 7.0]] },
  corridor_east: { arrows: [[3.85, 's'], [10.7, 's']], extinguishers: [['e', 7.7]], callPoints: [['w', 3.0]] },
  corridor_south: {
    arrows: [[9.9, 'e'], [25.3, 'w']],
    extinguishers: [['n', 33.3], ['s', 3.0]],
    callPoints: [['n', 12.5]],
  },
}

function Corridor({ room }) {
  const fx = CORRIDOR_FIXTURES[room.room_id] || {}
  const horizontal = room.w > room.d
  const mid = horizontal ? room.d / 2 : room.w / 2
  const sides = horizontal ? ['n', 's'] : ['w', 'e']
  const t = { n: 0, s: 0, w: 0, e: 0 }
  return (
    <>
      {sides.flatMap((side) => solidSpans(room, side).map(([a, b]) => (
        <Handrail key={`${side}${a}`} {...wall(room, t, side, (a + b) / 2)} length={b - a - 0.2} />
      )))}
      {(fx.arrows || []).map(([pos, dir]) => (
        <FloorArrow key={`a${pos}`} position={horizontal ? [pos, 0, mid] : [mid, 0, pos]} dir={dir} size={1.2} />
      ))}
      {(fx.extinguishers || []).map(([side, pos]) => <FireExtinguisher key={`x${side}${pos}`} {...wall(room, t, side, pos)} />)}
      {(fx.callPoints || []).map(([side, pos]) => <CallPoint key={`c${side}${pos}`} {...wall(room, t, side, pos)} />)}
    </>
  )
}

const BY_ROOM = {
  icu: ICU, isolation_room: Isolation, patient_room: PatientRoom, operation_theater: OperatingTheatre,
  radiology: Radiology, lab: Lab, pharmacy: Pharmacy, waiting_area: WaitingArea, administration: Administration,
  records: Records, general_ward: GeneralWard, maternity_ward: MaternityWard, cafeteria: Cafeteria,
  hall_southwest: HallSouthWest, main_lobby: MainLobby, emergency_dept: EmergencyDept,
  hall_southeast: HallSouthEast, blood_bank: BloodBank,
}

function RoomContents({ room }) {
  const t = inner(room)
  const Comp = room.kind === 'stairwell' ? Stairwell : room.kind === 'corridor' ? Corridor : BY_ROOM[room.room_id]
  if (!Comp) return null
  return (
    <group position={[room.x1, 0, room.z1]}>
      <Comp room={room} t={t} />
    </group>
  )
}

// ── Exit signs above escape doors (both faces where useful) ─────────────────

const SIGNS = ['EXIT-NW', 'EXIT-NE', 'EXIT-SW', 'EXIT-SE', 'EXIT-S', 'D-STNW', 'D-STNE', 'D-CAF-ST', 'D-BB-ST',
               'D-HSE-BB', 'D-HSW-E', 'D-LOB-N']

function DoorSigns() {
  const signs = []
  for (const id of SIGNS) {
    const d = DOORS.find((x) => x.id === id)
    const [dx, dy] = d.at
    const h = d.orient === 'h'
    for (const dir of [-1, 1]) {
      // the room on this side of the door line
      const probe = h ? roomAt(dx, dy + dir * 4) : roomAt(dx + dir * 4, dy)
      if (!probe) continue
      const side = h ? (dir < 0 ? 's' : 'n') : (dir < 0 ? 'e' : 'w')
      const t = probe.hasWalls ? wallThickness(probe, side, h ? dx : dy) : 0
      const x = px(dx) + (h ? 0 : dir * (t + 0.005))
      const z = pz(dy) + (h ? dir * (t + 0.005) : 0)
      const rotY = h ? (dir > 0 ? 0 : PI) : (dir > 0 ? HALF : -HALF)
      signs.push(<ExitSign key={`${id}${dir}`} position={[x, 0, z]} rotation={[0, rotY, 0]} />)
    }
  }
  return <>{signs}</>
}

function RoomFurniture() {
  return (
    <>
      {ROOMS.map((room) => <RoomContents key={room.room_id} room={room} />)}
      <DoorSigns />
    </>
  )
}

export default memo(RoomFurniture)
