# Member 1: 3D Building Model + MQTT/Sensor Ingestion

**Your Role:** You own the 3D building input interface and the sensor data pipeline (MQTT ingestion).

**Tech Stack:**
- Frontend: React + Three.js (React Three Fiber)
- Backend: Python + FastAPI
- MQTT: Eclipse Mosquitto broker
- Database: PostgreSQL (sensor tables)

---

## Week 0: Setup & Contracts (Work with all team members)

### Shared Team Tasks (1-2 days)
- [ ] Clone/create project repository
- [ ] Review SRS.md and Technical Specification.md
- [ ] Set up shared contracts folder: `/shared-contracts/`
- [ ] Define building JSON schema (coordinate with Member 3 & 2)
- [ ] Define sensor message schema (MQTT format)
- [ ] Create mock data files for team use
- [ ] Set up development environment (Node.js, Python, PostgreSQL)

### Your Specific Setup
- [ ] Install Three.js / React Three Fiber
- [ ] Install MQTT libraries: `paho-mqtt` or `mosquitto` clients
- [ ] Install Python MQTT library: `paho-mqtt`
- [ ] Set up local Mosquitto broker

---

## Week 1: Foundation - 3D Editor Basics + MQTT Broker Setup

### Frontend: 3D Building Editor (40% of week)

**Day 1-2: Basic 3D Scene**
```
Create:
- 3D canvas with camera controls (orbit, pan, zoom)
- Grid floor/base plane
- Basic lighting setup
- Coordinate system display
```

**Day 2-3: Room Creation**
```
Implement:
- Click-to-add room cubes/boxes
- Room properties panel:
  - room_id (auto-generated or manual)
  - room_name
  - dimensions (width, height, depth)
  - position (x, y, z)
- Color-code rooms for visual distinction
- Room selection and highlight on click
```

**Files to create:**
```
/frontend/src/components/
  ├── BuildingEditor3D.jsx       # Main 3D editor component
  ├── Room3D.jsx                 # Individual room mesh component
  ├── RoomPropertiesPanel.jsx    # Edit room details
  └── CameraControls.jsx         # Camera movement setup
```

### Backend: MQTT Broker Setup (60% of week)

**Day 3-4: Mosquitto Installation & Configuration**
```
Tasks:
1. Install Mosquitto MQTT broker (Windows/Docker)
2. Create mosquitto.conf configuration:
   - Set port 1883
   - Allow anonymous (for development only)
   - Enable logging
3. Test broker with MQTT client tool (MQTT Explorer or mqttx)
4. Document broker connection details in README

Configuration file location:
/backend/mqtt/mosquitto.conf
```

**Day 4-5: Basic Sensor Simulator**
```
Create:
- Python script that publishes test messages
- Topics: pyronav/v1/sensors/{room_id}/{sensor_id}/reading
- Message format (JSON):
  {
    "sensor_id": "SMOKE-OT-01",
    "room_id": "operation_theater",
    "sensor_type": "smoke_heat",
    "timestamp": "2026-10-12T10:30:00Z",
    "values": {"smoke": 45, "temperature": 22},
    "units": {"smoke": "ppm", "temperature": "degC"}
  }
- Publish 1 message every 5 seconds
- Use 3-5 mock sensors
```

**Files to create:**
```
/backend/mqtt/
  ├── mosquitto.conf            # Broker configuration
  ├── test_publisher.py         # Simple message publisher
  └── README.md                 # Setup instructions
```

**Week 1 Deliverable:**
- 3D editor where you can add and position rooms
- Running MQTT broker
- Test script that publishes sensor data

---

## Week 2: Core Implementation - Sensor Ingestion Backend

### Backend: MQTT Subscriber + Database Integration (70% of week)

**Day 1-2: Database Schema**
```
Create PostgreSQL tables:

Table: sensors
- sensor_id (PRIMARY KEY)
- room_id (FOREIGN KEY to rooms table - Member 2 creates this)
- sensor_type (enum: current, smoke_heat, co)
- status (enum: active, inactive, error)
- created_at

Table: sensor_readings
- id (PRIMARY KEY, auto-increment)
- message_id (UNIQUE)
- sensor_id (FOREIGN KEY)
- room_id
- timestamp
- values (JSONB - stores all sensor values)
- units (JSONB)
- validation_status (enum: valid, invalid, stale)
- received_at
```

**SQL file location:**
```
/backend/database/migrations/
  └── 001_create_sensor_tables.sql
```

**Day 2-3: MQTT Ingestion Adapter**
```
Create Python service:

1. Subscribe to pyronav/v1/sensors/+/+/reading
2. On message received:
   - Parse JSON
   - Validate schema (required fields exist)
   - Validate sensor_id exists in sensors table
   - Validate room_id exists in rooms table
   - Check for duplicate message_id
   - Insert into sensor_readings table
3. Error handling:
   - Log invalid messages
   - Update sensor status on errors
   - Don't crash on bad data

Use libraries:
- paho-mqtt for MQTT client
- psycopg2 or sqlalchemy for database
- pydantic for validation
```

**Files to create:**
```
/backend/sensor_ingestion/
  ├── mqtt_subscriber.py        # Main MQTT client
  ├── message_validator.py      # Schema validation logic
  ├── database_writer.py        # Insert readings to DB
  ├── config.py                 # MQTT/DB connection settings
  └── main.py                   # Entry point to run service
```

**Day 4-5: REST API for Sensor Data**
```
Create FastAPI endpoints:

GET /api/v1/sensors
- Returns list of all registered sensors

GET /api/v1/sensors/{sensor_id}
- Returns sensor details and status

GET /api/v1/sensors/{sensor_id}/readings
- Query params: limit (default 100), from_time, to_time
- Returns recent readings

POST /api/v1/sensors (optional - for registering sensors)
- Body: {sensor_id, room_id, sensor_type}
```

**Files to create:**
```
/backend/api/
  ├── main.py                   # FastAPI app setup
  └── routes/
      └── sensors.py            # Sensor endpoints
```

### Frontend: 3D Editor Enhancements (30% of week)

**Day 5: Sensor Placement**
```
Add to 3D editor:
- Sensor placement mode (add sensor icons/markers in rooms)
- Sensor properties:
  - sensor_id
  - sensor_type (dropdown: current, smoke_heat, co)
  - assigned room
- Visual distinction for sensor types (different colors/icons)
```

**Week 2 Deliverable:**
- MQTT subscriber service ingesting messages to database
- Sensor REST API endpoints working
- 3D editor can place sensors in rooms

---

## Week 3: Advanced Features - Virtual Simulator + API Integration

### Backend: Realistic Virtual Sensor Simulator (50% of week)

**Day 1-3: Enhanced Simulator**
```
Create sophisticated simulator:

Features:
1. Reads building config JSON (from Member 1's 3D export)
2. Creates sensors for each room automatically
3. Simulates realistic patterns:
   - Normal conditions (baseline readings)
   - Gradual hazard escalation (rising temperature/smoke)
   - Sudden events (spike in readings)
4. Scenario support:
   - Normal operation
   - Single-room fire
   - Spreading fire
   - Sensor failure simulation
5. Configurable parameters:
   - Publishing interval (default 2 seconds)
   - Noise/randomness level
   - Scenario selection

Command line interface:
python simulator.py --scenario normal --interval 2
python simulator.py --scenario fire_ot --room operation_theater
```

**Files to create:**
```
/backend/sensor_simulator/
  ├── simulator.py              # Main simulator logic
  ├── scenarios.py              # Predefined hazard scenarios
  ├── sensor_models.py          # Realistic value generation
  └── README.md                 # Usage instructions
```

**Day 3-4: Stale Data Detection**
```
Add to ingestion service:

1. Track last_received_at for each sensor
2. Background task checks for stale sensors every 30 seconds
3. If no message in last 60 seconds (configurable):
   - Update sensor status to 'stale'
   - Log warning
4. Expose stale sensor status in API
```

### Frontend: 3D Export + Polish (50% of week)

**Day 4: Export Building Configuration**
```
Implement export functionality:

1. "Export Building" button
2. Generate JSON file with all data:
   {
     "building_id": "hospital_main",
     "rooms": [
       {
         "room_id": "operation_theater",
         "name": "Operation Theater",
         "position": {"x": 0, "y": 0, "z": 0},
         "dimensions": {"width": 10, "height": 5, "depth": 8}
       }
     ],
     "connections": [
       {
         "from_room": "operation_theater",
         "to_room": "corridor_1",
         "door_position": {"x": 5, "y": 0, "z": 0}
       }
     ],
     "sensors": [
       {
         "sensor_id": "SMOKE-OT-01",
         "room_id": "operation_theater",
         "sensor_type": "smoke_heat",
         "position": {"x": 5, "y": 4, "z": 4}
       }
     ],
     "exits": [
       {
         "exit_id": "EXIT-A",
         "room_id": "lobby",
         "position": {"x": 0, "y": 0, "z": 0}
       }
     ]
   }
3. Save file to /shared-contracts/building-config.json
4. Share with team members 2 & 3
```

**Day 5: UI Polish**
```
Improvements:
- Add/delete connections between rooms (corridors)
- Mark exits with special markers
- Color legend for sensor types
- Save/Load building projects
- Undo/Redo functionality
```

**Week 3 Deliverable:**
- Realistic sensor simulator with scenarios
- Complete building export functionality
- Stale sensor detection working
- building-config.json shared with team

---

## Week 4: Integration + Connection Management

### Backend: Connection Resilience (40% of week)

**Day 1-2: MQTT Reconnection Logic**
```
Enhance mqtt_subscriber.py:

1. Handle broker disconnection gracefully
2. Automatic reconnection with exponential backoff
3. Resume subscription on reconnect
4. Log connection events
5. Health check endpoint: GET /api/v1/health
   Returns:
   {
     "mqtt_connected": true,
     "database_connected": true,
     "last_message_received": "2026-10-12T10:30:00Z"
   }
```

**Day 2-3: Database Connection Pooling**
```
Optimize database access:
- Implement connection pooling (SQLAlchemy pool)
- Handle database connection failures
- Retry logic for transient errors
- Add database health check
```

### Frontend: Building Editor Finalization (40% of week)

**Day 3-4: Advanced Features**
```
Add:
- 3D camera preset views (top-down, side view)
- Room labeling (display room names in 3D)
- Measurement tools (distance between rooms)
- Import existing building JSON
- Validation warnings (rooms without sensors, disconnected rooms)
```

### Integration Testing (20% of week)

**Day 4-5: End-to-End Testing**
```
Test complete pipeline:

1. Start MQTT broker
2. Start ingestion service
3. Run simulator with fire scenario
4. Verify readings appear in database
5. Test API endpoints return correct data
6. Simulate sensor failure and verify stale detection
7. Test reconnection scenarios (stop/start broker)

Create test checklist document
```

**Week 4 Deliverable:**
- Resilient sensor ingestion pipeline
- Polished 3D building editor
- Complete integration testing passed

---

## Week 5-6: Polish, Testing & Documentation

### Final Integration (Week 5)

**Day 1-2: Connect with Member 2's Decision Engine**
```
Ensure:
- Your sensor_readings table is accessible to Member 2
- Decision Engine can query latest readings
- Test with Member 2: simulator → ingestion → decision engine
```

**Day 3-4: Frontend Integration with Dashboard**
```
Help Members 2 & 3:
- Ensure building JSON format works for 2D displays
- Provide sample building configurations
- Test 3D → 2D data flow
```

**Day 5: Performance Testing**
```
Test limits:
- How many sensors can publish simultaneously?
- Database performance with high message rate
- API response time under load
```

### Documentation & Demo Prep (Week 6)

**Documentation Tasks:**
```
Create/update:
1. /backend/mqtt/README.md - MQTT setup instructions
2. /backend/sensor_ingestion/README.md - Service architecture
3. /backend/sensor_simulator/SCENARIOS.md - How to run scenarios
4. /frontend/README.md - 3D editor user guide
5. API documentation (use FastAPI auto-docs)
```

**Demo Preparation:**
```
Prepare demo scenarios:
1. Normal building operation
2. Fire in operation theater
3. Spreading fire scenario
4. Sensor failure recovery
5. Multiple simultaneous hazards

Practice:
- Building creation demo (2-3 minutes)
- Sensor placement and export
- Simulator control
```

---

## Key Deliverables Summary

### Frontend Deliverables:
✅ 3D building editor with room creation  
✅ Sensor placement interface  
✅ Connection/corridor definition  
✅ Exit markers  
✅ Export building configuration JSON  

### Backend Deliverables:
✅ MQTT broker setup and configuration  
✅ Sensor ingestion service (MQTT subscriber)  
✅ Database schema (sensors, sensor_readings)  
✅ Message validation and error handling  
✅ REST API for sensor data  
✅ Virtual sensor simulator with scenarios  
✅ Stale data detection  
✅ Connection resilience and health checks  

---

## Important Notes

### Mock Data for Team
By end of Week 1, create:
```
/shared-contracts/mock-data/mock-sensor-readings.json
```
So Members 2 & 3 can work independently.

### Coordinate With:
- **Member 2:** Ensure room_id values match between your building config and their decision engine
- **Member 3:** Provide building graph structure for pathfinding
- **Member 4:** Coordinate database schema and API standards

### Testing Strategy
After each week, test independently:
- Week 1: Can you publish and receive MQTT messages?
- Week 2: Can you see readings in database?
- Week 3: Does simulator generate realistic patterns?
- Week 4: Does system survive broker restart?

---

## Quick Start Commands

### Start MQTT Broker
```bash
mosquitto -c backend/mqtt/mosquitto.conf -v
```

### Start Ingestion Service
```bash
cd backend/sensor_ingestion
python main.py
```

### Run Simulator
```bash
cd backend/sensor_simulator
python simulator.py --scenario normal
```

### Start API Server
```bash
cd backend/api
uvicorn main:app --reload --port 8001
```

### Start 3D Editor
```bash
cd frontend
npm start
```

---

## Resources

### MQTT Libraries:
- Python: `pip install paho-mqtt`
- Test tool: MQTT Explorer (desktop app)

### 3D Libraries:
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Three.js examples: https://threejs.org/examples/

### Database:
- PostgreSQL docs: https://www.postgresql.org/docs/
- SQLAlchemy: https://docs.sqlalchemy.org/

---

**Good luck! Remember: Create building-config.json by Week 3 so the team can use it!**
