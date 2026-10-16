/**
 * Theme Switcher Component
 * Ultra-compact icon-wise dropdown to switch PyroNav color themes
 */
import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import './ThemeSwitcher.css'

const THEME_ICONS = {
  classic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  ocean: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0" />
      <path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0" />
    </svg>
  ),
  midnight: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  forest: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 4 13a7 7 0 0 1 7-7 7 7 0 0 1 7 7v7h-7z" />
      <path d="M11 6v14" />
    </svg>
  ),
  sunset: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0-10 0" />
      <line x1="12" y1="3" x2="12" y2="9" />
      <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
      <line x1="1" y1="18" x2="3" y2="18" />
      <line x1="21" y1="18" x2="23" y2="18" />
      <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
      <line x1="23" y1="22" x2="1" y2="22" />
    </svg>
  ),
  amber: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  arctic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    </svg>
  ),
  highContrast: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
  ),
}

const THEME_SHORT_NAMES = {
  classic: 'Classic',
  ocean: 'Ocean',
  midnight: 'Midnight',
  forest: 'Forest',
  sunset: 'Sunset',
  amber: 'Amber',
  arctic: 'Arctic',
  highContrast: 'Contrast',
}

const ThemeSwitcher = () => {
  const { currentTheme, themes, changeTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredTheme, setHoveredTheme] = useState(null)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setHoveredTheme(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleThemeSelect = (themeId) => {
    changeTheme(themeId)
    setIsOpen(false)
    setHoveredTheme(null)
  }

  const currentThemeData = themes[currentTheme]
  const previewedTheme = themes[hoveredTheme] || currentThemeData

  return (
    <div className="theme-switcher" ref={dropdownRef}>
      <button
        type="button"
        className="theme-switcher-trigger"
        onClick={() => setIsOpen(open => !open)}
        aria-label="Change theme"
        title="Change color theme"
      >
        <span className="theme-trigger-icon" style={{ color: currentThemeData?.colors?.['--orange-500'] || 'currentColor' }}>
          {THEME_ICONS[currentTheme] || THEME_ICONS.classic}
        </span>
        <span className="theme-switcher-label">
          {currentThemeData?.name || 'Theme'}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`theme-switcher-chevron ${isOpen ? 'open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="theme-switcher-dropdown">
          <div className="theme-switcher-header">
            <span className="theme-switcher-title">Color Themes</span>
            <span className="theme-count-badge">{Object.keys(themes).length}</span>
          </div>

          <div className="theme-switcher-grid">
            {Object.values(themes).map((theme) => {
              const isActive = currentTheme === theme.id
              const accentColor = theme.colors['--orange-500']
              const baseColor = theme.colors['--bg-base']
              const shortName = THEME_SHORT_NAMES[theme.id] || theme.name

              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-icon-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleThemeSelect(theme.id)}
                  onMouseEnter={() => setHoveredTheme(theme.id)}
                  onMouseLeave={() => setHoveredTheme(null)}
                  title={`${theme.name}: ${theme.description}`}
                >
                  <div
                    className="theme-icon-swatch"
                    style={{
                      background: baseColor,
                      borderColor: isActive ? accentColor : 'var(--border-subtle)',
                      color: accentColor,
                    }}
                  >
                    {THEME_ICONS[theme.id] || THEME_ICONS.classic}
                    {isActive && (
                      <span className="theme-active-dot" style={{ background: accentColor }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="theme-icon-name">{shortName}</span>
                </button>
              )
            })}
          </div>

          <div className="theme-switcher-footer">
            <span className="theme-footer-desc">
              {previewedTheme?.description || previewedTheme?.name}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThemeSwitcher
