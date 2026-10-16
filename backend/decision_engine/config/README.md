# Decision Engine Configuration

## Thresholds.json

This file contains all threshold rules and policies for the Decision Engine.

### ⚠️ Important Disclaimer
These threshold values are **RESEARCH-BASED** for an academic prototype.
- ✅ Derived from authoritative sources (OSHA, NFPA, NIST, manufacturer specs)
- ✅ Documented with citations in `THRESHOLD-JUSTIFICATION.md`
- ✅ Defensible for academic evaluation and demonstration
- ❌ NOT certified for real-world deployment (would require UL testing, NFPA 72 compliance)
- ❌ NOT a replacement for certified life-safety systems
- PyroNav is an academic prototype demonstrating fire detection concepts

### Threshold Sources (RESEARCHED October 15, 2026)
Our values are derived from:
- **NIST** - Smoke detector performance research (obscuration thresholds)
- **OSHA 29 CFR 1917.24** - Carbon monoxide exposure limits (35/100/200 ppm)
- **NIOSH** - Updated PEL recommendations for workplace safety
- **NFPA 101** - Life Safety Code for Healthcare Occupancies
- **Manufacturer specifications** - Honeywell, System Sensor heat detectors (57-90°C activation)
- **MDPI Sensors (2020)** - Peer-reviewed smoke detector threshold database

**See `THRESHOLD-JUSTIFICATION.md` for complete 13-page defense with citations.**

### Structure

#### Individual Sensor Rules
Each rule evaluates a single sensor reading:
- `rule_id`: Unique identifier
- `sensor_type`: Which sensor category (current, smoke_heat, co)
- `field`: Which measurement field to check
- `condition`: Comparison operator (>=, >, <=, <)
- `threshold`: The numeric value to compare against
- `unit`: Measurement unit
- `hazard_level`: Result if rule triggers (WARNING, HIGH_RISK, CRITICAL)
- `requires_notification`: Whether to generate alert
- `message_template`: Notification message format

#### Room-Level Combined Rules
These evaluate multiple sensor readings together:
- Combine evidence from different sensors
- More conservative than single-sensor rules
- Example: Smoke + Heat = strong fire indicator

#### Policies

**Stale Data Policy:**
- `fresh_window_seconds: 60` - Data less than 60s old is FRESH
- `stale_threshold_seconds: 120` - Data older than 120s is STALE
- `unknown_after_seconds: 300` - Data older than 5min → room is UNKNOWN

**Recovery Policy:**
- `auto_resolve: true` - Hazards auto-resolve when readings normalize
- `resolution_delay_seconds: 30` - Wait 30s before resolving
- `requires_all_sensors_normal: true` - All sensors must be normal

### How to Modify

#### Adding a New Rule
1. Copy an existing rule structure
2. Change the `rule_id` to be unique
3. Set appropriate threshold value
4. Choose correct hazard_level
5. Write clear message_template
6. Test with simulator

#### Adjusting Thresholds
1. Change the `threshold` value
2. Document your reasoning
3. Test edge cases
4. Coordinate with team (especially Member 1's simulator)

#### Example: Lowering Smoke Warning
```json
{
  "rule_id": "SMOKE_WARNING",
  "threshold": 40,  // Changed from 50 to 40
  "hazard_level": "WARNING"
}
```

### Testing Your Changes
1. Update `thresholds.json`
2. Restart Decision Engine processor
3. Run Member 1's simulator with test values
4. Verify correct hazard level assigned
5. Check notification generated if expected

### Severity Precedence
When multiple rules trigger for a room:
1. **CRITICAL** (highest priority)
2. **HIGH_RISK**
3. **WARNING**
4. **NORMAL**
5. **UNKNOWN** (no data)

The highest severity wins.

### Field Names
Must match sensor reading format from Member 1:

**Smoke/Heat Sensor:**
- `smoke` (in ppm)
- `temperature` (in degC)

**CO Sensor:**
- `co_level` (in ppm)

**Current Sensor:**
- `current` (in A - Amperes)

### Version Control
- Change `version` field when making significant updates
- Update `last_updated` date
- Document changes in git commit message

---

**Last Updated:** 2026-10-15  
**Owner:** Member 2  
**Status:** Week 0 Setup Complete
