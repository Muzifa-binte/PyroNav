-- =============================================================================
-- PyroNav — Migration 002: performance, integrity, operations
-- Owner: Member 4 (database architecture)
--
--   1. Composite indexes for the hottest read paths (+ drop the indexes they replace)
--   2. Integrity checks the algorithms rely on
--   3. Extra columns for WebSocket session + API audit tracking
--   4. security_events table (IDS events shown on the Network Security page)
--   5. room_sensor_freshness view (GET /rooms/{room_id}/data-quality)
--   6. purge_old_data() data-retention function
--   7. Database-level UTC timezone default
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Query performance
-- ----------------------------------------------------------------------------

-- Latest reading per sensor (latest_sensor_readings view, GET /sensors/{id}/readings):
-- DISTINCT ON (sensor_id) ... ORDER BY sensor_id, timestamp DESC is served by an
-- index scan with no extra sort.
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_ts
    ON sensor_readings (sensor_id, "timestamp" DESC);

-- Latest readings for one room (decision engine evaluation loop)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_room_ts
    ON sensor_readings (room_id, "timestamp" DESC);

-- The composite indexes above lead with the same columns, so these single-column
-- indexes from 001 only add write overhead on the highest-volume table.
DROP INDEX IF EXISTS idx_sensor_readings_sensor_id;
DROP INDEX IF EXISTS idx_sensor_readings_room_id;

-- Decision-engine deduplication ("is there already an ACTIVE event for this room?")
CREATE INDEX IF NOT EXISTS idx_hazard_events_room_status ON hazard_events (room_id, status);
CREATE INDEX IF NOT EXISTS idx_hazard_events_detected_at ON hazard_events (detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id   ON notifications (event_id);

CREATE INDEX IF NOT EXISTS idx_sensors_room_id ON sensors (room_id);

-- Graph loading / edge lookups (pathfinding)
CREATE INDEX IF NOT EXISTS idx_building_edges_from ON building_edges (from_node_id);
CREATE INDEX IF NOT EXISTS idx_building_edges_to   ON building_edges (to_node_id);

-- GET /system/logs?level=ERROR
CREATE INDEX IF NOT EXISTS idx_system_logs_level_ts ON system_logs (level, "timestamp" DESC);

-- ----------------------------------------------------------------------------
-- 2. Integrity
-- ----------------------------------------------------------------------------

-- Dijkstra is only correct for non-negative edge weights
ALTER TABLE building_edges
    ADD CONSTRAINT chk_building_edges_cost_non_negative CHECK (cost >= 0);

ALTER TABLE exits
    ADD CONSTRAINT chk_exits_capacity_positive CHECK (capacity IS NULL OR capacity > 0);

-- ----------------------------------------------------------------------------
-- 3. Infrastructure tracking columns
-- ----------------------------------------------------------------------------

ALTER TABLE websocket_sessions
    ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS client_ip       VARCHAR(64),
    ADD COLUMN IF NOT EXISTS messages_sent   INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_websocket_sessions_connected_at
    ON websocket_sessions (connected_at DESC);

ALTER TABLE api_audit_log
    ADD COLUMN IF NOT EXISTS request_id   VARCHAR(64),
    ADD COLUMN IF NOT EXISTS client_ip    VARCHAR(64),
    ADD COLUMN IF NOT EXISTS query_string TEXT;

-- ----------------------------------------------------------------------------
-- 4. Security / IDS events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS security_events (
    event_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    category    VARCHAR(50)  NOT NULL,     -- e.g. INVALID_MESSAGE, UNKNOWN_SENSOR, REPLAY
    source      VARCHAR(100),              -- sensor_id, client IP, MQTT topic, …
    severity    VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    description TEXT,
    metadata    JSONB,
    detected_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_detected_at
    ON security_events (detected_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Per-room sensor freshness (a sensor is "fresh" if seen in the last 60 s)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW room_sensor_freshness AS
SELECT
    r.room_id,
    r.data_quality_status,
    COUNT(s.sensor_id) AS sensor_count,
    COUNT(s.sensor_id) FILTER (
        WHERE s.last_seen_at >= (now() AT TIME ZONE 'UTC') - INTERVAL '60 seconds'
    ) AS fresh_sensors,
    COUNT(s.sensor_id) FILTER (
        WHERE s.last_seen_at <  (now() AT TIME ZONE 'UTC') - INTERVAL '60 seconds'
    ) AS stale_sensors,
    COUNT(s.sensor_id) FILTER (WHERE s.last_seen_at IS NULL) AS never_reported,
    MAX(s.last_seen_at) AS last_update
FROM rooms r
LEFT JOIN sensors s ON s.room_id = r.room_id
GROUP BY r.room_id, r.data_quality_status;

-- ----------------------------------------------------------------------------
-- 6. Data retention
--    SELECT * FROM purge_old_data(30);   -- delete operational data older than 30 days
--    Hazard events and notifications are kept: they are the incident history.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION purge_old_data(retention_days INTEGER)
RETURNS TABLE (table_name TEXT, rows_deleted BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    cutoff TIMESTAMP;
    n      BIGINT;
BEGIN
    IF retention_days IS NULL OR retention_days < 1 THEN
        RAISE EXCEPTION 'retention_days must be >= 1 (got %)', retention_days;
    END IF;
    cutoff := (now() AT TIME ZONE 'UTC') - make_interval(days => retention_days);

    DELETE FROM sensor_readings WHERE "timestamp" < cutoff;
    GET DIAGNOSTICS n = ROW_COUNT;
    table_name := 'sensor_readings'; rows_deleted := n; RETURN NEXT;

    DELETE FROM system_logs WHERE "timestamp" < cutoff;
    GET DIAGNOSTICS n = ROW_COUNT;
    table_name := 'system_logs'; rows_deleted := n; RETURN NEXT;

    DELETE FROM api_audit_log WHERE "timestamp" < cutoff;
    GET DIAGNOSTICS n = ROW_COUNT;
    table_name := 'api_audit_log'; rows_deleted := n; RETURN NEXT;

    DELETE FROM websocket_sessions
     WHERE COALESCE(disconnected_at, last_activity) < cutoff;
    GET DIAGNOSTICS n = ROW_COUNT;
    table_name := 'websocket_sessions'; rows_deleted := n; RETURN NEXT;

    DELETE FROM security_events WHERE detected_at < cutoff;
    GET DIAGNOSTICS n = ROW_COUNT;
    table_name := 'security_events'; rows_deleted := n; RETURN NEXT;

    -- Always keep the most recent route: GET /routes/current reads it
    DELETE FROM route_results
     WHERE calculated_at < cutoff
       AND route_id <> (SELECT route_id FROM route_results
                         ORDER BY calculated_at DESC LIMIT 1);
    GET DIAGNOSTICS n = ROW_COUNT;
    table_name := 'route_results'; rows_deleted := n; RETURN NEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Make every new session default to UTC, so DEFAULT CURRENT_TIMESTAMP stores
--    UTC even for clients that don't go through db_manager (psql, pgAdmin, …).
--    Needs database ownership; skipped with a notice otherwise.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Not the database owner — skipped ALTER DATABASE ... SET timezone';
END;
$$;
