'use client'

import { useState, useEffect } from 'react'
import { THEMES, applyTheme, getStoredTheme, type ThemeMode } from '@/lib/themes'

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeMode>('light')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    setCurrent(stored)
    applyTheme(stored)
  }, [])

  function switchTheme(mode: ThemeMode) {
    setCurrent(mode)
    applyTheme(mode)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, transition: 'all 0.2s',
        }}
        title={`Theme: ${THEMES[current].label}`}
      >
        {THEMES[current].icon}
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', top: 44, right: 0, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
            padding: 8, minWidth: 160,
          }}>
            {(Object.entries(THEMES) as [ThemeMode, typeof THEMES[ThemeMode]][]).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => switchTheme(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 12px', border: 'none',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  background: current === key ? 'var(--bg-active)' : 'transparent',
                  color: current === key ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: current === key ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>{theme.icon}</span>
                <span>{theme.label}</span>
                {current === key && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
