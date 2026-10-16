# PyroNav — UI/UX Specification

**Project:** PyroNav — Autonomous, Cyber-Defended Emergency Egress & Predictive Fire Safety Infrastructure  
**Document:** User Interface & User Experience Specification  
**Version:** 1.0  
**Status:** Design Specification  
**Date:** 13 October 2026

---

## 1. Design Philosophy

### 1.1 Core Principles

**Safety First, Beauty Second**
- Critical information must be immediately visible
- Animations should enhance understanding, not distract
- Color coding must be intuitive and accessible

**Dual Theme Support**
- Light theme (default) for daytime use and well-lit environments
- Dark theme for low-light conditions and reduced eye strain
- Smooth theme transitions with localStorage persistence
- Theme-aware components that adapt colors, shadows, and effects

**Elegant Minimalism**
- Clean, uncluttered interface
- Information hierarchy: most critical → most prominent
- White space as a design element
- Glass morphism for depth and sophistication (adaptive to theme)

**Smooth & Responsive**
- 60 FPS animations
- Fluid transitions between states
- Immediate visual feedback
- Loading states that don't feel like waiting

**Professional & Trustworthy**
- Adaptive theme with accent colors for emergency context
- Consistent spacing and alignment
- Polished micro-interactions
- Enterprise-grade feel

---

## 2. Visual Design System

### 2.1 Theme System (Light & Dark Mode)

PyroNav supports both light and dark themes with a smooth toggle transition. The theme preference is saved to localStorage.

**Theme Toggle Implementation:**
```javascript
// Theme management
const themeToggle = {
  init() {
    const savedTheme = localStorage.getItem('pyronav-theme') || 'light';
    this.setTheme(savedTheme);
  },
  
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pyronav-theme', theme);
  },
  
  toggle() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
};
```

### 2.2 Color Palette (Dual Theme)

**Light Theme (Default)**
```css
[data-theme="light"] {
  /* Background Colors */
  --bg-primary: #ffffff;           /* Pure white background */
  --bg-secondary: #f8fafc;         /* Light gray for cards */
  --bg-tertiary: #f1f5f9;          /* Elevated surfaces */
  
  /* Glass Morphism */
  --glass-bg: rgba(255, 255, 255, 0.8);
  --glass-border: rgba(0, 0, 0, 0.1);
  --glass-shadow: rgba(0, 0, 0, 0.1);
  
  /* Text */
  --text-primary: #0f172a;         /* Almost black */
  --text-secondary: #475569;       /* Medium gray */
  --text-muted: #94a3b8;           /* Light gray */
  
  /* Accent */
  --accent-blue: #3b82f6;          /* Primary actions */
  --accent-cyan: #06b6d4;          /* Information highlights */
  --accent-purple: #8b5cf6;        /* Special features */
  
  /* Borders & Dividers */
  --border-color: #e2e8f0;
  --divider-color: #cbd5e1;
}

/* Dark Theme */
[data-theme="dark"] {
  /* Background Colors */
  --bg-primary: #0a0e1a;           /* Deep navy background */
  --bg-secondary: #151b2e;         /* Card/panel background */
  --bg-tertiary: #1e2740;          /* Elevated surfaces */
  
  /* Glass Morphism */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: rgba(0, 0, 0, 0.3);
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #b4bcd0;
  --text-muted: #6c7689;
  
  /* Accent */
  --accent-blue: #3b82f6;          /* Primary actions */
  --accent-cyan: #06b6d4;          /* Information highlights */
  --accent-purple: #8b5cf6;        /* Special features */
  
  /* Borders & Dividers */
  --border-color: #1e293b;
  --divider-color: #334155;
}

/* Smooth theme transition */
* {
  transition: background-color 0.3s ease, 
              border-color 0.3s ease, 
              color 0.3s ease;
}
```

**Hazard Level Colors (Theme Independent)**
```css
/* Status Colors - Same for both themes, carefully chosen for accessibility */
:root {
  --status-normal: #10b981;        /* Emerald green */
  --status-warning: #f59e0b;       /* Amber */
  --status-high-risk: #f97316;     /* Orange */
  --status-critical: #ef4444;      /* Red */
  --status-unknown: #6b7280;       /* Gray */
  
  /* Glow effects - adjusted opacity per theme */
  --glow-normal: rgba(16, 185, 129, 0.3);
  --glow-warning: rgba(245, 158, 11, 0.3);
  --glow-high-risk: rgba(249, 115, 22, 0.3);
  --glow-critical: rgba(239, 68, 68, 0.3);
}

/* Light theme - more subtle glows */
[data-theme="light"] {
  --glow-normal: rgba(16, 185, 129, 0.2);
  --glow-warning: rgba(245, 158, 11, 0.2);
  --glow-high-risk: rgba(249, 115, 22, 0.2);
  --glow-critical: rgba(239, 68, 68, 0.2);
}

/* Dark theme - stronger glows */
[data-theme="dark"] {
  --glow-normal: rgba(16, 185, 129, 0.4);
  --glow-warning: rgba(245, 158, 11, 0.4);
  --glow-high-risk: rgba(249, 115, 22, 0.4);
  --glow-critical: rgba(239, 68, 68, 0.4);
}
```

### 2.3 Typography

```css
/* Font Stack */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Fira Code', 'Consolas', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px - labels */
--text-sm: 0.875rem;   /* 14px - secondary text */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - headings */
--text-xl: 1.25rem;    /* 20px - section titles */
--text-2xl: 1.5rem;    /* 24px - page titles */
--text-3xl: 2rem;      /* 32px - hero text */

/* Font Weights */
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### 2.4 Spacing System

```css
/* Consistent 8px grid */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 2.5 Border Radius

```css
--radius-sm: 0.375rem;   /* 6px - buttons */
--radius-md: 0.5rem;     /* 8px - cards */
--radius-lg: 0.75rem;    /* 12px - panels */
--radius-xl: 1rem;       /* 16px - modals */
--radius-full: 9999px;   /* Pills, avatars */
```

### 2.6 Shadows & Depth (Theme Adaptive)

```css
/* Light theme shadows */
[data-theme="light"] {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.15);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* Glow effects for alerts */
  --shadow-critical: 0 0 20px var(--glow-critical);
  --shadow-warning: 0 0 15px var(--glow-warning);
}

/* Dark theme shadows */
[data-theme="dark"] {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  
  /* Glow effects for alerts */
  --shadow-critical: 0 0 20px var(--glow-critical);
  --shadow-warning: 0 0 15px var(--glow-warning);
}
```

---

## 3. Layout Architecture

### 3.0 Theme Toggle System

**Complete React Component Implementation:**

```jsx
// ThemeToggle.jsx
import React, { useEffect, useState } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('pyronav-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('pyronav-theme', newTheme);
  };
  
  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <svg className="theme-icon sun-icon" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" fill="currentColor"/>
        <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
        <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2"/>
        <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2"/>
        <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2"/>
      </svg>
      <svg className="theme-icon moon-icon" viewBox="0 0 24 24">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
      </svg>
    </button>
  );
};

export default ThemeToggle;
```

**Theme Context Provider (Recommended):**

```jsx
// ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('pyronav-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('pyronav-theme', newTheme);
  };
  
  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
```

---

## 3. Layout Architecture

### 3.1 Overall Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Top Navigation Bar (64px height)                               │
│  Logo | Building Selector | Status Indicators | User Menu       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┬──────────────────────────────┬────────────────┐ │
│  │            │                              │                │ │
│  │   Left     │      Main Content Area       │  Right Panel   │ │
│  │   Sidebar  │      (Dynamic Views)         │  (Contextual)  │ │
│  │            │                              │                │ │
│  │  • 3D View │   - 2D Heatmap Dashboard     │  • Sensor      │ │
│  │  • Routes  │   - 2D Route Visualization   │    Details     │ │
│  │  • Alerts  │   - 3D Building Editor       │  • Room Info   │ │
│  │  • History │   - Analytics                │  • Alerts      │ │
│  │  • Settings│                              │  • Timeline    │ │
│  │            │                              │                │ │
│  │  260px     │        Flexible Width        │    340px       │ │
│  │            │                              │                │ │
│  └────────────┴──────────────────────────────┴────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Breakpoints

```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Ultra-wide */

/* Layout adaptations */
< 768px:  Single column, collapsible sidebar, bottom navigation
768-1024px: Two column, floating panels
> 1024px: Full three-column layout
```

---

## 4. Component Design Specifications

### 4.1 Top Navigation Bar (Theme Adaptive)

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔥 PyroNav]    [🏢 Hospital - Main Building ▾]                │
│                                                                  │
│                     Status: ● All Systems Operational           │
│                                                                  │
│                             [🌙/☀️] [🔔 3] [👤 Admin ▾]        │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Glass morphism background with backdrop blur (adaptive to theme)
- Logo with subtle animation on load
- Building selector dropdown with smooth expand
- Real-time status indicator with pulse animation
- **Theme toggle button** with smooth icon transition
- Notification bell with badge counter
- User avatar with dropdown menu

**Theme Toggle Button:**
```html
<button class="theme-toggle" onclick="themeToggle.toggle()">
  <svg class="theme-icon sun-icon"><!-- Sun icon --></svg>
  <svg class="theme-icon moon-icon"><!-- Moon icon --></svg>
</button>
```

```css
.theme-toggle {
  position: relative;
  width: 48px;
  height: 48px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.theme-toggle:hover {
  background: var(--bg-tertiary);
  transform: scale(1.05);
}

.theme-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="light"] .sun-icon {
  opacity: 1;
  transform: translate(-50%, -50%) rotate(0deg);
}

[data-theme="light"] .moon-icon {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(180deg) scale(0);
}

[data-theme="dark"] .sun-icon {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(-180deg) scale(0);
}

[data-theme="dark"] .moon-icon {
  opacity: 1;
  transform: translate(-50%, -50%) rotate(0deg);
}
```

**Animation:**
```css
/* Navbar entrance */
animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);

/* Status pulse */
.status-indicator {
  animation: pulse 2s ease-in-out infinite;
}

/* Navbar glass effect - theme adaptive */
.top-navbar {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}
```

### 4.2 Left Sidebar Navigation

**Design:**
```
┌──────────────┐
│              │
│  Navigation  │
│              │
│  ◉ Dashboard │ ← Active (accent gradient)
│  ○ 3D View   │
│  ○ Routes    │
│  ○ Alerts    │
│  ○ History   │
│  ○ Settings  │
│              │
│  ────────    │
│              │
│  Quick Stats │
│  • 24 Rooms  │
│  • 3 Active  │
│  • 0 Critical│
│              │
└──────────────┘
```

**Features:**
- Icons with smooth hover effects
- Active state with gradient background + glow
- Collapse/expand animation (arrow icon rotates)
- Quick stats section at bottom
- Smooth color transitions on hover

**Hover Effect:**
```css
.nav-item:hover {
  background: var(--glass-bg);
  transform: translateX(4px);
  transition: all 0.2s ease;
}

.nav-item.active {
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan));
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}
```

### 4.3 Main Content Area - 2D Heatmap Dashboard

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Building Status Overview                    [Filter ▾] [⟳] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────┐     │
│   │                                                   │     │
│   │         2D Building Map (Canvas/SVG)             │     │
│   │                                                   │     │
│   │    [Rooms with color-coded hazard levels]       │     │
│   │                                                   │     │
│   │    • Smooth pan & zoom                           │     │
│   │    • Hover for room details                      │     │
│   │    • Click for full room info                    │     │
│   │                                                   │     │
│   └──────────────────────────────────────────────────┘     │
│                                                              │
│   Legend: [🟢 Normal] [🟡 Warning] [🟠 High] [🔴 Critical]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Visual Effects:**

1. **Room Rendering:**
```css
.room-normal {
  fill: var(--status-normal);
  filter: drop-shadow(0 0 8px var(--glow-normal));
  transition: all 0.3s ease;
}

.room-critical {
  fill: var(--status-critical);
  filter: drop-shadow(0 0 15px var(--glow-critical));
  animation: criticalPulse 1.5s ease-in-out infinite;
}

@keyframes criticalPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
}
```

2. **Hover Effects:**
```css
.room:hover {
  filter: brightness(1.2) drop-shadow(0 0 20px currentColor);
  transform: scale(1.05);
  z-index: 10;
  cursor: pointer;
}
```

3. **Status Change Animation:**
```javascript
// When room status changes
function animateStatusChange(room, newStatus) {
  // 1. Ripple effect from center
  createRipple(room.center, newStatus);
  
  // 2. Color transition
  room.style.transition = 'fill 0.6s ease-in-out';
  room.style.fill = getStatusColor(newStatus);
  
  // 3. Bounce effect
  room.style.animation = 'statusBounce 0.4s ease-out';
}
```

### 4.4 Main Content Area - 2D Route Visualization

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Evacuation Route                      [Calculate] [Export] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────┐     │
│   │                                                   │     │
│   │         2D Building Map + Route Overlay          │     │
│   │                                                   │     │
│   │    • Animated route path (growing line)          │     │
│   │    • Directional arrows flowing                  │     │
│   │    • Blocked areas with red X pattern            │     │
│   │    • Exit markers pulsing                        │     │
│   │                                                   │     │
│   └──────────────────────────────────────────────────┘     │
│                                                              │
│   Route Info: Reception → Corridor A → EXIT A               │
│   Distance: 24.5m | Status: ✓ Safe Route Found             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Route Animation:**

1. **Path Drawing Effect:**
```css
.evacuation-path {
  stroke: var(--accent-cyan);
  stroke-width: 4;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  filter: drop-shadow(0 0 10px var(--accent-cyan));
  animation: drawPath 2s ease-out forwards;
}

@keyframes drawPath {
  to {
    stroke-dashoffset: 0;
  }
}
```

2. **Flowing Arrows:**
```css
.route-arrow {
  animation: flowArrows 2s linear infinite;
}

@keyframes flowArrows {
  0% { offset-distance: 0%; opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
```

3. **Exit Marker Pulse:**
```css
.exit-marker {
  fill: var(--status-normal);
  animation: exitPulse 2s ease-in-out infinite;
}

@keyframes exitPulse {
  0%, 100% { 
    transform: scale(1);
    filter: drop-shadow(0 0 5px var(--glow-normal));
  }
  50% { 
    transform: scale(1.15);
    filter: drop-shadow(0 0 20px var(--glow-normal));
  }
}
```

4. **Blocked Area Pattern:**
```css
.blocked-area {
  fill: url(#diagonal-stripes);
  opacity: 0.6;
  animation: fadeIn 0.3s ease-out;
}
```

### 4.5 Right Panel - Sensor Details

**Design:**
```
┌────────────────────────────┐
│  Operation Theater         │
│  Status: 🔴 CRITICAL       │
├────────────────────────────┤
│                            │
│  Live Sensor Readings:     │
│                            │
│  🌡️ Temperature            │
│  ▓▓▓▓▓▓▓▓▓░ 68°C          │
│  ⚠️ Above threshold        │
│                            │
│  💨 Smoke Level            │
│  ▓▓▓▓▓▓▓▓▓▓ 120 ppm       │
│  🔴 Critical level         │
│                            │
│  ⚡ Current                │
│  ▓▓▓░░░░░░░ 2.1 A         │
│  ✓ Normal                 │
│                            │
│  🧪 CO Level               │
│  ▓▓░░░░░░░░ 15 ppm        │
│  ✓ Normal                 │
│                            │
├────────────────────────────┤
│  Last Updated: 2s ago      │
└────────────────────────────┘
```

**Features:**

1. **Animated Progress Bars:**
```css
.sensor-bar {
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.sensor-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--status-normal), var(--accent-cyan));
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

/* Shimmer effect on progress bar */
.sensor-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  to { left: 100%; }
}
```

2. **Value Counter Animation:**
```javascript
// Animate number changes
function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16); // 60fps
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || 
        (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}
```

### 4.6 Alert Notifications Panel

**Design:**
```
┌────────────────────────────────────────┐
│  Active Alerts (3)        [Clear All]  │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🔴 CRITICAL                      │ │
│  │ Operation Theater                │ │
│  │ Smoke + Temperature Critical     │ │
│  │ 2 minutes ago          [View →] │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🟡 WARNING                       │ │
│  │ Corridor B                       │ │
│  │ Elevated smoke detected          │ │
│  │ 5 minutes ago          [View →] │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🟠 HIGH RISK                     │ │
│  │ Ward 3                           │ │
│  │ High temperature detected        │ │
│  │ 8 minutes ago          [View →] │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

**Alert Card Animations:**

1. **Entrance Animation:**
```css
.alert-card {
  animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

2. **Critical Alert Pulse:**
```css
.alert-critical {
  background: linear-gradient(
    135deg,
    rgba(239, 68, 68, 0.1),
    rgba(239, 68, 68, 0.05)
  );
  border-left: 4px solid var(--status-critical);
  animation: criticalGlow 2s ease-in-out infinite;
}

@keyframes criticalGlow {
  0%, 100% {
    box-shadow: 0 0 10px var(--glow-critical);
  }
  50% {
    box-shadow: 0 0 20px var(--glow-critical);
  }
}
```

3. **Dismiss Animation:**
```css
.alert-dismiss {
  animation: slideOutRight 0.3s ease-out forwards;
}

@keyframes slideOutRight {
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
```

### 4.7 3D Building Editor

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Building Editor               [Grid] [Snap] [Export JSON]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Tools:        3D Canvas (Three.js)                        │
│   ┌─────────┐                                               │
│   │ [🏠] Add│   • Smooth camera controls                    │
│   │ [📏] Msr│   • Room highlighting on hover                │
│   │ [🚪] Con│   • Sensor placement with drag-drop           │
│   │ [🔥] Sen│   • Exit markers                              │
│   │ [🗑️] Del│   • Measurement tools                         │
│   └─────────┘                                               │
│                                                              │
│   Properties Panel (Right):                                 │
│   • Selected room properties                                │
│   • Position, dimensions                                    │
│   • Sensor assignments                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**3D Interactions:**

1. **Room Hover Effect:**
```javascript
// Three.js hover effect
room.onPointerEnter = () => {
  gsap.to(room.material, {
    opacity: 0.8,
    emissive: new THREE.Color(0x3b82f6),
    emissiveIntensity: 0.3,
    duration: 0.3
  });
};
```

2. **Camera Transitions:**
```javascript
// Smooth camera movement
function focusOnRoom(room) {
  gsap.to(camera.position, {
    x: room.position.x,
    y: room.position.y + 10,
    z: room.position.z + 15,
    duration: 1.2,
    ease: "power2.inOut"
  });
}
```

---

## 5. Micro-Interactions & Animations

### 5.1 Button Interactions

```css
.button-primary {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan));
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  padding: var(--space-3) var(--space-6);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.button-primary::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.button-primary:hover::before {
  width: 300px;
  height: 300px;
}

.button-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.button-primary:active {
  transform: translateY(0);
}
```

### 5.2 Loading States

```css
/* Skeleton loader for cards */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Spinner for actions */
.spinner {
  border: 3px solid var(--bg-tertiary);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 5.3 Toast Notifications

```css
.toast {
  position: fixed;
  bottom: var(--space-8);
  right: var(--space-8);
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-xl);
  animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%) translateY(0);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

.toast-success {
  border-left: 4px solid var(--status-normal);
}

.toast-error {
  border-left: 4px solid var(--status-critical);
}
```

### 5.4 Modal Dialogs

```css
/* Modal backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 26, 0.8);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease-out;
  z-index: 1000;
}

/* Modal content */
.modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  max-width: 600px;
  width: 90%;
  animation: modalZoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1001;
}

@keyframes modalZoomIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

---

## 6. Specialized Components

### 6.1 Live Data Stream Indicator

```html
<div class="live-indicator">
  <span class="pulse-dot"></span>
  <span class="text">LIVE</span>
</div>
```

```css
.live-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: rgba(16, 185, 129, 0.1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--status-normal);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--status-normal);
  border-radius: 50%;
  animation: pulseDot 2s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}
```

### 6.2 Status Badge Component

```html
<span class="status-badge status-critical">
  <span class="status-icon">🔥</span>
  <span class="status-text">CRITICAL</span>
</span>
```

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-critical {
  background: rgba(239, 68, 68, 0.15);
  color: var(--status-critical);
  border: 1px solid var(--status-critical);
  box-shadow: 0 0 15px var(--glow-critical);
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### 6.3 Timeline Component (Event History)

```html
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-dot status-critical"></div>
    <div class="timeline-content">
      <div class="timeline-time">2 min ago</div>
      <div class="timeline-title">Critical Alert</div>
      <div class="timeline-description">
        Operation Theater smoke level critical
      </div>
    </div>
  </div>
  <!-- More items -->
</div>
```

```css
.timeline {
  position: relative;
  padding-left: var(--space-8);
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    180deg,
    var(--status-critical),
    var(--status-warning),
    var(--status-normal)
  );
}

.timeline-item {
  position: relative;
  padding-bottom: var(--space-6);
  animation: fadeInUp 0.5s ease-out;
}

.timeline-dot {
  position: absolute;
  left: -20px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid var(--bg-primary);
  background: var(--status-critical);
  box-shadow: 0 0 10px currentColor;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 6.4 Comparison Card (Dijkstra vs BFS)

```html
<div class="comparison-grid">
  <div class="comparison-card">
    <div class="card-header">
      <h3>Dijkstra's Algorithm</h3>
      <span class="badge-recommended">Recommended</span>
    </div>
    <div class="metric">
      <span class="metric-label">Distance</span>
      <span class="metric-value">24.5m</span>
    </div>
    <div class="metric">
      <span class="metric-label">Safety Score</span>
      <span class="metric-value">95%</span>
    </div>
  </div>
  
  <div class="comparison-card">
    <div class="card-header">
      <h3>BFS Algorithm</h3>
    </div>
    <div class="metric">
      <span class="metric-label">Hops</span>
      <span class="metric-value">4</span>
    </div>
    <div class="metric">
      <span class="metric-label">Safety Score</span>
      <span class="metric-value">87%</span>
    </div>
  </div>
</div>
```

```css
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
}

.comparison-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all 0.3s ease;
}

.comparison-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: var(--accent-blue);
}

.badge-recommended {
  background: linear-gradient(135deg, var(--status-normal), #059669);
  color: white;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
}
```

---

## 7. Advanced Visual Effects

### 7.1 Glassmorphism Cards (Theme Adaptive)

```css
/* Light theme glass card */
[data-theme="light"] .glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* Dark theme glass card */
[data-theme="dark"] .glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### 7.2 Gradient Borders

```css
.gradient-border {
  position: relative;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  padding: 2px;
  background: linear-gradient(
    135deg,
    var(--accent-blue),
    var(--accent-purple),
    var(--accent-cyan)
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

### 7.3 Animated Gradient Background (Theme Adaptive)

```css
/* Light theme - subtle gradient animation */
[data-theme="light"] .animated-gradient-bg {
  background: linear-gradient(
    -45deg,
    #ffffff,
    #f8fafc,
    #f1f5f9,
    #e2e8f0
  );
  background-size: 400% 400%;
  animation: gradientShift 20s ease infinite;
}

/* Dark theme - richer gradient animation */
[data-theme="dark"] .animated-gradient-bg {
  background: linear-gradient(
    -45deg,
    #0a0e1a,
    #151b2e,
    #1e2740,
    #0f1729
  );
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

### 7.4 Particle Effect for Critical Alerts

```javascript
// Canvas-based particle system
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }
  
  createParticle(x, y, color) {
    return {
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      color,
      life: 1
    };
  }
  
  emit(x, y, count = 20, color = '#ef4444') {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(x, y, color));
    }
  }
  
  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravity
      p.life -= 0.02;
      return p.life > 0;
    });
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }
}
```

---

## 8. Responsive Design Guidelines

### 8.1 Mobile Layout (< 768px)

```css
@media (max-width: 767px) {
  /* Stack layout */
  .main-layout {
    display: flex;
    flex-direction: column;
  }
  
  /* Collapsible sidebar */
  .sidebar {
    position: fixed;
    left: -260px;
    transition: left 0.3s ease;
    z-index: 100;
  }
  
  .sidebar.open {
    left: 0;
  }
  
  /* Full width content */
  .main-content {
    width: 100%;
  }
  
  /* Bottom navigation */
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-secondary);
    border-top: 1px solid var(--glass-border);
    display: flex;
    justify-content: space-around;
    padding: var(--space-3);
    z-index: 99;
  }
}
```

### 8.2 Tablet Layout (768px - 1024px)

```css
@media (min-width: 768px) and (max-width: 1023px) {
  /* Two column layout */
  .main-layout {
    display: grid;
    grid-template-columns: 80px 1fr;
  }
  
  /* Compact sidebar */
  .sidebar {
    width: 80px;
  }
  
  .sidebar-text {
    display: none;
  }
  
  /* Floating right panel */
  .right-panel {
    position: fixed;
    right: -340px;
    transition: right 0.3s ease;
  }
  
  .right-panel.open {
    right: 0;
  }
}
```

---

## 9. Accessibility Considerations

### 9.1 Color Contrast

All text must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio minimum
- Large text: 3:1 contrast ratio minimum
- Interactive elements: clearly distinguishable states

### 9.2 Keyboard Navigation

```css
/* Focus indicators */
*:focus-visible {
  outline: 2px solid var(--accent-cyan);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Skip to content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--accent-blue);
  color: white;
  padding: var(--space-3);
  text-decoration: none;
  z-index: 9999;
}

.skip-link:focus {
  top: 0;
}
```

### 9.3 Screen Reader Support

```html
<!-- ARIA labels for interactive elements -->
<button aria-label="Calculate evacuation route">
  <svg><!-- Icon --></svg>
</button>

<!-- Live regions for dynamic updates -->
<div aria-live="polite" aria-atomic="true">
  <span class="sr-only">New critical alert in Operation Theater</span>
</div>

<!-- Screen reader only text -->
<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
```

### 9.4 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Performance Optimization

### 10.1 Animation Performance

```css
/* Use transform and opacity for smooth animations */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU acceleration */
}

/* Avoid animating expensive properties */
/* ❌ Bad */
.bad-animation {
  animation: badMove 1s ease;
}
@keyframes badMove {
  to { width: 100px; height: 100px; } /* Triggers layout */
}

/* ✅ Good */
.good-animation {
  animation: goodMove 1s ease;
}
@keyframes goodMove {
  to { transform: scale(1.2); } /* Composited */
}
```

### 10.2 Lazy Loading

```javascript
// Intersection Observer for lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.lazy-animate').forEach(el => {
  observer.observe(el);
});
```

### 10.3 Debouncing Real-Time Updates

```javascript
// Debounce rapid updates
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle high-frequency events
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

---

## 11. Implementation Libraries & Tools

### 11.1 Recommended Stack

**Animation Libraries:**
- `GSAP` - Professional-grade animations
- `Framer Motion` - React animation library
- `Lottie` - After Effects animations

**UI Components:**
- `Radix UI` - Accessible component primitives
- `Headless UI` - Unstyled accessible components
- `React Spring` - Spring-physics animations

**Canvas/3D:**
- `Three.js` + `React Three Fiber` - 3D rendering
- `Konva.js` - 2D canvas library
- `D3.js` - Data visualization

**Utilities:**
- `Tailwind CSS` - Utility-first CSS
- `clsx` - Conditional class names
- `date-fns` - Date formatting

### 11.2 Icon System

Use a consistent icon library:
- **Heroicons** - Clean, modern SVG icons
- **Lucide** - Beautiful icon set
- **Phosphor Icons** - Flexible icon family

```jsx
import { FireIcon, MapIcon, BellIcon } from '@heroicons/react/24/outline';

<FireIcon className="w-6 h-6 text-critical" />
```

---

## 12. Brand Identity

### 12.1 Logo Design Concept

```
🔥 PyroNav
```

- Icon: Stylized flame + navigation arrow
- Wordmark: Modern sans-serif
- Colors: Gradient from orange to cyan (fire to safety)

### 12.2 Loading Screen

```html
<div class="loading-screen">
  <div class="logo-container">
    <svg class="logo-animated">
      <!-- Animated flame icon -->
    </svg>
    <h1 class="logo-text">PyroNav</h1>
  </div>
  <div class="loading-bar">
    <div class="loading-progress"></div>
  </div>
  <p class="loading-message">Initializing safety systems...</p>
</div>
```

```css
.loading-screen {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.logo-animated {
  width: 80px;
  height: 80px;
  animation: flameFlicker 2s ease-in-out infinite;
}

@keyframes flameFlicker {
  0%, 100% { 
    filter: brightness(1) drop-shadow(0 0 20px var(--status-critical));
  }
  50% { 
    filter: brightness(1.3) drop-shadow(0 0 30px var(--status-critical));
  }
}
```

---

## 13. Error States & Empty States

### 13.1 No Data State

```html
<div class="empty-state">
  <svg class="empty-icon"><!-- Illustration --></svg>
  <h3>No Active Alerts</h3>
  <p>All systems are operating normally</p>
</div>
```

### 13.2 Error State

```html
<div class="error-state">
  <svg class="error-icon"><!-- Warning icon --></svg>
  <h3>Connection Lost</h3>
  <p>Unable to connect to monitoring system</p>
  <button class="button-primary">Retry Connection</button>
</div>
```

---

## 14. Summary Checklist

**Visual Design:**
- ✅ Dual theme system (Light & Dark)
- ✅ Smooth theme transitions
- ✅ Glassmorphism adaptive to theme
- ✅ Consistent color palette
- ✅ Clear hazard level visualization
- ✅ Smooth animations (60fps target)

**User Experience:**
- ✅ Intuitive navigation
- ✅ Real-time updates with visual feedback
- ✅ Clear information hierarchy
- ✅ Responsive across devices
- ✅ Theme preference persistence

**Accessibility:**
- ✅ WCAG AA compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Reduced motion support
- ✅ Theme-aware contrast ratios

**Performance:**
- ✅ Optimized animations
- ✅ Lazy loading
- ✅ Debounced updates
- ✅ GPU-accelerated transforms

**Theme Features:**
- ✅ Light theme (default) - clean white backgrounds
- ✅ Dark theme - elegant dark navy
- ✅ Smooth toggle animation (rotating icons)
- ✅ LocalStorage persistence
- ✅ Theme-aware shadows and effects
- ✅ Adaptive glassmorphism

---

**End of UI/UX Specification**

*This design system creates a professional, elegant, and highly functional interface with dual theme support. Users can seamlessly switch between light and dark modes while maintaining the balance between critical safety information and beautiful, smooth visual experiences. The light theme provides clarity for daytime use, while the dark theme reduces eye strain in low-light conditions.*
