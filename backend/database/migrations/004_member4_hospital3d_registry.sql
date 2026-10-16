-- =============================================================================
-- PyroNav — Migration 004: columns for the 3D-hospital registry (Member 1)
-- Owner: Member 4 (database architecture)
--
-- shared-contracts/hospital-3d-sensors.json describes every room and sensor of
-- the 3D model with details the 001 schema has no place for. Schema only — the
-- rows themselves are loaded from that file by `python -m database.seed`, so
-- the database follows the registry whenever Member 1 changes it.
--
-- All columns are nullable and added only if missing: existing rows, queries
-- and teammates' INSERTs keep working unchanged.
-- =============================================================================

-- ── rooms ───────────────────────────────────────────────────────────────────
ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS floor_id VARCHAR(50),   -- e.g. floor_1 (sample-building.json floors[])
    ADD COLUMN IF NOT EXISTS kind     VARCHAR(20),   -- room | hall | corridor | stairwell
    ADD COLUMN IF NOT EXISTS category VARCHAR(30);   -- critical_care, ward, circulation, stairs, …

-- No CHECK constraint on kind/category on purpose: the registry owner may add
-- new values without a schema change. Documented values are in the registry.

CREATE INDEX IF NOT EXISTS idx_rooms_floor_kind ON rooms (floor_id, kind);

-- ── sensors ─────────────────────────────────────────────────────────────────
ALTER TABLE sensors
    ADD COLUMN IF NOT EXISTS mount    VARCHAR(20),   -- ceiling | wall | panel
    ADD COLUMN IF NOT EXISTS metadata JSONB;         -- placement, baseline, purpose, rated_current_a

COMMENT ON COLUMN rooms.kind IS
    'room | hall | corridor | stairwell (from shared-contracts/hospital-3d-sensors.json)';
COMMENT ON COLUMN sensors.metadata IS
    'Registry details: placement {u,v | wall,u,h}, baseline values, purpose, rated_current_a (current sensors)';
