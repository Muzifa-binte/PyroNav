# Member 2: 2D Heatmap Dashboard + Decision Engine

**Your Role:** You own the 2D building status visualization and the hazard classification logic (Decision Engine).

**Tech Stack:**
- Frontend: React + Canvas/SVG for 2D rendering
- Backend: Python + FastAPI
- Database: PostgreSQL (rooms, hazard_events, notifications)

---

## Week 0: Setup & Contracts (Work with all team members)

### Shared Team Tasks (1-2 days)
- [ ] Clone/create project repository
- [ ] Review SRS.md and Technical Specification.md
- [ ] Set up shared contracts folder: `/shared-contracts/`
- [ ] Define hazard levels enum (Normal, Warning, High Risk, Critical, Unknown)
- [ ] Define threshold configuration format
- [ ] Define WebSocket event schemas
- [ ] Create mock data files for team use
- [ ] Set up development environment (Node.js, Python, PostgreSQL)

### Your Specific Setup
- [ ] Install React and state management (Redux/Context API)
- [ ] Install Python FastAPI and dependencies
- [ ] Set up database connection libraries
- [ ] Review threshold values from fire safety standards (for reference)

---

## Week 1: Foundation - 2D Heatmap UI + Threshold Design

### Frontend: 2D Building Status Visualization (60% of week)

**Day 1-2: Basic 2D Canvas Setup**
```
Create:
- 2D Canvas or SVG-based building renderer
- Load building layout from JSON (use Member 1's sample)
- Display rooms as rectangles with labels
- Pan and zoom functionality
- Coordinate system matching 3D model

Use sample building data initially:
/shared-contracts/mock-data/sample-building.json
```

**Files to create:**
```
/frontend/src/components/
  ├── BuildingHeatmap2D.jsx     # Main 2D display component
  ├── Room2D.jsx                # Individual room rectangle
  ├── StatusLegend.jsx          # Hazard level color legend
  └── SensorReadingPanel.jsx    # Display sensor values for selected room
```

**Day 2-3: Room Color-Coding System**
```
Implement hazard level visualization:

Color scheme:
- Normal: Green (#4CAF50)
- Warning: Yellow (#FFC107)
- High Risk: Orange (#FF9800)
- Critical: Red (#F44336)
- Unknown: Gray (#9E9E9E)

Features:
- Room changes color based on hazard_level
- Hover shows room name and current status
- Click room to show detailed sensor readings
- Animated color transitions
```

**Day 3-4: Sensor Value Display Panel**
```
Create info panel showing:
- Room name and ID
- All sensor readings for that room:
  - Temperature: 22°C (timestamp)
  - Smoke: 45 ppm (timestamp)
  - CO: 10 ppm (timestamp)
  - Current: 5.2A (timestamp)
- Hazard level with icon
- "Last updated" timestamp
- Stale data warning if applicable

Use mock data for now:
{
  "room_id": "operation_theater",
  "hazard_level": "WARNING",
  "sensors": {
    "temperature": {"value": 45, "unit": "degC", "timestamp": "..."},
    "smoke": {"value": 85, "unit": "ppm", "timestamp": "..."}
  }
}
```

**Day 4-5: Alert Notifications Panel**
```
Create notifications sidebar:
- List of active alerts
- Each alert shows:
  - Severity badge (color-coded)
  - Room name
  - Event description
  - Timestamp
- Sort by severity (Critical first)
- Auto-scroll to new alerts
- Dismissible notifications

Mock alert data:
{
  "notification_id": "notif-001",
  "room_id": "operation_theater",
  "severity": "CRITICAL",
  "message": "Smoke and temperature thresholds exceeded",
  "timestamp": "2026-10-12T10:30:00Z"
}
```

### Backend: Threshold Configuration Design (40% of week)

**Day 5: Define Threshold Rules**
```
Create configuration file structure:

/backend/decision_engine/config/thresholds.json
{
  "version": "1.0",
  "rules": [
    {
      "rule_id": "SMOKE_WARNING",
      "sensor_type": "smoke_heat",
      "field": "smoke",
      "condition": ">=",
      "threshold": 50,
      "unit": "ppm",
      "hazard_level": "WARNING",
      "requires_notification": true,
      "message_template": "Smoke level elevated in {room_name}"
    },
    {
      "rule_id": "SMOKE_CRITICAL",
      "sensor_type": "smoke_heat",
      "field": "smoke",
      "condition": ">=",
      "threshold": 100,
      "unit": "ppm",
      "hazard_level": "CRITICAL",
      "requires_notification": true,
      "message_template": "Critical smoke level in {room_name}"
    },
    {
      "rule_id": "TEMP_HIGH_RISK",
      "sensor_type": "smoke_heat",
      "field": "temperature",
      "condition": ">=",
      "threshold": 60,
      "unit": "degC",
      "hazard_level": "HIGH_RISK",
      "requires_notification": true,
      "message_template": "High temperature detected in {room_name}"
    }
    // Add more rules for CO, current, etc.
  ],
  "room_level_rules": [
    {
      "rule_id": "COMBINED_CRITICAL",
      "description": "If smoke >= 80 AND temperature >= 50, escalate to CRITICAL",
      "conditions": {
        "smoke": {"min": 80},
        "temperature": {"min": 50}
      },
      "hazard_level": "CRITICAL"
    }
  ]
}

Research and document threshold sources:
- NFPA standards (if available)
- OSHA guidelines
- Mark as "demonstration values" if not validated
```

**Week 1 Deliverable:**
- 2D heatmap displaying rooms with color coding
- Sensor reading panel
- Alert notifications panel
- Threshold configuration file designed

---

## Week 2: Core Implementation - Decision Engine Backend

### Backend: Decision Engine Core Logic (80% of week)

**Day 1-2: Database Schema**
```
Create PostgreSQL tables:

Table: rooms
- room_id (PRIMARY KEY)
- name
- map_position (JSONB: {x, y, z})
- dimensions (JSONB: {width, height, depth})
- current_hazard_level (enum: NORMAL, WARNING, HIGH_RISK, CRITICAL, UNKNOWN)
- last_updated_at
- data_quality_status (enum: FRESH, STALE, NO_DATA)

Table: hazard_events
- event_id (PRIMARY KEY, UUID)
- room_id (FOREIGN KEY)
- hazard_level
- reason_codes (ARRAY of strings)
- source_sensor_ids (ARRAY of strings)
- detected_at
- resolved_at (nullable)
- status (enum: ACTIVE, RESOLVED)

Table: notifications
- notification_id (PRIMARY KEY, UUID)
- event_id (FOREIGN KEY)
- room_id
- severity (enum)
- message
- created_at
- acknowledged_at (nullable)
- status (enum: ACTIVE, ACKNOWLEDGED, DISMISSED)
```

**SQL file location:**
```
/backend/database/migrations/
  └── 002_create_decision_engine_tables.sql
```

**Day 2-4: Threshold Evaluation Logic**
```
Create Python module for rule evaluation:

/backend/decision_engine/
  ├── evaluator.py              # Main evaluation logic
  ├── rule_loader.py            # Load thresholds.json
  ├── room_state_manager.py    # Track and update room states
  └── config/
      └── thresholds.json       # Configuration file

Key functions:

1. evaluate_sensor_reading(sensor_reading, rules):
   - Takes a sensor reading
   - Checks against all applicable rules
   - Returns matched rules and their hazard levels

2. determine_room_hazard_level(room_id):
   - Query all latest readings for room
   - Apply individual threshold rules
   - Apply combined room-level rules
   - Return highest severity level

3. update_room_state(room_id, new_hazard_level, reason_codes):
   - Update rooms table
   - Create hazard_event if level increased
   - Resolve previous event if level decreased
   - Return state change event

Logic flow:
Sensor Reading → Evaluate Rules → Determine Room Level → Update State → Generate Events
```

**Example implementation:**
```python
# evaluator.py
class ThresholdEvaluator:
    def __init__(self, config_path):
        self.rules = load_rules(config_path)
    
    def evaluate_reading(self, reading):
        """
        reading = {
            'sensor_id': 'SMOKE-OT-01',
            'room_id': 'operation_theater',
            'sensor_type': 'smoke_heat',
            'values': {'smoke': 85, 'temperature': 55}
        }
        """
        triggered_rules = []
        
        for rule in self.rules:
            if rule['sensor_type'] == reading['sensor_type']:
                field_value = reading['values'].get(rule['field'])
                if self._check_condition(field_value, rule):
                    triggered_rules.append(rule)
        
        return triggered_rules
    
    def _check_condition(self, value, rule):
        threshold = rule['threshold']
        condition = rule['condition']
        
        if condition == '>=':
            return value >= threshold
        elif condition == '>':
            return value > threshold
        elif condition == '<=':
            return value <= threshold
        # Add more conditions as needed
        
        return False
```

**Day 4-5: Event Generation**
```
Implement event creation:

1. When hazard level changes:
   - Create new entry in hazard_events
   - Record reason_codes (which rules triggered)
   - Record source sensor_ids
   - Set status to ACTIVE

2. When notification required:
   - Create entry in notifications
   - Use message_template from rule
   - Set severity
   - Link to hazard_event

3. When hazard resolves:
   - Update hazard_event.resolved_at
   - Set status to RESOLVED
   - Create resolution notification (optional)

4. Deduplication:
   - Don't create duplicate events for same room+level
   - Update existing event instead
   - Implement cooldown period (e.g., 30 seconds)
```

### Backend: REST API Endpoints (20% of week)

**Day 5: Create Decision Engine APIs**
```
FastAPI endpoints:

GET /api/v1/rooms
Response:
{
  "rooms": [
    {
      "room_id": "operation_theater",
      "name": "Operation Theater",
      "hazard_level": "CRITICAL",
      "data_quality": "FRESH",
      "last_updated": "2026-10-12T10:30:00Z"
    }
  ]
}

GET /api/v1/rooms/{room_id}
Response:
{
  "room_id": "operation_theater",
  "name": "Operation Theater",
  "hazard_level": "CRITICAL",
  "latest_readings": {
    "temperature": {"value": 55, "unit": "degC", "timestamp": "..."},
    "smoke": {"value": 85, "unit": "ppm", "timestamp": "..."}
  },
  "active_events": [...]
}

GET /api/v1/events
Query params: status (ACTIVE/RESOLVED), room_id
Response: List of hazard events

GET /api/v1/notifications
Query params: status (ACTIVE/ACKNOWLEDGED), since (timestamp)
Response: List of notifications

POST /api/v1/notifications/{notification_id}/acknowledge
Mark notification as acknowledged
```

**Files to create:**
```
/backend/api/routes/
  ├── rooms.py                  # Room status endpoints
  ├── events.py                 # Hazard events endpoints
  └── notifications.py          # Notification endpoints
```

**Week 2 Deliverable:**
- Decision engine evaluating thresholds
- Room hazard classification working
- Event and notification generation
- REST APIs returning data

---

## Week 3: Integration - Connect Sensors to Decision Engine

### Backend: Real-Time Processing (70% of week)

**Day 1-2: Integration with Member 1's Sensor Data**
```
Create background service:

/backend/decision_engine/processor.py

Responsibilities:
1. Query new sensor_readings from database (Member 1's table)
   - Poll every 2 seconds OR
   - Listen to database triggers OR
   - Use MQTT subscription (duplicate of Member 1's)

2. For each new reading:
   - Load applicable threshold rules
   - Evaluate reading
   - Get triggered rules
   - Determine room-level hazard
   - Update room state if changed
   - Create events/notifications if required

3. Background tasks:
   - Check for stale sensor data every 30 seconds
   - Set room to UNKNOWN if all sensors stale
   - Update data_quality_status

Deployment:
- Run as separate service OR
- Integrate into FastAPI with background tasks
```

**Day 2-3: Room State Update Logic**
```
Implement sophisticated state management:

1. Get all latest readings for a room
2. Check each reading's freshness (< 60 seconds old)
3. Evaluate each reading against rules
4. Combine results using precedence:
   - CRITICAL > HIGH_RISK > WARNING > NORMAL
5. Apply multi-sensor combined rules
6. Compare with current room state
7. If changed:
   - Update rooms table
   - Create/resolve events
   - Generate notifications
   - Trigger WebSocket update (coordinate with Member 4)

Handle edge cases:
- Mixed readings (some normal, some warning)
- Missing sensor data (mark as UNKNOWN)
- Sensor failure vs. no hazard
- Rapid fluctuations (debouncing)
```

**Day 3-4: Data Quality Monitoring**
```
Add data quality tracking:

For each room, track:
- How many sensors are assigned
- How many have fresh data (< 60 sec)
- How many are stale (> 60 sec)
- How many have never reported

Set data_quality_status:
- FRESH: All sensors reporting
- PARTIAL: Some sensors stale
- STALE: All sensors stale
- NO_DATA: No sensors or never received data

Expose in API:
GET /api/v1/rooms/{room_id}/data-quality
{
  "room_id": "operation_theater",
  "status": "FRESH",
  "sensor_count": 3,
  "fresh_sensors": 3,
  "stale_sensors": 0,
  "last_update": "2026-10-12T10:30:00Z"
}
```

**Day 4-5: Testing with Real Sensor Stream**
```
Integration testing:

1. Start Member 1's MQTT broker
2. Start Member 1's ingestion service
3. Start Member 1's simulator (normal scenario)
4. Start your decision engine processor
5. Verify:
   - Rooms remain NORMAL
   - No false alarms
6. Run simulator (fire scenario)
7. Verify:
   - Room changes to WARNING/CRITICAL
   - Event created in database
   - Notification generated
   - API returns correct status

Create test scenarios document
```

### Frontend: Live Data Integration (30% of week)

**Day 5: Connect Frontend to Real API**
```
Update React components:

1. Replace mock data with API calls:
   - Fetch /api/v1/rooms on component mount
   - Display real room statuses
   - Update colors based on real hazard_level

2. Polling (temporary, until WebSocket in Week 4):
   - Poll /api/v1/rooms every 3 seconds
   - Poll /api/v1/notifications every 3 seconds
   - Update UI with new data

3. Add loading states and error handling:
   - Show spinner while loading
   - Display error message if API fails
   - Retry logic for failed requests

Use axios or fetch:
```javascript
// Example API integration
const fetchRoomStatus = async () => {
  try {
    const response = await fetch('http://localhost:8002/api/v1/rooms');
    const data = await response.json();
    setRooms(data.rooms);
  } catch (error) {
    console.error('Failed to fetch room status:', error);
    setError('Unable to connect to backend');
  }
};

useEffect(() => {
  fetchRoomStatus();
  const interval = setInterval(fetchRoomStatus, 3000);
  return () => clearInterval(interval);
}, []);
```

**Week 3 Deliverable:**
- Decision engine processing real sensor data
- Room states updating automatically
- Frontend displaying live status from API
- Events and notifications working end-to-end

---

## Week 4: Real-Time Updates - WebSocket Integration

### Backend: Prepare for WebSocket Events (40% of week)

**Day 1-2: Event Publishing Interface**
```
Create event publisher module:

/backend/decision_engine/event_publisher.py

Purpose: Send state changes to Member 4's WebSocket service

Interface:
```python
class EventPublisher:
    def publish_room_status_changed(self, room_data):
        """
        Called when room hazard level changes
        Member 4 will forward this to WebSocket clients
        """
        event = {
            'event_type': 'room_status_changed',
            'room_id': room_data['room_id'],
            'hazard_level': room_data['hazard_level'],
            'timestamp': datetime.utcnow().isoformat()
        }
        # Send to Member 4's WebSocket service
        # Could use: internal HTTP call, message queue, or direct function call
        
    def publish_hazard_event_created(self, event_data):
        event = {
            'event_type': 'hazard_event_created',
            'event_id': event_data['event_id'],
            'room_id': event_data['room_id'],
            'hazard_level': event_data['hazard_level'],
            'message': event_data['message'],
            'timestamp': event_data['detected_at']
        }
        # Send to Member 4
        
    def publish_notification_created(self, notification_data):
        event = {
            'event_type': 'notification_created',
            'notification_id': notification_data['notification_id'],
            'severity': notification_data['severity'],
            'message': notification_data['message'],
            'room_id': notification_data['room_id'],
            'timestamp': notification_data['created_at']
        }
        # Send to Member 4
```

Integrate into room_state_manager.py:
- After updating room state → publish_room_status_changed()
- After creating event → publish_hazard_event_created()
- After creating notification → publish_notification_created()

**Day 2-3: Coordinate with Member 4**
```
Work with Member 4 to define:
1. How to send events (HTTP callback? Shared queue? Direct import?)
2. Event format standardization
3. Error handling if WebSocket service unavailable
4. Testing procedure

Document the integration contract
```

### Frontend: WebSocket Client Integration (60% of week)

**Day 3-5: Replace Polling with WebSocket**
```
Implement WebSocket client:

/frontend/src/services/websocket.js

```javascript
class PyroNavWebSocket {
  constructor() {
    this.ws = null;
    this.listeners = {};
  }
  
  connect() {
    // Member 4 provides WebSocket URL
    this.ws = new WebSocket('ws://localhost:8000/ws/v1/live');
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connect(), 5000);
    };
  }
  
  handleEvent(data) {
    const { event_type } = data;
    
    if (event_type === 'room_status_changed') {
      // Update room color in heatmap
      this.notifyListeners('room_update', data);
    } else if (event_type === 'notification_created') {
      // Add notification to panel
      this.notifyListeners('new_notification', data);
    } else if (event_type === 'sensor_reading_updated') {
      // Update sensor reading panel
      this.notifyListeners('sensor_update', data);
    }
  }
  
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }
  
  notifyListeners(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => callback(data));
    }
  }
}

export default new PyroNavWebSocket();
```

**Update React components:**
```javascript
// BuildingHeatmap2D.jsx
useEffect(() => {
  // Initial data load
  fetchRoomStatus();
  
  // Listen for WebSocket updates
  websocket.on('room_update', (data) => {
    setRooms(prevRooms => 
      prevRooms.map(room => 
        room.room_id === data.room_id 
          ? { ...room, hazard_level: data.hazard_level }
          : room
      )
    );
  });
  
  websocket.connect();
  
  return () => {
    websocket.disconnect();
  };
}, []);
```

Add visual feedback:
- Pulse animation when room status changes
- Sound notification for CRITICAL alerts (optional)
- Toast notifications for new events
```

**Week 4 Deliverable:**
- WebSocket events sent from Decision Engine
- Frontend receiving real-time updates
- No more polling (replaced by WebSocket)
- Smooth animations for status changes

---

## Week 5-6: Polish, Testing & Documentation

### Testing & Validation (Week 5)

**Day 1-2: Comprehensive Testing**
```
Test all scenarios:

1. Normal conditions:
   - All rooms GREEN
   - No events/notifications

2. Single room hazard:
   - One room WARNING → CRITICAL
   - Event created
   - Notification appears
   - UI updates within 1 second

3. Multiple hazards:
   - Multiple rooms affected simultaneously
   - Correct prioritization in notification list

4. Hazard resolution:
   - Readings return to normal
   - Room returns to GREEN
   - Event marked RESOLVED

5. Stale data:
   - Stop simulator for one sensor
   - Room becomes GRAY (UNKNOWN)
   - Data quality warning shown

6. Edge cases:
   - Conflicting sensor readings
   - Rapid state changes
   - Missing sensor data
   - Database connection failure

Create test report document
```

**Day 2-3: Performance Optimization**
```
Optimize:

Backend:
- Add database indexes on room_id, timestamp fields
- Optimize queries (use JOIN instead of multiple queries)
- Cache threshold rules (don't reload every evaluation)
- Batch database updates if possible

Frontend:
- Memoize room rendering (React.memo)
- Virtualize notification list if >100 items
- Optimize color transition animations
- Reduce re-renders
```

**Day 3-4: Coordinate with Member 3**
```
Ensure integration:

1. Your hazard_level updates must trigger Member 3's route recalculation
2. Member 4 coordinates this through WebSocket
3. Test: Fire in room → Route recalculates

Joint testing:
- Create hazard on current route
- Verify route changes
- Verify both dashboards update
```

**Day 4-5: User Experience Polish**
```
UI improvements:

1. Add filters:
   - Show only active alerts
   - Filter by severity
   - Filter by room

2. Add search:
   - Search rooms by name
   - Search alerts by keyword

3. Add settings panel:
   - Adjust refresh rate (if still polling)
   - Enable/disable sound notifications
   - Adjust color scheme

4. Accessibility:
   - Add ARIA labels
   - Keyboard navigation
   - Screen reader support
   - High contrast mode
```

### Documentation & Demo Prep (Week 6)

**Documentation Tasks:**
```
Create/update:

1. /backend/decision_engine/README.md
   - Architecture overview
   - Threshold configuration guide
   - How to add new rules
   - Event flow diagrams

2. /backend/decision_engine/THRESHOLDS.md
   - Explanation of each threshold
   - Sources/references (if validated)
   - Mark as "demonstration values" if not certified

3. /frontend/README.md
   - Component structure
   - WebSocket integration guide
   - Customization options

4. API_DOCUMENTATION.md
   - All endpoints
   - Request/response examples
   - Error codes

5. TESTING.md
   - Test scenarios
   - Expected results
   - How to verify manually
```

**Demo Preparation:**
```
Prepare demo flow:

1. Show building in normal state (2 minutes)
   - Walk through UI elements
   - Explain color scheme
   - Show sensor readings

2. Trigger fire scenario (2 minutes)
   - Show gradual escalation
   - Point out notifications
   - Show event log

3. Show resolution (1 minute)
   - Return to normal
   - Event marked resolved

4. Show edge cases (1 minute)
   - Stale data handling
   - Multiple simultaneous hazards

Practice presentation timing
```

---

## Key Deliverables Summary

### Frontend Deliverables:
✅ 2D building heatmap with color-coded rooms  
✅ Hazard level legend  
✅ Sensor reading detail panel  
✅ Alert notifications sidebar  
✅ Real-time updates via WebSocket  
✅ Stale data indicators  
✅ Search and filter functionality  

### Backend Deliverables:
✅ Threshold configuration system  
✅ Rule evaluation engine  
✅ Room hazard classification logic  
✅ Multi-sensor decision logic  
✅ Hazard event generation  
✅ Notification system  
✅ Data quality monitoring  
✅ REST API endpoints  
✅ WebSocket event publishing  
✅ Integration with sensor ingestion  

---

## Important Notes

### Mock Data for Team
By end of Week 1, create:
```
/shared-contracts/mock-data/mock-room-status.json
/shared-contracts/mock-data/mock-notifications.json
```
So Member 3 can work independently.

### Coordinate With:
- **Member 1:** Query sensor_readings table; ensure room_id consistency
- **Member 3:** Your hazard updates trigger route recalculation
- **Member 4:** WebSocket event format and integration method

### Testing Strategy
After each week, verify:
- Week 1: Can you render buildings and display colors?
- Week 2: Do thresholds correctly classify hazards?
- Week 3: Do real sensor readings update room status?
- Week 4: Do WebSocket updates appear instantly?

---

## Quick Start Commands

### Start Decision Engine Processor
```bash
cd backend/decision_engine
python processor.py
```

### Start API Server
```bash
cd backend/api
uvicorn main:app --reload --port 8002
```

### Start Frontend Dashboard
```bash
cd frontend
npm start
```

### Manual Testing
```bash
# Insert test reading to database
psql pyronav_db -c "INSERT INTO sensor_readings ..."
# Watch decision engine logs
tail -f logs/decision_engine.log
```

---

## Resources

### Frontend Libraries:
- Canvas: HTML5 Canvas API
- Or use Konva.js for interactive 2D graphics
- React state management: Context API or Redux
- WebSocket: native WebSocket API

### Backend Libraries:
- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Pydantic: https://docs.pydantic.dev/

### Fire Safety References:
- NFPA standards (educational reference)
- OSHA guidelines (educational reference)
- **Mark all thresholds as "demonstration values" unless certified**

---

**Good luck! Remember: Your hazard classification is the brain of the system!**
