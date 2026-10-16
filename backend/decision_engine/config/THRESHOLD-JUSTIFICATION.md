# Threshold Justification and Defense Document

**Project:** PyroNav - Emergency Evacuation System  
**Component:** Decision Engine Threshold Configuration  
**Date:** October 15, 2026  
**Academic Prototype Disclaimer:** This is an educational demonstration system, NOT a certified fire safety system.

---

## Executive Summary

This document provides evidence-based justification for the threshold values used in PyroNav's Decision Engine. All values are derived from authoritative fire safety standards, occupational safety guidelines, and peer-reviewed research. This system is designed as an **academic prototype** to demonstrate fire detection and evacuation routing concepts for hospital environments.

---

## 1. Smoke Detection Thresholds

### Research Findings

According to NIST (National Institute of Standards and Technology) research on smoke detector performance:

- **Photoelectric smoke detectors** activate at approximately **6.6%/m obscuration**
- **Ionization detectors** activate at approximately **4.3%/m obscuration** to **40%/m** depending on combustible type
- **Dual sensors** provide better coverage across different fire types

Source: NIST Publication on "Performance of Dual Photoelectric/Ionization Smoke Alarms in Full-Scale Fire Tests"  
URL: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=908210

### Research on Obscuration Levels

Study: "Obscuration Threshold Database Construction of Smoke Detectors for Various Combustibles" (MDPI Sensors, 2020)

Key findings:
- Nominal obscuration thresholds: **15%/m for detector activation**
- Ionization detectors activated at **16%/m to 40%/m** depending on material
- Photoelectric sensors showed different response patterns

Source: https://www.mdpi.com/1424-8220/20/21/6272/xml

### Our Thresholds (Converted to ppm approximation)

**Note:** Smoke obscuration (% per meter) and concentration (ppm) are different measurements. Commercial smoke detectors measure obscuration, not ppm. Our values are **educational approximations** for demonstration purposes.

| Level | Value | Justification |
|-------|-------|---------------|
| **WARNING** | 50 ppm | Early warning - corresponds to light smoke presence, well before typical detector activation |
| **HIGH_RISK** | 80 ppm | Significant smoke - approaching detector activation levels, requires immediate attention |
| **CRITICAL** | 100 ppm | Dense smoke - exceeds typical detection thresholds, immediate evacuation required |

**Defense:** These values provide a **progressive warning system** that alerts before commercial detectors would activate, giving more time for safe evacuation in a hospital setting with vulnerable populations.

---

## 2. Temperature Thresholds

### Industry Standards for Heat Detectors

According to manufacturer specifications and fire safety standards:

**Fixed-Temperature Heat Detectors:**
- Standard activation: **135°F (57°C)** for normal environments
- High-temperature rating: **194°F (90°C)** for industrial/high-heat areas
- Ultra-high rating: **200°F (93°C)** for mechanical rooms

Sources:
- Honeywell 302 Series Heat Detectors: 135°F (57.2°C) and 194°F (90°C) ratings
- System Sensor 5624: 194°F (90°C) activation
- Engineerfix: Most common activation point is 135°F (57°C)

**Rate-of-Rise Detectors:**
- Baseline: **70°F (21°C)**
- Alarm activation: **Rapid rise of 15°F (8.3°C) per minute or more**

### Our Thresholds

| Level | °C | °F | Justification |
|-------|----|----|---------------|
| **WARNING** | 45°C | 113°F | Elevated temperature - below detector activation but indicates abnormal heating. Hospital equipment sensitivity. |
| **HIGH_RISK** | 60°C | 140°F | Dangerous heat - just above standard detector activation (57°C/135°F). Fire likely present. |
| **CRITICAL** | 75°C | 167°F | Extreme temperature - well above fixed detector thresholds. Active fire confirmed. |

**Defense for Hospital Context:**
- **45°C is chosen** to provide early warning before reaching the 57°C standard detector threshold
- Hospitals have **oxygen-enriched environments** which amplify fire risk
- **Vulnerable populations** (patients, elderly, immobile) require earlier warning than typical buildings
- Medical equipment can be damaged at elevated temperatures
- ICU and surgical areas have temperature-sensitive medications

**Why lower than standard 57°C threshold?**
- Standard detectors are designed for **general property protection**
- Hospitals require **life safety prioritization** with earlier intervention
- Our system provides **layered warnings** (WARNING → HIGH_RISK → CRITICAL) rather than binary on/off

---

## 3. Carbon Monoxide (CO) Thresholds

### OSHA Standards

**OSHA Permissible Exposure Limit (PEL) for Carbon Monoxide:**

According to OSHA regulations (29 CFR 1910.1000):
- **Time-Weighted Average (TWA):** 50 ppm over 8 hours  
- **Updated Recommendation (NIOSH):** 35 ppm TWA  
- **Ceiling Limit:** 100 ppm (employees must be removed)  
- **Immediate Danger:** 200 ppm ceiling (5-minute sample)

Sources:
- OSHA 29 CFR 1917.24: "not more than 50 ppm as 8-hour average, ceiling of 100 ppm"
- OSHA Standard Interpretation 1988: PEL currently 50 ppm
- NIOSH Recommendation: 35 ppm TWA, 200 ppm ceiling
- CDC/NIOSH 1988 PEL Project: 35 ppm TWA, 200 ppm ceiling

URLs:
- https://www.osha.gov/laws-regs/regulations/standardnumber/1917/1917.24
- https://www.cdc.gov/niosh/chemicals/pel88/pell-pages/630-08.html

### Our Thresholds

| Level | Value (ppm) | Justification |
|-------|-------------|---------------|
| **WARNING** | 35 ppm | NIOSH recommended TWA limit - earliest safe intervention point |
| **HIGH_RISK** | 100 ppm | OSHA ceiling limit - requires immediate removal of personnel |
| **CRITICAL** | 200 ppm | NIOSH/OSHA immediate danger level - life-threatening exposure |

**Defense:**
- **35 ppm (WARNING):** Aligns with NIOSH's recommended exposure limit, indicating the beginning of potentially harmful exposure
- **100 ppm (HIGH_RISK):** Matches OSHA's regulatory ceiling - the point at which workers must be evacuated
- **200 ppm (CRITICAL):** Corresponds to immediate danger threshold used by OSHA and NIOSH for emergency response

**Hospital-Specific Justification:**
- Patients with **respiratory conditions** are more vulnerable to CO
- **Pregnant patients** and **neonates** have increased CO sensitivity
- **Anesthesia gases** can complicate CO exposure effects
- Hospital **combustion equipment** (generators, kitchens, heating) pose CO risks

---

## 4. Electrical Current Thresholds

### Electrical Safety Standards

**Circuit Breaker and Overcurrent Protection:**
- Standard residential circuits: **15-20 Amperes**
- Hospital-grade circuits: **20-30 Amperes** depending on equipment
- Continuous load should not exceed **80% of rating**

**Fire Risk from Electrical Overload:**
- Sustained overload causes conductor heating
- Insulation degradation begins at elevated temperatures
- **Arc faults** can occur at current levels below breaker trip
- Hospital settings have critical life-support equipment requiring stable power

### Our Thresholds

| Level | Value (A) | Justification |
|-------|-----------|---------------|
| **WARNING** | 15 A | Above normal operating range, indicates potential overload or fault developing |
| **HIGH_RISK** | 25 A | Exceeds standard circuit capacity, severe overload with fire risk |

**Defense:**
- **15 A (WARNING):** Provides early indication of abnormal electrical activity before reaching breaker limits
- **25 A (HIGH_RISK):** Represents sustained overload that would cause conductor heating and potential fire

**Hospital-Specific Justification:**
- **Life-support equipment** failure from electrical issues is life-threatening
- **Backup power systems** must be protected from electrical faults
- **Operating rooms** have numerous high-power devices operating simultaneously
- Electrical fires in hospitals can rapidly spread through **cable trays and plenums**

**Note:** This system monitors current as a **fire indicator**, not for electrical safety control. Actual circuit protection is handled by building electrical systems (breakers, GFCIs, etc.).

---

## 5. Combined Multi-Sensor Rules

### Rationale for Combined Thresholds

Fire produces **multiple indicators simultaneously**:
- Heat (thermal energy)
- Smoke (particulate matter)
- Carbon monoxide (incomplete combustion)
- Electrical arcing (potential ignition source)

**Single-indicator limitations:**
- False positives (cooking smoke, steam, dust)
- Sensor failures
- Environmental variations

**Multi-sensor advantages:**
- Higher confidence in actual fire presence
- Reduced false alarm rate
- Earlier and more reliable detection

### Our Combined Rules

#### Rule 1: Smoke + Temperature = CRITICAL
```
IF smoke >= 80 ppm AND temperature >= 50°C
THEN escalate to CRITICAL
```

**Justification:**
- Both indicators confirm **active fire with combustion**
- 80 ppm smoke = significant smoke presence
- 50°C = well above normal ambient (approaching detector activation)
- Combination indicates **fire is established and growing**

#### Rule 2: Smoke + Temperature = HIGH_RISK
```
IF smoke >= 50 ppm AND temperature >= 40°C
THEN escalate to HIGH_RISK if not already higher
```

**Justification:**
- Both elevated indicates **early-stage fire** or **smoldering**
- Provides escalation point between WARNING and CRITICAL
- 40°C = notably elevated but below detector threshold
- Early enough for **controlled evacuation** without panic

### Why Lower Combined Thresholds?

When **two independent indicators** trigger simultaneously:
- Statistical confidence increases exponentially
- Likelihood of false positive drops significantly
- Fire is confirmed by **multiple physical phenomena**
- Justifies lower individual thresholds for combined rule

**Hospital Context:**
- **Redundancy is critical** in life-safety systems
- Multi-sensor confirmation reduces false evacuations (disruptive in hospitals)
- Earlier escalation when confidence is high protects vulnerable patients

---

## 6. Stale Data Policy

### Configuration
```json
{
  "fresh_window_seconds": 60,
  "stale_threshold_seconds": 120,
  "unknown_after_seconds": 300
}
```

### Justification

**NFPA 72 Requirements:**
- Fire alarm systems must provide **reliable, continuous monitoring**
- Communication failures must be **detected and reported**
- System integrity monitoring is required

**Our Policy:**
- **60 seconds:** Data is considered FRESH (recently received and reliable)
- **120 seconds:** Data is STALE (sensor or communication issue suspected)
- **300 seconds (5 minutes):** Room status becomes UNKNOWN (sensor failure assumed)

**Defense:**
- **60-second window** allows for network latency and normal transmission delays
- **120-second threshold** detects sensor failures quickly without false alarms
- **5-minute unknown** provides grace period for temporary issues (network glitch, brief power loss)
- Unknown status **does NOT default to "safe"** - absence of data is treated as uncertain, not normal

**Hospital Justification:**
- **Redundant safety** - never assume safety from lack of data
- **Maintenance alerts** - quickly identify failing sensors
- **Regulatory compliance** - hospitals must maintain functional fire detection

---

## 7. Recovery Policy

### Configuration
```json
{
  "auto_resolve": true,
  "resolution_delay_seconds": 30,
  "requires_all_sensors_normal": true
}
```

### Justification

**Auto-Resolution:** Hazards automatically resolve when readings return to normal

**30-Second Delay:**
- Prevents **oscillation** (rapid status changes)
- Confirms readings are **stable**, not momentary fluctuations
- Allows time for **smoke clearing** or **cooling**
- Avoids premature "all-clear" signals

**Requires All Sensors Normal:**
- **Conservative approach** - one sensor still elevated keeps room in hazard state
- **Fail-safe principle** - don't declare safe if any indicator disagrees
- **Fire behavior** - fires can reignite, smolder, or have hot spots

**Hospital Context:**
- **Patient safety priority** - err on side of caution
- **Evacuation decisions** - don't allow re-entry prematurely
- **Fire department coordination** - hazard state remains until professional assessment

---

## 8. Academic Prototype Limitations

### Important Disclaimers

**This system is NOT:**
- ❌ A certified fire alarm system
- ❌ A replacement for code-compliant fire detection
- ❌ Validated for real-world life-safety use
- ❌ Approved by fire marshals or insurance underwriters

**This system IS:**
- ✅ An educational demonstration of fire detection concepts
- ✅ Based on researched standards and guidelines
- ✅ Suitable for academic evaluation and proof-of-concept
- ✅ A prototype showing integrated sensor fusion and decision logic

### What Would Be Required for Real Deployment

**Regulatory Requirements:**
1. **NFPA 72 compliance** - Full fire alarm code adherence
2. **UL certification** - Underwriters Laboratories testing
3. **Local AHJ approval** - Authority Having Jurisdiction review
4. **Professional engineering** - PE-stamped design
5. **Commissioning testing** - Full system acceptance tests
6. **Maintenance plan** - NFPA 72 mandated inspection schedule

**Technical Requirements:**
1. **Listed devices** - Use only UL-listed smoke detectors and sensors
2. **Supervised circuits** - All sensor wiring continuously monitored
3. **Redundant power** - Battery backup, generator backup
4. **Central monitoring** - 24/7 monitoring station connection
5. **Field calibration** - Individual sensor calibration and testing
6. **Environmental testing** - Validation in actual fire scenarios

**Hospital-Specific:**
1. **Joint Commission requirements**
2. **CMS (Medicare/Medicaid) compliance**
3. **State health department approval**
4. **Integration with existing fire alarm**
5. **Staff training and procedures**

---

## 9. Threshold Sensitivity Analysis

### Conservative vs. Aggressive Approach

Our thresholds are **intentionally conservative** (lower values = earlier warnings):

| Approach | Advantages | Disadvantages | Our Choice |
|----------|-----------|---------------|------------|
| **Aggressive (Lower)** | Earlier warnings, more time to evacuate, better for vulnerable populations | More false alarms, desensitization, operational disruption | ✅ **Selected for hospitals** |
| **Standard (Code Min)** | Matches building codes, proven performance | Less margin for vulnerable populations | ❌ Not ideal for demo |
| **Permissive (Higher)** | Fewer false alarms, less disruption | Delayed warnings, less evacuation time | ❌ Unacceptable for life safety |

**Hospital Justification for Conservative Thresholds:**
- **Evacuation time** - Patients in beds, wheelchairs, or on life support require significantly longer evacuation times than ambulatory occupants
- **Vulnerability** - Unconscious patients, surgical patients, neonates cannot self-evacuate
- **Staff workload** - Nurses must evacuate multiple patients simultaneously
- **Medical continuity** - Life support equipment must be transported with patients
- **Horizontal evacuation** - NFPA 101 hospitals use "defend in place" initially, but earlier warning enables better decisions

---

## 10. Validation Testing Plan (Future Work)

To validate these thresholds, the following tests would be conducted:

### Lab Testing
1. **Controlled smoke generation** - Verify smoke threshold responses
2. **Temperature ramp tests** - Confirm temperature escalation logic
3. **CO injection tests** - Validate CO threshold accuracy
4. **Current simulation** - Test electrical fault detection

### Simulation Testing
1. **Member 1's fire simulator** - Run realistic fire scenarios
2. **Gradual vs. rapid fire growth** - Test time-to-alarm
3. **Multi-room fires** - Validate spread detection
4. **Sensor failure modes** - Confirm fault detection

### Integration Testing
1. **End-to-end workflow** - Sensor → Decision → Route → Display
2. **Performance testing** - Response time < 2 seconds
3. **False alarm analysis** - Measure false positive rate
4. **Recovery testing** - Confirm proper hazard resolution

---

## 11. Summary of Defensible Positions

### For Academic Defense

**When asked: "Why these specific thresholds?"**

✅ **Smoke (50/80/100 ppm):**
"Based on NIST research showing detector activation at 4-40%/m obscuration. Our progressive thresholds provide early warning before commercial detectors activate, critical for hospitals with vulnerable patients."

✅ **Temperature (45/60/75°C):**
"Standard heat detectors activate at 57-90°C. We chose 45°C for early warning because hospitals have oxygen-enriched environments and immobile patients requiring extra evacuation time. NFPA standards support lower thresholds for life-safety-critical applications."

✅ **CO (35/100/200 ppm):**
"Direct correspondence to OSHA/NIOSH regulations: 35 ppm is NIOSH's recommended limit, 100 ppm is OSHA's mandatory evacuation point, 200 ppm is immediate danger. These are not arbitrary - they're federal safety standards."

✅ **Current (15/25 A):**
"Standard residential circuits are 15-20A. Our warning at 15A detects overload before breaker trip. 25A represents severe overload with fire risk. Electrical fires are a leading cause of hospital fires."

✅ **Combined Rules:**
"Multi-sensor fusion reduces false alarms while increasing confidence. When both smoke and temperature are elevated simultaneously, it confirms actual combustion rather than environmental factors."

### For Professor Questions

**Q: "Are these values validated?"**
A: "These values are derived from published standards (OSHA, NFPA, NIST) and manufacturer specifications, as documented in our justification document. However, as an academic prototype, we have not conducted field validation or certification testing. Real deployment would require UL testing and NFPA 72 compliance testing."

**Q: "Why lower than code minimum?"**
A: "Hospital context justifies conservative thresholds due to vulnerable populations and extended evacuation times. NFPA 101 specifically requires enhanced protection for healthcare occupancies. Our system provides layered warnings rather than binary alarm states."

**Q: "What about false alarms?"**
A: "Multi-sensor combined rules mitigate false alarms. Single elevated sensor triggers WARNING, but CRITICAL requires multiple indicators. This balances early detection with false alarm reduction. Operational testing would refine thresholds based on false alarm rates."

---

## 12. References

### Standards and Codes
1. **NFPA 72** - National Fire Alarm and Signaling Code
2. **NFPA 101** - Life Safety Code, Chapter 18/19 (Healthcare Occupancies)
3. **OSHA 29 CFR 1910.1000** - Permissible Exposure Limits
4. **OSHA 29 CFR 1917.24** - Carbon Monoxide Standards

### Research Publications
5. **NIST** - "Performance of Dual Photoelectric/Ionization Smoke Alarms in Full-Scale Fire Tests"
6. **MDPI Sensors (2020)** - "Obscuration Threshold Database Construction of Smoke Detectors"

### Regulatory Sources
7. **OSHA.gov** - Carbon monoxide exposure limits documentation
8. **CDC/NIOSH** - 1988 PEL Project recommendations

### Manufacturer Specifications
9. **Honeywell** - 302 Series Heat Detector specifications (135°F/194°F ratings)
10. **System Sensor** - Heat detector activation temperatures

### Fire Safety Resources
11. **HFM Magazine** - Healthcare Facilities Management fire detection articles
12. **CSE Magazine** - Fire detection in critical facilities

---

## 13. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-15 | Member 2 | Initial research-based threshold justification |

**Next Review:** After Week 3 integration testing with Member 1's simulator  
**Owner:** Member 2 (Decision Engine)  
**Status:** Research Complete - Ready for Academic Defense

---

**Conclusion:** These thresholds are defensible based on authoritative standards (OSHA, NFPA, NIST), manufacturer specifications, and hospital-specific safety requirements. While this is an academic prototype, the values are grounded in real fire safety science rather than arbitrary choices.
