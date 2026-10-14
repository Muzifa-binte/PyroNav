# Member 4: Backend Integration + WebSocket + Database Architecture

**Your Role:** You own the backend infrastructure, database architecture, API coordination, and real-time WebSocket communication system.

**Tech Stack:**
- Backend: Python + FastAPI
- Database: PostgreSQL
- Real-time: WebSocket (Socket.IO or native WebSocket)
- Integration: Message queue or direct service calls

---

## Week 0: Setup & Contracts (Work with all team members)

### Shared Team Tasks (1-2 days)
- [ ] Clone/create project repository
- [ ] Review SRS.md and Technical Specification.md
- [ ] Set up shared contracts folder: `/shared-contracts/`
- [ ] Define all API endpoint contracts
- [ ] Define WebSocket event schemas
- [ ] Define database architecture overview
- [ ] Set up development environment (Python, PostgreSQL, Node.js)

### Your Specific Setup
- [ ] Install PostgreSQL locally or Docker
- [ ] Install Python 3.9+ and create virtual environment
- [ ] Install FastAPI and dependencies
- [ ] Install WebSocket libraries
- [ ] Set up database management tools (pgAdmin, DBeaver, or psql)
- [ ] Create Git branching strategy

---

## Week 1: Foundation - Database Setup + API Framework

### Database Architecture Setup (50% of week)

**Day 1: PostgreSQL Installation & Configuration**
```
Tasks:
1. Install PostgreSQL (or use Docker)
   Docker command:
   docker run --name pyronav-db -e POSTGRES_PASSWORD=pyronav123 -p 5432:5432 -d postgres:15

2. Create database and user:
   CREATE DATABASE pyronav_db;
   CREATE USER pyronav_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE pyronav_db TO pyronav_user;

3. Configure connection settings
4. Test connection from Python

Files to create:
/backend/database/
  ├── connection.py           # Database connection manager
  └── config.py              # Database credentials
```

**Example connection.py:**
```python
# connection.py
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager

class DatabaseManager:
    def __init__(self, host, port, database, user, password):
        self.pool = SimpleConnectionPool(
            minconn=1,
            maxconn=20,
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
    
    @contextmanager
    def get_connection(self):
        conn = self.pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            self.pool.putconn(conn)
    
    def execute_query(self, query, params=None):
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()

# Singleton instance
db_manager = DatabaseManager(
    host='localhost',
    port=5432,
    database='pyronav_db',
    user='pyronav_user',
    password='secure_password'  # Move to environment variable
)
```

**Day 2-3: Complete Database Schema Design**
```
Create master schema integrating all team members' needs:

/backend/database/schema.sql

Full schema including:
- Member 1's tables: sensors, sensor_readings
- Member 2's tables: rooms, hazard_events, notifications
- Member 3's tables: building_nodes, building_edges, exits, route_results
- Your tables: system_logs, websocket_sessions, api_keys

See detailed schema below
```

**Complete Schema:**
```sql
-- schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MEMBER 1: SENSOR DATA
-- ============================================

CREATE TYPE sensor_type_enum AS ENUM ('current', 'smoke_heat', 'co');
CREATE TYPE sensor_status_enum AS ENUM ('active', 'inactive', 'error', 'stale');
CREATE TYPE validation_status_enum AS ENUM ('valid', 'invalid', 'stale', 'duplicate');

CREATE TABLE sensors (
    sensor_id VARCHAR(50) PRIMARY KEY,
    room_id VARCHAR(50) NOT NULL,
    sensor_type sensor_type_enum NOT NULL,
    status sensor_status_enum DEFAULT 'active',
    unit_config JSONB,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    sensor_id VARCHAR(50) REFERENCES sensors(sensor_id),
    room_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    values JSONB NOT NULL,
    units JSONB NOT NULL,
    validation_status validation_status_enum DEFAULT 'valid',
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sensor_readings_room_id ON sensor_readings(room_id);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);

-- ============================================
-- MEMBER 2: DECISION ENGINE
-- ============================================

CREATE TYPE hazard_level_enum AS ENUM ('NORMAL', 'WARNING', 'HIGH_RISK', 'CRITICAL', 'UNKNOWN');
CREATE TYPE data_quality_enum AS ENUM ('FRESH', 'PARTIAL', 'STALE', 'NO_DATA');
CREATE TYPE event_status_enum AS ENUM ('ACTIVE', 'RESOLVED');
CREATE TYPE notification_status_enum AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'DISMISSED');

CREATE TABLE rooms (
    room_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    map_position JSONB,
    dimensions JSONB,
    current_hazard_level hazard_level_enum DEFAULT 'UNKNOWN',
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_quality_status data_quality_enum DEFAULT 'NO_DATA'
);

CREATE TABLE hazard_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(50) REFERENCES rooms(room_id),
    hazard_level hazard_level_enum NOT NULL,
    reason_codes TEXT[],
    source_sensor_ids TEXT[],
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    status event_status_enum DEFAULT 'ACTIVE'
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES hazard_events(event_id),
    room_id VARCHAR(50) REFERENCES rooms(room_id),
    severity hazard_level_enum NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    status notification_status_enum DEFAULT 'ACTIVE'
);

CREATE INDEX idx_hazard_events_room_id ON hazard_events(room_id);
CREATE INDEX idx_hazard_events_status ON hazard_events(status);
CREATE INDEX idx_notifications_status ON notifications(status);

-- ============================================
-- MEMBER 3: PATHFINDING
-- ============================================

CREATE TYPE node_type_enum AS ENUM ('room', 'junction', 'exit');
CREATE TYPE route_status_enum AS ENUM ('ROUTE_FOUND', 'NO_VALID_ROUTE', 'NO_AVAILABLE_EXIT', 'INVALID_ORIGIN', 'RECALCULATION_PENDING');
CREATE TYPE algorithm_enum AS ENUM ('dijkstra', 'bfs');

CREATE TABLE building_nodes (
    node_id VARCHAR(50) PRIMARY KEY,
    node_type node_type_enum NOT NULL,
    room_id VARCHAR(50) REFERENCES rooms(room_id),
    position JSONB NOT NULL,
    traversable BOOLEAN DEFAULT TRUE,
    metadata JSONB
);

CREATE TABLE building_edges (
    edge_id VARCHAR(50) PRIMARY KEY,
    from_node_id VARCHAR(50) REFERENCES building_nodes(node_id),
    to_node_id VARCHAR(50) REFERENCES building_nodes(node_id),
    cost FLOAT NOT NULL,
    bidirectional BOOLEAN DEFAULT TRUE,
    traversable BOOLEAN DEFAULT TRUE,
    metadata JSONB
);

CREATE TABLE exits (
    exit_id VARCHAR(50) PRIMARY KEY,
    node_id VARCHAR(50) REFERENCES building_nodes(node_id),
    name VARCHAR(100) NOT NULL,
    position JSONB,
    available BOOLEAN DEFAULT TRUE,
    capacity INT
);

CREATE TABLE route_results (
    route_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_node_id VARCHAR(50),
    exit_id VARCHAR(50),
    node_ids TEXT[],
    edge_ids TEXT[],
    total_cost FLOAT,
    algorithm algorithm_enum,
    status route_status_enum,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hazard_state_snapshot JSONB
);

CREATE INDEX idx_route_results_calculated_at ON route_results(calculated_at DESC);

-- ============================================
-- MEMBER 4: SYSTEM INFRASTRUCTURE
-- ============================================

CREATE TYPE log_level_enum AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

CREATE TABLE system_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level log_level_enum NOT NULL,
    component VARCHAR(100),
    message TEXT,
    metadata JSONB
);

CREATE TABLE websocket_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(100),
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE api_audit_log (
    audit_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    endpoint VARCHAR(200),
    method VARCHAR(10),
    status_code INT,
    response_time_ms INT,
    error_message TEXT
);

CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_api_audit_timestamp ON api_audit_log(timestamp DESC);

-- Add foreign key for sensors table (circular dependency fix)
ALTER TABLE sensors ADD CONSTRAINT fk_sensors_room 
    FOREIGN KEY (room_id) REFERENCES rooms(room_id);
```

**Day 3-4: Database Migration System**
```
Set up migration management:

/backend/database/migrations/
  ├── 001_initial_schema.sql
  ├── migrate.py                # Migration runner
  └── README.md

Create migration runner:
```python
# migrate.py
import os
import psycopg2
from datetime import datetime

class MigrationRunner:
    def __init__(self, db_connection):
        self.conn = db_connection
        self._create_migration_table()
    
    def _create_migration_table(self):
        query = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            migration_id SERIAL PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        with self.conn.cursor() as cursor:
            cursor.execute(query)
        self.conn.commit()
    
    def get_applied_migrations(self):
        query = "SELECT filename FROM schema_migrations ORDER BY migration_id"
        with self.conn.cursor() as cursor:
            cursor.execute(query)
            return [row[0] for row in cursor.fetchall()]
    
    def apply_migration(self, filename):
        path = os.path.join('migrations', filename)
        with open(path, 'r') as f:
            sql = f.read()
        
        with self.conn.cursor() as cursor:
            cursor.execute(sql)
            cursor.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s)",
                (filename,)
            )
        self.conn.commit()
        print(f"Applied migration: {filename}")
    
    def run_migrations(self):
        applied = self.get_applied_migrations()
        migration_files = sorted([
            f for f in os.listdir('migrations') 
            if f.endswith('.sql')
        ])
        
        for filename in migration_files:
            if filename not in applied:
                print(f"Applying {filename}...")
                self.apply_migration(filename)
        
        print("All migrations applied successfully")

# Usage
if __name__ == '__main__':
    conn = psycopg2.connect(
        host='localhost',
        database='pyronav_db',
        user='pyronav_user',
        password='secure_password'
    )
    runner = MigrationRunner(conn)
    runner.run_migrations()
    conn.close()
```

### Backend API Framework (50% of week)

**Day 4-5: FastAPI Application Setup**
```
Create main API application:

/backend/api/
  ├── main.py                   # Main FastAPI app
  ├── config.py                 # Configuration
  ├── middleware.py             # Custom middleware
  ├── dependencies.py           # Dependency injection
  └── routes/
      ├── __init__.py
      ├── health.py             # Health check endpoints
      ├── sensors.py            # Member 1's endpoints (placeholder)
      ├── rooms.py              # Member 2's endpoints (placeholder)
      ├── routes.py             # Member 3's endpoints (placeholder)
      └── system.py             # System endpoints

Main application:
```python
# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from datetime import datetime

app = FastAPI(
    title="PyroNav API",
    version="1.0.0",
    description="Emergency evacuation and fire safety monitoring system"
)

# CORS middleware (allow frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000  # Convert to ms
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log to audit table
    # await log_api_call(request, response, process_time)
    
    return response

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Import routes
from routes import health, sensors, rooms, routes as route_endpoints, system

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(sensors.router, prefix="/api/v1", tags=["sensors"])
app.include_router(rooms.router, prefix="/api/v1", tags=["rooms"])
app.include_router(route_endpoints.router, prefix="/api/v1", tags=["routes"])
app.include_router(system.router, prefix="/api/v1", tags=["system"])

@app.on_startup
async def startup_event():
    print("PyroNav API starting up...")
    # Initialize database connections
    # Start background tasks
    print("API ready")

@app.on_shutdown
async def shutdown_event():
    print("PyroNav API shutting down...")
    # Clean up connections
    print("Shutdown complete")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

**Health check endpoint:**
```python
# routes/health.py
from fastapi import APIRouter, Depends
from datetime import datetime
from database.connection import db_manager

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    System health check
    Returns status of all components
    """
    # Check database
    try:
        db_manager.execute_query("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Check MQTT (coordinate with Member 1)
    # mqtt_status = check_mqtt_connection()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "database": db_status,
            "api": "running",
            # "mqtt": mqtt_status,
            # "websocket": ws_status
        },
        "version": "1.0.0"
    }

@router.get("/health/db")
async def database_health():
    """Detailed database health"""
    try:
        # Count records in key tables
        sensors_count = db_manager.execute_query(
            "SELECT COUNT(*) FROM sensors"
        )[0][0]
        
        readings_count = db_manager.execute_query(
            "SELECT COUNT(*) FROM sensor_readings"
        )[0][0]
        
        rooms_count = db_manager.execute_query(
            "SELECT COUNT(*) FROM rooms"
        )[0][0]
        
        return {
            "status": "connected",
            "statistics": {
                "sensors": sensors_count,
                "readings": readings_count,
                "rooms": rooms_count
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
```

**Week 1 Deliverable:**
- PostgreSQL database set up
- Complete schema deployed
- Migration system working
- FastAPI application running
- Health check endpoints functional

---

## Week 2: Core Integration - Connect Team Members' Services

### Service Integration Layer (60% of week)

**Day 1-2: Create Mock Endpoints for All Team Members**
```
Create placeholder endpoints that return mock data:

This allows frontend development to continue while
backend services are being built.

/backend/api/routes/sensors.py (Member 1's endpoints)
```python
from fastapi import APIRouter
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# Mock data (replace with real queries later)
MOCK_SENSORS = [
    {
        "sensor_id": "SMOKE-OT-01",
        "room_id": "operation_theater",
        "sensor_type": "smoke_heat",
        "status": "active",
        "last_seen_at": datetime.utcnow().isoformat()
    }
]

@router.get("/sensors")
async def get_all_sensors():
    """Get all registered sensors"""
    # TODO: Replace with real database query
    return {"sensors": MOCK_SENSORS}

@router.get("/sensors/{sensor_id}")
async def get_sensor(sensor_id: str):
    """Get specific sensor details"""
    # TODO: Query from database
    return {"sensor_id": sensor_id, "status": "active"}

@router.get("/sensors/{sensor_id}/readings")
async def get_sensor_readings(
    sensor_id: str,
    limit: int = 100,
    from_time: Optional[str] = None
):
    """Get recent readings for a sensor"""
    # TODO: Query sensor_readings table
    return {
        "sensor_id": sensor_id,
        "readings": [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "values": {"smoke": 45, "temperature": 22},
                "units": {"smoke": "ppm", "temperature": "degC"}
            }
        ]
    }
```

**Create similar mock endpoints for Member 2 & 3**

**Day 2-3: API Documentation**
```
Document all endpoints:

/backend/api/API_DOCUMENTATION.md

Use FastAPI's automatic docs:
- Visit http://localhost:8000/docs for Swagger UI
- Visit http://localhost:8000/redoc for ReDoc

Add descriptions to all endpoints:
```python
@router.get(
    "/sensors",
    summary="List all sensors",
    description="Returns a list of all registered sensors in the system",
    response_description="Array of sensor objects with status"
)
```

Export OpenAPI spec:
```bash
# Auto-generated at /openapi.json
curl http://localhost:8000/openapi.json > api-spec.json
```

**Day 3-4: Inter-Service Communication Design**
```
Design how services communicate:

Option 1: Direct Database Access
- Member 2 queries Member 1's sensor_readings table directly
- Pros: Simple, fast
- Cons: Tight coupling

Option 2: HTTP API Calls
- Member 2 calls Member 1's API
- Pros: Loose coupling
- Cons: Network overhead

Option 3: Event Queue (Recommended)
- Use message queue (RabbitMQ, Redis, or Python queue)
- Services publish events, others subscribe
- Pros: Decoupled, scalable
- Cons: More complexity

Recommended approach for prototype:
- Use direct database access for reading
- Use event system for real-time updates

Create event bus:
```python
# events/event_bus.py
from typing import Callable, Dict, List
from dataclasses import dataclass
from datetime import datetime
import asyncio

@dataclass
class Event:
    event_type: str
    data: Dict
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

class EventBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, handler: Callable):
        """Register a handler for an event type"""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
        print(f"Subscribed to {event_type}")
    
    async def publish(self, event: Event):
        """Publish an event to all subscribers"""
        if event.event_type in self.subscribers:
            for handler in self.subscribers[event.event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    print(f"Error in event handler: {e}")
    
    def publish_sync(self, event: Event):
        """Synchronous publish (for non-async contexts)"""
        if event.event_type in self.subscribers:
            for handler in self.subscribers[event.event_type]:
                try:
                    handler(event)
                except Exception as e:
                    print(f"Error in event handler: {e}")

# Global event bus instance
event_bus = EventBus()
```

**Example usage:**
```python
# Member 1 publishes new reading
from events.event_bus import event_bus, Event

event_bus.publish_sync(Event(
    event_type="sensor_reading_received",
    data={
        "sensor_id": "SMOKE-OT-01",
        "room_id": "operation_theater",
        "values": {"smoke": 85, "temperature": 55}
    }
))

# Member 2 subscribes
def handle_new_reading(event: Event):
    reading = event.data
    # Evaluate against thresholds
    # Update room hazard level
    pass

event_bus.subscribe("sensor_reading_received", handle_new_reading)
```

### Database Optimization (40% of week)

**Day 4-5: Performance Tuning**
```
Optimize database:

1. Add indexes (already in schema, verify):
   CREATE INDEX idx_sensor_readings_room_id ON sensor_readings(room_id);
   CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);

2. Create views for common queries:
```sql
-- Latest reading per sensor
CREATE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (sensor_id)
    sensor_id,
    room_id,
    timestamp,
    values,
    units,
    validation_status
FROM sensor_readings
ORDER BY sensor_id, timestamp DESC;

-- Active hazards per room
CREATE VIEW active_hazards_by_room AS
SELECT 
    r.room_id,
    r.name,
    r.current_hazard_level,
    COUNT(he.event_id) as active_event_count
FROM rooms r
LEFT JOIN hazard_events he ON r.room_id = he.room_id AND he.status = 'ACTIVE'
GROUP BY r.room_id, r.name, r.current_hazard_level;
```

3. Connection pooling (already in connection.py)

4. Query optimization helper:
```python
# database/queries.py
class OptimizedQueries:
    @staticmethod
    def get_latest_readings_for_room(room_id: str):
        """Optimized query for room readings"""
        query = """
        SELECT DISTINCT ON (sensor_id)
            sensor_id,
            values,
            units,
            timestamp
        FROM sensor_readings
        WHERE room_id = %s
        ORDER BY sensor_id, timestamp DESC
        """
        return query
    
    @staticmethod
    def get_hazardous_rooms():
        """Get all rooms with active hazards"""
        query = """
        SELECT room_id, current_hazard_level, last_updated_at
        FROM rooms
        WHERE current_hazard_level IN ('WARNING', 'HIGH_RISK', 'CRITICAL')
        """
        return query
```

**Week 2 Deliverable:**
- Mock API endpoints for all team members
- Event bus system working
- Database optimizations applied
- API documentation complete

---

## Week 3: WebSocket Implementation - Real-Time Updates

### WebSocket Server (70% of week)

**Day 1-3: WebSocket Setup**
```
Implement WebSocket server:

Install dependencies:
pip install websockets python-socketio

/backend/websocket/
  ├── server.py                 # WebSocket server
  ├── connection_manager.py     # Manage client connections
  └── event_broadcaster.py      # Broadcast events to clients

WebSocket server implementation:
```python
# websocket/server.py
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import List, Dict
import json
from datetime import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.client_metadata: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_metadata[websocket] = {
            "client_id": client_id,
            "connected_at": datetime.utcnow()
        }
        print(f"Client connected: {client_id}. Total clients: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        if websocket in self.client_metadata:
            del self.client_metadata[websocket]
        print(f"Client disconnected. Total clients: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                dead_connections.append(connection)
        
        # Remove dead connections
        for conn in dead_connections:
            self.disconnect(conn)
    
    async def broadcast_event(self, event_type: str, data: dict):
        """Broadcast structured event"""
        message = {
            "event_type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(message)

# Global connection manager
manager = ConnectionManager()

@router.websocket("/ws/v1/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Handle client messages if needed
            # For now, just echo back
            await manager.send_personal_message(
                {"type": "ack", "message": "Message received"},
                websocket
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Add to main.py
from websocket.server import router as websocket_router
app.include_router(websocket_router)
```

**Day 3-4: Event Broadcasting System**
```
Connect event bus to WebSocket:

/backend/websocket/event_broadcaster.py

```python
from events.event_bus import event_bus, Event
from websocket.server import manager

class EventBroadcaster:
    def __init__(self):
        self.setup_subscriptions()
    
    def setup_subscriptions(self):
        """Subscribe to all relevant events"""
        event_bus.subscribe("sensor_reading_updated", self.on_sensor_reading)
        event_bus.subscribe("room_status_changed", self.on_room_status_changed)
        event_bus.subscribe("hazard_event_created", self.on_hazard_event)
        event_bus.subscribe("notification_created", self.on_notification)
        event_bus.subscribe("route_updated", self.on_route_updated)
    
    async def on_sensor_reading(self, event: Event):
        """Broadcast new sensor reading"""
        await manager.broadcast_event(
            "sensor_reading_updated",
            event.data
        )
    
    async def on_room_status_changed(self, event: Event):
        """Broadcast room hazard level change"""
        await manager.broadcast_event(
            "room_status_changed",
            {
                "room_id": event.data["room_id"],
                "hazard_level": event.data["hazard_level"],
                "previous_level": event.data.get("previous_level")
            }
        )
    
    async def on_hazard_event(self, event: Event):
        """Broadcast new hazard event"""
        await manager.broadcast_event(
            "hazard_event_created",
            event.data
        )
    
    async def on_notification(self, event: Event):
        """Broadcast new notification"""
        await manager.broadcast_event(
            "notification_created",
            event.data
        )
    
    async def on_route_updated(self, event: Event):
        """Broadcast route recalculation"""
        await manager.broadcast_event(
            "route_updated",
            event.data
        )

# Initialize broadcaster
broadcaster = EventBroadcaster()
```

**Add to main.py startup:**
```python
from websocket.event_broadcaster import broadcaster

@app.on_startup
async def startup_event():
    print("Initializing event broadcaster...")
    # Broadcaster is already initialized on import
    print("WebSocket ready")
```

### Testing & Monitoring (30% of week)

**Day 4-5: WebSocket Testing**
```
Create test client:

/backend/tests/test_websocket_client.py

```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/v1/live"
    
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket")
        
        # Listen for events
        try:
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                print(f"Received: {data['event_type']}")
                print(f"Data: {data['data']}")
                print("---")
        except KeyboardInterrupt:
            print("Disconnecting...")

if __name__ == "__main__":
    asyncio.run(test_websocket())
```

Run test:
```bash
python tests/test_websocket_client.py
```

Create monitoring dashboard endpoint:
```python
# routes/system.py
from fastapi import APIRouter
from websocket.server import manager

router = APIRouter()

@router.get("/system/websocket/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "active_connections": len(manager.active_connections),
        "clients": [
            {
                "connected_at": meta["connected_at"].isoformat(),
                "client_id": meta.get("client_id", "unknown")
            }
            for meta in manager.client_metadata.values()
        ]
    }
```

**Week 3 Deliverable:**
- WebSocket server running
- Event broadcasting working
- Frontend can connect and receive updates
- Monitoring endpoints available

---

## Week 4: Integration Testing & Service Coordination

### Cross-Service Integration (60% of week)

**Day 1-2: Replace Mock Endpoints with Real Queries**
```
Update API routes to use real data:

Work with each team member to replace mock endpoints:

Member 1's sensors.py:
```python
from database.connection import db_manager

@router.get("/sensors")
async def get_all_sensors():
    query = """
    SELECT sensor_id, room_id, sensor_type, status, last_seen_at
    FROM sensors
    ORDER BY room_id, sensor_id
    """
    results = db_manager.execute_query(query)
    
    sensors = [
        {
            "sensor_id": row[0],
            "room_id": row[1],
            "sensor_type": row[2],
            "status": row[3],
            "last_seen_at": row[4].isoformat() if row[4] else None
        }
        for row in results
    ]
    
    return {"sensors": sensors}
```

**Do similar for all endpoints**

**Day 2-3: Event Flow Testing**
```
Test complete event flow:

Scenario: New sensor reading triggers cascade

1. Member 1's ingestion writes to sensor_readings
2. Member 1 publishes event: "sensor_reading_received"
3. Member 2's decision engine receives event
4. Member 2 evaluates thresholds
5. Member 2 updates rooms table
6. Member 2 publishes: "room_status_changed"
7. Member 3's pathfinding receives event
8. Member 3 checks if route affected
9. Member 3 recalculates route if needed
10. Member 3 publishes: "route_updated"
11. Your WebSocket broadcasts all events to frontend

Create integration test:
```python
# tests/test_integration.py
import pytest
from events.event_bus import event_bus, Event

def test_sensor_to_decision_flow():
    """Test sensor reading triggers decision engine"""
    events_received = []
    
    def capture_event(event: Event):
        events_received.append(event.event_type)
    
    event_bus.subscribe("room_status_changed", capture_event)
    
    # Simulate sensor reading
    event_bus.publish_sync(Event(
        event_type="sensor_reading_received",
        data={
            "sensor_id": "SMOKE-OT-01",
            "room_id": "operation_theater",
            "values": {"smoke": 120, "temperature": 70}  # Critical values
        }
    ))
    
    # Wait for processing
    import time
    time.sleep(1)
    
    # Verify decision engine responded
    assert "room_status_changed" in events_received
```

**Day 3-4: Error Handling & Resilience**
```
Add robust error handling:

1. Database connection failures:
```python
from database.connection import db_manager
from fastapi import HTTPException

@router.get("/rooms")
async def get_rooms():
    try:
        query = "SELECT * FROM rooms"
        results = db_manager.execute_query(query)
        return {"rooms": format_rooms(results)}
    except psycopg2.OperationalError as e:
        # Database connection failed
        raise HTTPException(
            status_code=503,
            detail="Database unavailable"
        )
    except Exception as e:
        # Other errors
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )
```

2. Service unavailability:
```python
async def call_external_service_with_retry(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = await http_client.get(url)
            return response
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

3. WebSocket disconnection handling:
Already implemented in connection_manager

### Load Testing (40% of week)

**Day 4-5: Performance Testing**
```
Test system under load:

Install locust:
pip install locust

Create load test:
```python
# tests/locustfile.py
from locust import HttpUser, task, between

class PyroNavUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def get_rooms(self):
        self.client.get("/api/v1/rooms")
    
    @task(2)
    def get_sensors(self):
        self.client.get("/api/v1/sensors")
    
    @task(1)
    def calculate_route(self):
        self.client.post("/api/v1/routes/calculate", json={
            "origin_room_id": "reception",
            "algorithm": "dijkstra"
        })
    
    @task(1)
    def get_notifications(self):
        self.client.get("/api/v1/notifications")

# Run with:
# locust -f tests/locustfile.py --host=http://localhost:8000
```

Monitor:
- Response times
- Error rates
- Database connection pool usage
- WebSocket connection count

Optimize based on results

**Week 4 Deliverable:**
- All mock endpoints replaced with real data
- End-to-end event flow working
- Error handling robust
- Load testing completed

---

## Week 5-6: Polish, Documentation & Deployment

### System Monitoring (Week 5, 40%)

**Day 1-2: Logging System**
```
Implement comprehensive logging:

/backend/logging/logger.py

```python
import logging
from logging.handlers import RotatingFileHandler
from database.connection import db_manager

class DatabaseLogHandler(logging.Handler):
    def emit(self, record):
        """Write log to database"""
        try:
            query = """
            INSERT INTO system_logs (level, component, message, metadata)
            VALUES (%s, %s, %s, %s)
            """
            db_manager.execute_query(query, (
                record.levelname,
                record.name,
                record.getMessage(),
                {"extra": getattr(record, 'extra', {})}
            ))
        except Exception:
            pass  # Don't fail on logging errors

def setup_logging():
    # File handler
    file_handler = RotatingFileHandler(
        'logs/pyronav.log',
        maxBytes=10*1024*1024,  # 10 MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    
    # Database handler
    db_handler = DatabaseLogHandler()
    db_handler.setLevel(logging.WARNING)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    
    # Format
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # Root logger
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    logger.addHandler(db_handler)
    logger.addHandler(console_handler)
    
    return logger

# Initialize
logger = setup_logging()
```

Use throughout application:
```python
import logging
logger = logging.getLogger(__name__)

logger.info("Processing sensor reading")
logger.warning("Stale sensor detected")
logger.error("Database connection failed")
```

**Day 2-3: System Dashboard Endpoints**
```
Create admin/monitoring endpoints:

```python
# routes/system.py
@router.get("/system/stats")
async def system_statistics():
    """Overall system statistics"""
    return {
        "database": {
            "sensors": await count_table("sensors"),
            "readings_24h": await count_recent_readings(24),
            "active_hazards": await count_active_hazards()
        },
        "websocket": {
            "connected_clients": len(manager.active_connections)
        },
        "api": {
            "uptime_hours": get_uptime_hours(),
            "requests_per_minute": calculate_rpm()
        }
    }

@router.get("/system/logs")
async def recent_logs(limit: int = 100, level: str = None):
    """Get recent system logs"""
    query = "SELECT * FROM system_logs"
    if level:
        query += f" WHERE level = '{level}'"
    query += f" ORDER BY timestamp DESC LIMIT {limit}"
    
    logs = db_manager.execute_query(query)
    return {"logs": format_logs(logs)}
```

### Documentation (Week 5-6, 60%)

**Complete Documentation Package:**

1. **README.md** (Project root)
```markdown
# PyroNav - Emergency Evacuation System

## Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL 15+
- Node.js 16+

### Setup
1. Clone repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   cd frontend && npm install
   ```
3. Initialize database:
   ```bash
   python backend/database/migrations/migrate.py
   ```
4. Start services:
   ```bash
   # Terminal 1: API
   cd backend/api
   uvicorn main:app --reload

   # Terminal 2: Frontend
   cd frontend
   npm start
   ```

### Architecture
[Diagram showing all components]

### Team Members
- Member 1: 3D Building Model + MQTT Ingestion
- Member 2: 2D Heatmap + Decision Engine
- Member 3: 2D Routes + Pathfinding
- Member 4: Backend Integration + WebSocket
```

2. **DEPLOYMENT.md**
```markdown
# Deployment Guide

## Local Development
[Instructions above]

## Production Deployment

### Database
```bash
# Production PostgreSQL setup
# Connection pooling configuration
# Backup strategy
```

### API Server
```bash
# Using gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.api.main:app
```

### Environment Variables
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pyronav_db
DB_USER=pyronav_user
DB_PASSWORD=your_secure_password
MQTT_BROKER=localhost
MQTT_PORT=1883
```

### Docker Compose (Optional)
[Docker compose file]
```

3. **API_COMPLETE_REFERENCE.md**
- All endpoints documented
- Request/response examples
- Error codes
- Rate limiting (if applicable)

4. **ARCHITECTURE.md**
- System diagram
- Component responsibilities
- Data flow
- Event flow
- Database schema diagram

5. **TESTING.md**
- Unit test instructions
- Integration test scenarios
- Load testing procedure
- Test coverage reports

**Demo Preparation (Week 6)**
```
Prepare comprehensive demo:

1. System Status Dashboard (1 min)
   - Show all components healthy
   - Show database statistics
   - Show WebSocket connections

2. Data Flow Demo (3 min)
   - Start simulator
   - Show sensor readings appear
   - Show decision engine classifying
   - Show route updates

3. Resilience Demo (2 min)
   - Stop database briefly
   - Show graceful error handling
   - Show recovery when database returns

4. Performance Demo (1 min)
   - Show response times
   - Show WebSocket broadcasting to multiple clients
   - Show system under load

5. Monitoring Demo (1 min)
   - Show logs
   - Show audit trail
   - Show system statistics
```

**Week 5-6 Deliverable:**
- Complete logging system
- Monitoring dashboards
- Full documentation package
- Deployment guide
- Demo preparation complete

---

## Key Deliverables Summary

### Infrastructure Deliverables:
✅ PostgreSQL database with complete schema  
✅ Database migration system  
✅ Connection pooling and optimization  
✅ FastAPI application framework  
✅ CORS and middleware configuration  
✅ Health check endpoints  

### Integration Deliverables:
✅ Event bus system  
✅ Inter-service communication  
✅ API endpoints for all team members  
✅ Error handling and resilience  

### Real-Time Deliverables:
✅ WebSocket server implementation  
✅ Connection management  
✅ Event broadcasting system  
✅ Live updates to frontend  

### Monitoring & Operations:
✅ Logging system (file + database)  
✅ System statistics endpoints  
✅ Performance monitoring  
✅ Load testing  

### Documentation:
✅ API documentation  
✅ Architecture documentation  
✅ Deployment guide  
✅ Testing guide  

---

## Coordinate With Team

### Member 1 (MQTT/Sensors):
- Provide database connection for sensor_readings table
- Subscribe to sensor events for WebSocket broadcasting
- Test MQTT → Database → WebSocket flow

### Member 2 (Decision Engine):
- Provide database connection for rooms, events, notifications
- Integrate event publishing into decision logic
- Test Decision Engine → WebSocket flow

### Member 3 (Pathfinding):
- Provide database connection for graph tables
- Integrate route calculation with event system
- Test Pathfinding → WebSocket flow

---

## Quick Start Commands

### Start Database
```bash
docker run --name pyronav-db -e POSTGRES_PASSWORD=pyronav123 -p 5432:5432 -d postgres:15
```

### Run Migrations
```bash
cd backend/database
python migrations/migrate.py
```

### Start API
```bash
cd backend/api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Test WebSocket
```bash
cd backend/tests
python test_websocket_client.py
```

### Run Load Tests
```bash
locust -f tests/locustfile.py --host=http://localhost:8000
```

---

## Resources

### FastAPI:
- Documentation: https://fastapi.tiangolo.com/
- WebSocket guide: https://fastapi.tiangolo.com/advanced/websockets/

### PostgreSQL:
- Documentation: https://www.postgresql.org/docs/
- Performance tuning: https://wiki.postgresql.org/wiki/Performance_Optimization

### WebSocket:
- Python websockets: https://websockets.readthedocs.io/
- Testing: https://pypi.org/project/websocket-client/

---

**Good luck! You're the glue that holds everything together!**
