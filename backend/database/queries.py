"""
Optimized, reusable SQL queries used across the application.
Returns query strings (and optionally params) ready for db_manager.execute_query().
"""


class OptimizedQueries:

    @staticmethod
    def get_latest_readings_for_room(room_id: str):
        """Latest reading per sensor for a given room."""
        query = """
            SELECT DISTINCT ON (sensor_id)
                sensor_id,
                values,
                units,
                timestamp,
                validation_status
            FROM sensor_readings
            WHERE room_id = %s
            ORDER BY sensor_id, timestamp DESC
        """
        return query, (room_id,)

    @staticmethod
    def get_hazardous_rooms():
        """All rooms with an active hazard level above NORMAL."""
        query = """
            SELECT room_id, current_hazard_level, last_updated_at
            FROM rooms
            WHERE current_hazard_level IN ('WARNING', 'HIGH_RISK', 'CRITICAL')
            ORDER BY
                CASE current_hazard_level
                    WHEN 'CRITICAL'  THEN 1
                    WHEN 'HIGH_RISK' THEN 2
                    WHEN 'WARNING'   THEN 3
                END
        """
        return query, ()

    @staticmethod
    def get_active_alerts():
        """All unresolved hazard events with room name."""
        query = """
            SELECT he.event_id, he.room_id, r.name AS room_name,
                   he.hazard_level, he.reason_codes,
                   he.source_sensor_ids, he.detected_at
            FROM hazard_events he
            JOIN rooms r ON he.room_id = r.room_id
            WHERE he.status = 'ACTIVE'
            ORDER BY he.detected_at DESC
        """
        return query, ()

    @staticmethod
    def get_latest_route():
        """Most recently calculated route result."""
        query = """
            SELECT route_id, origin_node_id, exit_id,
                   node_ids, edge_ids, total_cost,
                   algorithm, status, calculated_at
            FROM route_results
            ORDER BY calculated_at DESC
            LIMIT 1
        """
        return query, ()
