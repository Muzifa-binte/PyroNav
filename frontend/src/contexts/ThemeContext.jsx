/**
 * PyroNav Theme Engine
 * User-customizable color themes with accessibility support
 */
import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// 🎨 Theme Definitions
export const THEMES = {
  // 1. Default: Warm Ivory Neumorphic (Original PyroNav Design)
  classic: {
    id: 'classic',
    name: 'Classic PyroNav',
    description: 'Warm ivory with orange accents - Original design',
    colors: {
      '--bg-base': '#F4EFE9',
      '--bg-raised': '#F8F4EE',
      '--bg-inset': '#EDE6DD',
      '--ink-900': '#1E1A17',
      '--ink-600': '#5A4F47',
      '--ink-400': '#8B7F76',
      '--orange-500': '#FF6A1A',
      '--orange-600': '#E5530A',
      '--orange-300': '#FFB27A',
      '--orange-100': '#FFE6D3',
      '--neo-light': 'rgba(255, 255, 255, 0.9)',
      '--neo-dark': 'rgba(163, 140, 118, 0.35)',
      '--topbar-bg': 'rgba(255, 255, 255, 0.78)',
      '--topbar-border': 'rgba(255, 255, 255, 0.88)',
      '--sidebar-bg': 'rgba(248, 244, 238, 0.96)',
      '--sidebar-border': 'rgba(163, 140, 118, 0.3)',
      '--sidebar-item-bg': 'transparent',
      '--sidebar-item-active-bg': '#F8F4EE',
      '--sidebar-item-hover-bg': 'rgba(0, 0, 0, 0.04)',
      '--sidebar-item-color': '#5A4F47',
      '--sidebar-item-active-color': '#E5530A',
      '--sidebar-item-active-border': '#FF6A1A',
      '--sidebar-shadow': '4px 0 32px rgba(163, 140, 118, 0.10)',
      '--sidebar-item-shadow': 'var(--neo-raised-sm)',
      '--border-subtle': 'rgba(163, 140, 118, 0.3)',
      '--border-glass': 'rgba(163, 140, 118, 0.2)',
      '--glass-bg': 'rgba(255, 255, 255, 0.62)',
      '--glass-border': 'rgba(255, 255, 255, 0.82)',
      '--map-canvas-bg': '#F8FAFC',
      '--map-corridor-bg': '#FFFFFF',
      '--map-corridor-border': '#1E293B',
      '--map-title-bg': '#EFF6FF',
      '--map-title-border': '#2563EB',
      '--map-title-text': '#1E3A8A',
      '--map-title-sub': '#1E40AF',
      '--map-legend-bg': '#FFFFFF',
      '--map-legend-border': '#2563EB',
      '--map-legend-title': '#1E3A8A',
      '--map-legend-text': '#1E293B',
    },
  },

  // 2. Ocean Blue Theme
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Cool blue tones for calm monitoring',
    colors: {
      '--bg-base': '#E8F2F7',
      '--bg-raised': '#EFF7FA',
      '--bg-inset': '#DBE9F0',
      '--ink-900': '#0A2540',
      '--ink-600': '#425466',
      '--ink-400': '#6B7B8C',
      '--orange-500': '#0091EA', // Blue accent
      '--orange-600': '#006BB8',
      '--orange-300': '#64B5F6',
      '--orange-100': '#B3E5FC',
      '--neo-light': 'rgba(255, 255, 255, 0.95)',
      '--neo-dark': 'rgba(66, 84, 102, 0.30)',
      '--topbar-bg': 'rgba(239, 247, 250, 0.85)',
      '--sidebar-bg': 'rgba(239, 247, 250, 0.98)',
    },
  },

  // 3. Dark Mode - Midnight
  midnight: {
    id: 'midnight',
    name: 'Midnight Dark',
    description: 'True dark theme for night operations',
    colors: {
      '--bg-base': '#0B0F14',
      '--bg-raised': '#161C24',
      '--bg-inset': '#0F141A',
      '--ink-900': '#F1F5F9',
      '--ink-600': '#94A3B8',
      '--ink-400': '#64748B',
      '--orange-500': '#FF6A1A',
      '--orange-600': '#E5530A',
      '--orange-300': '#FF9D5C',
      '--orange-100': 'rgba(255, 106, 26, 0.15)',
      '--border-subtle': 'rgba(255, 255, 255, 0.08)',
      '--border-glass': 'rgba(255, 255, 255, 0.06)',
      '--topbar-bg': 'rgba(22, 28, 36, 0.88)',
      '--topbar-border': 'rgba(255, 255, 255, 0.08)',
      '--sidebar-bg': '#12171F',
      '--sidebar-border': 'rgba(255, 255, 255, 0.07)',
      '--sidebar-item-bg': 'transparent',
      '--sidebar-item-active-bg': '#1D2430',
      '--sidebar-item-hover-bg': 'rgba(255, 255, 255, 0.05)',
      '--sidebar-item-color': '#94A3B8',
      '--sidebar-item-active-color': '#FF8A50',
      '--sidebar-item-active-border': '#FF6A1A',
      '--sidebar-shadow': 'none',
      '--sidebar-item-shadow': 'none',
      '--map-canvas-bg': '#0F141C',
      '--map-corridor-bg': '#1A212D',
      '--map-corridor-border': '#334155',
      '--map-title-bg': '#1E293B',
      '--map-title-border': '#3B82F6',
      '--map-title-text': '#93C5FD',
      '--map-title-sub': '#60A5FA',
      '--map-legend-bg': '#161D26',
      '--map-legend-border': '#3B82F6',
      '--map-legend-title': '#93C5FD',
      '--map-legend-text': '#CBD5E1',
      '--glass-bg': 'rgba(22, 28, 36, 0.82)',
      '--glass-border': 'rgba(255, 255, 255, 0.08)',
      '--neo-light': 'rgba(255, 255, 255, 0.03)',
      '--neo-dark': 'rgba(0, 0, 0, 0.55)',
      '--neo-raised': '0 4px 18px rgba(0, 0, 0, 0.45)',
      '--neo-raised-sm': '0 2px 8px rgba(0, 0, 0, 0.35)',
      '--neo-inset': 'inset 2px 2px 6px rgba(0, 0, 0, 0.6)',
      '--neo-pressed': 'inset 2px 2px 6px rgba(0, 0, 0, 0.7)',
    },
  },

  // 4. Forest Green
  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural green tones for eco-conscious design',
    colors: {
      '--bg-base': '#E8F3E8',
      '--bg-raised': '#F0F7F0',
      '--bg-inset': '#DCE9DC',
      '--ink-900': '#1B3A1B',
      '--ink-600': '#3D5A3D',
      '--ink-400': '#6B8A6B',
      '--orange-500': '#4CAF50', // Green accent
      '--orange-600': '#388E3C',
      '--orange-300': '#81C784',
      '--orange-100': '#C8E6C9',
      '--neo-light': 'rgba(255, 255, 255, 0.92)',
      '--neo-dark': 'rgba(61, 90, 61, 0.28)',
      '--topbar-bg': 'rgba(240, 247, 240, 0.82)',
      '--sidebar-bg': 'rgba(240, 247, 240, 0.96)',
    },
  },

  // 5. Sunset Purple
  sunset: {
    id: 'sunset',
    name: 'Sunset Purple',
    description: 'Warm purple sunset tones',
    colors: {
      '--bg-base': '#F3E8F5',
      '--bg-raised': '#F8F0FA',
      '--bg-inset': '#E9DBF0',
      '--ink-900': '#3A1B3A',
      '--ink-600': '#5A3D5A',
      '--ink-400': '#8A6B8A',
      '--orange-500': '#9C27B0', // Purple accent
      '--orange-600': '#7B1FA2',
      '--orange-300': '#BA68C8',
      '--orange-100': '#E1BEE7',
      '--neo-light': 'rgba(255, 255, 255, 0.90)',
      '--neo-dark': 'rgba(90, 61, 90, 0.32)',
      '--topbar-bg': 'rgba(248, 240, 250, 0.80)',
      '--sidebar-bg': 'rgba(248, 240, 250, 0.95)',
    },
  },

  // 6. High Contrast (Accessibility)
  highContrast: {
    id: 'highContrast',
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    colors: {
      '--bg-base': '#FFFFFF',
      '--bg-raised': '#F5F5F5',
      '--bg-inset': '#EEEEEE',
      '--ink-900': '#000000',
      '--ink-600': '#333333',
      '--ink-400': '#666666',
      '--orange-500': '#FF5722',
      '--orange-600': '#E64A19',
      '--orange-300': '#FF8A65',
      '--orange-100': '#FFCCBC',
      '--neo-light': 'rgba(255, 255, 255, 1)',
      '--neo-dark': 'rgba(0, 0, 0, 0.40)',
      '--topbar-bg': 'rgba(255, 255, 255, 0.98)',
      '--sidebar-bg': 'rgba(245, 245, 245, 0.98)',
    },
  },

  // 7. Amber Gold
  amber: {
    id: 'amber',
    name: 'Amber Gold',
    description: 'Warm amber and gold tones',
    colors: {
      '--bg-base': '#FFF8E1',
      '--bg-raised': '#FFFBEE',
      '--bg-inset': '#FFECB3',
      '--ink-900': '#3E2723',
      '--ink-600': '#5D4037',
      '--ink-400': '#8D6E63',
      '--orange-500': '#FFA000',
      '--orange-600': '#FF8F00',
      '--orange-300': '#FFCA28',
      '--orange-100': '#FFE082',
      '--neo-light': 'rgba(255, 255, 255, 0.92)',
      '--neo-dark': 'rgba(93, 64, 55, 0.30)',
      '--topbar-bg': 'rgba(255, 251, 238, 0.85)',
      '--sidebar-bg': 'rgba(255, 251, 238, 0.96)',
    },
  },

  // 8. Arctic Ice
  arctic: {
    id: 'arctic',
    name: 'Arctic Ice',
    description: 'Cool cyan and white tones',
    colors: {
      '--bg-base': '#E0F7FA',
      '--bg-raised': '#E8FAFE',
      '--bg-inset': '#B2EBF2',
      '--ink-900': '#01579B',
      '--ink-600': '#0277BD',
      '--ink-400': '#0288D1',
      '--orange-500': '#00BCD4',
      '--orange-600': '#00ACC1',
      '--orange-300': '#4DD0E1',
      '--orange-100': '#B2EBF2',
      '--neo-light': 'rgba(255, 255, 255, 0.95)',
      '--neo-dark': 'rgba(1, 87, 155, 0.25)',
      '--topbar-bg': 'rgba(232, 250, 254, 0.88)',
      '--sidebar-bg': 'rgba(232, 250, 254, 0.98)',
    },
  },
}

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('pyronav-theme')
    return saved && THEMES[saved] ? saved : 'classic'
  })

  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  // Apply theme colors to CSS variables
  useEffect(() => {
    const theme = THEMES[currentTheme]
    if (!theme) return

    const root = document.documentElement
    root.setAttribute('data-theme', currentTheme)

    // Clear previous theme inline properties so no dark/light variables linger across themes
    root.style.cssText = ''

    Object.entries(theme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Update neumorphic shadows based on theme
    const isDark = currentTheme === 'midnight'
    if (isDark) {
      root.style.setProperty('--neo-raised', '0 4px 18px rgba(0, 0, 0, 0.45)')
      root.style.setProperty('--neo-raised-sm', '0 2px 8px rgba(0, 0, 0, 0.35)')
      root.style.setProperty('--neo-inset', 'inset 2px 2px 6px rgba(0, 0, 0, 0.6)')
      root.style.setProperty('--neo-pressed', 'inset 2px 2px 6px rgba(0, 0, 0, 0.7)')
    } else {
      root.style.setProperty('--neo-raised', '8px 8px 18px var(--neo-dark), -8px -8px 18px var(--neo-light)')
      root.style.setProperty('--neo-raised-sm', '4px 4px 10px var(--neo-dark), -4px -4px 10px var(--neo-light)')
      root.style.setProperty('--neo-inset', 'inset 6px 6px 12px var(--neo-dark), inset -6px -6px 12px var(--neo-light)')
      root.style.setProperty('--neo-pressed', 'inset 3px 3px 8px var(--neo-dark), inset -3px -3px 8px var(--neo-light)')
    }

    // Save to localStorage
    localStorage.setItem('pyronav-theme', currentTheme)

    // Update meta theme-color for mobile browsers
    let metaTheme = document.querySelector('meta[name="theme-color"]')
    if (!metaTheme) {
      metaTheme = document.createElement('meta')
      metaTheme.name = 'theme-color'
      document.head.appendChild(metaTheme)
    }
    metaTheme.content = theme.colors['--bg-base']
  }, [currentTheme])

  // Check user preferences
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: more)')

    setReducedMotion(motionQuery.matches)
    setHighContrast(contrastQuery.matches)

    const handleMotionChange = (e) => setReducedMotion(e.matches)
    const handleContrastChange = (e) => setHighContrast(e.matches)

    motionQuery.addEventListener('change', handleMotionChange)
    contrastQuery.addEventListener('change', handleContrastChange)

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      contrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [])

  const changeTheme = (themeId) => {
    if (THEMES[themeId]) {
      setCurrentTheme(themeId)
    }
  }

  const value = {
    currentTheme,
    theme: THEMES[currentTheme],
    themes: THEMES,
    changeTheme,
    reducedMotion,
    highContrast,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
