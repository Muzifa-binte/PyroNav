-- =============================================================================
-- 005 - Faster latest_sensor_readings view (Member 4)
--
-- The decision engine reads this view for every room every few seconds. The
-- original DISTINCT ON version sorted the whole sensor_readings table on each
-- query (80 ms at 14k rows, growing with every reading). This version does one
-- index lookup per sensor (idx_sensor_readings_sensor_ts), so the cost stays
-- flat (~3 ms) however many readings are stored.
--
-- Same columns, names, types and order, so CREATE OR REPLACE keeps every
-- dependent view and query working.
-- =============================================================================

CREATE OR REPLACE VIEW latest_sensor_readings AS
SELECT
    s.sensor_id,
    r.room_id,
    r."timestamp",
    r."values",
    r.units,
    r.validation_status
FROM sensors s
CROSS JOIN LATERAL (
    SELECT sr.room_id, sr."timestamp", sr."values", sr.units, sr.validation_status
    FROM sensor_readings sr
    WHERE sr.sensor_id = s.sensor_id
    ORDER BY sr."timestamp" DESC
    LIMIT 1
) r;
