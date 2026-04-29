/**
 * Canvas layout — the ONLY visible front-end layer.
 *
 * The rest of the app runs on a forced-dark theme (html.dark +
 * data-theme="dark" + color-scheme:dark on :root). The canvas escapes ALL
 * of that:
 *
 *   - Removes html.dark while this route is mounted (auto-restored on leave)
 *   - Overrides the dark CSS custom properties to light values within its tree
 *   - Forces color-scheme:light so native browser chrome (scrollbars, form
 *     fields) renders light too
 *   - Suppresses LaunchBanner / PublicNav / VoiceAI / LoadingScreen via
 *     route-prefix checks already in those components
 */

'use client'

import { useEffect } from 'react'

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  // Toggle the html.dark class while on /canvas. Restore on unmount so the
  // rest of the app doesn't lose its theme.
  useEffect(() => {
    const html = document.documentElement
    const hadDark = html.classList.contains('dark')
    const prevTheme = html.getAttribute('data-theme')
    html.classList.remove('dark')
    html.setAttribute('data-theme', 'light')
    return () => {
      if (hadDark) html.classList.add('dark')
      if (prevTheme !== null) html.setAttribute('data-theme', prevTheme)
    }
  }, [])

  return (
    <div
      data-canvas-root
      className="canvas-root h-screen w-screen overflow-hidden bg-white text-slate-900"
      style={
        {
          // Override dark-mode shadcn vars so anything dropped here renders light
          ['--background' as string]: '#ffffff',
          ['--foreground' as string]: '#0f172a',
          ['--card' as string]: '#ffffff',
          ['--card-foreground' as string]: '#0f172a',
          ['--popover' as string]: '#ffffff',
          ['--popover-foreground' as string]: '#0f172a',
          ['--primary' as string]: '#0f172a',
          ['--primary-foreground' as string]: '#ffffff',
          ['--secondary' as string]: '#f1f5f9',
          ['--secondary-foreground' as string]: '#0f172a',
          ['--muted' as string]: '#f8fafc',
          ['--muted-foreground' as string]: '#64748b',
          ['--accent' as string]: '#6EE05A',
          ['--accent-foreground' as string]: '#04140a',
          ['--border' as string]: '#e2e8f0',
          ['--input' as string]: '#e2e8f0',
          ['--ring' as string]: '#94a3b8',
          colorScheme: 'light',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
