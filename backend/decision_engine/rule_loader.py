"""
Rule Loader - Loads and validates threshold configuration
Member 2: Decision Engine
"""
import json
from pathlib import Path
from typing import Dict, List
from functools import lru_cache

CONFIG_DIR = Path(__file__).parent / "config"
THRESHOLDS_FILE = CONFIG_DIR / "thresholds.json"


@lru_cache(maxsize=1)
def load_rules() -> Dict:
    """
    Load threshold rules from thresholds.json
    Cached so repeated calls don't re-read the file
    
    Returns:
        Dict with keys: rules, room_level_rules, stale_data_policy, recovery_policy
    """
    if not THRESHOLDS_FILE.exists():
        raise FileNotFoundError(f"Threshold configuration not found: {THRESHOLDS_FILE}")
    
    with open(THRESHOLDS_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # Validate structure
    required_keys = ['rules', 'room_level_rules', 'stale_data_policy', 'recovery_policy']
    for key in required_keys:
        if key not in config:
            raise ValueError(f"Missing required key in thresholds.json: {key}")
    
    return config


def get_rules_for_sensor_type(sensor_type: str) -> List[Dict]:
    """
    Get all threshold rules for a specific sensor type
    
    Args:
        sensor_type: 'smoke_heat', 'co', or 'current'
    
    Returns:
        List of rule dictionaries
    """
    config = load_rules()
    return [
        rule for rule in config['rules']
        if rule.get('sensor_type') == sensor_type
    ]


def get_room_level_rules() -> List[Dict]:
    """Get combined room-level rules (multi-sensor conditions)"""
    config = load_rules()
    return config['room_level_rules']


def get_stale_data_policy() -> Dict:
    """Get configuration for handling stale sensor data"""
    config = load_rules()
    return config['stale_data_policy']


def get_recovery_policy() -> Dict:
    """Get configuration for auto-resolving hazard events"""
    config = load_rules()
    return config['recovery_policy']


def reload_rules():
    """Force reload of rules (clears cache)"""
    load_rules.cache_clear()


if __name__ == "__main__":
    # Test the rule loader
    print("Testing rule loader...")
    config = load_rules()
    print(f"✓ Loaded {len(config['rules'])} individual rules")
    print(f"✓ Loaded {len(config['room_level_rules'])} room-level rules")
    print(f"✓ Fresh window: {config['stale_data_policy']['fresh_window_seconds']}s")
    print(f"✓ Auto-resolve: {config['recovery_policy']['auto_resolve']}")
    
    # Show rules by sensor type
    for sensor_type in ['smoke_heat', 'co', 'current']:
        rules = get_rules_for_sensor_type(sensor_type)
        print(f"\n{sensor_type}: {len(rules)} rules")
        for rule in rules:
            print(f"  - {rule['rule_id']}: >= {rule['threshold']} {rule['unit']} → {rule['hazard_level']}")
