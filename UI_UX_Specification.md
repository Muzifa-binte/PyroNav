# PyroNav — UI/UX Specification

**Document:** UI/UX Specification  
**Version:** 1.0  
**Date:** 12 October 2026  
**Status:** Frontend design baseline for implementation planning  
**Product:** PyroNav — Autonomous, Cyber-Defended Emergency Egress & Predictive Fire Safety Infrastructure

---

## 1. Purpose

This document defines the frontend information architecture, navigation, page responsibilities, dashboard layout, visual system, interaction patterns, and feature priorities for the PyroNav academic prototype.

The frontend is a desktop-first command interface for one operator/administrator. It presents processed system state from the backend: sensor readings, room hazards, alerts, IDS events, and evacuation routes. It does not independently apply a second set of hazard rules or calculate authoritative room states in the browser.

### Confirmed UX decisions

- **Visual direction:** professional dark command center.
- **Visual style:** clean, restrained neumorphism; premium and professional rather than playful or heavily embossed.
- **Building map:** interactive 2D floor plan first. 3D may be considered later as an optional enhancement.
- **User roles:** one operator/administrator experience for the academic prototype.
- **Simulation controls:** separate Simulation / Developer page, not embedded in the live operational dashboard.
- **Input-source independence:** frontend and backend contracts must work whether readings come from physical hardware or software simulation. The physical-vs-simulated source decision remains open.

### Product boundary

PyroNav is a controlled academic demonstration and decision-support prototype, not a certified fire alarm or life-safety system. UI labels, alerts, routes, and demonstration data must not imply real-world certification or guaranteed safety.

---

## 2. UX principles

1. **Status at a glance:** the operator should understand system health, hazard state, and active incidents immediately.
2. **Map-first situational awareness:** the building map is the main visual workspace, not a decorative thumbnail.
3. **Clear severity hierarchy:** Critical, High Risk, Warning, Normal, and Unknown must be visually distinguishable.
4. **No silent uncertainty:** stale, missing, invalid, or untrusted readings must be shown as Unknown/Unavailable rather than Normal.
5. **Explain decisions:** where possible, show the room state, contributing readings, timestamp, and reason for an alert or route change.
6. **Safety before optimization:** show the backend-provided route result and its status. Do not present a route through a blocked/unsafe segment as valid.
7. **Progressive disclosure:** keep the main dashboard focused; put deep history, detailed sensor inspection, and simulation controls on their own pages.
8. **Consistent interaction:** the same room, sensor, alert, severity, and route should behave consistently across pages.
9. **Accessible dark UI:** high contrast and clear labels matter more than visual effects.
10. **Demonstration honesty:** simulated data, unverified prediction, unavailable integrations, and illustrative values must be explicitly identified.

---

## 3. Feature priority definitions

- **Must-have (M):** required for the first coherent end-to-end demonstration and core operator workflow.
- **Should-have (S):** strongly recommended if implementation time allows; improves clarity, traceability, or testability.
- **Plus / later (P):** enhancement after the end-to-end workflow is stable.
- **Out of initial scope (O):** intentionally not part of the first release.

Priority is based on the academic prototype’s ability to demonstrate the complete flow, not on the visual complexity of a feature.

---

## 4. Must-have vs Plus feature matrix

| Page / module | Must-have for first release | Should-have | Plus / later |
|---|---|---|---|
| **1. Overview Dashboard** | System connection/status; overall building state; counts for affected rooms and active alerts; sensor availability/freshness summary; active/most recent critical event; compact map preview with hazard state and route status; recent events list | Last-update timestamp; data-source label; clear empty/error/loading states; click-through links to affected rooms, alerts, and map | Customizable widgets; historical comparisons; incident KPIs; configurable dashboard layout |
| **2. Live Building Map** | Interactive 2D floor plan; room/corridor/door/exit identifiers; room hazard coloring; Unknown/stale state; affected areas; current route overlay; blocked/unavailable connections; legend; room selection and detail panel; fit-to-building/reset view | Zoom/pan; sensor markers; room status and latest reading in selected-room panel; route recalculation timestamp; keyboard-accessible room selection | Animated route transitions; alternative-route comparison; optional 3D view; multi-floor switching if scope expands |
| **3. Sensors & Monitoring** | Sensor ID; sensor type; mapped room/zone; latest value and unit; last-seen time; connectivity/freshness; validation or trust state; readable empty/error states | Search/filter by room, type, state; recent readings sparkline; sensor detail drawer; sorting by stale/offline/abnormal | Long-range trend charts; CSV export; comparison views; configurable sampling intervals |
| **4. Evacuation & Pathfinding** | Current route result; origin/target exit where relevant; route status; path displayed on the map; blocked links; recalculation/update timestamp; explicit “no valid route found” state; explanation when the route changes | Step-by-step corridor/room sequence; route cost/distance if defined; reason a route was rejected; route history for a scenario | Alternative-route comparison; animated path playback; algorithm teaching/demo view comparing Dijkstra and BFS |
| **5. Alerts & Incidents** | Severity; event type; room/zone; event description; timestamp; active/resolved state; trigger/source; event list and detail view; acknowledgement state if acknowledgement is implemented | Filter by severity, status, room, source; event timeline; link alert to room, sensor, and route change; acknowledgement notes | Exportable incident report; configurable alert preferences; external notification-channel settings |
| **6. Network Security / IDS** | IDS event list; timestamp; affected device/topic or source when available; event category; severity/confidence as defined; status; concise reason; distinction between invalid data and suspected malicious activity | Filter by category/status/device; device health/trust summary; link to related sensor messages; event detail panel | Traffic-rate charts; controlled attack/replay simulation; event timeline; explainable rule evidence |
| **7. Risk & Room State Details** | Current backend-assigned room state; contributing measurements; reading freshness; rule/reason summary; explicit Unknown state when inputs are insufficient; distinguish rule-based classification from ML output | Room history; event-linked measurement context; display optional model output only when implemented and labeled | Trend analytics; anomaly score and explanation; predictive timeline; room-level comparison |
| **8. Simulation / Developer** | Separate page; start/stop/reset scenario controls; select a predefined scenario; choose affected room/zone; adjustable test inputs only if supported; visible “SIMULATION” indicator; current scenario state; repeatable test steps; confirmation before reset/stop where state may be lost | Scenario timeline; publish/readout log; test presets for normal, rising heat/smoke, sensor unavailable, blocked corridor, invalid message, suspicious message pattern | Scenario builder; playback/scrubbing; custom sensor sequences; saved scenario library; export test run |
| **9. Configuration** | Building/room/sensor/exit mapping needed for the prototype; configured measurement units and thresholds displayed read-only or editable according to implementation; explicit save/error feedback; validation before applying changes | Simple form validation; change history; configurable stale-data interval and route policy if approved by team | Role/permission management; advanced rule editor; import/export building configuration |
| **10. Global shell and system feedback** | Persistent navigation; app name; global connection state; consistent severity tokens; loading, offline, stale, empty, and error states; accessible focus states; responsive desktop layout | Toasts for non-critical confirmations; breadcrumb/page title; keyboard shortcuts where useful | Theme switcher; personalization; multiple operator roles |

### First-release acceptance rule

A first release is not complete merely because each page exists. It must demonstrate a single coherent flow:

**Reading received → reading validated → room state updated → alert created → route recalculated when needed → dashboard/map updated → event recorded.**

The same scenario should be repeatable from the Simulation / Developer page. Any unsupported step must be shown as unavailable rather than simulated as if it were real.

---

## 5. Recommended navigation architecture

Use a persistent left sidebar with a compact top bar. Keep the main navigation short and task-oriented.

### Primary navigation

1. **Overview**
2. **Live Map**
3. **Sensors**
4. **Evacuation**
5. **Alerts & Incidents**
6. **Network Security**
7. **Risk Analytics**
8. **Simulation / Developer**
9. **Configuration**

The Simulation / Developer and Configuration pages should be visually separated from day-to-day monitoring, for example with a divider and a small **TOOLS** label near the bottom of the sidebar. They remain accessible in the single-operator prototype; this is visual grouping, not role-based authorization.

### Navigation behavior

- The selected page has a clear active indicator, not color alone.
- A small badge may show the count of active critical/high-severity alerts. Avoid badges on every navigation item.
- Clicking a room name, map room, sensor, alert, or IDS event opens the most relevant detail panel or navigates to the relevant page with that item selected.
- Preserve useful filters and selected room when moving between related pages where practical.
- Do not use a modal for every detail. Prefer a right-side detail drawer for quick inspection.
- Keep simulation mode unmistakable. A simulation banner must never be confused with a live operational status.

### Suggested route paths

| Page | Suggested frontend route |
|---|---|
| Overview | `/overview` |
| Live Map | `/map` |
| Sensors | `/sensors` |
| Evacuation | `/evacuation` |
| Alerts & Incidents | `/alerts` |
| Network Security | `/security` |
| Risk Analytics | `/risk` |
| Simulation / Developer | `/simulation` |
| Configuration | `/settings` |

These are proposed frontend routes, not backend API endpoints.

---

## 6. Global application layout

### Desktop shell

- **Left sidebar:** approximately 224–248 px expanded; collapsible to an icon rail.
- **Top bar:** approximately 64–72 px high.
- **Main content:** flexible width, generous spacing, consistent 8 px spacing scale.
- **Content max width:** use the available width for map-centric screens; constrain text-heavy configuration forms for readability.
- **Detail drawer:** approximately 360–440 px when opened, with the main content remaining visible where possible.

### Top bar elements

Left side:
- Page title and optional short contextual subtitle.

Right side:
- Backend/live connection indicator.
- Last update / data freshness indicator.
- Active alert shortcut with count if there are active alerts.
- Operator label or simple account/menu placeholder if authentication is not implemented.

Do not add decorative profile avatars, notification bells, or status indicators that have no working behavior.

### Global status language

Use explicit labels:
- **Connected**
- **Delayed / Stale**
- **Disconnected**
- **Unknown**
- **Simulation Active**

A green “Connected” state only describes connectivity; it does not mean the building is safe. Keep system health and hazard status separate.

---

## 7. Page layout specifications

### 7.1 Overview Dashboard

**Purpose:** provide a fast summary and links to the main operational workspaces.

Recommended layout:
1. Page title: **Overview**; subtitle: “Building status and live system activity”.
2. A compact row of summary cards:
   - Building state
   - Rooms with active hazard states
   - Active alerts
   - Sensors online / total
3. Main two-column workspace:
   - **Left / wider column:** building map preview with room states, exits, and route status.
   - **Right column:** highest-priority active alert and recent event feed.
4. Lower row:
   - Sensor/data freshness summary.
   - Recent route recalculation or IDS summary, depending on available data.

Interactions:
- Clicking an affected-room count opens Live Map with affected rooms highlighted.
- Clicking an alert opens its detail view.
- Clicking the map preview opens Live Map.
- Clicking sensor availability opens Sensors with offline/stale filters applied.

Avoid filling the page with many charts. The overview should prioritize current state and next action.

### 7.2 Live Building Map

**Purpose:** be the main situational-awareness workspace.

Recommended layout:
- Main canvas: 2D floor plan, occupying about 65–75% of usable content width.
- Right panel: selected room/route/exit details, about 25–35%.
- Map toolbar: zoom in/out, fit to view, reset, layer toggles if supported.
- Compact legend: Normal, Warning, High Risk, Critical, Unknown, exit, blocked connection, sensor marker, route.
- Route summary strip: route status, destination exit, last recalculation time.

Map rules:
- Use stable room and connection IDs shared with the backend/pathfinding graph.
- Rooms should remain identifiable when color is removed; use labels, borders, icons, or patterns in addition to color.
- Use a distinct route line with sufficient contrast against room fills.
- A blocked or unsafe connection must be visually different from an ordinary corridor.
- A no-route result must not draw a misleading route.
- Clicking a room opens a side panel with state, reason, sensors, latest readings, and related events.
- Clicking an exit displays its availability and route relevance.
- Unknown/stale rooms must not use the Normal appearance.

The 2D floor plan is the first-release target. Keep map rendering behind a component boundary so a later 3D view can be added without changing room/route data contracts.

### 7.3 Sensors & Monitoring

**Purpose:** inspect measurement and data quality.

Recommended layout:
- Page header with total/online/stale/offline counts.
- Filter row: search, room, sensor type, status/freshness.
- Table/list columns:
  - Sensor
  - Type
  - Room / zone
  - Latest reading
  - Unit
  - Last seen
  - Connection/freshness
  - Validation state
- Selecting a row opens a detail drawer containing recent readings, mapped location, validation notes, and linked alerts.

Data display rules:
- Always display units alongside values.
- Use the backend's normalized values and status.
- Show timestamp and freshness; do not imply a reading is current if it is stale.
- Avoid fabricated thresholds. Show configured limits only when supplied by the system configuration.
- If a sensor reports multiple values (such as smoke and temperature), display each field clearly.

### 7.4 Evacuation & Pathfinding

**Purpose:** explain the current route decision and its status.

Recommended layout:
- Left/main: larger building map with route overlay.
- Right panel: route result, origin/target where applicable, destination exit, route steps, blocked links, last calculation time, and reason for recalculation.
- Empty/no-route state: explicit message and relevant reason if available.
- If multiple origins are not supported by the current model, do not invent them in the UI.

Route presentation:
- Display only the route returned by the backend as valid.
- A route is not valid merely because a geometric line can be drawn.
- Safety constraints must take precedence over distance/cost optimization.
- If there is no valid route, show **No valid route found** and do not silently fall back to a route through a hazard.
- Dijkstra/BFS educational comparison is a Plus feature and must not be presented as proof that one algorithm is inherently safer.

### 7.5 Alerts & Incidents

**Purpose:** review current and historical events.

Recommended layout:
- Summary strip: active critical/high alerts, active warnings, unresolved incidents.
- Filterable event table or list:
  - Severity
  - Event
  - Room/zone
  - Source (sensor/rule/IDS/system)
  - Timestamp
  - Status
- Selecting an event opens a detail drawer with explanation, related readings, associated room, route changes, and event history if available.

Interaction rules:
- Acknowledgement is separate from resolution. If implemented, acknowledging an alert must not imply that the underlying hazard is cleared.
- Do not include a “Resolve” action unless the backend supports a defined resolution workflow.
- Use event severity and state from the backend rather than deriving a different frontend classification.

### 7.6 Network Security / IDS

**Purpose:** make the cyber-defence module visible and understandable during evaluation.

Recommended layout:
- Small summary row: recent IDS events, unknown devices, invalid-message count, connection health (only where data exists).
- Main event list with category, source/device, time, severity/status, and reason.
- Detail drawer with evidence fields actually available from the IDS.

Use careful language:
- **Invalid reading/message** means validation failed.
- **Suspicious activity** means a configured rule flagged a pattern.
- **Confirmed malicious activity** should only be used if the implementation has evidence and a defined basis for that conclusion.
- Do not show decorative “live attack” graphics or claim protection against attacks that are not implemented and tested.

### 7.7 Risk Analytics / Room State

**Purpose:** explain current room classification and, if implemented, supplementary risk estimates.

Must-have:
- Current room state.
- Measurements contributing to the state.
- Freshness/data-quality context.
- Configured rule/reason summary.
- Distinction between threshold-based hazard state and ML output.

Plus:
- Historical trend charts.
- Anomaly scores, only if produced by a real implemented model.
- Model explanation or predictive timeline, only if the model and evaluation support the claim.

Never label a threshold comparison as “AI prediction.” If no trained and evaluated ML model exists, use **Room State** or **Hazard Assessment** language rather than implying predictive AI.

### 7.8 Simulation / Developer

**Purpose:** create repeatable, controlled demonstrations without cluttering the operational dashboard.

Recommended sections:
1. **Scenario selector:** predefined scenarios and short descriptions.
2. **Scenario controls:** Start, Pause if supported, Stop, Reset.
3. **Scenario configuration:** target room/zone, simulated input changes, blocked corridor, sensor outage, invalid/suspicious message—only for implemented cases.
4. **Live scenario state:** active scenario, elapsed time if implemented, latest events, route changes.
5. **Event/readout log:** concise chronological messages useful for debugging and evaluation.

Safety and clarity:
- Persistent **SIMULATION MODE — TEST DATA** banner while a scenario is active.
- Clearly distinguish simulator-generated data from physical sensor data.
- Confirm destructive actions such as Reset.
- Do not let simulation controls silently modify the operational view without indicating the active source.
- Simulation input must use the same documented sensor-data contract as any future physical source.

### 7.9 Configuration

Keep this page deliberately simple for the first release.

Must-have configuration surfaces:
- Building and room identifiers.
- Connections/corridors and exit availability.
- Sensor-to-room/zone mapping.
- Units and configured thresholds/ranges.
- Stale-data policy and route rules, if these are exposed as configurable values in the backend.

Rules:
- Show whether a value is saved, pending, invalid, or failed.
- Validate room/sensor/exit references before saving.
- Use confirmation for changes that affect active demonstrations.
- If editing is not implemented, present the values read-only; do not display fake save controls.

---

## 8. Visual design system: dark neumorphism

### 8.1 Art direction

Use a dark, restrained command-center aesthetic with soft raised/inset surfaces, thin borders, clear typography, and purposeful accent colors. Neumorphism should provide subtle depth—not obscure boundaries or reduce contrast.

**Avoid:**
- Large blurred shadows on every element.
- Excessive glow, neon outlines, glass effects, or gradients.
- Low-contrast grey text on dark grey backgrounds.
- Making buttons appear disabled because they blend into their surfaces.
- Using red/green alone to communicate critical state.
- Rounded “pill” styling on every component.

### 8.2 Suggested palette

| Token | Suggested value | Usage |
|---|---|---|
| `bg-canvas` | `#0B1120` | Overall application background |
| `bg-sidebar` | `#0E1627` | Sidebar and structural surfaces |
| `surface-base` | `#151F32` | Main cards and panels |
| `surface-raised` | `#1A2740` | Raised cards, menus, selected panels |
| `surface-inset` | `#10192A` | Search fields, map controls, recessed wells |
| `border-subtle` | `#29364D` | Panel separation and control outlines |
| `text-primary` | `#F2F5FA` | Main text |
| `text-secondary` | `#AAB7CC` | Secondary labels and metadata |
| `text-muted` | `#7F8DA5` | Tertiary information; not for essential content |
| `accent-primary` | `#69B7FF` | Links, focus, selected navigation, neutral actions |
| `status-normal` | `#43C59E` | Normal state, with text/icon support |
| `status-warning` | `#F5BE55` | Warning |
| `status-high` | `#FF8A4C` | High risk |
| `status-critical` | `#FF5D6C` | Critical |
| `status-unknown` | `#9AA7BA` | Unknown, stale, unavailable |
| `status-info` | `#8BA8FF` | Informational/system events |

These are proposed UI tokens, not safety thresholds or domain standards. Validate text and component contrast during implementation.

### 8.3 Neumorphic treatment

Use two shadow layers sparingly on raised surfaces:
- A soft dark shadow offset down/right.
- A subtle lighter edge/highlight offset up/left.

Use inset shadows only for controls that genuinely behave like recessed wells (e.g., search fields or map canvas). Keep a thin border even when using shadows so component edges remain visible.

Suggested component treatment:
- **Cards:** low-elevation surface, subtle dual shadow, 12–16 px radius, thin border.
- **Buttons:** clearly distinct hover, pressed, focus, and disabled states; primary action uses an accent fill or strong border rather than shadow alone.
- **Inputs:** inset surface, visible border, clear placeholder and focus ring.
- **Navigation:** mostly flat; active item uses a muted accent surface and a slim accent indicator.
- **Critical alerts:** use a critical icon, label, border/accent, and text. Do not rely on a red glow.
- **Map:** map canvas may be inset, but rooms, exits, corridors, and route must remain visually legible.

### 8.4 Typography and spacing

- Use a clean sans-serif such as Inter, IBM Plex Sans, or the project’s available equivalent.
- Use a clear hierarchy: page title, section heading, body, metadata.
- Use tabular numerals for live values and counts where possible.
- Keep labels concise and sentence case.
- Use a consistent 4/8 px spacing scale; typical card padding 16–20 px.
- Avoid tiny all-caps text for important information.
- Use icons alongside labels where the icon meaning may be ambiguous.

### 8.5 Shape and motion

- Prefer 10–16 px radius for cards and panels; smaller radius for compact controls.
- Use subtle transitions (about 120–180 ms) for hover, selection, and drawer entry.
- Do not animate urgent alerts continuously. A single restrained state transition is sufficient.
- Respect reduced-motion preferences.
- Never use animation as the only indication that a room or route changed.

---

## 9. Interaction and component standards

### Reusable components

- `AppShell`
- `SidebarNavigation`
- `TopStatusBar`
- `PageHeader`
- `StatusPill`
- `SeverityIndicator`
- `MetricCard`
- `RoomStateBadge`
- `SensorStatusRow`
- `SensorReadingsTable`
- `BuildingMap2D`
- `MapLegend`
- `RoomDetailDrawer`
- `RouteSummaryPanel`
- `AlertList` / `AlertDetailDrawer`
- `IDSEventTable` / `IDSEventDrawer`
- `EventTimeline`
- `FilterBar`
- `EmptyState`
- `ErrorState`
- `LoadingSkeleton`
- `ConnectionBanner`
- `SimulationModeBanner`
- `ConfirmActionDialog`
- `ToastMessage`

Names are illustrative component boundaries; the team can rename them while preserving responsibilities.

### Interaction states every relevant component should support

- Default
- Hover
- Keyboard focus
- Selected
- Disabled
- Loading
- Empty
- Error
- Stale or disconnected where relevant

Use tooltips for secondary explanation, not to hide essential labels. All important actions should be keyboard reachable and have visible focus states.

### Data and frontend responsibilities

- The backend is the source of truth for room hazard state, event severity, sensor freshness/validation, and route results.
- The frontend may format values and present explanations supplied by the backend, but must not maintain competing safety rules.
- Live updates may arrive through WebSocket or another agreed transport. The UI should show connection state and last successful update.
- On disconnection, retain the last known state only with a clear **Stale / Disconnected** banner and timestamp.
- Do not silently convert missing values to zero.
- Do not show placeholder or fabricated live readings as if they came from real sensors.
- If demo fixtures are used for design/development, label them as demo data.

---

## 10. Required global states and edge cases

| Condition | Required UI behavior |
|---|---|
| Backend unavailable | Persistent disconnected banner; show last update time; disable actions that require backend confirmation |
| No readings yet | Show “Waiting for readings” or equivalent, not zero-valued readings |
| Stale sensor | Show stale/unavailable state and age of last reading; never style it as Normal |
| Invalid payload | Surface data-quality/validation status and a related event where supported |
| Unknown/unregistered sensor | Identify it as unknown; do not silently map it to a room |
| Active critical alert | High visual priority in overview and alerts list; preserve access to details |
| Route recalculated | Update route and timestamp; show reason if provided |
| No valid route | Explicit no-route state; do not draw a fallback route as valid |
| Exit unavailable | Mark the exit unavailable and exclude it from valid route presentation |
| Empty event history | Clear empty state, not an empty table with no explanation |
| Simulation active | Persistent simulation banner and source label |
| Simulation reset | Confirm action and visibly return scenario state to idle |
| ML unavailable | Continue to show deterministic rule-based state; mark ML output unavailable if a panel depends on it |
| Partial sensor coverage | Explain that the room/zone state is based on available data; do not imply full coverage |

---

## 11. Accessibility and usability requirements

- Meet WCAG AA contrast targets for text and essential UI components where practical.
- Do not use color as the sole indicator of hazard severity, sensor status, or route state.
- Provide text labels and/or icons for all status colors.
- Keep keyboard focus visible on navigation, tables, controls, drawers, and map interactions.
- Use semantic headings, buttons, tables, and form labels.
- Provide meaningful accessible names for map rooms and controls.
- Ensure tables can be navigated without a mouse.
- Do not use rapid flashing, pulsing, or continuous motion to indicate hazards.
- Maintain readable type and hit targets at common desktop zoom levels.
- Include confirmation for destructive simulation/configuration actions.

---

## 12. Responsive behavior

The prototype is desktop-first because the building map and event table need space.

- **Wide desktop:** full sidebar, map plus right detail panel, summary cards in one row.
- **Small laptop/tablet landscape:** collapsible sidebar; detail panel may become a drawer; summary cards wrap.
- **Narrow/mobile:** treat as a secondary read-only/monitoring layout unless mobile operation is explicitly added to scope. Stack summary cards and panels; map controls remain accessible; do not claim the mobile view is suitable for operational evacuation guidance.

Responsive design does not change the system’s academic-prototype limitations.

---

## 13. Frontend data contract expectations

The frontend should consume backend resources for at least these logical entities:

- Building and room map metadata.
- Room hazard/current state.
- Sensor metadata and latest readings.
- Sensor connectivity, freshness, and validation status.
- Active and historical alerts/incidents.
- IDS/security events.
- Current route results and route history where implemented.
- Scenario state and simulation events.
- System connectivity and last-update metadata.

Use the actual agreed API contract when implementation begins. This document does not prescribe final endpoint names or payload shapes. The frontend should not directly subscribe to arbitrary sensor topics unless that responsibility is explicitly assigned to the frontend architecture; the proposed design keeps ingestion and validation in the backend.

---

## 14. Implementation order

### Phase 1 — Visual foundation
- Establish palette, typography, spacing, radii, shadows, and focus styles.
- Build AppShell, navigation, top status bar, cards, badges, tables, drawers, and global state components.
- Create representative static/demo fixtures that are explicitly labeled.

### Phase 2 — Core live workflow
- Overview Dashboard.
- Interactive 2D Building Map and room detail.
- Sensor monitoring and freshness/validation states.
- Alerts & Incidents.
- Evacuation route overlay and no-route handling.
- Connect to agreed backend API/live update mechanism.

### Phase 3 — Complete module demonstration
- Network Security / IDS.
- Risk / room-state explanation.
- Simulation / Developer page.
- Basic Configuration needed to define rooms, sensors, exits, and rules.
- End-to-end scenario testing and event traceability.

### Phase 4 — Polish and Plus features
- Filters, timelines, trends, route steps, and improved detail drawers.
- Optional scenario playback and route animation.
- Optional 3D map only after the 2D map and backend contracts are stable.
- Optional export/reporting.

---

## 15. Definition of done for the first frontend release

The frontend baseline is ready for evaluation when:

- [ ] The operator can identify the current system connection state and last update.
- [ ] The overview shows room hazards, active alerts, sensor availability, and recent events.
- [ ] The 2D map identifies rooms, connections, exits, hazards, unknown states, and the current valid route result.
- [ ] Selecting a room exposes its current state, relevant sensors, readings, freshness, and reason where available.
- [ ] The sensor page distinguishes online, stale, offline, invalid, and unknown states as supported by the backend.
- [ ] Alerts and IDS events can be inspected with their timestamps, source, category, and explanation where available.
- [ ] Route changes are visible, and the UI handles “no valid route” without presenting an unsafe fallback as valid.
- [ ] Simulation controls are separate from the operational overview and clearly label test data.
- [ ] Backend disconnects, empty data, stale readings, and unavailable ML output have explicit UI states.
- [ ] The visual system uses restrained neumorphism without sacrificing contrast, focus visibility, or legibility.
- [ ] The same end-to-end scenario can be repeated and its results inspected in the UI.
- [ ] All claims and values shown by the interface reflect implemented behavior or are clearly marked as illustrative/demo data.

---

## 16. Final recommendation

Build PyroNav as a **dark, map-centered command interface with restrained neumorphism**. Keep the Overview focused on the current situation, use the Live Map for spatial understanding, and place deep inspection on Sensors, Alerts, Security, and Risk pages. Put all scenario generation and developer controls on a separate Simulation page. Implement the must-have workflow before investing in 3D, advanced charts, animations, or elaborate visual effects.

The defining quality of the interface should be **clarity under uncertainty**: the operator can tell what the system knows, what it does not know, what changed, and why the displayed route or alert exists.
