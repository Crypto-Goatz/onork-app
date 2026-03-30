/**
 * 0nCore — Global Theme System
 * 4 modes: Light (Portu), Dark (Navy), Brand (0nMCP Green), Glass (Glassmorphism)
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
      '--bg-page': '#F0F2F8',
      '--bg-page-gradient': 'radial-gradient(ellipse at 20% 0%, rgba(110,224,90,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(0,212,255,0.04) 0%, transparent 50%), #F0F2F8',
      '--bg-card': 'rgba(255,255,255,0.85)',
      '--bg-card-blur': 'blur(12px)',
      '--bg-sidebar': 'rgba(255,255,255,0.7)',
      '--bg-header': 'rgba(255,255,255,0.6)',
      '--bg-input': '#F4F7FE',
      '--bg-hover': '#F0F3F9',
      '--bg-active': 'rgba(110,224,90,0.12)',
      '--text-primary': '#2B3674',
      '--text-secondary': '#A3AED0',
      '--text-muted': '#CBD5E1',
      '--accent': '#6EE05A',
      '--accent-dim': '#5CB83A',
      '--accent-glow': 'rgba(110,224,90,0.15)',
      '--secondary': '#00D4FF',
      '--border': '#E9EDF7',
      '--shadow': '0 4px 24px rgba(0,0,0,0.06)',
      '--shadow-lg': '0 8px 40px rgba(0,0,0,0.08)',
      '--radius': '16px',
      '--radius-sm': '10px',
      '--sidebar-width': '220px',
      '--success': '#05CD99',
      '--warning': '#FFB547',
      '--error': '#EE5D50',
      '--overlay': 'rgba(43,54,116,0.4)',
    },
  },

  dark: {
    name: 'dark',
    label: 'Dark',
    icon: '🌙',
    vars: {
      '--bg-page': '#0B0F19',
      '--bg-page-gradient': 'radial-gradient(ellipse at 15% 5%, rgba(110,224,90,0.08) 0%, transparent 40%), radial-gradient(ellipse at 85% 80%, rgba(0,212,255,0.06) 0%, transparent 40%), radial-gradient(ellipse at 50% 50%, rgba(167,139,250,0.04) 0%, transparent 50%), #0B0F19',
      '--bg-card': 'rgba(17,24,39,0.8)',
      '--bg-card-blur': 'blur(12px)',
      '--bg-sidebar': 'rgba(14,20,34,0.9)',
      '--bg-header': 'rgba(14,20,34,0.75)',
      '--bg-input': '#1C2333',
      '--bg-hover': '#1C2B42',
      '--bg-active': 'rgba(110,224,90,0.12)',
      '--text-primary': '#E8EAED',
      '--text-secondary': '#7A8290',
      '--text-muted': '#4A5568',
      '--accent': '#6EE05A',
      '--accent-dim': '#5CB83A',
      '--accent-glow': 'rgba(110,224,90,0.15)',
      '--secondary': '#00D4FF',
      '--border': '#1E293B',
      '--shadow': '0 4px 24px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 8px 40px rgba(0,0,0,0.4)',
      '--radius': '16px',
      '--radius-sm': '10px',
      '--sidebar-width': '220px',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--error': '#EF4444',
      '--overlay': 'rgba(0,0,0,0.7)',
    },
  },

  brand: {
    name: 'brand',
    label: 'Brand',
    icon: '💚',
    vars: {
      '--bg-page': '#0A1A0F',
      '--bg-page-gradient': 'radial-gradient(ellipse at 30% 10%, rgba(110,224,90,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 90%, rgba(110,224,90,0.08) 0%, transparent 40%), #0A1A0F',
      '--bg-card': 'rgba(15,37,23,0.7)',
      '--bg-card-blur': 'blur(16px)',
      '--bg-sidebar': 'rgba(10,26,15,0.9)',
      '--bg-header': 'rgba(10,26,15,0.75)',
      '--bg-input': '#133A1F',
      '--bg-hover': '#1A4D28',
      '--bg-active': 'rgba(110,224,90,0.2)',
      '--text-primary': '#E8F5E9',
      '--text-secondary': '#81C784',
      '--text-muted': '#4CAF50',
      '--accent': '#6EE05A',
      '--accent-dim': '#4CAF3D',
      '--accent-glow': 'rgba(110,224,90,0.25)',
      '--secondary': '#00E676',
      '--border': '#1B5E20',
      '--shadow': '0 4px 24px rgba(0,0,0,0.3)',
      '--shadow-lg': '0 8px 40px rgba(110,224,90,0.1)',
      '--radius': '16px',
      '--radius-sm': '10px',
      '--sidebar-width': '220px',
      '--success': '#69F0AE',
      '--warning': '#FFD54F',
      '--error': '#FF5252',
      '--overlay': 'rgba(10,26,15,0.8)',
    },
  },

  glass: {
    name: 'glass',
    label: 'Glass',
    icon: '✨',
    vars: {
      '--bg-page': '#0D1117',
      '--bg-page-gradient': 'radial-gradient(ellipse at 25% 0%, rgba(110,224,90,0.1) 0%, transparent 40%), radial-gradient(ellipse at 75% 100%, rgba(0,212,255,0.08) 0%, transparent 40%), radial-gradient(ellipse at 50% 40%, rgba(167,139,250,0.06) 0%, transparent 50%), #0D1117',
      '--bg-card': 'rgba(255,255,255,0.04)',
      '--bg-card-blur': 'blur(20px) saturate(180%)',
      '--bg-sidebar': 'rgba(255,255,255,0.03)',
      '--bg-header': 'rgba(255,255,255,0.05)',
      '--bg-input': 'rgba(255,255,255,0.06)',
      '--bg-hover': 'rgba(255,255,255,0.08)',
      '--bg-active': 'rgba(110,224,90,0.15)',
      '--text-primary': '#F0F6FC',
      '--text-secondary': '#8B949E',
      '--text-muted': '#484F58',
      '--accent': '#6EE05A',
      '--accent-dim': '#5CB83A',
      '--accent-glow': 'rgba(110,224,90,0.2)',
      '--secondary': '#00D4FF',
      '--border': 'rgba(255,255,255,0.08)',
      '--shadow': '0 4px 24px rgba(0,0,0,0.2)',
      '--shadow-lg': '0 8px 40px rgba(0,0,0,0.3)',
      '--radius': '20px',
      '--radius-sm': '12px',
      '--sidebar-width': '220px',
      '--success': '#3FB950',
      '--warning': '#D29922',
      '--error': '#F85149',
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
