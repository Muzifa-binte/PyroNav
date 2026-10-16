"""
Writes validated readings to sensor_readings and keeps sensors.last_seen_at /
sensors.status current — one transaction per reading.

Duplicate message_ids (QoS 1 redelivery, a publisher retrying) are detected by
the UNIQUE constraint and reported as duplicate instead of raising.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from database.connection import db_manager

INSERT_READING = """
    INSERT INTO sensor_readings
        (message_id, sensor_id, room_id, timestamp, values, units, validation_status)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (message_id) DO NOTHING
    RETURNING received_at
"""

# Lock the row, remember the previous status, mark the sensor active.
# last_seen_at never moves backwards when readings arrive out of order.
TOUCH_SENSOR = """
    UPDATE sensors AS s
       SET last_seen_at = GREATEST(COALESCE(s.last_seen_at, %s), %s),
           status = 'active'
      FROM (SELECT sensor_id, status::text AS previous_status
              FROM sensors WHERE sensor_id = %s FOR UPDATE) AS prev
     WHERE s.sensor_id = prev.sensor_id
 RETURNING prev.previous_status
"""


@dataclass
class StoreResult:
    stored: bool
    duplicate: bool = False
    received_at: Optional[datetime] = None
    previous_status: Optional[str] = None


class ReadingWriter:
    def __init__(self, db=db_manager):
        self.db = db

    def store(self, reading: dict, validation_status: str) -> StoreResult:
        """Raises DatabaseUnavailableError when PostgreSQL is unreachable."""
        ts = reading["timestamp"]
        with self.db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(INSERT_READING, (
                    reading["message_id"], reading["sensor_id"], reading["room_id"], ts,
                    reading["values"], reading["units"], validation_status,
                ))
                row = cur.fetchone()
                if row is None:
                    return StoreResult(stored=False, duplicate=True)
                previous = None
                if validation_status == "valid":
                    cur.execute(TOUCH_SENSOR, (ts, ts, reading["sensor_id"]))
                    touched = cur.fetchone()
                    previous = touched[0] if touched else None
                return StoreResult(stored=True, received_at=row[0], previous_status=previous)
