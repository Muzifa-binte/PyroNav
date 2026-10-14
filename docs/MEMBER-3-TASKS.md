# Member 3: 2D Evacuation Routes + Pathfinding Engine

**Your Role:** You own the 2D evacuation route visualization and the pathfinding/routing logic (Dijkstra & BFS).

**Tech Stack:**
- Frontend: React + Canvas/SVG for 2D route display
- Backend: Python + FastAPI
- Database: PostgreSQL (building graph, routes)
- Algorithms: Dijkstra's algorithm, BFS

---

## Week 0: Setup & Contracts (Work with all team members)

### Shared Team Tasks (1-2 days)
- [ ] Clone/create project repository
- [ ] Review SRS.md and Technical Specification.md
- [ ] Set up shared contracts folder: `/shared-contracts/`
- [ ] Define building graph structure (nodes, edges)
- [ ] Define route result format
- [ ] Define exit markers and availability
- [ ] Create mock data files for team use
- [ ] Set up development environment (Node.js, Python, PostgreSQL)

### Your Specific Setup
- [ ] Install React and visualization libraries
- [ ] Install Python graph libraries (optional: NetworkX for testing)
- [ ] Review Dijkstra and BFS algorithms
- [ ] Study graph data structures

---

## Week 1: Foundation - 2D Route Display + Graph Design

### Frontend: 2D Route Visualization (60% of week)

**Day 1-2: Basic 2D Map Setup**
```
Create:
- 2D Canvas or SVG renderer for building layout
- Load building from JSON (use Member 1's sample)
- Display rooms, corridors, and exits
- Pan and zoom functionality
- Layer system (background, route overlay, markers)

Use sample building data:
/shared-contracts/mock-data/sample-building.json
```

**Files to create:**
```
/frontend/src/components/
  ├── EvacuationMap2D.jsx       # Main route display component
  ├── RouteOverlay.jsx          # Draw route path on top of map
  ├── ExitMarker.jsx            # Exit icon/marker component
  └── RouteControlPanel.jsx     # Route calculation controls
```

**Day 2-3: Exit Markers and Visual Elements**
```
Implement:

1. Exit markers:
   - Distinct icon/symbol (door with arrow)
   - Green for available exits
   - Red/gray for blocked exits
   - Exit label (e.g., "EXIT A")
   - Animated indicator for recommended exit

2. Visual distinction for areas:
   - Normal rooms: light background
   - Hazardous rooms: red overlay/hatching
   - Blocked corridors: red X or barrier icon
   - Safe route: green/blue path with arrow
```

**Day 3-4: Route Path Rendering**
```
Create route visualization:

Path rendering:
- Smooth line connecting rooms
- Animated arrow showing direction
- Thickness indicates main route
- Color coding:
  - GREEN: Safe, recommended route
  - YELLOW: Caution, acceptable route
  - RED: Blocked/unsafe (crossed out)

Features:
- Start point marker (person icon)
- End point marker (exit icon)
- Step-by-step waypoints
- Distance/cost display
- Animated path drawing (line grows from start to exit)

Mock route data:
{
  "route_id": "route-001",
  "origin_node_id": "reception",
  "exit_id": "EXIT-A",
  "node_ids": ["reception", "corridor_1", "junction_2", "EXIT-A"],
  "edge_ids": ["EDGE-01", "EDGE-07", "EDGE-11"],
  "total_cost": 24.5,
  "status": "ROUTE_FOUND"
}
```

**Day 4-5: Route Status Display**
```
Create status panel:

Show:
- "Route Status: ROUTE FOUND" with icon
- Current origin: "Reception"
- Destination exit: "EXIT A"
- Total distance: "24.5 meters"
- Algorithm used: "Dijkstra"
- Last calculated: timestamp
- Warning messages if applicable

Handle all statuses:
- ROUTE_FOUND: Show route
- NO_VALID_ROUTE: Big warning message
- RECALCULATION_PENDING: Loading spinner
- NO_AVAILABLE_EXIT: Critical alert

Mock different statuses for testing
```

### Backend: Graph Data Structure Design (40% of week)

**Day 5: Define Building Graph Schema**
```
Design graph representation:

Graph structure:
- Nodes: rooms, corridor junctions, exits
- Edges: connections with costs (distance/travel time)
- Each node has position for rendering
- Each edge has traversability status

Create specification document:
/backend/pathfinding/GRAPH_SPEC.md

Example graph data structure:
{
  "nodes": [
    {
      "node_id": "reception",
      "node_type": "room",
      "room_id": "reception",
      "position": {"x": 0, "y": 0},
      "traversable": true
    },
    {
      "node_id": "EXIT-A",
      "node_type": "exit",
      "position": {"x": 50, "y": 0},
      "available": true
    }
  ],
  "edges": [
    {
      "edge_id": "EDGE-01",
      "from_node": "reception",
      "to_node": "corridor_1",
      "cost": 5.0,
      "bidirectional": true,
      "traversable": true
    }
  ]
}

Coordinate with Member 1:
- Ensure building JSON can be converted to graph
- Define how connections become edges
- Define how to calculate edge costs (distance)
```

**Week 1 Deliverable:**
- 2D map displaying building with exits
- Mock route rendering
- Route status panel
- Graph data structure specification

---

## Week 2: Core Implementation - Pathfinding Algorithms

### Backend: Graph Implementation (80% of week)

**Day 1-2: Database Schema**
```
Create PostgreSQL tables:

Table: building_nodes
- node_id (PRIMARY KEY)
- node_type (enum: room, junction, exit)
- room_id (nullable, FOREIGN KEY to rooms)
- position (JSONB: {x, y, z})
- traversable (boolean)
- metadata (JSONB: additional info)

Table: building_edges
- edge_id (PRIMARY KEY)
- from_node_id (FOREIGN KEY)
- to_node_id (FOREIGN KEY)
- cost (float: distance or travel time)
- bidirectional (boolean)
- traversable (boolean)
- metadata (JSONB)

Table: exits
- exit_id (PRIMARY KEY)
- node_id (FOREIGN KEY)
- name (e.g., "EXIT A")
- position (JSONB)
- available (boolean)
- capacity (int, optional)

Table: route_results
- route_id (PRIMARY KEY, UUID)
- origin_node_id
- exit_id
- node_ids (ARRAY of strings)
- edge_ids (ARRAY of strings)
- total_cost (float)
- algorithm (enum: dijkstra, bfs)
- status (enum: ROUTE_FOUND, NO_VALID_ROUTE, etc.)
- calculated_at
- hazard_state_snapshot (JSONB: rooms that were hazardous)
```

**SQL file location:**
```
/backend/database/migrations/
  └── 003_create_pathfinding_tables.sql
```

**Day 2-4: Dijkstra's Algorithm Implementation**
```
Implement Dijkstra pathfinding:

/backend/pathfinding/
  ├── dijkstra.py               # Dijkstra implementation
  ├── bfs.py                    # BFS implementation
  ├── graph_loader.py           # Load graph from database
  ├── route_calculator.py       # Main interface
  └── safety_constraints.py     # Apply hazard rules to graph

Key implementation:
```python
# dijkstra.py
import heapq
from typing import Dict, List, Set, Optional, Tuple

class DijkstraPathfinder:
    def __init__(self, graph):
        """
        graph = {
            'nodes': {node_id: {'position': {...}, 'traversable': bool}},
            'edges': {
                from_node: [
                    {'to': to_node, 'cost': float, 'traversable': bool}
                ]
            }
        }
        """
        self.graph = graph
    
    def find_shortest_path(
        self, 
        start_node: str, 
        end_node: str,
        blocked_nodes: Set[str] = None
    ) -> Tuple[List[str], float]:
        """
        Returns (path, total_cost) or (None, float('inf')) if no path
        """
        if blocked_nodes is None:
            blocked_nodes = set()
        
        # Priority queue: (cost, node, path)
        queue = [(0, start_node, [start_node])]
        visited = set()
        costs = {start_node: 0}
        
        while queue:
            current_cost, current_node, path = heapq.heappop(queue)
            
            if current_node in visited:
                continue
            
            visited.add(current_node)
            
            # Found destination
            if current_node == end_node:
                return path, current_cost
            
            # Explore neighbors
            neighbors = self.graph['edges'].get(current_node, [])
            for edge in neighbors:
                neighbor = edge['to']
                edge_cost = edge['cost']
                
                # Skip blocked or non-traversable nodes/edges
                if (neighbor in blocked_nodes or 
                    not edge['traversable'] or
                    not self.graph['nodes'][neighbor]['traversable']):
                    continue
                
                new_cost = current_cost + edge_cost
                
                if neighbor not in costs or new_cost < costs[neighbor]:
                    costs[neighbor] = new_cost
                    new_path = path + [neighbor]
                    heapq.heappush(queue, (new_cost, neighbor, new_path))
        
        # No path found
        return None, float('inf')
    
    def find_best_exit(
        self,
        start_node: str,
        available_exits: List[str],
        blocked_nodes: Set[str] = None
    ) -> Tuple[Optional[str], List[str], float]:
        """
        Find nearest available exit
        Returns (exit_id, path, cost) or (None, None, inf)
        """
        best_exit = None
        best_path = None
        best_cost = float('inf')
        
        for exit_node in available_exits:
            path, cost = self.find_shortest_path(
                start_node, 
                exit_node, 
                blocked_nodes
            )
            
            if path and cost < best_cost:
                best_exit = exit_node
                best_path = path
                best_cost = cost
        
        return best_exit, best_path, best_cost
```

**Test Dijkstra:**
```python
# Test with simple graph
graph = {
    'nodes': {
        'A': {'traversable': True},
        'B': {'traversable': True},
        'C': {'traversable': True},
        'EXIT': {'traversable': True}
    },
    'edges': {
        'A': [{'to': 'B', 'cost': 5, 'traversable': True}],
        'B': [{'to': 'C', 'cost': 3, 'traversable': True}],
        'C': [{'to': 'EXIT', 'cost': 2, 'traversable': True}]
    }
}

pathfinder = DijkstraPathfinder(graph)
path, cost = pathfinder.find_shortest_path('A', 'EXIT')
# Expected: (['A', 'B', 'C', 'EXIT'], 10)
```

**Day 4-5: BFS Implementation**
```
Implement BFS for unweighted graphs:

```python
# bfs.py
from collections import deque
from typing import List, Set, Optional

class BFSPathfinder:
    def __init__(self, graph):
        self.graph = graph
    
    def find_shortest_path(
        self,
        start_node: str,
        end_node: str,
        blocked_nodes: Set[str] = None
    ) -> Optional[List[str]]:
        """
        BFS for minimum edge count path
        Returns path or None
        """
        if blocked_nodes is None:
            blocked_nodes = set()
        
        queue = deque([(start_node, [start_node])])
        visited = set([start_node])
        
        while queue:
            current_node, path = queue.popleft()
            
            if current_node == end_node:
                return path
            
            neighbors = self.graph['edges'].get(current_node, [])
            for edge in neighbors:
                neighbor = edge['to']
                
                if (neighbor not in visited and
                    neighbor not in blocked_nodes and
                    edge['traversable'] and
                    self.graph['nodes'][neighbor]['traversable']):
                    
                    visited.add(neighbor)
                    new_path = path + [neighbor]
                    queue.append((neighbor, new_path))
        
        return None  # No path found
```

### Backend: Safety Constraints (20% of week)

**Day 5: Hazard-Aware Routing**
```
Implement safety constraints:

/backend/pathfinding/safety_constraints.py

```python
class SafetyConstraintApplier:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def get_hazardous_rooms(self, min_severity='WARNING'):
        """
        Query Member 2's rooms table for hazards
        Returns set of room_ids that are hazardous
        """
        query = """
            SELECT room_id, current_hazard_level
            FROM rooms
            WHERE current_hazard_level IN ('WARNING', 'HIGH_RISK', 'CRITICAL')
        """
        # If min_severity='HIGH_RISK', only return HIGH_RISK and CRITICAL
        
        results = self.db.execute(query).fetchall()
        return {row['room_id'] for row in results}
    
    def apply_safety_policy(self, graph, policy='BLOCK_CRITICAL'):
        """
        Modify graph based on hazard policy
        
        Policies:
        - BLOCK_CRITICAL: Block rooms with CRITICAL hazard
        - BLOCK_HIGH_AND_ABOVE: Block HIGH_RISK and CRITICAL
        - PENALIZE: Increase cost for hazardous rooms (don't block)
        """
        if policy == 'BLOCK_CRITICAL':
            blocked_rooms = self.get_rooms_by_level(['CRITICAL'])
        elif policy == 'BLOCK_HIGH_AND_ABOVE':
            blocked_rooms = self.get_rooms_by_level(['HIGH_RISK', 'CRITICAL'])
        
        # Mark nodes as non-traversable
        for node_id, node_data in graph['nodes'].items():
            if node_data.get('room_id') in blocked_rooms:
                node_data['traversable'] = False
        
        return blocked_rooms
    
    def get_rooms_by_level(self, levels: List[str]) -> Set[str]:
        query = f"""
            SELECT room_id
            FROM rooms
            WHERE current_hazard_level IN ({','.join(['%s']*len(levels))})
        """
        results = self.db.execute(query, levels).fetchall()
        return {row['room_id'] for row in results}
```

**Week 2 Deliverable:**
- Dijkstra algorithm working
- BFS algorithm working
- Graph loading from database
- Safety constraints applied to routing

---

## Week 3: Integration - Route Calculation Service

### Backend: Route Calculation Service (70% of week)

**Day 1-2: Main Route Calculator Interface**
```
Create unified route calculation service:

/backend/pathfinding/route_calculator.py

```python
from typing import Dict, Optional
from datetime import datetime
import uuid

class RouteCalculator:
    def __init__(self, db_connection, safety_policy='BLOCK_CRITICAL'):
        self.db = db_connection
        self.safety_policy = safety_policy
        self.graph_loader = GraphLoader(db_connection)
        self.safety_applier = SafetyConstraintApplier(db_connection)
    
    def calculate_route(
        self,
        origin_room_id: str,
        algorithm: str = 'dijkstra',
        target_exit_id: Optional[str] = None
    ) -> Dict:
        """
        Main entry point for route calculation
        
        Returns route result dict
        """
        # 1. Load building graph from database
        graph = self.graph_loader.load_graph()
        
        # 2. Apply safety constraints
        blocked_rooms = self.safety_applier.apply_safety_policy(
            graph, 
            self.safety_policy
        )
        
        # 3. Get available exits
        available_exits = self.get_available_exits()
        
        if not available_exits:
            return self.create_result(
                origin_room_id,
                None,
                status='NO_AVAILABLE_EXIT'
            )
        
        # 4. Convert room_id to node_id
        origin_node = self.get_node_for_room(origin_room_id)
        
        # 5. Calculate route
        if algorithm == 'dijkstra':
            pathfinder = DijkstraPathfinder(graph)
            exit_id, path, cost = pathfinder.find_best_exit(
                origin_node,
                available_exits,
                blocked_nodes=self.get_blocked_nodes(graph)
            )
        elif algorithm == 'bfs':
            pathfinder = BFSPathfinder(graph)
            # BFS doesn't return cost, use edge count
            exit_id, path = self.find_best_exit_bfs(
                origin_node,
                available_exits,
                pathfinder,
                graph
            )
            cost = len(path) - 1 if path else float('inf')
        
        # 6. Check if route found
        if not path:
            return self.create_result(
                origin_room_id,
                None,
                status='NO_VALID_ROUTE'
            )
        
        # 7. Extract edge IDs from path
        edge_ids = self.get_edge_ids_from_path(path, graph)
        
        # 8. Create result
        result = self.create_result(
            origin_room_id,
            exit_id,
            node_ids=path,
            edge_ids=edge_ids,
            cost=cost,
            algorithm=algorithm,
            status='ROUTE_FOUND',
            blocked_rooms=blocked_rooms
        )
        
        # 9. Save to database
        self.save_route_result(result)
        
        return result
    
    def create_result(self, origin, exit_id, **kwargs):
        return {
            'route_id': str(uuid.uuid4()),
            'origin_node_id': origin,
            'exit_id': exit_id,
            'node_ids': kwargs.get('node_ids'),
            'edge_ids': kwargs.get('edge_ids'),
            'total_cost': kwargs.get('cost'),
            'algorithm': kwargs.get('algorithm', 'dijkstra'),
            'status': kwargs.get('status', 'ROUTE_FOUND'),
            'calculated_at': datetime.utcnow().isoformat(),
            'hazard_state_snapshot': kwargs.get('blocked_rooms', [])
        }
    
    def get_available_exits(self) -> List[str]:
        query = "SELECT node_id FROM exits WHERE available = TRUE"
        results = self.db.execute(query).fetchall()
        return [row['node_id'] for row in results]
    
    def get_blocked_nodes(self, graph) -> Set[str]:
        blocked = set()
        for node_id, node_data in graph['nodes'].items():
            if not node_data['traversable']:
                blocked.add(node_id)
        return blocked
```

**Day 2-3: Graph Loader from Database**
```
Implement graph loading:

```python
# graph_loader.py
class GraphLoader:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def load_graph(self) -> Dict:
        """
        Load graph from building_nodes and building_edges tables
        """
        # Load nodes
        nodes_query = """
            SELECT node_id, node_type, room_id, position, traversable
            FROM building_nodes
        """
        nodes_data = self.db.execute(nodes_query).fetchall()
        
        nodes = {}
        for row in nodes_data:
            nodes[row['node_id']] = {
                'node_type': row['node_type'],
                'room_id': row['room_id'],
                'position': row['position'],
                'traversable': row['traversable']
            }
        
        # Load edges
        edges_query = """
            SELECT edge_id, from_node_id, to_node_id, cost, 
                   bidirectional, traversable
            FROM building_edges
        """
        edges_data = self.db.execute(edges_query).fetchall()
        
        edges = {}
        for row in edges_data:
            from_node = row['from_node_id']
            to_node = row['to_node_id']
            
            if from_node not in edges:
                edges[from_node] = []
            
            edges[from_node].append({
                'edge_id': row['edge_id'],
                'to': to_node,
                'cost': row['cost'],
                'traversable': row['traversable']
            })
            
            # Add reverse edge if bidirectional
            if row['bidirectional']:
                if to_node not in edges:
                    edges[to_node] = []
                
                edges[to_node].append({
                    'edge_id': row['edge_id'] + '_reverse',
                    'to': from_node,
                    'cost': row['cost'],
                    'traversable': row['traversable']
                })
        
        return {'nodes': nodes, 'edges': edges}
```

**Day 3-4: REST API Endpoints**
```
Create FastAPI routes:

/backend/api/routes/routes.py

GET /api/v1/building
Response:
{
  "nodes": [...],
  "edges": [...],
  "exits": [...]
}

POST /api/v1/routes/calculate
Request body:
{
  "origin_room_id": "reception",
  "algorithm": "dijkstra",  // or "bfs"
  "target_exit_id": null    // null = find best exit
}
Response:
{
  "route_id": "...",
  "origin_node_id": "reception",
  "exit_id": "EXIT-A",
  "node_ids": ["reception", "corridor_1", "EXIT-A"],
  "edge_ids": ["EDGE-01", "EDGE-07"],
  "total_cost": 12.5,
  "algorithm": "dijkstra",
  "status": "ROUTE_FOUND",
  "calculated_at": "2026-10-12T10:30:00Z"
}

GET /api/v1/routes/current
Returns most recent calculated route

GET /api/v1/routes/{route_id}
Returns specific route by ID

GET /api/v1/exits
Returns all exits with availability status
```

**Day 4-5: Database Population Script**
```
Create script to convert building JSON to graph:

/backend/pathfinding/import_building.py

Read Member 1's building-config.json and:
1. Create nodes for each room
2. Create nodes for exits
3. Create nodes for corridor junctions if needed
4. Create edges for connections
5. Calculate edge costs (Euclidean distance between positions)
6. Insert into database

Run this script when Member 1 provides building JSON
```

### Frontend: Connect to Route API (30% of week)

**Day 5: API Integration**
```
Connect frontend to backend:

```javascript
// services/routeService.js
export const calculateRoute = async (originRoomId, algorithm = 'dijkstra') => {
  const response = await fetch('http://localhost:8003/api/v1/routes/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin_room_id: originRoomId,
      algorithm: algorithm
    })
  });
  return response.json();
};

export const getCurrentRoute = async () => {
  const response = await fetch('http://localhost:8003/api/v1/routes/current');
  return response.json();
};
```

Update EvacuationMap2D.jsx:
```javascript
useEffect(() => {
  // Load building and initial route
  loadBuilding();
  loadCurrentRoute();
  
  // Poll for route updates every 5 seconds (temporary)
  const interval = setInterval(loadCurrentRoute, 5000);
  return () => clearInterval(interval);
}, []);

const loadCurrentRoute = async () => {
  const route = await getCurrentRoute();
  if (route) {
    setRoute(route);
    renderRoute(route);
  }
};
```

**Week 3 Deliverable:**
- Complete route calculation service
- Graph imported from building JSON
- REST API endpoints working
- Frontend displaying real calculated routes

---

## Week 4: Real-Time Recalculation + WebSocket

### Backend: Route Recalculation Logic (50% of week)

**Day 1-2: Automatic Route Invalidation**
```
Create route monitor service:

/backend/pathfinding/route_monitor.py

Purpose: Listen for hazard changes and recalculate if needed

```python
class RouteMonitor:
    def __init__(self, db_connection):
        self.db = db_connection
        self.calculator = RouteCalculator(db_connection)
        self.current_route = None
    
    def on_room_hazard_changed(self, room_id, new_hazard_level):
        """
        Called when Member 2's Decision Engine updates room hazard
        This will be triggered by Member 4's event system
        """
        if not self.current_route:
            return
        
        # Check if hazardous room affects current route
        if self.route_affected_by_hazard(room_id, new_hazard_level):
            print(f"Route affected by hazard in {room_id}, recalculating...")
            self.recalculate_route()
    
    def route_affected_by_hazard(self, room_id, hazard_level) -> bool:
        """
        Check if room is on current route and hazard is serious
        """
        if hazard_level not in ['HIGH_RISK', 'CRITICAL']:
            return False
        
        # Check if room is in current route
        route_room_ids = self.get_rooms_from_route(self.current_route)
        return room_id in route_room_ids
    
    def recalculate_route(self):
        """
        Recalculate route using same origin
        """
        origin = self.current_route['origin_node_id']
        new_route = self.calculator.calculate_route(origin)
        self.current_route = new_route
        
        # Publish route update (Member 4 forwards to WebSocket)
        self.publish_route_updated(new_route)
    
    def publish_route_updated(self, route):
        """
        Send to Member 4's WebSocket service
        """
        event = {
            'event_type': 'route_updated',
            'route': route,
            'timestamp': datetime.utcnow().isoformat()
        }
        # Send to Member 4
```

**Day 2-3: Coordinate with Member 2 & 4**
```
Integration work:

1. When Member 2 updates room hazard:
   → Member 2 publishes event
   → Member 4 receives and broadcasts
   → Your RouteMonitor receives event
   → Recalculate if needed
   → Publish new route back to Member 4

2. Define event contract:
Event from Member 2:
{
  "event_type": "room_status_changed",
  "room_id": "operation_theater",
  "hazard_level": "CRITICAL"
}

Event to Member 4:
{
  "event_type": "route_updated",
  "route": {...},
  "reason": "hazard_change"
}

Document this integration
```

**Day 3-4: Performance Optimization**
```
Optimize route calculation:

1. Cache graph in memory (don't reload from DB every time)
2. Invalidate graph cache when building changes
3. Pre-compute common routes (optional)
4. Limit recalculation frequency (debounce rapid changes)
5. Add timeout for pathfinding (max 2 seconds)

Add monitoring:
- Log calculation time
- Log cache hit/miss
- Alert if calculation takes > 1 second
```

### Frontend: WebSocket for Route Updates (50% of week)

**Day 4-5: Real-Time Route Display**
```
Integrate with WebSocket:

```javascript
// EvacuationMap2D.jsx
useEffect(() => {
  // Initial route load
  loadCurrentRoute();
  
  // Listen for route updates via WebSocket (Member 4's service)
  websocket.on('route_updated', (data) => {
    console.log('Route updated:', data.route);
    setRoute(data.route);
    animateRouteChange(data.route);
  });
  
  websocket.connect();
  
  return () => websocket.disconnect();
}, []);

const animateRouteChange = (newRoute) => {
  // Fade out old route
  // Fade in new route with animation
  // Show "Route recalculated" toast notification
  // Highlight new exit if changed
};
```

Add visual feedback:
```javascript
// Show route recalculation indicator
if (route.status === 'RECALCULATION_PENDING') {
  return <div className="loading">Recalculating route...</div>;
}

// Animate path changes
const RouteOverlay = ({ route, previousRoute }) => {
  // Compare routes
  // Highlight changed segments
  // Pulse animation on new route
};
```

**Week 4 Deliverable:**
- Automatic route recalculation working
- WebSocket integration complete
- Animated route updates
- Performance optimized

---

## Week 5-6: Testing, Polish & Documentation

### Testing (Week 5)

**Day 1-2: Algorithm Verification**
```
Create comprehensive tests:

/backend/tests/test_dijkstra.py
/backend/tests/test_bfs.py

Test cases:
1. Simple path (A → B → C)
2. Multiple path options (choose shortest)
3. Blocked node (find alternate path)
4. No path available
5. All exits blocked
6. Bidirectional edges
7. Zero-cost edges
8. Large graph (100+ nodes)

Verify correctness:
- Dijkstra returns minimum cost path
- BFS returns minimum edge count path
- Blocked nodes are avoided
- No invalid paths returned
```

**Day 2-3: Integration Testing**
```
Test complete workflow:

Scenario 1: Normal routing
1. Start with all rooms NORMAL
2. Calculate route from reception to exit
3. Verify route is shortest path

Scenario 2: Single hazard
1. Set one room to CRITICAL
2. Verify room is blocked
3. Verify route avoids that room

Scenario 3: Route invalidation
1. Calculate route
2. Make room on route CRITICAL
3. Verify route recalculates
4. Verify new route avoids hazard

Scenario 4: No valid route
1. Block all paths to exits
2. Verify status = NO_VALID_ROUTE
3. Verify UI shows warning

Scenario 5: Exit unavailable
1. Mark all exits unavailable
2. Verify status = NO_AVAILABLE_EXIT
3. Verify UI shows critical alert

Create test report document
```

**Day 3-4: UI/UX Polish**
```
Frontend improvements:

1. Route comparison mode:
   - Show multiple route options
   - Display Dijkstra vs BFS results
   - Let user see different algorithms

2. Interactive features:
   - Click any room to calculate route from there
   - Select specific exit as target
   - Toggle algorithm (Dijkstra/BFS)

3. Enhanced visualization:
   - Show room-by-room directions ("Turn left at...")
   - Distance markers along route
   - Estimated evacuation time
   - Alternative exits if primary blocked

4. Accessibility:
   - Text-based route directions
   - High contrast mode
   - Keyboard navigation
```

**Day 4-5: Coordinate with Team**
```
Full system integration:

Work with all team members:
1. Member 1's simulator running
2. Member 2's decision engine classifying hazards
3. Your pathfinding responding to hazards
4. Member 4's WebSocket broadcasting updates

Test complete scenario:
- Normal building state
- Fire starts in room
- Member 2 detects hazard
- Your route recalculates
- All dashboards update

Fix any integration issues
```

### Documentation (Week 6)

**Documentation Tasks:**
```
Create comprehensive docs:

1. /backend/pathfinding/README.md
   - Architecture overview
   - Algorithm explanations
   - Graph structure
   - Safety policies

2. /backend/pathfinding/ALGORITHMS.md
   - Dijkstra vs BFS comparison
   - When to use each
   - Performance characteristics
   - Example calculations

3. /backend/pathfinding/GRAPH_BUILDING.md
   - How to create graph from building JSON
   - Node and edge definitions
   - Cost calculation methods

4. /frontend/ROUTE_VISUALIZATION.md
   - Component architecture
   - Rendering approach
   - Animation system

5. API_REFERENCE.md
   - All pathfinding endpoints
   - Request/response examples
   - Error handling

6. TESTING_PATHFINDING.md
   - Test scenarios
   - Expected results
   - Manual testing procedures
```

**Demo Preparation:**
```
Prepare demonstrations:

Demo 1: Algorithm Comparison (2 minutes)
- Show same building, same start point
- Calculate with Dijkstra (shows distance-optimal)
- Calculate with BFS (shows edge-count-optimal)
- Explain difference

Demo 2: Hazard Avoidance (3 minutes)
- Show initial route
- Trigger fire on route
- Show automatic recalculation
- Highlight alternate path

Demo 3: No Valid Route (1 minute)
- Block all exits
- Show clear warning message
- Explain system behavior

Demo 4: Complex Building (2 minutes)
- Large building with many rooms
- Multiple simultaneous hazards
- Show optimal safe route

Practice timing and transitions
```

---

## Key Deliverables Summary

### Frontend Deliverables:
✅ 2D evacuation map visualization  
✅ Route path rendering with animations  
✅ Exit markers (available/blocked)  
✅ Route status panel  
✅ Blocked area highlighting  
✅ Real-time route updates via WebSocket  
✅ No-route-found warning display  
✅ Interactive route calculation controls  

### Backend Deliverables:
✅ Building graph database schema  
✅ Dijkstra's algorithm implementation  
✅ BFS algorithm implementation  
✅ Graph loader from database  
✅ Safety constraint application  
✅ Route calculation service  
✅ Route recalculation logic  
✅ REST API endpoints  
✅ WebSocket event publishing  
✅ Building JSON import script  
✅ Performance optimization  

---

## Important Notes

### Mock Data for Team
By end of Week 1, create:
```
/shared-contracts/mock-data/mock-route-result.json
/shared-contracts/mock-data/sample-graph.json
```

### Coordinate With:
- **Member 1:** Use building JSON to create graph; match room IDs
- **Member 2:** Query room hazard levels; respond to hazard changes
- **Member 4:** Send route updates through WebSocket; receive hazard events

### Testing Strategy
After each week:
- Week 1: Can you render routes on 2D map?
- Week 2: Do algorithms return correct paths?
- Week 3: Does route calculation API work?
- Week 4: Do routes update when hazards change?

---

## Quick Start Commands

### Import Building to Graph
```bash
cd backend/pathfinding
python import_building.py --input ../../shared-contracts/building-config.json
```

### Start Route Calculator Service
```bash
cd backend/pathfinding
python route_monitor.py
```

### Start API Server
```bash
cd backend/api
uvicorn main:app --reload --port 8003
```

### Run Tests
```bash
cd backend/tests
pytest test_dijkstra.py -v
pytest test_bfs.py -v
```

### Start Frontend
```bash
cd frontend
npm start
```

---

## Resources

### Algorithms:
- Dijkstra: https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
- BFS: https://en.wikipedia.org/wiki/Breadth-first_search
- Graph theory: https://www.youtube.com/watch?v=09_LlHjoEiY

### Visualization:
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Pathfinding visualization: https://qiao.github.io/PathFinding.js/visual/

### Python Libraries:
- NetworkX (for testing): https://networkx.org/
- HeapQ (for Dijkstra): https://docs.python.org/3/library/heapq.html

---

**Good luck! Remember: Your pathfinding keeps people safe!**
