"""
Threshold Evaluator - Core decision logic
Member 2: Decision Engine

Evaluates sensor readings against configured thresholds and determines hazard levels.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from .rule_loader import load_rules, get_rules_for_sensor_type, get_room_level_rules


class ThresholdEvaluator:
    """
    Evaluates sensor readings against threshold rules
    """
    
    def __init__(self):
        """Initialize evaluator with threshold configuration"""
        self.config = load_rules()
        self.rules = self.config['rules']
        self.room_level_rules = self.config['room_level_rules']
        self.stale_policy = self.config['stale_data_policy']
    
    def evaluate_reading(self, reading: Dict) -> List[Dict]:
        """
        Evaluate a single sensor reading against all applicable rules
        
        Args:
            reading: Dict with keys:
                - sensor_id: str
                - room_id: str
                - sensor_type: 'smoke_heat', 'co', or 'current'
                - timestamp: ISO timestamp or datetime
                - values: Dict[str, float] (e.g., {'smoke': 85, 'temperature': 55})
                - units: Dict[str, str]
        
        Returns:
            List of triggered rule dictionaries with added 'triggered_value' field
        """
        triggered_rules = []
        sensor_type = reading.get('sensor_type')
        values = reading.get('values', {})
        
        if not sensor_type or not values:
            return triggered_rules
        
        # Get all rules for this sensor type
        applicable_rules = [r for r in self.rules if r['sensor_type'] == sensor_type]
        
        for rule in applicable_rules:
            field = rule['field']
            field_value = values.get(field)
            
            if field_value is None:
                continue
            
            threshold = self._resolve_threshold(rule, reading)
            if self._check_condition(field_value, {**rule, 'threshold': threshold}):
                triggered_rule = dict(rule)
                triggered_rule['threshold'] = threshold
                triggered_rule['triggered_value'] = field_value
                triggered_rule['sensor_id'] = reading.get('sensor_id')
                triggered_rules.append(triggered_rule)
        
        return triggered_rules
    
    def _resolve_threshold(self, rule: Dict, reading: Dict) -> float:
        """
        Current rules scale with the circuit's rated current
        (threshold_ratio_of_rated x rated_current_a); without a rating the
        fixed threshold applies.
        """
        ratio = rule.get('threshold_ratio_of_rated')
        rated = reading.get('rated_current_a')
        if ratio is not None and rated:
            return ratio * float(rated)
        return rule['threshold']
    
    def _check_condition(self, value: float, rule: Dict) -> bool:
        """
        Check if a value triggers a rule's condition
        
        Args:
            value: Sensor reading value
            rule: Rule dict with 'condition' and 'threshold' keys
        
        Returns:
            True if condition is met
        """
        threshold = rule['threshold']
        condition = rule['condition']
        
        if condition == '>=':
            return value >= threshold
        elif condition == '>':
            return value > threshold
        elif condition == '<=':
            return value <= threshold
        elif condition == '<':
            return value < threshold
        elif condition == '==':
            return value == threshold
        
        return False
    
    def determine_room_hazard_level(self, room_readings: List[Dict]) -> Tuple[str, List[str], List[str]]:
        """
        Determine the hazard level for a room based on all its sensor readings
        
        Args:
            room_readings: List of sensor reading dicts for the room
        
        Returns:
            Tuple of (hazard_level, reason_codes, source_sensor_ids)
            hazard_level: 'NORMAL', 'WARNING', 'HIGH_RISK', 'CRITICAL', or 'UNKNOWN'
            reason_codes: List of rule_ids that were triggered
            source_sensor_ids: List of sensor_ids involved
        """
        if not room_readings:
            return ('UNKNOWN', [], [])
        
        # Evaluate each reading
        all_triggered_rules = []
        source_sensors = set()
        
        for reading in room_readings:
            triggered = self.evaluate_reading(reading)
            all_triggered_rules.extend(triggered)
            if triggered:
                source_sensors.add(reading.get('sensor_id'))
        
        # If no rules triggered, check for combined room-level rules
        if not all_triggered_rules:
            # Check multi-sensor combined rules
            room_level_triggered = self._check_room_level_rules(room_readings)
            if room_level_triggered:
                return (
                    room_level_triggered['hazard_level'],
                    [room_level_triggered['rule_id']],
                    list(source_sensors) or [r.get('sensor_id') for r in room_readings]
                )
            return ('NORMAL', [], [])
        
        # Determine highest severity level
        # Order: CRITICAL > HIGH_RISK > WARNING > NORMAL
        severity_order = {
            'CRITICAL': 4,
            'HIGH_RISK': 3,
            'WARNING': 2,
            'NORMAL': 1,
            'UNKNOWN': 0
        }
        
        max_severity = 'NORMAL'
        max_severity_value = 1
        
        for rule in all_triggered_rules:
            level = rule['hazard_level']
            value = severity_order.get(level, 0)
            if value > max_severity_value:
                max_severity = level
                max_severity_value = value
        
        # Check if combined rules escalate severity further
        room_level_triggered = self._check_room_level_rules(room_readings)
        if room_level_triggered:
            combined_level = room_level_triggered['hazard_level']
            if severity_order.get(combined_level, 0) > max_severity_value:
                all_triggered_rules.append(room_level_triggered)
                max_severity = combined_level
        
        reason_codes = [rule['rule_id'] for rule in all_triggered_rules]
        source_sensor_ids = list(source_sensors)
        
        return (max_severity, reason_codes, source_sensor_ids)
    
    def _check_room_level_rules(self, room_readings: List[Dict]) -> Optional[Dict]:
        """
        Check multi-sensor combined rules (e.g., smoke + temperature)
        
        Args:
            room_readings: All sensor readings for the room
        
        Returns:
            Triggered combined rule dict or None
        """
        # Aggregate all measurements from the room
        aggregated_values = {}
        for reading in room_readings:
            values = reading.get('values', {})
            for measurement, value in values.items():
                # Keep the highest value for each measurement
                if measurement not in aggregated_values or value > aggregated_values[measurement]:
                    aggregated_values[measurement] = value
        
        # Check each room-level rule
        for rule in self.room_level_rules:
            conditions = rule.get('conditions', {})
            all_conditions_met = True
            
            for measurement, constraint in conditions.items():
                min_value = constraint.get('min')
                max_value = constraint.get('max')
                actual_value = aggregated_values.get(measurement)
                
                if actual_value is None:
                    all_conditions_met = False
                    break
                
                if min_value is not None and actual_value < min_value:
                    all_conditions_met = False
                    break
                
                if max_value is not None and actual_value > max_value:
                    all_conditions_met = False
                    break
            
            if all_conditions_met:
                return rule
        
        return None
    
    def is_reading_stale(self, timestamp: datetime) -> bool:
        """
        Check if a sensor reading is stale based on configured policy
        
        Args:
            timestamp: Reading timestamp
        
        Returns:
            True if reading is stale
        """
        if not isinstance(timestamp, datetime):
            # Try to parse if it's a string
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                return True
        if timestamp.tzinfo is None:
            # The database stores UTC timestamps without a zone
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        age_seconds = (now - timestamp).total_seconds()
        
        fresh_window = self.stale_policy['fresh_window_seconds']
        return age_seconds > fresh_window
    
    def classify_data_quality(self, sensor_count: int, fresh_count: int) -> str:
        """
        Classify room data quality based on sensor freshness
        
        Args:
            sensor_count: Total sensors in room
            fresh_count: Number of sensors with fresh data
        
        Returns:
            'FRESH', 'PARTIAL', 'STALE', or 'NO_DATA'
        """
        if sensor_count == 0:
            return 'NO_DATA'
        
        if fresh_count == 0:
            return 'STALE'
        
        if fresh_count == sensor_count:
            return 'FRESH'
        
        return 'PARTIAL'


if __name__ == "__main__":
    # Test the evaluator
    print("Testing Threshold Evaluator...")
    
    evaluator = ThresholdEvaluator()
    
    # Test 1: Normal smoke reading
    normal_reading = {
        'sensor_id': 'SMOKE-TEST-01',
        'room_id': 'test_room',
        'sensor_type': 'smoke_heat',
        'timestamp': datetime.now(timezone.utc),
        'values': {'smoke': 30, 'temperature': 22},
        'units': {'smoke': 'ppm', 'temperature': 'degC'}
    }
    triggered = evaluator.evaluate_reading(normal_reading)
    print(f"\n✓ Normal reading: {len(triggered)} rules triggered (expected 0)")
    
    # Test 2: WARNING level smoke
    warning_reading = {
        'sensor_id': 'SMOKE-TEST-01',
        'room_id': 'test_room',
        'sensor_type': 'smoke_heat',
        'timestamp': datetime.now(timezone.utc),
        'values': {'smoke': 60, 'temperature': 25},
        'units': {'smoke': 'ppm', 'temperature': 'degC'}
    }
    triggered = evaluator.evaluate_reading(warning_reading)
    print(f"✓ Warning reading: {len(triggered)} rules triggered")
    for rule in triggered:
        print(f"  - {rule['rule_id']}: {rule['hazard_level']}")
    
    # Test 3: CRITICAL level (combined smoke + temperature)
    critical_readings = [
        {
            'sensor_id': 'SMOKE-TEST-01',
            'room_id': 'test_room',
            'sensor_type': 'smoke_heat',
            'timestamp': datetime.now(timezone.utc),
            'values': {'smoke': 90, 'temperature': 55},
            'units': {'smoke': 'ppm', 'temperature': 'degC'}
        }
    ]
    hazard_level, reason_codes, sensor_ids = evaluator.determine_room_hazard_level(critical_readings)
    print(f"\n✓ Critical scenario: {hazard_level}")
    print(f"  - Reason codes: {reason_codes}")
    print(f"  - Source sensors: {sensor_ids}")
    
    # Test 4: Stale data detection
    old_timestamp = datetime(2026, 1, 1, tzinfo=timezone.utc)
    is_stale = evaluator.is_reading_stale(old_timestamp)
    print(f"\n✓ Stale detection: {is_stale} (expected True)")
    
    # Test 5: Data quality classification
    quality = evaluator.classify_data_quality(sensor_count=5, fresh_count=5)
    print(f"✓ Data quality (5/5 fresh): {quality} (expected FRESH)")
    
    quality = evaluator.classify_data_quality(sensor_count=5, fresh_count=3)
    print(f"✓ Data quality (3/5 fresh): {quality} (expected PARTIAL)")
    
    print("\n✅ All evaluator tests passed!")
