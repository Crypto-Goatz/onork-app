'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/console/exec', label: 'Orbit View', icon: '⬡' },
  { href: '/console/exec/formulas', label: 'Formulas', icon: '◆' },
  { href: '/console/exec/orbits', label: 'Orbits', icon: '◎' },
  { href: '/console/exec/insights', label: 'AI Insights', icon: '💡' },
]

export default function ExecLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isExact = (href: string) => {
    if (href === '/console/exec') return pathname === '/console/exec'
    return pathname?.startsWith(href)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#04060d' }}>
      {/* Exec Sub-Nav */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 20px',
        background: 'rgba(4,6,13,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, zIndex: 40,
      }}>
        <Link href="/dashboard" style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: '#3a4f6a', textDecoration: 'none', marginRight: 8,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ← Dashboard
        </Link>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)', marginRight: 4 }} />

        {NAV.map(n => {
          const active = isExact(n.href)
          return (
            <Link key={n.href} href={n.href} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              background: active ? 'rgba(110,224,90,0.1)' : 'transparent',
              border: active ? '1px solid rgba(110,224,90,0.2)' : '1px solid transparent',
              color: active ? '#6EE05A' : '#3a4f6a',
              fontSize: 12, fontWeight: active ? 600 : 400,
              fontFamily: "'JetBrains Mono', monospace",
              textDecoration: 'none', transition: 'all 0.15s',
              letterSpacing: '0.03em',
            }}>
              <span style={{ fontSize: 12 }}>{n.icon}</span>
              {n.label}
            </Link>
          )
        })}

        <div style={{ flex: 1 }} />
        <Link href="/console/exec/formulas/new" style={{
          padding: '6px 14px', borderRadius: 7,
          background: 'rgba(110,224,90,0.08)', border: '1px solid rgba(110,224,90,0.15)',
          color: '#6EE05A', fontSize: 11, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          textDecoration: 'none', letterSpacing: '0.04em',
        }}>
          + New Formula
        </Link>
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
