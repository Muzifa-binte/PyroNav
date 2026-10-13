# Work Distribution Strategy: 4-Member Team

*Evacuation and building-status system: 3D input model, 2D dashboards, and backend*

## 1. Project Context

The project has these parts:

- A **3D React model** for building input.
- A **2D evacuation view** on the dashboard.
- A **2D heatmap view** showing building status on the dashboard.
- A backend with sensor ingestion, a decision engine, pathfinding, a database, and live updates.

**Problem:** The team has 4 members, and every module depends on the others. The team wasn't sure how to work in parallel without getting blocked.

**Approach:** Contract-first development with mocks and stubs. Everyone agrees on data shapes and APIs first, then builds against mock data until the real pieces are ready.

## 2. Phase 0: Team Setup (All Members, 1-2 Days)

Do this together before splitting up:

- Define all API contracts and data schemas.
- Create mock data files.
- Set up the project structure and repositories.
- Establish shared constants and types.

### Shared contracts (version controlled)

```
/shared-contracts/
├── building-schema.json          # Building config structure
├── sensor-message-schema.json    # MQTT message format
├── api-endpoints.md              # REST API documentation
├── websocket-events.md           # WebSocket event types
├── hazard-levels.json            # Enum definitions
└── mock-data/
    ├── sample-building.json
    ├── sample-sensors.json
    └── sample-routes.json
```

## 3. First Draft and Why It Was Rejected

The first plan gave Members 1-3 frontend-only work and put the entire backend on Member 4: MQTT, Decision Engine, Pathfinding, database, REST API, WebSocket, and the sensor simulator.

**Issue raised:** Member 4 had unfairly massive work compared to the others.

The backend was split across all four members in the revised plan below.

## 4. Revised Member Assignments

### Member 1: 3D Building Model + MQTT/Sensor Ingestion

**Part A: 3D Building Input (about 40% of time)**

- 3D React building editor (Three.js / React Three Fiber)
- Room creation, connections, and exits
- Export of building configuration as JSON
- Sensor placement interface

**Part B: Sensor Data Pipeline (about 60% of time)**

- MQTT broker setup (Mosquitto)
- Sensor ingestion adapter (validate and normalize messages)
- Virtual sensor simulator that publishes test data
- Database tables: `sensors`, `sensor_readings`
- REST API: `/api/v1/sensors/*`

**Why it fits:** The 3D model defines where sensors go, and the next step is ingesting their data. The simulator can be tested with its own MQTT setup.

### Member 2: 2D Heatmap Dashboard + Decision Engine

**Part A: 2D Heatmap UI (about 40% of time)**

- 2D building status visualization
- Room color-coding by hazard level
- Sensor value displays
- Alert notifications panel

**Part B: Decision Engine Backend (about 60% of time)**

- Threshold evaluation logic
- Hazard classification rules (Normal, Warning, High Risk, Critical)
- Room state management
- Event generation (hazard events, notifications)
- Database tables: `rooms`, `hazard_events`, `notifications`
- REST API: `/api/v1/rooms`, `/api/v1/events`, `/api/v1/notifications`

**Why it fits:** The heatmap displays hazard levels, so the owner should understand the classification logic behind it.

### Member 3: 2D Evacuation Routes + Pathfinding Engine

**Part A: 2D Route Visualization (about 40% of time)**

- 2D evacuation route display
- Animated path rendering
- Blocked area highlighting
- Exit markers and status indicators

**Part B: Pathfinding Engine Backend (about 60% of time)**

- Building graph construction (nodes, edges, costs)
- Dijkstra's algorithm and BFS
- Hazard-aware routing (apply safety constraints)
- Route recalculation logic
- Database tables: `building_nodes`, `building_edges`, `exits`, `route_results`
- REST API: `/api/v1/routes/*`, `/api/v1/building`

**Why it fits:** The route display shows the pathfinding results, so the same person calculates and displays routes.

### Member 4: Backend Integration + WebSocket + Database Architecture

This role is 100% backend infrastructure, split into four equal parts (about 25% each).

**A. Database architecture**

- PostgreSQL setup and configuration
- Complete schema design and relationships
- Indexes and query optimization
- Data retention policies and migrations

**B. Backend API framework**

- FastAPI application setup
- Routing and middleware
- Request validation and error handling
- CORS and security configuration
- Health check endpoints

**C. WebSocket live updates**

- WebSocket server at `/ws/v1/live`
- Real-time event broadcasting
- Connection management and reconnection
- Event types: `sensor_reading_updated`, `room_status_changed`, `route_updated`, and others

**D. System integration and orchestration**

- Connect Member 1's MQTT to Member 2's Decision Engine
- Connect Member 2's Decision Engine to Member 3's Pathfinding
- Coordinate data flow across components
- End-to-end testing framework
- Deployment configuration

**Why it fits:** This is the glue code and infrastructure that enables everyone else's work, without implementing domain algorithms.

## 5. Workload Balance

| Member | Frontend | Backend | Est. Lines of Code |
| --- | --- | --- | --- |
| Member 1 | 3D Model | MQTT + Ingestion | \~1500 |
| Member 2 | 2D Heatmap | Decision Engine | \~1500 |
| Member 3 | 2D Routes | Pathfinding Engine | \~1500 |
| Member 4 | None | Infrastructure + Integration | \~1500 |

## 6. Revised Timeline

### Week 1: Independent Development

| Member | Tasks |
| --- | --- |
| Member 1 | 3D editor basics, MQTT broker setup, simulator stub |
| Member 2 | 2D heatmap UI, threshold configuration design |
| Member 3 | 2D route UI, graph data structure design |
| Member 4 | Database schema, FastAPI skeleton, mock endpoints |

### Week 2: Core Logic Implementation

| Member | Tasks |
| --- | --- |
| Member 1 | Sensor ingestion validation, database insert |
| Member 2 | Decision Engine rules, hazard classification |
| Member 3 | Dijkstra and BFS implementation |
| Member 4 | REST API completion, database optimization |

### Week 3: Backend Integration

| Member | Tasks |
| --- | --- |
| Member 1 | Virtual simulator publishes realistic data |
| Member 2 | Connect ingestion to decision engine |
| Member 3 | Connect decision engine to pathfinding |
| Member 4 | WebSocket implementation, event pipeline |

### Week 4: Frontend-Backend Connection

| Member | Tasks |
| --- | --- |
| Member 1 | 3D model refinement, sensor placement export |
| Member 2 | Heatmap connects to WebSocket for live updates |
| Member 3 | Route display connects to route API and WebSocket |
| Member 4 | Integration testing, bug fixes |

### Weeks 5-6: Integration and Polish (All Members)

- End-to-end scenario testing
- Performance optimization
- UI/UX improvements
- Documentation

## 7. Dependency Flow

```
Member 1 (MQTT)  →  Member 2 (Decision)  →  Member 3 (Pathfinding)
                              ↓                      ↓
                        Member 4 (orchestrates data flow via WebSocket)
                              ↓
                    Frontend components (all 3 members receive updates)
```

## 8. Mock Data Strategy

Each backend owner creates a mock of their own output immediately, so downstream members never wait.

**Member 1: `mock-sensor-readings.json`**

```json
{
  "sensor_id": "SMOKE-OT-01",
  "room_id": "operation_theater",
  "values": {"smoke": 85, "temperature": 68}
}
```

**Member 2: `mock-hazard-events.json`**

```json
{
  "room_id": "operation_theater",
  "hazard_level": "CRITICAL",
  "reason_codes": ["SMOKE_THRESHOLD_EXCEEDED"]
}
```

**Member 3: `mock-route-result.json`**

```json
{
  "origin_node_id": "reception",
  "exit_id": "EXIT-A",
  "node_ids": ["reception", "corridor_1", "EXIT-A"],
  "status": "ROUTE_FOUND"
}
```

### Example: building layout before the 3D editor is done

The 2D dashboards need a building layout, but the editor isn't finished. Both use a shared sample file and swap the import source later.

```json
// shared-contracts/mock-data/sample-building.json
{
  "rooms": [
    {
      "room_id": "operation_theater",
      "name": "Operation Theater",
      "coordinates": {"x": 100, "y": 200},
      "dimensions": {"width": 50, "height": 40}
    }
  ]
}
```

Live updates can be simulated during development:

```javascript
setInterval(() => updateMockData(), 2000);
```

## 9. Daily Standup Questions

Each member answers:

1. What API contract assumptions did I make?
2. What shared file or constant do I need clarified?
3. Any blockers on mock data format?

## 10. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A backend module falls behind | Frontend members keep using mocks, so the system can still demo with simulated data |
| API contract changes mid-development | Version the contracts and use adapter functions in the frontend |
| Building JSON format changes | All frontend members use the same parser utility, so updates happen in one place |

## 11. Why This Distribution Works

- **Balanced workload:** Each person has roughly 1500 lines of code.
- **Frontend-backend pairing:** Each UI owner understands the backend logic behind their view.
- **Member 4 not overloaded:** Focus is on infrastructure rather than domain algorithms.
- **Natural ownership:** Whoever builds a calculation also builds its display.
- **Still parallelizable:** Mock data lets everyone work independently.
- **Better learning:** Everyone touches both frontend and backend.

## 12. Alternative: One Member Prefers Pure Frontend

Member 2 takes the 2D Heatmap Dashboard, the 2D Route Visualization, the WebSocket client integration, and all real-time UI updates. Member 4 then picks up the Decision Engine, and the workload stays balanced.

## 13. Possible Next Steps

- Detailed task breakdowns for each member
- Starter code templates for each member's responsibilities
- A Kanban board structure for tracking progress
- The API contracts document
