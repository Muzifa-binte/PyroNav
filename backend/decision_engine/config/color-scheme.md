# Hazard Level Color Scheme - Member 2

## Color Mapping for 2D Heatmap

Use these colors when rendering rooms in your 2D heatmap dashboard.

### Hazard Level Colors

| Hazard Level | Color Name | Hex Code | RGB | Usage |
|--------------|------------|----------|-----|-------|
| **NORMAL** | Green | `#4CAF50` | rgb(76, 175, 80) | Room is safe, all sensors normal |
| **WARNING** | Yellow | `#FFC107` | rgb(255, 193, 7) | Elevated readings, caution advised |
| **HIGH_RISK** | Orange | `#FF9800` | rgb(255, 152, 0) | Dangerous conditions, blocks routes |
| **CRITICAL** | Red | `#F44336` | rgb(244, 67, 54) | Immediate danger, evacuation required |
| **UNKNOWN** | Gray | `#9E9E9E` | rgb(158, 158, 158) | No sensor data or stale data |

### CSS Variables (For Frontend)

```css
:root {
  /* Hazard Level Colors */
  --hazard-normal: #4CAF50;
  --hazard-warning: #FFC107;
  --hazard-high-risk: #FF9800;
  --hazard-critical: #F44336;
  --hazard-unknown: #9E9E9E;
  
  /* Lighter Variants (for backgrounds) */
  --hazard-normal-light: #C8E6C9;
  --hazard-warning-light: #FFF9C4;
  --hazard-high-risk-light: #FFE0B2;
  --hazard-critical-light: #FFCDD2;
  --hazard-unknown-light: #F5F5F5;
  
  /* Darker Variants (for borders/text) */
  --hazard-normal-dark: #388E3C;
  --hazard-warning-dark: #F57C00;
  --hazard-high-risk-dark: #E65100;
  --hazard-critical-dark: #C62828;
  --hazard-unknown-dark: #616161;
}
```

### JavaScript Color Map

```javascript
const HAZARD_COLORS = {
  NORMAL: '#4CAF50',
  WARNING: '#FFC107',
  HIGH_RISK: '#FF9800',
  CRITICAL: '#F44336',
  UNKNOWN: '#9E9E9E'
};

function getRoomColor(hazardLevel) {
  return HAZARD_COLORS[hazardLevel] || HAZARD_COLORS.UNKNOWN;
}
```

### Canvas Rendering Example

```javascript
function drawRoom(ctx, room) {
  const color = HAZARD_COLORS[room.current_hazard_level];
  ctx.fillStyle = color;
  ctx.fillRect(room.position.x, room.position.y, 
               room.dimensions.width, room.dimensions.depth);
}
```

### Visual Legend Component

For your UI, create a legend showing all colors:

```
Legend:
🟢 NORMAL     - All systems operational
🟡 WARNING    - Elevated readings detected
🟠 HIGH RISK  - Dangerous conditions present
🔴 CRITICAL   - Immediate evacuation required
⚪ UNKNOWN    - Sensor data unavailable
```

### Data Quality Colors (Secondary)

| Status | Color | Hex Code | Usage |
|--------|-------|----------|-------|
| FRESH | Green | `#66BB6A` | Data < 60 seconds old |
| PARTIAL | Yellow | `#FFEB3B` | Some sensors stale |
| STALE | Orange | `#FF9800` | Data > 120 seconds old |
| NO_DATA | Gray | `#BDBDBD` | Never received data |

### Notification Severity Colors

| Severity | Badge Color | Hex Code |
|----------|-------------|----------|
| CRITICAL | Red | `#F44336` |
| HIGH_RISK | Orange | `#FF9800` |
| WARNING | Yellow | `#FFC107` |
| INFO | Blue | `#2196F3` |

### Animation Suggestions

**Room Status Change:**
- Fade transition between colors (0.5s ease-in-out)
- Pulse effect for CRITICAL (subtle glow)
- Gray out with opacity for UNKNOWN

**New Notification:**
- Slide in from right
- Flash badge color once
- Bounce animation for CRITICAL alerts

### Accessibility Considerations

**Do NOT rely on color alone:**
- Add icon indicators: ✓ (normal), ⚠ (warning), 🔥 (critical), ? (unknown)
- Use text labels always
- Ensure sufficient contrast ratios
- Provide pattern/texture alternatives for colorblind users

**Pattern Suggestions:**
- NORMAL: Solid fill
- WARNING: Diagonal lines
- HIGH_RISK: Cross-hatch
- CRITICAL: Dense dots/stipple
- UNKNOWN: Light dots

### Testing Your Color Scheme

1. **Normal Vision:** Colors should be distinct at a glance
2. **Colorblind (Protanopia):** Test with colorblind simulator
3. **Grayscale:** Colors should have different brightness levels
4. **High Contrast Mode:** Ensure borders/text are visible

### Color Contrast Ratios (WCAG AA)

| Background | Text Color | Contrast Ratio | Pass? |
|------------|------------|----------------|-------|
| #4CAF50 (Normal) | White | 3.4:1 | ⚠️ Use dark text |
| #FFC107 (Warning) | Black | 10.4:1 | ✅ Pass |
| #FF9800 (High Risk) | Black | 7.5:1 | ✅ Pass |
| #F44336 (Critical) | White | 4.5:1 | ✅ Pass |
| #9E9E9E (Unknown) | White | 2.8:1 | ⚠️ Use dark text |

**Recommendation:** Use white text on CRITICAL/HIGH_RISK, black text on WARNING/NORMAL/UNKNOWN.

---

**Created:** October 15, 2026  
**For:** Member 2 Frontend Development  
**Use:** Week 1 2D Heatmap Implementation
