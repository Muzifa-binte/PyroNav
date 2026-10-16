# PyroNav — Technical Specification

**Project:** PyroNav — Autonomous, Cyber-Defended Emergency Egress & Predictive Fire Safety Infrastructure  
**Document:** Technical Specification  
**Version:** 1.0  
**Status:** Proposed architecture; implementation details to be finalized  
**Date:** 12 October 2026

---

## 1. Purpose

This document describes the proposed technical architecture, component responsibilities, interfaces, data contracts, processing workflow, algorithms, storage, security considerations, and verification approach for PyroNav.

The specification focuses on the software system and its interfaces. The physical or virtual source of sensor readings is intentionally left open. A physical sensor setup and a software simulator can both act as data producers if they follow the same input contract. This decision does not need to be made before the core software architecture is designed.

## 2. Design Principles

1. **Source independence:** The application shall not depend on whether readings originate from physical sensors or a simulator.
2. **Separation of concerns:** Ingestion, decision logic, pathfinding, persistence, notifications, and presentation shall be separate logical components.
3. **Consistent data contracts:** Components shall exchange documented, validated data structures.
4. **Safety-aware routing:** Route selection shall apply hazard constraints before optimizing distance or travel cost.
5. **Traceability:** Important readings, decisions, route changes, and errors shall be recorded for testing and review.
6. **Configurable rules:** Thresholds, hazard policies, stale-data limits, and route costs shall be configuration-driven rather than unexplained hard-coded constants.
7. **Academic prototype limitation:** PyroNav is a demonstration system and is not a certified life-safety system.

---

## 3. Proposed Technology Stack

The following stack is a proposal, not a claim that these technologies have already been selected or implemented. Equivalent tools may be substituted if agreed by the team.

| Layer | Proposed technology | Responsibility |
|---|---|---|
| Frontend | React.js | Live dashboard, building map, sensor values, alerts, route visualization |
| Backend API | Python + FastAPI | API endpoints, orchestration, validation, state updates |
| Sensor messaging | MQTT | Delivery of sensor readings from the selected input source |
| MQTT broker | Eclipse Mosquitto | Receives sensor publications and forwards subscribed messages |
| Decision Engine | Python module/service | Threshold evaluation, room hazard classification, event decisions |
| Pathfinding Engine | Python module/service | Building graph, hazard-aware routing, Dijkstra and BFS |
| Database | PostgreSQL (proposed) | Sensor history, room state, hazard events, alerts, route history |
| Live frontend updates | WebSocket (proposed) | Push updated readings, statuses, alerts, and routes to clients |
| Testing | pytest + simulated message publisher | Repeatable component and integration tests |
| Deployment | Local development environment initially | Run services locally during development; deployment approach to be decided |

**Selection note:** The team should confirm the stack before implementation. This specification defines logical boundaries so that the stack can be changed without changing the overall architecture.

---

## 4. System Architecture

### 4.1 Logical Architecture

```text
               Physical Sensor Source OR Virtual Simulator
                                  |
                                  | MQTT publish
                                  v
                           MQTT Broker
                                  |
                                  | subscribe
                                  v
                       Sensor Ingestion Adapter
                                  |
                         Validate and normalize
                                  |
                                  v
                            Decision Engine
                  +---------------+----------------+
                  |               |                |
             Room State      Hazard Events     Notification
                  |               |                |
                  +---------------+----------------+
                                  |
                          Hazard/Room Updates
                                  |
                                  v
                          Pathfinding Engine
                      Building Graph + Route Policy
                                  |
                           Route Result / Status
                                  |
                                  v
                           Application Backend
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
              PostgreSQL                   WebSocket/API
                                                 |
                                                 v
                                            React UI
                                 Building Status + Route Map
```

### 4.2 Component Boundaries

- **Input source:** Produces readings. It may be physical hardware or a software simulator.
- **MQTT broker:** Transports messages; it does not classify hazards or calculate routes.
- **Ingestion adapter:** Subscribes to configured topics, validates the message envelope, normalizes units/fields, and reports invalid or stale data.
- **Decision Engine:** Applies configured rules and produces room-level status and hazard events.
- **Pathfinding Engine:** Uses the current building graph and safety state to return a route or a no-route result.
- **Persistence layer:** Stores readings and significant state changes.
- **API/live-update layer:** Supplies initial state and pushes subsequent updates to the frontend.
- **Frontend:** Visualizes system state and user-facing results. It must not independently recalculate hazard severity using rules that differ from the backend.

---

## 5. Sensor Input and Messaging

### 5.1 Sensor Types

The software shall support the following logical sensor categories:

- Electrical current
- Combined smoke and heat
- Carbon monoxide (CO)

A logical sensor may provide one or more values. The physical sensor model, hardware interface, or simulator implementation is outside the scope of this decision-neutral software specification.

### 5.2 MQTT Topic Convention

Proposed topic structure:

```text
pyronav/v1/sensors/{room_id}/{sensor_id}/reading
pyronav/v1/sensors/{room_id}/{sensor_id}/status
```

Examples:

```text
pyronav/v1/sensors/operation_theater/SMOKE-OT-01/reading
pyronav/v1/sensors/electrical_room/CURRENT-ER-01/reading
pyronav/v1/sensors/ward/CO-WARD-01/reading
```

Room and sensor identifiers shall be stable, machine-readable identifiers. The broker's access-control policy should restrict which devices or simulator clients may publish to each topic.

### 5.3 Canonical Reading Message

Proposed JSON envelope:

```json
{
  "schema_version": "1.0",
  "message_id": "unique-message-id",
  "sensor_id": "SMOKE-OT-01",
  "room_id": "operation_theater",
  "sensor_type": "smoke_heat",
  "timestamp": "2026-10-12T10:30:00Z",
  "values": {
    "smoke": 85,
    "temperature": 68
  },
  "units": {
    "smoke": "project_defined_unit",
    "temperature": "degC"
  }
}
```

This is an illustrative contract. The team must define the actual smoke measurement unit or scale, current unit, CO unit, acceptable ranges, timestamp policy, and required fields before implementation. Example values are not safety thresholds.

For current and CO messages, `values` and `units` shall contain the relevant field(s) using the same envelope.

### 5.4 Message Processing Rules

1. Parse the message and verify its schema version.
2. Check required fields, data types, identifiers, timestamp, and units.
3. Confirm that the sensor and room are registered in the building configuration.
4. Check duplicate message IDs and out-of-order timestamps where supported.
5. Normalize values to the system's configured units.
6. Persist accepted readings according to the data-retention policy.
7. Pass valid readings to the Decision Engine.
8. Record invalid messages and expose a suitable sensor/data-quality status.
9. Treat stale or missing readings as **unknown/unavailable**, not as proof of safety.

### 5.5 MQTT Delivery and Availability

- Use a documented QoS level appropriate to the chosen test environment.
- Define broker reconnection and retry behavior.
- Consider retained messages only for suitable status/configuration topics; historical readings should not be treated as fresh merely because they were retained.
- Define a configurable stale-data timeout based on the chosen sampling interval.
- Protect broker credentials and restrict anonymous publishing in any shared or network-accessible deployment.

---

## 6. Decision Engine

### 6.1 Responsibilities

The Decision Engine shall:

- Evaluate validated sensor readings against configurable rules.
- Maintain the current state of each room.
- Combine readings from applicable sensor categories according to documented rules.
- Assign a hazard classification.
- Identify affected rooms.
- Generate hazard events and notification requests.
- Inform the Pathfinding Engine and frontend when relevant room safety state changes.
- Record the readings and rule outcomes that led to a decision.

### 6.2 Processing Flow

```text
Validated Reading
       |
       v
Identify Sensor and Room
       |
       v
Check Data Freshness and Sensor Health
       |
       v
Evaluate Configured Threshold Rules
       |
       v
Combine Applicable Room-Level Evidence
       |
       v
Determine Room State and Hazard Level
       |
       +------> Record State/Event
       |
       +------> Request Notification if Required
       |
       +------> Publish Room Safety Update
                         |
                         v
                 Pathfinding + Frontend
```

### 6.3 Hazard Rule Configuration

Thresholds shall be stored in a configuration structure or database, not scattered through the code. Each rule should specify:

- Rule identifier and version
- Sensor type and measured field
- Unit and applicable range
- Threshold or condition
- Resulting hazard level
- Required action(s)
- Optional persistence/debounce duration
- Recovery or clear condition
- Whether the rule requires multiple readings or corroborating evidence

The project team must establish threshold values from appropriate authoritative guidance and/or clearly label them as experimental demonstration thresholds. Values must not be presented as certified fire-safety limits without validation.

### 6.4 Room-Level State Model

Proposed state labels:

- **NORMAL:** Available readings satisfy configured normal conditions.
- **WARNING:** A configured warning condition is detected.
- **HIGH_RISK:** A configured high-risk condition is detected.
- **CRITICAL:** A configured critical condition requires urgent notification and route reassessment.
- **UNKNOWN:** Data is missing, stale, invalid, or insufficient to determine the room's condition.

The final state model, transition precedence, recovery conditions, and treatment of conflicting sensors shall be explicitly configured. `UNKNOWN` must not be represented visually as `NORMAL`.

### 6.5 Decision Output Contract

Proposed internal event:

```json
{
  "event_id": "unique-event-id",
  "room_id": "operation_theater",
  "hazard_level": "CRITICAL",
  "reason_codes": [
    "SMOKE_THRESHOLD_EXCEEDED",
    "TEMPERATURE_THRESHOLD_EXCEEDED"
  ],
  "source_sensor_ids": ["SMOKE-OT-01"],
  "detected_at": "2026-10-12T10:30:01Z",
  "requires_notification": true,
  "requires_route_recalculation": true
}
```

The reason codes shown are examples. Actual codes shall be defined in the implementation.

---

## 7. Building Model and Pathfinding

### 7.1 Building Graph

The building shall be represented as a graph:

- **Nodes:** rooms, corridor junctions, exits, or other navigation points.
- **Edges:** traversable connections such as doors and corridor segments.
- **Edge attributes:** distance or travel cost, traversability, and relevant hazard/availability status.
- **Room attributes:** stable room ID, display name, map geometry/coordinates, hazard level, and data-quality state.
- **Exit attributes:** stable exit ID, location, and current availability.

The graph's room identifiers must match the room IDs used in sensor messages and the map rendered by the frontend.

### 7.2 Route Selection Policy

Routing shall follow this order:

1. Load the latest building graph and room/corridor safety state.
2. Apply safety constraints to block prohibited nodes/edges or assign documented penalties where policy allows.
3. Identify available exits and eligible starting locations.
4. Calculate candidate routes using the configured graph algorithm.
5. Select a route according to the documented safety and route-cost policy.
6. Return the route, destination exit, cost, calculation timestamp, and status.
7. Recalculate when a relevant hazard or connectivity change affects route validity.

**Important:** Do not simply calculate the shortest route and then check whether it crosses a hazard. Safety constraints must influence route eligibility before the final route is selected. If no eligible route exists, return `NO_VALID_ROUTE` rather than silently returning an unsafe route.

### 7.3 Algorithm Responsibilities

**Dijkstra's algorithm**
- Use for graphs with non-negative edge costs.
- Supports weighted route cost, such as distance or a defined travel-cost measure.
- The safety policy must determine which edges are unavailable and how permitted risks affect cost.

**Breadth-First Search (BFS)**
- Use for unweighted graphs when minimizing the number of edges is the intended objective.
- Does not optimize real-world distance when edges have different lengths.
- Can be included for comparison, testing, or a clearly defined unweighted routing case.

Dijkstra and BFS are graph algorithms, not machine-learning models. If predictive ML is later required, it shall be a separate component with its own data, features, outputs, training/evaluation process, and acceptance criteria.

### 7.4 Route Result Contract

```json
{
  "route_id": "unique-route-id",
  "origin_node_id": "reception",
  "exit_id": "EXIT-A",
  "node_ids": ["reception", "corridor_1", "junction_2", "EXIT-A"],
  "edge_ids": ["EDGE-01", "EDGE-07", "EDGE-11"],
  "total_cost": 24.5,
  "algorithm": "dijkstra",
  "status": "ROUTE_FOUND",
  "calculated_at": "2026-10-12T10:30:02Z"
}
```

The IDs and cost are illustrative. The implementation shall define cost units and the mapping from graph IDs to frontend map geometry.

Possible route statuses:

- `ROUTE_FOUND`
- `NO_VALID_ROUTE`
- `NO_AVAILABLE_EXIT`
- `INVALID_ORIGIN`
- `RECALCULATION_PENDING`

---

## 8. Backend API and Live Updates

The following is a proposed interface; endpoint names and payloads may be adjusted during implementation.

### 8.1 REST API

| Method | Proposed endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/building` | Retrieve building layout, rooms, connections, and exits |
| GET | `/api/v1/rooms` | Retrieve room summaries and current status |
| GET | `/api/v1/sensors` | Retrieve registered sensors and their status |
| GET | `/api/v1/sensors/{sensor_id}/readings` | Retrieve recent readings for a sensor |
| GET | `/api/v1/events` | Retrieve active/recent hazard events |
| GET | `/api/v1/notifications` | Retrieve notification history |
| GET | `/api/v1/routes/current` | Retrieve current route results, if available |
| GET | `/api/v1/health` | Retrieve service health status |

REST endpoints are intended for initial page load, historical queries, and health checks. MQTT is the proposed sensor-ingestion transport; it is not a browser-facing API.

### 8.2 WebSocket Events

Proposed WebSocket endpoint: `/ws/v1/live`

Possible event types:

- `sensor_reading_updated`
- `sensor_status_changed`
- `room_status_changed`
- `hazard_event_created`
- `notification_created`
- `route_updated`
- `system_status_changed`

Each event should include an event type, timestamp, and typed payload. The frontend shall handle reconnection and obtain a fresh snapshot after reconnecting so that missed events do not leave the display permanently stale.

### 8.3 Error Handling

- Return appropriate HTTP error responses for invalid requests or unavailable resources.
- Use a consistent error body with a machine-readable code and a human-readable message.
- Do not expose credentials, stack traces, or sensitive internal details to the frontend.
- Log server-side diagnostics with enough context to investigate failures.
- Display sensor, backend, and route-calculation problems clearly in the UI.

---

## 9. Frontend Technical Design

### 9.1 Main Views

1. **Building Overview:** overall building status, room map, available exits, active hazards.
2. **Room Detail:** latest sensor values, sensor freshness, hazard state, and recent events.
3. **Alerts/Events:** active and historical hazard events and notifications.
4. **Route View:** recommended route, destination exit, blocked/unsafe areas, and route status.
5. **System/Device Status:** sensor availability and relevant backend connection status.

### 9.2 Map Rendering

The frontend shall render the building layout from a stable map/graph definition. A route result shall reference graph nodes and edges; the UI shall map those identifiers to visual positions or path segments.

Visual encoding shall include:

- A legend and text labels for hazard states
- A distinct visual style for the recommended route
- Clearly marked exits
- Clear indications for unknown/stale room data
- A no-valid-route state
- Textual status in addition to color, for accessibility and print/readability

The frontend is responsible for presentation. The backend remains the authoritative source for hazard decisions and route results.

---

## 10. Data Storage Design

A relational database such as PostgreSQL is proposed. The following are logical entities; exact table design and indexing will be finalized during implementation.

| Entity/Table | Main fields |
|---|---|
| `sensors` | `sensor_id`, `room_id`, `sensor_type`, `status`, `unit_config` |
| `sensor_readings` | `id`, `message_id`, `sensor_id`, `room_id`, `timestamp`, `values`, `validation_status` |
| `rooms` | `room_id`, `name`, `map_geometry`, `current_hazard_level`, `last_updated_at` |
| `building_nodes` | `node_id`, `node_type`, `room_id`, `map_position` |
| `building_edges` | `edge_id`, `from_node_id`, `to_node_id`, `cost`, `traversable` |
| `exits` | `exit_id`, `node_id`, `availability_status` |
| `hazard_events` | `event_id`, `room_id`, `hazard_level`, `reason_codes`, `detected_at`, `resolved_at` |
| `notifications` | `notification_id`, `event_id`, `message`, `created_at`, `status` |
| `route_results` | `route_id`, `origin_node_id`, `exit_id`, `node_ids`, `edge_ids`, `total_cost`, `algorithm`, `status`, `calculated_at` |

Data-retention duration, indexes, transaction boundaries, and whether sensor readings are stored individually or aggregated shall be decided based on the expected data rate and demonstration needs.

---

## 11. Security and Reliability

- Use authenticated MQTT clients and topic-level publish/subscribe permissions where supported.
- Do not allow unrestricted anonymous sensor publishing in a shared or exposed environment.
- Validate all MQTT messages and API input; treat incoming payloads as untrusted.
- Keep credentials and secret values outside source control.
- Restrict API access if the application is deployed beyond a trusted local development environment.
- Use TLS when communicating across untrusted networks.
- Record malformed messages, unauthorized publishing attempts, and relevant service errors.
- Keep data-quality state separate from hazard classification; missing data must not imply normal conditions.
- Make route recalculation and notification handling idempotent where feasible, to reduce duplicate processing.
- Provide reconnection and recovery behavior for broker, backend, database, and browser connections.
- Keep the prototype clearly labeled as non-certified and unsuitable as the sole real-world life-safety mechanism.

---

## 12. Testing and Verification Strategy

### 12.1 Unit Tests

- Message parsing, schema validation, unit handling, and duplicate detection
- Threshold comparisons and hazard-state transitions
- Multi-sensor room-level rule evaluation
- Graph construction and blocked-edge/node behavior
- Dijkstra correctness on known weighted graphs
- BFS correctness on known unweighted graphs
- No-route and unavailable-exit handling
- Route result and notification formatting

### 12.2 Integration Tests

- Sensor publisher → MQTT broker → ingestion adapter
- Ingestion adapter → Decision Engine
- Decision Engine → hazard event and persistence
- Decision Engine → Pathfinding Engine
- Backend → WebSocket → frontend update
- Route result → map rendering
- Reconnection and fresh-snapshot recovery

### 12.3 End-to-End Scenarios

1. **Normal conditions:** all inputs remain within configured normal rules; room states and route are displayed.
2. **Single-room hazard:** readings trigger a hazard; the correct room is identified, an event is recorded, and the route is reconsidered.
3. **Route obstruction:** a corridor or room on the current route becomes unavailable; a new eligible route is shown if one exists.
4. **No valid route:** all eligible routes to exits are blocked; the UI displays a clear no-route state.
5. **Stale sensor:** a sensor stops reporting; its state becomes stale/unknown and is not shown as safe.
6. **Invalid data:** malformed or out-of-range readings are rejected or flagged according to policy.
7. **Recovery:** readings return to configured recovery conditions; room state and active event status change according to the documented recovery rules.
8. **Network/security test:** unauthorized or malformed messages are rejected or flagged according to the broker and ingestion policies.

### 12.4 Performance Measures

The team shall establish and measure:
- End-to-end reading-to-dashboard latency
- Hazard-decision processing time
- Route recalculation time
- Maximum tested message rate and sensor count
- WebSocket reconnection and recovery behavior
- Frequency of duplicate notifications in repeated scenarios

Performance targets shall be agreed before final acceptance testing.

---

## 13. Implementation Phases

### Phase 1 — Contracts and Building Configuration
- Finalize sensor message schema and units.
- Define room, sensor, graph-node, edge, and exit identifiers.
- Create a version-controlled building configuration.
- Define threshold configuration format and route policy.

### Phase 2 — Data Ingestion
- Set up MQTT broker and ingestion adapter.
- Implement schema validation, logging, stale-data tracking, and a test publisher.
- Verify that the input source can be swapped without changing downstream processing.

### Phase 3 — Decision Engine
- Implement configurable threshold rules.
- Implement room state transitions and event generation.
- Add unit tests for expected and edge-case readings.

### Phase 4 — Pathfinding
- Implement the building graph and safety constraints.
- Implement and test Dijkstra and BFS for their specified use cases.
- Add route invalidation, recalculation, and no-route handling.

### Phase 5 — Backend, Persistence, and Live API
- Add database persistence.
- Expose initial-state REST endpoints.
- Implement WebSocket live events and reconnect recovery.

### Phase 6 — Frontend
- Render the building map, room states, sensor details, alerts, and route overlays.
- Add stale-data, backend-disconnected, and no-route indicators.

### Phase 7 — Integration and Demonstration
- Run repeatable normal, hazard, route-change, stale-data, invalid-data, and recovery scenarios.
- Measure performance and resolve defects.
- Document limitations and final implementation choices.

---

## 14. Decisions Intentionally Deferred

The following decisions are not required to define the core software architecture and remain open:

- Whether sensor input will come from physical hardware, a software simulator, or both
- The exact sensor hardware or simulator tool
- The final building model authoring tool and whether its visualization is 2D or 3D
- Final sensor sampling frequency and data units
- Final hazard thresholds and validation basis
- Whether a separate predictive ML model will be included
- Final deployment environment

The system shall use a stable input interface so that the selected sensor source can be integrated later without changing the core Decision Engine, Pathfinding Engine, persistence, or frontend contracts.

---

## 15. Open Technical Decisions

Before implementation, the team must finalize:

1. Approved technology stack and repository structure.
2. Sensor message schema, units, sampling interval, and stale-data timeout.
3. Hazard rules, severity precedence, and recovery policy.
4. Room/corridor safety policy and route-cost definition.
5. The intended role of BFS versus Dijkstra in the final demonstration.
6. API response schemas and WebSocket event contracts.
7. Database retention and indexing.
8. Authentication, broker permissions, and deployment security.
9. Measurable performance and acceptance targets.
10. Whether predictive ML is in scope as a separate module.

---

**End of Technical Specification**
