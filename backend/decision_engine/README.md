# Decision Engine - Member 2

## Purpose
The Decision Engine is the "brain" of PyroNav. It evaluates sensor readings against **research-based, configurable thresholds**, classifies room hazard levels, and generates notifications.

**Threshold Values:** Derived from authoritative sources (OSHA, NFPA, NIST) and documented with citations. See `config/THRESHOLD-JUSTIFICATION.md` for complete defense.

## Components

### Core Files (To be created in Week 2)
- `evaluator.py` - Threshold evaluation logic
- `rule_loader.py` - Load and parse thresholds.json
- `room_state_manager.py` - Track and update room states
- `event_publisher.py` - Publish events to Member 4's WebSocket
- `processor.py` - Background service that processes sensor readings

### Configuration
- `config/thresholds.json` - All threshold rules and policies **(research-based, October 2026)**
- `config/THRESHOLD-JUSTIFICATION.md` - Complete defense with citations (13 pages)
- `config/QUICK-DEFENSE-REFERENCE.md` - Printable summary for presentations

## Week 0 Setup - COMPLETED ✓

### Created:
- [x] Decision engine folder structure
- [x] Threshold configuration file
- [x] Mock data for team (room-status, notifications)
- [x] Documentation

### Dependencies Needed (Already in requirements.txt):
- FastAPI - REST API framework
- psycopg2-binary - PostgreSQL database connection
- pydantic - Data validation
- SQLAlchemy - Database ORM

## How It Works

### Processing Flow:
```
1. Sensor Reading arrives (from Member 1's sensor_readings table)
2. Rule Loader provides applicable threshold rules
3. Evaluator checks reading against thresholds
4. Room State Manager determines room hazard level
5. If level changed:
   - Update rooms table
   - Create hazard_event record
   - Generate notification if required
   - Publish event to WebSocket (Member 4)
6. Member 3's pathfinding uses updated room hazard levels
7. Frontend displays updated room colors
```

## Integration Points

### Reads From:
- **Member 1**: `sensor_readings` table (sensor data)
- **Member 1**: `sensors` table (sensor metadata)

### Writes To:
- `rooms` table (current hazard level)
- `hazard_events` table (event history)
- `notifications` table (alerts)

### Publishes To:
- **Member 4**: Event bus (`room_status_changed` events)

### Used By:
- **Member 3**: Pathfinding reads `rooms.current_hazard_level`
- **Frontend**: 2D heatmap displays room colors

## Hazard Levels

From `shared-contracts/hazard-levels.json`:
- **NORMAL** - All sensors within safe thresholds
- **WARNING** - One or more sensors exceeded warning threshold
- **HIGH_RISK** - Dangerous levels detected, blocks evacuation routes
- **CRITICAL** - Immediate danger, blocks evacuation routes
- **UNKNOWN** - No fresh sensor data available

## Week 1 Tasks (Next)
- [ ] Design 2D heatmap frontend with mock data
- [ ] Create sensor reading display panel
- [ ] Create notifications sidebar
- [ ] Refine threshold values

## Week 2 Tasks
- [ ] Implement evaluator.py
- [ ] Implement room_state_manager.py
- [ ] Create REST API endpoints
- [ ] Database integration

## Testing
Test scenarios to verify:
1. Normal readings → room stays GREEN
2. Rising temperature → room turns YELLOW (WARNING)
3. Critical smoke → room turns RED (CRITICAL)
4. Combined hazards → correct escalation
5. Stale data → room turns GRAY (UNKNOWN)
6. Recovery → room returns to NORMAL

## Notes
- **Threshold values are RESEARCH-BASED** (OSHA, NFPA, NIST sources)
- Complete justification available in `config/THRESHOLD-JUSTIFICATION.md`
- Defensible for academic presentation and evaluation
- NOT certified for real fire safety applications (academic prototype)
- Must wait for Member 1 to provide sensor data before backend integration
