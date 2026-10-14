-- =============================================================================
-- PyroNav — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Covers: sensors, decision engine, pathfinding, and system infrastructure
-- =============================================================================

-- Requires PostgreSQL 13+: UUID defaults use the built-in gen_random_uuid(),
-- so no extension (uuid-ossp / pgcrypto) needs to be installed.

-- ============================================================================
-- MEMBER 2: ROOMS (must come first — sensors FK references rooms)
-- ============================================================================

CREATE TYPE hazard_level_enum     AS ENUM ('NORMAL', 'WARNING', 'HIGH_RISK', 'CRITICAL', 'UNKNOWN');
CREATE TYPE data_quality_enum     AS ENUM ('FRESH', 'PARTIAL', 'STALE', 'NO_DATA');
CREATE TYPE event_status_enum     AS ENUM ('ACTIVE', 'RESOLVED');
CREATE TYPE notification_status_enum AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'DISMISSED');

CREATE TABLE rooms (
    room_id               VARCHAR(50)  PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    map_position          JSONB,
    dimensions            JSONB,
    current_hazard_level  hazard_level_enum  DEFAULT 'UNKNOWN',
    last_updated_at       TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
    data_quality_status   data_quality_enum  DEFAULT 'NO_DATA'
);

-- ============================================================================
-- MEMBER 1: SENSOR DATA
-- ============================================================================

CREATE TYPE sensor_type_enum       AS ENUM ('current', 'smoke_heat', 'co');
CREATE TYPE sensor_status_enum     AS ENUM ('active', 'inactive', 'error', 'stale');
CREATE TYPE validation_status_enum AS ENUM ('valid', 'invalid', 'stale', 'duplicate');

CREATE TABLE sensors (
    sensor_id     VARCHAR(50)        PRIMARY KEY,
    room_id       VARCHAR(50)        NOT NULL REFERENCES rooms(room_id),
    sensor_type   sensor_type_enum   NOT NULL,
    status        sensor_status_enum DEFAULT 'active',
    unit_config   JSONB,
    last_seen_at  TIMESTAMP,
    created_at    TIMESTAMP          DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id                SERIAL         PRIMARY KEY,
    message_id        VARCHAR(100)   UNIQUE NOT NULL,
    sensor_id         VARCHAR(50)    REFERENCES sensors(sensor_id),
    room_id           VARCHAR(50)    NOT NULL,
    timestamp         TIMESTAMP      NOT NULL,
    values            JSONB          NOT NULL,
    units             JSONB          NOT NULL,
    validation_status validation_status_enum DEFAULT 'valid',
    received_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sensor_readings_room_id   ON sensor_readings(room_id);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);

-- ============================================================================
-- MEMBER 2: DECISION ENGINE
-- ============================================================================

CREATE TABLE hazard_events (
    event_id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id           VARCHAR(50)    REFERENCES rooms(room_id),
    hazard_level      hazard_level_enum NOT NULL,
    reason_codes      TEXT[],
    source_sensor_ids TEXT[],
    detected_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    resolved_at       TIMESTAMP,
    status            event_status_enum DEFAULT 'ACTIVE'
);

CREATE TABLE notifications (
    notification_id UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID           REFERENCES hazard_events(event_id),
    room_id         VARCHAR(50)    REFERENCES rooms(room_id),
    severity        hazard_level_enum NOT NULL,
    message         TEXT           NOT NULL,
    created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    status          notification_status_enum DEFAULT 'ACTIVE'
);

CREATE INDEX idx_hazard_events_room_id ON hazard_events(room_id);
CREATE INDEX idx_hazard_events_status  ON hazard_events(status);
CREATE INDEX idx_notifications_status  ON notifications(status);

-- ============================================================================
-- MEMBER 3: PATHFINDING
-- ============================================================================

CREATE TYPE node_type_enum    AS ENUM ('room', 'junction', 'exit');
CREATE TYPE route_status_enum AS ENUM (
    'ROUTE_FOUND', 'NO_VALID_ROUTE', 'NO_AVAILABLE_EXIT',
    'INVALID_ORIGIN', 'RECALCULATION_PENDING'
);
CREATE TYPE algorithm_enum    AS ENUM ('dijkstra', 'bfs');

CREATE TABLE building_nodes (
    node_id     VARCHAR(50)     PRIMARY KEY,
    node_type   node_type_enum  NOT NULL,
    room_id     VARCHAR(50)     REFERENCES rooms(room_id),
    position    JSONB           NOT NULL,
    traversable BOOLEAN         DEFAULT TRUE,
    metadata    JSONB
);

CREATE TABLE building_edges (
    edge_id       VARCHAR(50)   PRIMARY KEY,
    from_node_id  VARCHAR(50)   REFERENCES building_nodes(node_id),
    to_node_id    VARCHAR(50)   REFERENCES building_nodes(node_id),
    cost          FLOAT         NOT NULL,
    bidirectional BOOLEAN       DEFAULT TRUE,
    traversable   BOOLEAN       DEFAULT TRUE,
    metadata      JSONB
);

CREATE TABLE exits (
    exit_id   VARCHAR(50)  PRIMARY KEY,
    node_id   VARCHAR(50)  REFERENCES building_nodes(node_id),
    name      VARCHAR(100) NOT NULL,
    position  JSONB,
    available BOOLEAN      DEFAULT TRUE,
    capacity  INT
);

CREATE TABLE route_results (
    route_id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_node_id         VARCHAR(50),
    exit_id                VARCHAR(50),
    node_ids               TEXT[],
    edge_ids               TEXT[],
    total_cost             FLOAT,
    algorithm              algorithm_enum,
    status                 route_status_enum,
    calculated_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    hazard_state_snapshot  JSONB
);

CREATE INDEX idx_route_results_calculated_at ON route_results(calculated_at DESC);

-- ============================================================================
-- MEMBER 4: SYSTEM INFRASTRUCTURE
-- ============================================================================

CREATE TYPE log_level_enum AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

CREATE TABLE system_logs (
    log_id    SERIAL          PRIMARY KEY,
    timestamp TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    level     log_level_enum  NOT NULL,
    component VARCHAR(100),
    message   TEXT,
    metadata  JSONB
);

CREATE TABLE websocket_sessions (
    session_id    UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id     VARCHAR(100),
    connected_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata      JSONB
);

CREATE TABLE api_audit_log (
    audit_id        SERIAL    PRIMARY KEY,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    endpoint        VARCHAR(200),
    method          VARCHAR(10),
    status_code     INT,
    response_time_ms INT,
    error_message   TEXT
);

CREATE INDEX idx_system_logs_timestamp  ON system_logs(timestamp DESC);
CREATE INDEX idx_api_audit_timestamp    ON api_audit_log(timestamp DESC);

-- ============================================================================
-- VIEWS: common read patterns
-- ============================================================================

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

CREATE VIEW active_hazards_by_room AS
SELECT
    r.room_id,
    r.name,
    r.current_hazard_level,
    COUNT(he.event_id) AS active_event_count
FROM rooms r
LEFT JOIN hazard_events he
    ON r.room_id = he.room_id AND he.status = 'ACTIVE'
GROUP BY r.room_id, r.name, r.current_hazard_level;
