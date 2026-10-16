# Quick Defense Reference - Threshold Values

**For Presentation / Demo / Questions**

---

## 🔥 Smoke Thresholds

| Level | Value | Source/Defense |
|-------|-------|----------------|
| WARNING | 50 ppm | Below NIST detector activation levels (4-40%/m obscuration). Early warning phase. |
| HIGH_RISK | 80 ppm | Approaching detector activation. NIST research shows ionization detectors at 16-40%/m. |
| CRITICAL | 100 ppm | Exceeds typical activation thresholds. Dense smoke confirmed. |

**Key Defense:** "NIST research shows smoke detectors activate between 4-40%/m obscuration depending on type. Our progressive thresholds provide early warning before commercial detectors activate."

---

## 🌡️ Temperature Thresholds

| Level | Value | Source/Defense |
|-------|-------|----------------|
| WARNING | 45°C (113°F) | Below standard detector threshold of 57°C (135°F). Early warning for hospital context. |
| HIGH_RISK | 60°C (140°F) | Just above standard fixed detector activation (57°C). Fire likely present. |
| CRITICAL | 75°C (167°F) | Well above all standard thresholds. Active fire confirmed. |

**Key Defense:** "Standard heat detectors activate at 57-90°C (135-194°F) per manufacturer specs (Honeywell, System Sensor). We chose 45°C for early warning because hospitals have vulnerable populations requiring extra evacuation time."

---

## 💨 Carbon Monoxide Thresholds

| Level | Value | Source/Defense |
|-------|-------|----------------|
| WARNING | 35 ppm | **NIOSH recommended TWA** - Federal guideline |
| HIGH_RISK | 100 ppm | **OSHA ceiling limit** - Mandatory evacuation point (29 CFR 1917.24) |
| CRITICAL | 200 ppm | **NIOSH/OSHA immediate danger** - Life-threatening exposure |

**Key Defense:** "These are not arbitrary. 35 ppm is NIOSH's recommended exposure limit, 100 ppm is OSHA's mandatory evacuation ceiling, 200 ppm is federal immediate danger level. Direct from OSHA regulations 29 CFR 1917.24."

---

## ⚡ Electrical Current Thresholds

| Level | Value | Source/Defense |
|-------|-------|----------------|
| WARNING | 15 A | Standard residential circuit capacity (15-20A). Indicates potential overload. |
| HIGH_RISK | 25 A | Exceeds standard circuit rating. Severe overload with fire risk. |

**Key Defense:** "Standard residential circuits are rated 15-20 Amperes. Our 15A warning detects abnormal activity before breaker trip. 25A represents sustained dangerous overload."

---

## 🔗 Combined Multi-Sensor Rules

### Rule 1: CRITICAL Escalation
**IF** smoke >= 80 ppm **AND** temperature >= 50°C  
**THEN** escalate to CRITICAL

**Defense:** "Two independent indicators confirm active fire with combustion. Multi-sensor fusion increases confidence and reduces false alarms."

### Rule 2: HIGH_RISK Escalation
**IF** smoke >= 50 ppm **AND** temperature >= 40°C  
**THEN** escalate to HIGH_RISK

**Defense:** "Early-stage fire or smoldering confirmed by multiple physical phenomena. Provides graduated response for controlled evacuation."

---

## 📊 Why Conservative (Lower) Thresholds for Hospitals?

**Hospital-Specific Justification:**

1. **Vulnerable Populations**
   - Patients in beds, wheelchairs, on ventilators
   - Unconscious or sedated patients
   - Neonatal ICU, elderly care

2. **Extended Evacuation Times**
   - Must transport life-support equipment
   - Nurses evacuate multiple patients
   - Horizontal evacuation to adjacent compartments

3. **Oxygen-Enriched Environment**
   - Amplifies fire growth rate
   - Increases fire risk from ignition sources

4. **Critical Medical Operations**
   - Ongoing surgeries cannot be rapidly interrupted
   - Need maximum warning time for controlled shutdown

5. **NFPA 101 Healthcare Requirements**
   - Enhanced protection for healthcare occupancies
   - Stricter safety margins than general buildings

**Key Quote:** *"Our thresholds provide layered warnings (WARNING → HIGH_RISK → CRITICAL) rather than binary on/off, giving hospital staff time to safely evacuate vulnerable patients."*

---

## 🛡️ Stale Data Policy

| Timing | Status | Defense |
|--------|--------|---------|
| < 60 seconds | FRESH | Normal operation |
| 60-120 seconds | STALE | Sensor/communication issue suspected |
| > 300 seconds (5 min) | UNKNOWN | Sensor failure assumed, room status uncertain |

**Key Defense:** "We NEVER assume safety from lack of data. Unknown status is treated as uncertain, not normal. NFPA 72 requires continuous monitoring and fault detection."

---

## 📚 Primary Sources Cited

1. **NIST** - Smoke detector performance research (obscuration thresholds)
2. **OSHA 29 CFR 1917.24** - Carbon monoxide exposure limits
3. **NIOSH** - PEL recommendations (35 ppm CO TWA, 200 ppm ceiling)
4. **MDPI Sensors (2020)** - Smoke detector threshold database
5. **Honeywell / System Sensor** - Heat detector activation temperatures (57-90°C)
6. **NFPA 101** - Life Safety Code for Healthcare Occupancies
7. **NFPA 72** - National Fire Alarm and Signaling Code

---

## ⚠️ Academic Prototype Disclaimer

**Always state:**
"This is an academic prototype demonstrating fire detection concepts. It is NOT a certified fire alarm system and would require UL testing, NFPA 72 compliance, and Authority Having Jurisdiction approval for real deployment. All threshold values are derived from published standards for educational demonstration purposes."

---

## 🎯 Quick Response to Common Questions

**Q: "Are these values validated?"**
A: "Derived from published standards (OSHA, NFPA, NIST) as documented. Not field-validated as this is an academic prototype."

**Q: "Why lower than code minimum?"**
A: "Hospital vulnerable populations and extended evacuation times justify conservative approach. NFPA 101 specifically requires enhanced protection for healthcare occupancies."

**Q: "What about false alarms?"**
A: "Multi-sensor combined rules mitigate false alarms. Single elevated sensor = WARNING. CRITICAL requires multiple indicators confirming actual fire."

**Q: "What would real deployment require?"**
A: "UL certification, NFPA 72 compliance testing, fire marshal approval, professional engineering stamp, commissioning tests, 24/7 monitoring, maintenance plan per NFPA requirements."

---

**Print this page and keep it handy for demos and defense! 📄**
