"""
Decision Engine Processor - Real-time sensor monitoring and room state evaluation
Member 2: Decision Engine

This background service continuously monitors sensor readings and updates room hazard states.
"""
import time
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Set

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database.connection import db_manager
from decision_engine.room_state_manager import RoomStateManager
from events.event_bus import event_bus, Event
from events import event_types as ev
from monitoring.logger import get_logger

logger = get_logger("decision_engine.processor")


class DecisionEngineProcessor:
    """
    Main processor that monitors sensor data and evaluates room states
    """
    
    def __init__(self, poll_interval: float = 2.0):
        """
        Initialize the decision engine processor
        
        Args:
            poll_interval: How often to check for new sensor data (seconds)
        """
        self.poll_interval = poll_interval
        self.state_manager = RoomStateManager()
        self.last_processed_timestamp = None
        self.running = False
        
        logger.info("Decision Engine Processor initialized")
        logger.info(f"Poll interval: {poll_interval}s")
    
    def start(self):
        """Start the processor main loop"""
        self.running = True
        logger.info("🔥 Decision Engine Processor starting...")
        
        try:
            self._initialize()
            self._run_main_loop()
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        except Exception as e:
            logger.error(f"Fatal error in processor: {e}", exc_info=True)
        finally:
            self.stop()
    
    def stop(self):
        """Stop the processor"""
        self.running = False
        logger.info("Decision Engine Processor stopped")
    
    def _initialize(self):
        """Initialize processor state"""
        # Get the most recent sensor reading timestamp
        result = db_manager.fetch_one(
            'SELECT MAX("timestamp") as max_ts FROM sensor_readings'
        )
        if result and result['max_ts']:
            self.last_processed_timestamp = result['max_ts']
            logger.info(f"Starting from timestamp: {self.last_processed_timestamp}")
        else:
            self.last_processed_timestamp = datetime.now(timezone.utc)
            logger.warning("No existing sensor data found, starting fresh")
        
        # Get initial room count
        room_count = db_manager.fetch_one("SELECT COUNT(*) as count FROM rooms")
        logger.info(f"Monitoring {room_count['count']} rooms")

        # Bring every room up to date with the readings already stored
        self._check_stale_data()
    
    def _run_main_loop(self):
        """Main processing loop"""
        iteration = 0
        
        while self.running:
            iteration += 1
            start_time = time.time()
            
            try:
                # Check for new sensor readings
                affected_rooms = self._process_new_readings()
                
                # Periodically check for stale data
                if iteration % 15 == 0:  # Every ~30 seconds at 2s poll interval
                    self._check_stale_data()
                
                # Log activity
                if affected_rooms:
                    logger.info(f"Processed {len(affected_rooms)} rooms with new data")
                elif iteration % 30 == 0:  # Log heartbeat every ~60 seconds
                    logger.debug(f"Processor heartbeat - iteration {iteration}")
                
            except Exception as e:
                logger.error(f"Error in processing loop: {e}", exc_info=True)
            
            # Sleep for the remainder of the interval
            elapsed = time.time() - start_time
            sleep_time = max(0, self.poll_interval - elapsed)
            time.sleep(sleep_time)
    
    def _process_new_readings(self) -> Set[str]:
        """
        Process new sensor readings since last check
        
        Returns:
            Set of room IDs that were updated
        """
        # Query for readings newer than our last processed timestamp
        new_readings = db_manager.fetch_all(
            """
            SELECT DISTINCT room_id, MAX("timestamp") as latest_ts
            FROM sensor_readings
            WHERE "timestamp" > %s
            GROUP BY room_id
            """,
            (self.last_processed_timestamp,)
        )
        
        if not new_readings:
            return set()
        
        affected_rooms = set()
        
        # Process each room that has new data
        for row in new_readings:
            room_id = row['room_id']
            try:
                result = self.state_manager.update_room_state(room_id)
                
                if result.get('changed'):
                    affected_rooms.add(room_id)
                    self._publish_room_update(result)
                    
                    # Log significant changes
                    old_level = result['old_hazard_level']
                    new_level = result['new_hazard_level']
                    logger.warning(
                        f"🚨 Room {room_id}: {old_level} → {new_level}"
                    )
                    
                    if result.get('event_id'):
                        logger.warning(
                            f"   Event created: {result['event_id']}"
                        )
                
            except Exception as e:
                logger.error(f"Error processing room {room_id}: {e}", exc_info=True)
        
        # Update our timestamp
        max_ts = max(row['latest_ts'] for row in new_readings)
        self.last_processed_timestamp = max_ts
        
        return affected_rooms
    
    def _check_stale_data(self):
        """Check all rooms for stale sensor data"""
        rooms = db_manager.fetch_all("SELECT room_id FROM rooms")
        
        for room in rooms:
            room_id = room['room_id']
            try:
                # Re-evaluate room state (this will update data_quality_status)
                result = self.state_manager.update_room_state(room_id)
                
                # If data quality changed, publish update
                if result.get('changed'):
                    self._publish_room_update(result)
                    logger.info(
                        f"Room {room_id} data quality: {result.get('data_quality')}"
                    )
                
            except Exception as e:
                logger.error(f"Error checking stale data for {room_id}: {e}")
    
    def _publish_room_update(self, result: dict):
        """
        Publish room state change to event bus for WebSocket broadcast
        
        Args:
            result: Result from room_state_manager.update_room_state()
        """
        try:
            # Publish room_status_changed event
            event_bus.publish_sync(Event(
                ev.ROOM_STATUS_CHANGED,
                {
                    'room_id': result['room_id'],
                    'hazard_level': result['new_hazard_level'],
                    'previous_level': result.get('old_hazard_level'),
                    'data_quality': result.get('data_quality'),
                    'reason_codes': result.get('reason_codes', []),
                    'changed': result['changed'],
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            ))

            # Events superseded by the new level, or cleared on return to NORMAL
            for resolved in result.get('resolved_events') or []:
                event_bus.publish_sync(Event(
                    ev.HAZARD_EVENT_RESOLVED,
                    {
                        'event_id': resolved['event_id'],
                        'room_id': result['room_id'],
                        'resolved_at': resolved['resolved_at'],
                    }
                ))

            if result.get('event_created'):
                event_bus.publish_sync(Event(
                    ev.HAZARD_EVENT_CREATED,
                    {
                        'event_id': result['event_id'],
                        'room_id': result['room_id'],
                        'hazard_level': result['new_hazard_level'],
                        'reason_codes': result.get('reason_codes', []),
                        'source_sensor_ids': result.get('source_sensor_ids', []),
                        'detected_at': result.get('detected_at'),
                    }
                ))
            
            # If a new event was created, publish notification
            if result.get('event_id'):
                # Fetch the notification details
                notification = db_manager.fetch_one(
                    "SELECT * FROM notifications WHERE event_id = %s "
                    "ORDER BY created_at DESC LIMIT 1",
                    (result['event_id'],)
                )
                
                if notification:
                    event_bus.publish_sync(Event(
                        ev.NOTIFICATION_CREATED,
                        {
                            'notification_id': notification['notification_id'],
                            'event_id': result['event_id'],
                            'room_id': result['room_id'],
                            'severity': notification['severity'],
                            'message': notification['message'],
                            'timestamp': notification['created_at'].isoformat()
                        }
                    ))
            
        except Exception as e:
            logger.error(f"Error publishing room update: {e}", exc_info=True)


def main():
    """Main entry point"""
    print("=" * 70)
    print("PyroNav Decision Engine Processor")
    print("Member 2: Real-time Hazard Evaluation")
    print("=" * 70)
    print()
    
    # Check database connection
    try:
        db_manager.execute("SELECT 1")
        print("✓ Database connection OK")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        print("  Make sure PostgreSQL is running and .env is configured")
        sys.exit(1)
    
    # Check that tables exist
    try:
        result = db_manager.fetch_one("SELECT COUNT(*) as count FROM rooms")
        print(f"✓ Found {result['count']} rooms in database")
    except Exception as e:
        print(f"✗ Database schema not initialized: {e}")
        print("  Run migrations first: python backend/database/migrations/migrate.py")
        sys.exit(1)
    
    print()
    print("Starting processor...")
    print("Press Ctrl+C to stop")
    print()
    
    # Start the processor
    processor = DecisionEngineProcessor(poll_interval=2.0)
    processor.start()


if __name__ == "__main__":
    main()
