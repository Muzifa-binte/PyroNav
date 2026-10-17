"""
Room State Manager - Updates room hazard states and generates events/notifications
Member 2: Decision Engine

Manages the lifecycle of room hazard states, creates/resolves hazard events,
and generates notifications.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from uuid import uuid4

from database.connection import db_manager
from .evaluator import ThresholdEvaluator
from .rule_loader import get_recovery_policy

SEVERITY = {'UNKNOWN': 0, 'NORMAL': 1, 'WARNING': 2, 'HIGH_RISK': 3, 'CRITICAL': 4}
HAZARD_LEVELS = ('WARNING', 'HIGH_RISK', 'CRITICAL')


class RoomStateManager:
    """
    Manages room hazard states and event generation
    """
    
    def __init__(self):
        """Initialize with evaluator and recovery policy"""
        self.evaluator = ThresholdEvaluator()
        self.recovery_policy = get_recovery_policy()
    
    def update_room_state(self, room_id: str) -> Dict:
        """
        Re-evaluate a room's hazard level based on latest sensor readings
        Updates the rooms table and creates/resolves events as needed
        
        Args:
            room_id: Room identifier
        
        Returns:
            Dict with keys: room_id, old_hazard_level, new_hazard_level, changed, event_id
        """
        # Fetch latest readings for the room
        latest_readings = self._get_latest_room_readings(room_id)
        
        # Get current room state
        current_state = db_manager.fetch_one(
            "SELECT room_id, current_hazard_level, data_quality_status FROM rooms WHERE room_id = %s",
            (room_id,)
        )
        
        if not current_state:
            return {
                'room_id': room_id,
                'error': 'Room not found',
                'changed': False
            }
        
        old_hazard_level = current_state['current_hazard_level']
        
        # Readings older than stale_data_policy.unknown_after_seconds no longer
        # describe the room, so a room with nothing newer becomes UNKNOWN.
        # Silence never LOWERS an active hazard, though: route planning treats
        # UNKNOWN as passable, and a burning room whose detectors went quiet
        # must stay blocked.
        current_readings = [r for r in latest_readings if not self._too_old(r.get('timestamp'))]

        # Determine new hazard level
        new_hazard_level, reason_codes, source_sensor_ids = self.evaluator.determine_room_hazard_level(
            current_readings
        )
        if (len(current_readings) < len(latest_readings)
                and old_hazard_level in HAZARD_LEVELS
                and SEVERITY.get(new_hazard_level, 0) < SEVERITY[old_hazard_level]):
            new_hazard_level, reason_codes, source_sensor_ids = old_hazard_level, [], []
        
        # Update data quality status
        data_quality = self._assess_data_quality(room_id, latest_readings)
        
        # Update room in database
        db_manager.execute(
            """
            UPDATE rooms 
            SET current_hazard_level = %s, 
                data_quality_status = %s,
                last_updated_at = (now() AT TIME ZONE 'UTC')
            WHERE room_id = %s
            """,
            (new_hazard_level, data_quality, room_id)
        )
        
        changed = old_hazard_level != new_hazard_level
        event_id = None
        event = None
        resolved_events = []

        # Handle event lifecycle
        if changed:
            if new_hazard_level in ['WARNING', 'HIGH_RISK', 'CRITICAL']:
                # The new level supersedes the room's events at other levels
                resolved_events = self._resolve_active_events(room_id, keep_level=new_hazard_level)
                # Create new hazard event
                event = self._create_hazard_event(
                    room_id, new_hazard_level, reason_codes, source_sensor_ids
                )
                event_id = event['event_id']
                # Generate notification
                self._create_notification(room_id, new_hazard_level, reason_codes, event_id)
            elif new_hazard_level == 'NORMAL':
                # Resolve active events
                resolved_events = self._resolve_active_events(room_id)

        return {
            'room_id': room_id,
            'old_hazard_level': old_hazard_level,
            'new_hazard_level': new_hazard_level,
            'data_quality': data_quality,
            'changed': changed,
            'event_id': event_id,
            'event_created': bool(event and event['created']),
            'detected_at': event['detected_at'] if event else None,
            'resolved_events': resolved_events,
            'reason_codes': reason_codes,
            'source_sensor_ids': source_sensor_ids
        }
    
    def _get_latest_room_readings(self, room_id: str) -> List[Dict]:
        """
        Get latest sensor readings for a room
        
        Args:
            room_id: Room identifier
        
        Returns:
            List of reading dicts with sensor info
        """
        readings = db_manager.fetch_all(
            """
            SELECT 
                sr.sensor_id,
                sr.room_id,
                s.sensor_type,
                sr.timestamp,
                sr.values,
                sr.units,
                sr.validation_status,
                s.metadata
            FROM latest_sensor_readings sr
            JOIN sensors s ON s.sensor_id = sr.sensor_id
            WHERE sr.room_id = %s
            """,
            (room_id,)
        )
        for reading in readings:
            # Current thresholds scale with the circuit's rating (thresholds.json)
            reading['rated_current_a'] = (reading.pop('metadata') or {}).get('rated_current_a')
        return readings or []
    
    def _too_old(self, timestamp) -> bool:
        """Older than stale_data_policy.unknown_after_seconds (thresholds.json)."""
        limit = self.evaluator.stale_policy.get('unknown_after_seconds')
        if not limit or timestamp is None:
            return False
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)  # stored as UTC
        return (datetime.now(timezone.utc) - timestamp).total_seconds() > limit

    def _assess_data_quality(self, room_id: str, latest_readings: List[Dict]) -> str:
        """
        Assess data quality for a room based on sensor freshness
        
        Args:
            room_id: Room identifier
            latest_readings: Current sensor readings
        
        Returns:
            'FRESH', 'PARTIAL', 'STALE', or 'NO_DATA'
        """
        # Count total sensors in room
        sensor_count = db_manager.fetch_one(
            "SELECT COUNT(*) as count FROM sensors WHERE room_id = %s",
            (room_id,)
        )
        total_sensors = sensor_count['count'] if sensor_count else 0
        
        if total_sensors == 0:
            return 'NO_DATA'
        
        # Count fresh readings
        fresh_count = 0
        for reading in latest_readings:
            timestamp = reading.get('timestamp')
            if timestamp and not self.evaluator.is_reading_stale(timestamp):
                fresh_count += 1
        
        return self.evaluator.classify_data_quality(total_sensors, fresh_count)
    
    def _create_hazard_event(
        self, 
        room_id: str, 
        hazard_level: str, 
        reason_codes: List[str],
        source_sensor_ids: List[str]
    ) -> Dict:
        """
        Create a new hazard event in the database
        
        Args:
            room_id: Room identifier
            hazard_level: Hazard severity level
            reason_codes: List of triggered rule IDs
            source_sensor_ids: List of sensor IDs involved
        
        Returns:
            Dict with event_id (str), detected_at and created (False when an
            ACTIVE event at this level already existed and was updated)
        """
        # Check if there's already an active event for this room at this level
        existing = db_manager.fetch_one(
            """
            SELECT event_id, detected_at FROM hazard_events 
            WHERE room_id = %s AND hazard_level = %s AND status = 'ACTIVE'
            ORDER BY detected_at DESC LIMIT 1
            """,
            (room_id, hazard_level)
        )
        
        if existing:
            # Update existing event instead of creating duplicate
            event_id = existing['event_id']
            db_manager.execute(
                """
                UPDATE hazard_events 
                SET reason_codes = %s, source_sensor_ids = %s
                WHERE event_id = %s
                """,
                (reason_codes, source_sensor_ids, event_id)
            )
            return {'event_id': str(event_id), 'detected_at': existing['detected_at'], 'created': False}
        
        # Create new event
        event_id = str(uuid4())
        row = db_manager.fetch_one(
            """
            INSERT INTO hazard_events
                (event_id, room_id, hazard_level, reason_codes, source_sensor_ids, status)
            VALUES (%s, %s, %s, %s, %s, 'ACTIVE')
            RETURNING detected_at
            """,
            (event_id, room_id, hazard_level, reason_codes, source_sensor_ids)
        )

        return {'event_id': event_id, 'detected_at': row['detected_at'], 'created': True}
    
    def _resolve_active_events(self, room_id: str, keep_level: Optional[str] = None) -> List[Dict]:
        """
        Mark active events for a room as resolved

        Args:
            room_id: Room identifier
            keep_level: Leave ACTIVE events at this level untouched

        Returns:
            List of {event_id, resolved_at} for the events resolved
        """
        return db_manager.fetch_all(
            """
            UPDATE hazard_events
            SET status = 'RESOLVED', resolved_at = (now() AT TIME ZONE 'UTC')
            WHERE room_id = %s AND status = 'ACTIVE'
              AND (%s::text IS NULL OR hazard_level::text <> %s::text)
            RETURNING event_id, resolved_at
            """,
            (room_id, keep_level, keep_level)
        )
    
    def _create_notification(
        self, 
        room_id: str, 
        hazard_level: str, 
        reason_codes: List[str],
        event_id: Optional[str] = None
    ):
        """
        Create a notification for a hazard event
        
        Args:
            room_id: Room identifier
            hazard_level: Hazard severity
            reason_codes: Triggered rule IDs
            event_id: Associated event UUID
        """
        # Get room name for message
        room = db_manager.fetch_one(
            "SELECT name FROM rooms WHERE room_id = %s",
            (room_id,)
        )
        room_name = room['name'] if room else room_id
        
        # Build notification message
        message = self._build_notification_message(room_name, hazard_level, reason_codes)
        
        # Create notification
        notification_id = str(uuid4())
        db_manager.execute(
            """
            INSERT INTO notifications 
                (notification_id, event_id, room_id, severity, message, status)
            VALUES (%s, %s, %s, %s, %s, 'ACTIVE')
            """,
            (notification_id, event_id, room_id, hazard_level, message)
        )
    
    def _build_notification_message(
        self, 
        room_name: str, 
        hazard_level: str, 
        reason_codes: List[str]
    ) -> str:
        """
        Build a human-readable notification message
        
        Args:
            room_name: Name of the room
            hazard_level: Severity level
            reason_codes: Rule IDs that triggered
        
        Returns:
            Notification message string
        """
        severity_prefix = {
            'WARNING': 'Warning',
            'HIGH_RISK': 'High Risk',
            'CRITICAL': 'CRITICAL'
        }.get(hazard_level, hazard_level)
        
        # Determine what triggered the alert
        conditions = []
        for code in reason_codes:
            if code.startswith('SMOKE'):
                conditions.append('elevated smoke')
            elif code.startswith('TEMP'):
                conditions.append('high temperature')
            elif code.startswith('CO_'):
                conditions.append('carbon monoxide')
            elif code.startswith('CURRENT'):
                conditions.append('electrical overload')
            elif code.startswith('COMBINED'):
                conditions.append('multiple hazard indicators')
        
        if conditions:
            condition_str = ', '.join(set(conditions))
            message = f"{severity_prefix}: {condition_str} detected in {room_name}"
        else:
            message = f"{severity_prefix}: Hazard detected in {room_name}"
        
        return message


if __name__ == "__main__":
    # Test room state manager (requires database connection)
    print("Testing Room State Manager...")
    print("Note: This requires a running PostgreSQL database with schema initialized")
    
    try:
        manager = RoomStateManager()
        print("✓ RoomStateManager initialized")
        
        # Test with a demo room (if database is available)
        test_room_id = 'operation_theater'
        result = manager.update_room_state(test_room_id)
        
        print(f"\n✓ Updated room state for {test_room_id}:")
        print(f"  - Hazard level: {result.get('new_hazard_level')}")
        print(f"  - Data quality: {result.get('data_quality')}")
        print(f"  - Changed: {result.get('changed')}")
        
        if result.get('event_id'):
            print(f"  - Event created: {result['event_id']}")
        
    except Exception as e:
        print(f"⚠ Database not available or not seeded: {e}")
        print("  This is expected if you haven't set up the database yet")
    
    print("\n✅ Room State Manager code loaded successfully!")
