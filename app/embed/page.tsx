'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface SSOUser {
  userId?: string
  companyId?: string
  locationId?: string
  email?: string
  name?: string
  role?: string
  type?: string
}

type ThemeMode = 'dark' | 'light'
type AccentColor = string

const ACCENT_PRESETS = [
  { color: '#7ed957', label: '0n Green' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#8b5cf6', label: 'Purple' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#ef4444', label: 'Red' },
  { color: '#06b6d4', label: 'Cyan' },
  { color: '#ec4899', label: 'Pink' },
  { color: '#f97316', label: 'Orange' },
]

const PRODUCTS = [
  { name: 'AI Course Builder', desc: 'Generate full courses and import into your CRM.', price: '$49/mo', tag: 'AI' },
  { name: 'Voice AI Agent', desc: 'Deploy AI phone agents with knowledge bases.', price: '$99/mo', tag: 'AI' },
  { name: 'Social Planner', desc: 'Bulk generate and schedule across all platforms.', price: '$29/mo', tag: 'Social' },
  { name: 'Email Builder', desc: 'Drag-and-drop builder with AI generation.', price: '$19/mo', tag: 'Email' },
  { name: 'CRO9 Engine', desc: 'Automated conversion rate optimization.', price: '$39/mo', tag: 'Analytics' },
  { name: 'Task Manager', desc: 'AI-powered task management with focus mode.', price: '$19/mo', tag: 'Productivity' },
  { name: 'Knowledge Base', desc: 'Train AI with your company data. 15 layers.', price: '$49/mo', tag: 'AI' },
  { name: 'Snapshot Manager', desc: 'Clone and deploy CRM configurations.', price: '$99/mo', tag: 'Admin' },
]

const CAPABILITIES = [
  '1,554 AI tools', '96 connected services', 'Bulk social posting',
  'AI email generation', 'Phone number purchasing', 'Voice AI agents',
  'CRO9 scoring engine', 'Google Analytics', 'Search Console',
  'Drag-and-drop email builder', 'Task management', 'Calendar sync',
]

const EMBED_SETTINGS_KEY = '0ncore_embed_settings'

export default function EmbedPage() {
  const [user, setUser] = useState<SSOUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [accent, setAccent] = useState<AccentColor>('#7ed957')
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'tools'>('home')

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMBED_SETTINGS_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        if (s.theme) setTheme(s.theme)
        if (s.accent) setAccent(s.accent)
      }
    } catch {}
  }, [])

  // Save settings on change
  useEffect(() => {
    localStorage.setItem(EMBED_SETTINGS_KEY, JSON.stringify({ theme, accent }))
  }, [theme, accent])

  // SSO: request user data from parent CRM iframe
  useEffect(() => {
    async function initSSO() {
      try {
        // Request user data from CRM parent window
        const key = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('SSO timeout')), 5000)

          window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*')

          const handler = (event: MessageEvent) => {
            if (event.data?.message === 'REQUEST_USER_DATA_RESPONSE') {
              clearTimeout(timeout)
              window.removeEventListener('message', handler)
              resolve(event.data.payload)
            }
          }
          window.addEventListener('message', handler)
        })

        // Decrypt SSO data
        const res = await fetch('/api/auth/sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        })

        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
        } else {
          setError('SSO authentication failed')
        }
      } catch {
        // Not in iframe or SSO not configured — show standalone mode
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initSSO()
  }, [])

  // Disable right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => { e.preventDefault(); return false }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  // Theme colors
  const t = theme === 'dark' ? {
    bg: '#0d1117',
    bgCard: '#161b22',
    bgInput: '#0d1117',
    border: '#1e293b',
    text: '#f0f4f8',
    textSecondary: '#8b95a5',
    textMuted: '#4b5563',
    surface: '#161b22',
  } : {
    bg: '#ffffff',
    bgCard: '#f8fafc',
    bgInput: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    surface: '#f8fafc',
  }

  const accentGlow = `${accent}30`
  const accentDim = `${accent}80`

  if (loading) {
    return (
      <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: `2px solid ${accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'onSpin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Connecting to 0nCore...</span>
        </div>
        <style>{`@keyframes onSpin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', color: t.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', userSelect: 'none' }}>
      {/* ═══ Header ═══ */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        background: t.surface, borderBottom: `1px solid ${t.border}`,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: theme === 'dark' ? '#000' : '#fff' }}>0n</div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ color: accent }}>0n</span>Core
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: accentGlow, color: accent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Platform</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Tabs */}
          {(['home', 'products', 'tools'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: activeTab === tab ? 700 : 500, cursor: 'pointer',
              background: activeTab === tab ? accentGlow : 'transparent',
              color: activeTab === tab ? accent : t.textSecondary,
              textTransform: 'capitalize',
            }}>{tab}</button>
          ))}

          <div style={{ width: 1, height: 20, background: t.border, margin: '0 6px' }} />

          {/* Theme toggle */}
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{
            width: 30, height: 30, borderRadius: 6, border: `1px solid ${t.border}`,
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: t.textSecondary,
          }}>
            {theme === 'dark' ? '☀' : '🌙'}
          </button>

          {/* Settings */}
          <button onClick={() => setShowSettings(!showSettings)} style={{
            width: 30, height: 30, borderRadius: 6, border: `1px solid ${t.border}`,
            background: showSettings ? accentGlow : 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: showSettings ? accent : t.textSecondary,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {/* User avatar */}
          {user && (
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: theme === 'dark' ? '#000' : '#fff',
            }}>
              {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* ═══ Color Settings Dropdown ═══ */}
      {showSettings && (
        <div style={{
          position: 'absolute', top: 52, right: 20, zIndex: 100,
          background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12,
          padding: 16, width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 12 }}>Accent Color</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {ACCENT_PRESETS.map(p => (
              <button key={p.color} onClick={() => setAccent(p.color)} title={p.label} style={{
                width: '100%', aspectRatio: '1', borderRadius: 8, border: accent === p.color ? `2px solid ${t.text}` : `2px solid transparent`,
                background: p.color, cursor: 'pointer',
                boxShadow: accent === p.color ? `0 0 12px ${p.color}40` : 'none',
              }} />
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <input
              type="color"
              value={accent}
              onChange={e => setAccent(e.target.value)}
              style={{ width: '100%', height: 28, borderRadius: 6, border: `1px solid ${t.border}`, cursor: 'pointer', background: 'transparent' }}
            />
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, fontFamily: 'monospace' }}>{accent}</div>
          </div>
        </div>
      )}

      {/* ═══ Content ═══ */}
      <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
        {/* ── HOME TAB ── */}
        {activeTab === 'home' && (
          <>
            {/* Welcome */}
            <div style={{
              padding: 28, borderRadius: 16, marginBottom: 20,
              background: `linear-gradient(135deg, ${accentGlow} 0%, transparent 60%)`,
              border: `1px solid ${accent}20`,
            }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
                {user ? `Welcome back, ${user.name || user.email || 'there'}` : 'Welcome to 0nCore'}
              </h1>
              <p style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
                Your AI business operating system. 1,554 tools across 96 services — all connected through one brain.
              </p>
              {user?.locationId && (
                <div style={{ marginTop: 12, fontSize: 11, color: t.textMuted, fontFamily: 'monospace' }}>
                  Location: {user.locationId}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tools', value: '1,554', sub: 'Available' },
                { label: 'Services', value: '96', sub: 'Connected' },
                { label: 'Add-ons', value: '31', sub: 'Marketplace' },
                { label: 'AI Layers', value: '15', sub: 'Per location' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 16, borderRadius: 12,
                  background: t.bgCard, border: `1px solid ${t.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: t.textMuted, opacity: 0.6 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Capabilities */}
            <div style={{
              padding: 20, borderRadius: 12,
              background: t.bgCard, border: `1px solid ${t.border}`,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Capabilities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CAPABILITIES.map(c => (
                  <span key={c} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    background: `${accent}10`, border: `1px solid ${accent}20`, color: t.textSecondary,
                  }}>{c}</span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <a href="https://0ncore.com/dashboard" target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-block', padding: '12px 28px', borderRadius: 10,
                background: accent, color: theme === 'dark' ? '#000' : '#fff',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
                boxShadow: `0 0 20px ${accentGlow}`,
              }}>Open Full Dashboard</a>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>Opens 0ncore.com in a new tab with full access</div>
            </div>
          </>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'products' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Add-on Marketplace</h2>
              <p style={{ fontSize: 13, color: t.textSecondary }}>Install the tools you need. Pay only for what you use.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {PRODUCTS.map(p => (
                <div key={p.name} style={{
                  padding: 20, borderRadius: 12,
                  background: t.bgCard, border: `1px solid ${t.border}`,
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${accent}15`, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.tag}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{p.price}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
                  <p style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5, flex: 1, margin: '0 0 12px' }}>{p.desc}</p>
                  <button style={{
                    width: '100%', padding: '8px', borderRadius: 6, border: `1px solid ${accent}40`,
                    background: `${accent}10`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>Activate</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TOOLS TAB ── */}
        {activeTab === 'tools' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Quick Tools</h2>
              <p style={{ fontSize: 13, color: t.textSecondary }}>Jump directly into any 0nCore tool.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {[
                { name: 'Contacts', href: '/dashboard/contacts', icon: '👥' },
                { name: 'Pipeline', href: '/dashboard/pipeline', icon: '📊' },
                { name: 'Email Builder', href: '/dashboard/email/builder', icon: '✉️' },
                { name: 'Social Planner', href: '/dashboard/social', icon: '📱' },
                { name: 'Task Manager', href: '/dashboard/tasks', icon: '✓' },
                { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
                { name: 'Voice AI', href: '/dashboard/voice', icon: '🎙' },
                { name: 'Calendar', href: '/dashboard/calendar', icon: '📅' },
                { name: 'Knowledge Base', href: '/dashboard/training', icon: '🧠' },
                { name: 'Workflows', href: '/dashboard/workflows', icon: '⚡' },
                { name: 'Phone System', href: '/dashboard/phone', icon: '📞' },
                { name: 'Files', href: '/dashboard/files', icon: '📁' },
              ].map(tool => (
                <a key={tool.name} href={`https://0ncore.com${tool.href}`} target="_blank" rel="noopener noreferrer" style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: t.bgCard, border: `1px solid ${t.border}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  textDecoration: 'none', color: t.text,
                  transition: 'border-color 0.15s',
                }}>
                  <span style={{ fontSize: 20 }}>{tool.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{tool.name}</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══ Footer ═══ */}
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${t.border}`, textAlign: 'center' }}>
        <span style={{ fontSize: 10, color: t.textMuted }}>Powered by 0nCore — RocketOpp LLC — 1,554 tools, 96 services, 5 patents pending</span>
      </div>

      <style>{`
        @keyframes onSpin { to { transform: rotate(360deg) } }
        * { -webkit-user-select: none; user-select: none; }
        input, textarea { -webkit-user-select: text !important; user-select: text !important; }
      `}</style>
    </div>
  )
}
