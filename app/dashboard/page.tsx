'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── Module types ────────────────────────────────────────────

interface DashboardModule {
  id: string
  title: string
  size: 'full' | 'half' | 'third'
  visible: boolean
}

const DEFAULT_MODULES: DashboardModule[] = [
  { id: 'stats', title: 'Stats Overview', size: 'full', visible: true },
  { id: 'chart', title: 'Execution Overview', size: 'half', visible: true },
  { id: 'actions', title: 'Quick Actions', size: 'third', visible: true },
  { id: 'status', title: 'System Status', size: 'third', visible: true },
  { id: 'activity', title: 'Recent Activity', size: 'half', visible: true },
  { id: 'training', title: 'Training Center', size: 'half', visible: true },
  { id: 'integrations', title: 'Integrations', size: 'third', visible: true },
  { id: 'crm', title: 'CRM Overview', size: 'third', visible: true },
]

const STORAGE_KEY = '0ncore_dashboard_layout'

// ── Main Component ──────────────────────────────────────────

interface DashboardStats {
  contacts: number
  opportunities: number
  conversations: number
  pipelines: number
}

export default function DashboardHome() {
  const [userName, setUserName] = useState('')
  const [mcpStatus, setMcpStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [modules, setModules] = useState<DashboardModule[]>(DEFAULT_MODULES)
  const [editMode, setEditMode] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({ contacts: 0, opportunities: 0, conversations: 0, pipelines: 0 })
  const dragRef = useRef<HTMLDivElement | null>(null)
  const supabase = createClient()

  // Load saved layout
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as DashboardModule[]
        // Merge with defaults (in case new modules added)
        const ids = new Set(parsed.map(m => m.id))
        const merged = [
          ...parsed,
          ...DEFAULT_MODULES.filter(m => !ids.has(m.id)),
        ]
        setModules(merged)
      }
    } catch { /* use defaults */ }
  }, [])

  // Save layout on change
  const saveLayout = useCallback((newModules: DashboardModule[]) => {
    setModules(newModules)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newModules))
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User')
      }
    })
    fetch('/api/0nmcp/health')
      .then(r => r.json())
      .then(d => setMcpStatus(d.status === 'offline' ? 'offline' : 'online'))
      .catch(() => setMcpStatus('offline'))

    // Fetch live CRM stats
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => {
        if (d.stats) setStats(d.stats)
      })
      .catch(() => { /* keep defaults */ })
  }, [supabase.auth])

  // ── Drag & Drop ─────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4'
      dragRef.current = e.currentTarget as HTMLDivElement
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDragId(null)
    setDragOverId(null)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragOverId) setDragOverId(id)
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) return

    const newModules = [...modules]
    const fromIdx = newModules.findIndex(m => m.id === dragId)
    const toIdx = newModules.findIndex(m => m.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const [moved] = newModules.splice(fromIdx, 1)
    newModules.splice(toIdx, 0, moved)
    saveLayout(newModules)
    setDragId(null)
    setDragOverId(null)
  }

  function toggleModule(id: string) {
    const newModules = modules.map(m =>
      m.id === id ? { ...m, visible: !m.visible } : m
    )
    saveLayout(newModules)
  }

  function cycleSize(id: string) {
    const sizes: Array<'full' | 'half' | 'third'> = ['third', 'half', 'full']
    const newModules = modules.map(m => {
      if (m.id !== id) return m
      const idx = sizes.indexOf(m.size)
      return { ...m, size: sizes[(idx + 1) % sizes.length] }
    })
    saveLayout(newModules)
  }

  function resetLayout() {
    saveLayout([...DEFAULT_MODULES])
  }

  // ── Module Size → CSS ────────────────────────────────────

  function sizeToSpan(size: string) {
    switch (size) {
      case 'full': return 'span 3'
      case 'half': return 'span 2'
      case 'third': return 'span 1'
      default: return 'span 1'
    }
  }

  // ── Chart data ────────────────────────────────────────────
  const chartBars = [35, 55, 42, 68, 48, 75, 58, 82, 65, 45, 72, 52, 60, 78, 50, 85, 62, 70, 55, 88, 64, 48, 76, 58]

  // ── Render Module Content ─────────────────────────────────

  function renderModule(mod: DashboardModule) {
    switch (mod.id) {
      case 'stats':
        return (
          <div className="jp-stat-grid">
            {[
              { label: 'Total Contacts', value: stats.contacts.toLocaleString(), change: stats.contacts > 0 ? 'Live' : 'Syncing', colorClass: 'cyan', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
              { label: 'Services Connected', value: stats.pipelines > 0 ? stats.pipelines.toLocaleString() : '4', change: 'Active', colorClass: 'green', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg> },
              { label: 'Conversations', value: stats.conversations.toLocaleString(), change: stats.conversations > 0 ? 'Live' : 'Syncing', colorClass: 'purple', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
              { label: 'AI Credits', value: '$0.00', change: 'Active', colorClass: 'amber', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg> },
            ].map(card => (
              <div key={card.label} className={`jp-stat-card ${card.colorClass}`}>
                <div className="jp-stat-header">
                  <span className="jp-stat-label">{card.label}</span>
                  <div className={`jp-stat-icon ${card.colorClass}`}>{card.icon}</div>
                </div>
                <div className="jp-stat-value">{card.value}</div>
                <span className="jp-stat-change up">{card.change}</span>
              </div>
            ))}
          </div>
        )

      case 'chart':
        return (
          <div className="jp-card" style={{ height: '100%' }}>
            <div className="jp-card-header">
              <h6>Execution Overview</h6>
              <div style={{ display: 'flex', gap: 4 }}>
                {['7D', '30D', '90D'].map(p => (
                  <button key={p} className="jp-btn-outline" style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 6, ...(p === '30D' ? { borderColor: 'var(--jp-green-dim)', color: 'var(--jp-green)' } : {}) }}>{p}</button>
                ))}
              </div>
            </div>
            <div className="jp-card-body">
              <div className="jp-chart-area">
                {chartBars.map((h, i) => <div key={i} className="jp-chart-bar" style={{ height: `${h}%` }} />)}
              </div>
            </div>
          </div>
        )

      case 'actions':
        return (
          <div className="jp-card" style={{ height: '100%' }}>
            <div className="jp-card-header"><h6>Quick Actions</h6></div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'New Contact', href: '/dashboard/contacts', bg: 'rgba(0,212,255,0.10)', color: 'var(--jp-cyan)', border: '1px solid rgba(0,212,255,0.2)' },
                { label: 'Run Workflow', href: '/dashboard/workflows', bg: 'var(--jp-green-glow)', color: 'var(--jp-green)', border: '1px solid rgba(110,224,90,0.2)' },
                { label: 'Chat with Jaxx', href: '/dashboard/chat', bg: 'rgba(167,139,250,0.10)', color: 'var(--jp-purple)', border: '1px solid rgba(167,139,250,0.2)' },
                { label: 'Training Center', href: '/dashboard/training', bg: 'rgba(255,181,71,0.10)', color: 'var(--jp-amber)', border: '1px solid rgba(251,191,36,0.2)' },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--jp-radius-sm)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, background: a.bg, color: a.color, border: a.border }}>
                  {a.label}
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </div>
        )

      case 'status':
        return (
          <div className="jp-card" style={{ height: '100%' }}>
            <div className="jp-card-header"><h6>System Status</h6></div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: '0nMCP Engine', active: mcpStatus === 'online' },
                { label: 'Vault Encryption', active: true },
                { label: 'Webhook Handlers', active: true },
                { label: 'CRM Sync', active: false },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>{s.label}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: s.active ? 'var(--jp-green)' : 'var(--jp-text-muted)' }}>{s.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="jp-progress"><div className={`jp-progress-bar ${s.active ? 'green' : ''}`} style={{ width: s.active ? '100%' : '0%', background: s.active ? undefined : 'var(--jp-border-hi)' }} /></div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'activity':
        return (
          <div className="jp-card" style={{ height: '100%' }}>
            <div className="jp-card-header"><h6>Recent Activity</h6></div>
            <ul className="jp-activity-list">
              {[
                { text: 'System initialized', meta: '0nCore connected', time: 'Just now', dot: 'green' },
                { text: '0nMCP engine ready', meta: '1,171 tools loaded', time: '1m ago', dot: 'cyan' },
                { text: 'Dashboard loaded', meta: 'All systems nominal', time: '2m ago', dot: 'muted' },
                { text: 'Vault sealed', meta: 'AES-256-GCM active', time: '5m ago', dot: 'purple' },
              ].map((item, i) => (
                <li key={i} className="jp-activity-item">
                  <span className={`jp-activity-dot ${item.dot}`} />
                  <div className="jp-activity-content">
                    <div className="jp-activity-text">{item.text}</div>
                    <div className="jp-activity-meta">{item.meta}</div>
                  </div>
                  <span className="jp-activity-time">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        )

      case 'training':
        return (
          <div className="jp-card" style={{ height: '100%' }}>
            <div className="jp-card-header">
              <h6>Training Center</h6>
              <Link href="/dashboard/training" className="jp-btn-outline" style={{ fontSize: '0.75rem', padding: '4px 12px', textDecoration: 'none' }}>View All</Link>
            </div>
            <div className="jp-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Sources', value: '91+', color: 'var(--jp-cyan)' },
                  { label: 'Pairs', value: '0', color: 'var(--jp-green)' },
                  { label: 'Feeds', value: '11', color: 'var(--jp-amber)' },
                  { label: 'Quality', value: '—', color: 'var(--jp-purple)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '12px', borderRadius: 8, background: 'var(--jp-surface-elevated)', border: '1px solid var(--jp-border)' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'integrations':
        return (
          <div className="jp-card" style={{ height: '100%' }}>
            <div className="jp-card-header">
              <h6>Integrations</h6>
              <Link href="/dashboard/integrations" className="jp-btn-outline" style={{ fontSize: '0.75rem', padding: '4px 12px', textDecoration: 'none' }}>Manage</Link>
            </div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { name: 'CRM', status: 'Connected', color: 'var(--jp-green)' },
                { name: 'Stripe', status: 'Connected', color: 'var(--jp-green)' },
                { name: 'Supabase', status: 'Connected', color: 'var(--jp-green)' },
                { name: '0nMCP', status: mcpStatus === 'online' ? 'Online' : 'Offline', color: mcpStatus === 'online' ? 'var(--jp-green)' : 'var(--jp-red)' },
              ].map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--jp-border)' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>{s.name}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color }}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'crm':
        return (
          <div className="jp-card" style={{ height: '100%' }}>
            <div className="jp-card-header">
              <h6>CRM Overview</h6>
              <Link href="/dashboard/contacts" className="jp-btn-outline" style={{ fontSize: '0.75rem', padding: '4px 12px', textDecoration: 'none' }}>View All</Link>
            </div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Contacts', value: stats.contacts.toLocaleString() },
                { label: 'Pipelines', value: stats.pipelines.toLocaleString() },
                { label: 'Opportunities', value: stats.opportunities.toLocaleString() },
                { label: 'Conversations', value: stats.conversations.toLocaleString() },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>{s.label}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--jp-text)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return <div className="jp-card"><div className="jp-card-body">Module: {mod.id}</div></div>
    }
  }

  const visibleModules = modules.filter(m => m.visible)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title">
            Welcome back, <span style={{ color: 'var(--jp-green)' }}>{userName}</span>
          </h1>
          <p className="jp-page-subtitle">Your command center overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: editMode ? '1px solid var(--jp-green-dim)' : '1px solid var(--jp-border)',
              background: editMode ? 'var(--jp-green-glow)' : 'transparent',
              color: editMode ? 'var(--jp-green)' : 'var(--jp-text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {editMode ? 'Done' : 'Customize'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: mcpStatus === 'online' ? 'var(--jp-green)' : mcpStatus === 'offline' ? 'var(--jp-red)' : 'var(--jp-amber)',
              boxShadow: mcpStatus === 'online' ? '0 0 8px rgba(110,224,90,0.4)' : undefined,
            }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>
              0nMCP {mcpStatus === 'checking' ? '...' : mcpStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Mode: Module toggle bar */}
      {editMode && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '12px 16px',
          marginBottom: 16,
          borderRadius: 12,
          background: 'var(--jp-surface)',
          border: '1px solid var(--jp-border)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', fontWeight: 600, marginRight: 8, alignSelf: 'center' }}>MODULES:</span>
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => toggleModule(m.id)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: m.visible ? '1px solid rgba(110,224,90,0.3)' : '1px solid var(--jp-border)',
                background: m.visible ? 'rgba(110,224,90,0.10)' : 'transparent',
                color: m.visible ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {m.visible ? '✓' : '○'} {m.title}
            </button>
          ))}
          <button
            onClick={resetLayout}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid rgba(238,93,80,0.3)',
              background: 'rgba(238,93,80,0.08)',
              color: 'var(--jp-red)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginLeft: 'auto',
            }}
          >
            Reset
          </button>
        </div>
      )}

      {/* Module Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}>
        {visibleModules.map(mod => (
          <div
            key={mod.id}
            draggable={editMode}
            onDragStart={e => handleDragStart(e, mod.id)}
            onDragEnd={handleDragEnd}
            onDragOver={e => handleDragOver(e, mod.id)}
            onDrop={e => handleDrop(e, mod.id)}
            style={{
              gridColumn: sizeToSpan(mod.size),
              position: 'relative',
              transition: 'transform 0.15s, box-shadow 0.15s',
              cursor: editMode ? 'grab' : 'default',
              outline: dragOverId === mod.id ? '2px solid var(--jp-green)' : 'none',
              outlineOffset: 2,
              borderRadius: 'var(--jp-radius)',
              opacity: dragId === mod.id ? 0.4 : 1,
            }}
          >
            {/* Edit mode controls */}
            {editMode && (
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                display: 'flex',
                gap: 4,
                zIndex: 10,
              }}>
                <button
                  onClick={() => cycleSize(mod.id)}
                  title={`Size: ${mod.size}`}
                  style={{
                    width: 24, height: 24,
                    borderRadius: 4,
                    border: '1px solid var(--jp-border)',
                    background: 'var(--jp-surface)',
                    color: 'var(--jp-text-muted)',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--jp-font-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {mod.size === 'full' ? '3' : mod.size === 'half' ? '2' : '1'}
                </button>
                <button
                  onClick={() => toggleModule(mod.id)}
                  title="Hide module"
                  style={{
                    width: 24, height: 24,
                    borderRadius: 4,
                    border: '1px solid rgba(238,93,80,0.3)',
                    background: 'rgba(238,93,80,0.08)',
                    color: 'var(--jp-red)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            {renderModule(mod)}
          </div>
        ))}
      </div>
    </div>
  )
}
