# PyroNav — Building Graph Specification

**Owner:** Member 3 (Pathfinding Engine)  
**Version:** 1.0  
**Date:** 14 October 2026

---

## 1. Purpose

This document defines the graph data structure used by the Pathfinding Engine.
It covers node types, edge attributes, the in-memory format expected by the
Dijkstra and BFS algorithms, and the mapping from the database schema and the
building JSON contract.

---

## 2. Graph Concepts

The building is modelled as a directed graph:

- **Nodes** represent rooms, corridor junctions, or exits.
- **Edges** represent traversable connections (doors, corridor segments).
- Safety constraints mark nodes or edges as non-traversable before pathfinding runs.
- Pathfinding never returns a route through a non-traversable node or edge.

---

## 3. Node Types

| `node_type` | Description |
|---|---|
| `room` | An occupiable room. Has a matching `room_id` in the `rooms` table. |
| `junction` | A corridor intersection with no specific room. `room_id` is null. |
| `exit` | A designated building exit. Appears in the `exits` table. |

---

## 4. In-Memory Graph Format

All pathfinding classes (DijkstraPathfinder, BFSPathfinder) use this format:

```python
graph = {
    "nodes": {
        "<node_id>": {
            "node_type":  "room" | "junction" | "exit",
            "room_id":    "<room_id>" | None,
            "position":   {"x": float, "y": float},
            "traversable": True | False,
        },
        ...
    },
    "edges": {
        "<from_node_id>": [
            {
                "edge_id":    "<edge_id>",
                "to":         "<to_node_id>",
                "cost":       float,     # metres or travel-time units
                "traversable": True | False,
            },
            ...
        ],
        ...
    },
}
```

Bidirectional edges are expanded into two directed entries by `GraphLoader`:
`EDGE-01` from A→B becomes `EDGE-01` (A→B) and `EDGE-01_rev` (B→A).

---

## 5. Edge Cost

Edge cost represents the Euclidean distance between node positions in the demo
hospital, measured in metres. For demo data, costs were calculated as:

```
cost = sqrt((x2 - x1)^2 + (y2 - y1)^2)  [then rounded to sensible values]
```

When the full building editor (Member 1) is integrated, costs will come from
the building configuration export.

---

## 6. Database Schema (Member 3's tables)

### `building_nodes`

| Column | Type | Notes |
|---|---|---|
| `node_id` | VARCHAR(50) PK | Stable identifier shared with sensor messages |
| `node_type` | ENUM(room, junction, exit) | |
| `room_id` | VARCHAR(50) FK→rooms | Null for junction/exit nodes |
| `position` | JSONB `{"x": float, "y": float}` | Map coordinates |
| `traversable` | BOOLEAN DEFAULT TRUE | Set FALSE when a hazard blocks the node |
| `metadata` | JSONB | Reserved |

### `building_edges`

| Column | Type | Notes |
|---|---|---|
| `edge_id` | VARCHAR(50) PK | |
| `from_node_id` | VARCHAR(50) FK→building_nodes | |
| `to_node_id` | VARCHAR(50) FK→building_nodes | |
| `cost` | FLOAT | Travel cost (metres) |
| `bidirectional` | BOOLEAN DEFAULT TRUE | If TRUE, GraphLoader creates a reverse edge |
| `traversable` | BOOLEAN DEFAULT TRUE | Set FALSE for blocked corridors |
| `metadata` | JSONB | Reserved |

### `exits`

| Column | Type | Notes |
|---|---|---|
| `exit_id` | VARCHAR(50) PK | |
| `node_id` | VARCHAR(50) FK→building_nodes | The exit's graph node |
| `name` | VARCHAR(100) | Human-readable label |
| `position` | JSONB | Map coordinates |
| `available` | BOOLEAN DEFAULT TRUE | FALSE when exit is blocked or closed |
| `capacity` | INT | Optional |

### `route_results`

| Column | Type | Notes |
|---|---|---|
| `route_id` | UUID PK | |
| `origin_node_id` | VARCHAR(50) | Starting node |
| `exit_id` | VARCHAR(50) | Destination exit |
| `node_ids` | TEXT[] | Ordered list of node IDs in the route |
| `edge_ids` | TEXT[] | Ordered list of edge IDs traversed |
| `total_cost` | FLOAT | Sum of edge costs |
| `algorithm` | ENUM(dijkstra, bfs) | |
| `status` | ENUM | See section 8 |
| `calculated_at` | TIMESTAMP | |
| `hazard_state_snapshot` | JSONB | Rooms that were blocked at calculation time |

---

## 7. Safety Policy

The `SafetyConstraintApplier` queries the `rooms` table before pathfinding and
marks nodes as `traversable = False` based on the current policy:

| Policy name | Blocked hazard levels |
|---|---|
| `BLOCK_CRITICAL` | CRITICAL only |
| `BLOCK_HIGH_AND_ABOVE` | HIGH_RISK, CRITICAL (default) |
| `BLOCK_WARNING_AND_ABOVE` | WARNING, HIGH_RISK, CRITICAL |

Safety constraints are applied **before** the pathfinding algorithm runs, so the
algorithm never considers blocked nodes or edges as candidates.

---

## 8. Route Statuses

| Status | Meaning |
|---|---|
| `ROUTE_FOUND` | A valid safe route was calculated |
| `NO_VALID_ROUTE` | All paths to exits are blocked by hazards or non-traversable edges |
| `NO_AVAILABLE_EXIT` | No exit is marked `available = TRUE` |
| `INVALID_ORIGIN` | The supplied `origin_room_id` has no matching graph node |
| `RECALCULATION_PENDING` | A recalculation was triggered and is in progress |

---

## 9. Building JSON → Graph Mapping

`GraphLoader.load_graph_from_json()` accepts the `sample-graph.json` format:

```json
{
  "nodes": [
    {"node_id": "reception", "node_type": "room", "room_id": "reception",
     "position": {"x": 100, "y": 240}, "traversable": true}
  ],
  "edges": [
    {"edge_id": "EDGE-01", "from_node": "reception", "to_node": "corridor_1",
     "cost": 10.0, "bidirectional": true, "traversable": true}
  ]
}
```

Key field names: edges use `from_node` / `to_node` (not `from_node_id` / `to_node_id`).
The DB loader uses `from_node_id` / `to_node_id`. Both are handled by `GraphLoader`.

---

## 10. Demo Hospital Graph

The demo hospital (PyroNav Demo Hospital, Ground Floor) has:

- 6 room/junction nodes: `reception`, `corridor_1`, `operation_theater`,
  `emergency_ward`, `pharmacy`, `icu`
- 3 exit nodes: `EXIT-A` (available), `EXIT-B` (available), `EXIT-C` (unavailable)
- 8 edges: 5 bidirectional corridor segments + 3 one-way exit connections

Shortest routes from `reception`:
- Dijkstra: `reception → EXIT-A` (cost 10, direct via EDGE-06)
- BFS: `reception → EXIT-A` (1 hop, same path)

---

## 11. Seeding the Database

```bash
# From /backend
python -m pathfinding.import_building
# or with a custom file:
python -m pathfinding.import_building --input ../shared-contracts/mock-data/sample-graph.json
```

The script is idempotent — safe to re-run during development.
SQL equivalent: `backend/database/migrations/003_seed_demo_building.sql`
