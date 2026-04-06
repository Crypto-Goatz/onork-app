/**
 * 0nCore — Global Theme System (V3.0 Brand System)
 * 4 modes: Light, Dark, Brand, Glass
 * Switch with one click. Applies to entire dashboard.
 */

export type ThemeMode = 'light' | 'dark' | 'brand' | 'glass'

export const THEMES: Record<ThemeMode, {
  name: string
  label: string
  icon: string
  vars: Record<string, string>
}> = {
  light: {
    name: 'light',
    label: 'Light',
    icon: '☀️',
    vars: {
      '--bg-page': '#f1f2f7',
      '--bg-page-gradient': 'radial-gradient(ellipse at 20% 0%, rgba(126,217,87,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(20,184,166,0.04) 0%, transparent 50%), #f1f2f7',
      '--bg-card': 'rgba(255,255,255,0.85)',
      '--bg-card-blur': 'blur(12px)',
      '--bg-sidebar': 'rgba(31,41,55,0.95)',
      '--bg-header': 'rgba(255,255,255,0.6)',
      '--bg-input': '#f1f2f7',
      '--bg-hover': '#f8f9fc',
      '--bg-active': 'rgba(126,217,87,0.12)',
      '--text-primary': '#1f2937',
      '--text-secondary': '#4b5563',
      '--text-muted': '#6b7280',
      '--accent': '#7ed957',
      '--accent-dim': '#5cb83a',
      '--accent-glow': 'rgba(126,217,87,0.12)',
      '--secondary': '#14b8a6',
      '--border': '#e2e8f0',
      '--shadow': '0 4px 24px rgba(0,0,0,0.06)',
      '--shadow-lg': '0 8px 40px rgba(0,0,0,0.08)',
      '--radius': '16px',
      '--radius-sm': '10px',
      '--sidebar-width': '220px',
      '--success': '#10b981',
      '--warning': '#d97706',
      '--error': '#b91c1c',
      '--overlay': 'rgba(31,41,55,0.4)',
    },
  },

  dark: {
    name: 'dark',
    label: 'Dark',
    icon: '🌙',
    vars: {
      '--bg-page': '#0d1117',
      '--bg-page-gradient': 'radial-gradient(ellipse at 15% 5%, rgba(126,217,87,0.08) 0%, transparent 40%), radial-gradient(ellipse at 85% 80%, rgba(20,184,166,0.06) 0%, transparent 40%), radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 50%), #0d1117',
      '--bg-card': 'rgba(31,41,55,0.8)',
      '--bg-card-blur': 'blur(12px)',
      '--bg-sidebar': 'rgba(13,17,23,0.95)',
      '--bg-header': 'rgba(13,17,23,0.75)',
      '--bg-input': '#1c2333',
      '--bg-hover': '#1c2333',
      '--bg-active': 'rgba(126,217,87,0.12)',
      '--text-primary': '#f0f4f8',
      '--text-secondary': '#9ca3af',
      '--text-muted': '#6b7280',
      '--accent': '#7ed957',
      '--accent-dim': '#5cb83a',
      '--accent-glow': 'rgba(126,217,87,0.15)',
      '--secondary': '#14b8a6',
      '--border': '#30363d',
      '--shadow': '0 4px 24px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 8px 40px rgba(0,0,0,0.4)',
      '--radius': '16px',
      '--radius-sm': '10px',
      '--sidebar-width': '220px',
      '--success': '#10b981',
      '--warning': '#d97706',
      '--error': '#ef4444',
      '--overlay': 'rgba(0,0,0,0.7)',
    },
  },

  brand: {
    name: 'brand',
    label: 'Brand',
    icon: '💚',
    vars: {
      '--bg-page': '#040A1A',
      '--bg-page-gradient': 'radial-gradient(ellipse at 30% 10%, rgba(126,217,87,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 90%, rgba(126,217,87,0.08) 0%, transparent 40%), #040A1A',
      '--bg-card': 'rgba(8,28,79,0.7)',
      '--bg-card-blur': 'blur(16px)',
      '--bg-sidebar': 'rgba(4,10,26,0.95)',
      '--bg-header': 'rgba(4,10,26,0.75)',
      '--bg-input': '#081C4F',
      '--bg-hover': '#0d2660',
      '--bg-active': 'rgba(126,217,87,0.2)',
      '--text-primary': '#E0E0E0',
      '--text-secondary': '#7ed957',
      '--text-muted': '#5cb83a',
      '--accent': '#7ed957',
      '--accent-dim': '#5cb83a',
      '--accent-glow': 'rgba(126,217,87,0.25)',
      '--secondary': '#00C2C7',
      '--border': '#1B5E20',
      '--shadow': '0 4px 24px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 8px 40px rgba(126,217,87,0.1)',
      '--radius': '16px',
      '--radius-sm': '10px',
      '--sidebar-width': '220px',
      '--success': '#10b981',
      '--warning': '#FFD700',
      '--error': '#FF5252',
      '--overlay': 'rgba(4,10,26,0.8)',
    },
  },

  glass: {
    name: 'glass',
    label: 'Glass',
    icon: '✨',
    vars: {
      '--bg-page': '#0d1117',
      '--bg-page-gradient': 'radial-gradient(ellipse at 25% 0%, rgba(126,217,87,0.1) 0%, transparent 40%), radial-gradient(ellipse at 75% 100%, rgba(20,184,166,0.08) 0%, transparent 40%), radial-gradient(ellipse at 50% 40%, rgba(139,92,246,0.06) 0%, transparent 50%), #0d1117',
      '--bg-card': 'rgba(255,255,255,0.04)',
      '--bg-card-blur': 'blur(20px) saturate(180%)',
      '--bg-sidebar': 'rgba(255,255,255,0.03)',
      '--bg-header': 'rgba(255,255,255,0.05)',
      '--bg-input': 'rgba(255,255,255,0.06)',
      '--bg-hover': 'rgba(255,255,255,0.08)',
      '--bg-active': 'rgba(126,217,87,0.15)',
      '--text-primary': '#f0f4f8',
      '--text-secondary': '#9ca3af',
      '--text-muted': '#6b7280',
      '--accent': '#7ed957',
      '--accent-dim': '#5cb83a',
      '--accent-glow': 'rgba(126,217,87,0.2)',
      '--secondary': '#14b8a6',
      '--border': 'rgba(255,255,255,0.08)',
      '--shadow': '0 4px 24px rgba(0,0,0,0.2)',
      '--shadow-lg': '0 8px 40px rgba(0,0,0,0.3)',
      '--radius': '20px',
      '--radius-sm': '12px',
      '--sidebar-width': '220px',
      '--success': '#10b981',
      '--warning': '#d97706',
      '--error': '#ef4444',
      '--overlay': 'rgba(0,0,0,0.6)',
    },
  },
}

// Glass mode needs extra backdrop-filter CSS
export const GLASS_EXTRAS = `
  .glass-card { backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255,255,255,0.08); }
  .glass-sidebar { backdrop-filter: blur(24px) saturate(200%); }
  .glass-header { backdrop-filter: blur(16px) saturate(180%); }
`

export function applyTheme(mode: ThemeMode) {
  const theme = THEMES[mode]
  const root = document.documentElement

  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }

  // Apply gradient background to body
  document.body.style.background = theme.vars['--bg-page-gradient'] || theme.vars['--bg-page']

  // Toggle theme classes
  root.classList.remove('theme-light', 'theme-dark', 'theme-brand', 'theme-glass')
  root.classList.add(`theme-${mode}`)

  // Store preference
  try { localStorage.setItem('0ncore-theme', mode) } catch {}
}

export function getStoredTheme(): ThemeMode {
  try {
    return (localStorage.getItem('0ncore-theme') as ThemeMode) || 'light'
  } catch {
    return 'light'
  }
}
