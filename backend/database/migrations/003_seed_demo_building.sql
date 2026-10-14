-- =============================================================================
-- PyroNav — Demo Hospital Building Graph Seed
-- Migration: 003_seed_demo_building.sql
-- Seeds building_nodes, building_edges, and exits for the demo hospital floor.
-- Also ensures matching rows exist in the rooms table.
--
-- This is idempotent: uses INSERT … ON CONFLICT DO NOTHING throughout.
-- =============================================================================

-- ============================================================================
-- Rooms (required before building_nodes due to FK)
-- ============================================================================

INSERT INTO rooms (room_id, name, map_position, current_hazard_level)
VALUES
    ('reception',         'Reception',         '{"x": 100, "y": 240}', 'UNKNOWN'),
    ('corridor_1',        'Main Corridor',     '{"x": 275, "y": 220}', 'UNKNOWN'),
    ('operation_theater', 'Operation Theater', '{"x": 460, "y": 200}', 'UNKNOWN'),
    ('emergency_ward',    'Emergency Ward',    '{"x": 460, "y": 350}', 'UNKNOWN'),
    ('pharmacy',          'Pharmacy',          '{"x": 250, "y": 360}', 'UNKNOWN'),
    ('icu',               'ICU',               '{"x": 630, "y": 190}', 'UNKNOWN')
ON CONFLICT (room_id) DO NOTHING;

-- ============================================================================
-- Building nodes
-- ============================================================================

INSERT INTO building_nodes (node_id, node_type, room_id, position, traversable)
VALUES
    ('reception',         'room',    'reception',         '{"x": 100, "y": 240}', TRUE),
    ('corridor_1',        'junction','corridor_1',        '{"x": 275, "y": 220}', TRUE),
    ('operation_theater', 'room',    'operation_theater', '{"x": 460, "y": 200}', TRUE),
    ('emergency_ward',    'room',    'emergency_ward',    '{"x": 460, "y": 350}', TRUE),
    ('pharmacy',          'room',    'pharmacy',          '{"x": 250, "y": 360}', TRUE),
    ('icu',               'room',    'icu',               '{"x": 630, "y": 190}', TRUE),
    ('EXIT-A',            'exit',    NULL,                '{"x":   0, "y": 240}', TRUE),
    ('EXIT-B',            'exit',    NULL,                '{"x": 730, "y": 190}', TRUE),
    ('EXIT-C',            'exit',    NULL,                '{"x": 730, "y": 350}', TRUE)
ON CONFLICT (node_id) DO NOTHING;

-- ============================================================================
-- Building edges (bidirectional corridors + one-way exit connections)
-- ============================================================================

INSERT INTO building_edges (edge_id, from_node_id, to_node_id, cost, bidirectional, traversable)
VALUES
    ('EDGE-01', 'reception',         'corridor_1',        10.0, TRUE,  TRUE),
    ('EDGE-02', 'corridor_1',        'operation_theater', 10.0, TRUE,  TRUE),
    ('EDGE-03', 'corridor_1',        'emergency_ward',    12.0, TRUE,  TRUE),
    ('EDGE-04', 'corridor_1',        'pharmacy',           8.0, TRUE,  TRUE),
    ('EDGE-05', 'operation_theater', 'icu',               10.0, TRUE,  TRUE),
    ('EDGE-06', 'reception',         'EXIT-A',            10.0, FALSE, TRUE),
    ('EDGE-07', 'icu',               'EXIT-B',             5.0, FALSE, TRUE),
    ('EDGE-08', 'emergency_ward',    'EXIT-C',             5.0, FALSE, TRUE)
ON CONFLICT (edge_id) DO NOTHING;

-- ============================================================================
-- Exits
-- ============================================================================

INSERT INTO exits (exit_id, node_id, name, position, available)
VALUES
    ('EXIT-A', 'EXIT-A', 'EXIT A — Main Entrance', '{"x":   0, "y": 240}', TRUE),
    ('EXIT-B', 'EXIT-B', 'EXIT B — Side Door',     '{"x": 730, "y": 190}', TRUE),
    ('EXIT-C', 'EXIT-C', 'EXIT C — Emergency Exit','{"x": 730, "y": 350}', FALSE)
ON CONFLICT (exit_id) DO NOTHING;
