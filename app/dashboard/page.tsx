'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, ChevronRight, X, TrendingUp, TrendingDown, BarChart3, Search, Eye, MousePointer, ArrowUpRight, ArrowDownRight, ToggleLeft, ToggleRight } from 'lucide-react'

// ── Module types ────────────────────────────────────────────

interface DashboardModule {
  id: string
  title: string
  size: 'full' | 'half' | 'third'
  visible: boolean
}

const DEFAULT_MODULES: DashboardModule[] = [
  { id: 'stats', title: 'Stats Overview', size: 'full', visible: true },
  { id: 'cro9', title: 'CRO9 Analytics', size: 'full', visible: true },
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
  businessName?: string
  tierLevel?: number
}

export default function DashboardHome() {
  const [userName, setUserName] = useState('')
  const [mcpStatus, setMcpStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [modules, setModules] = useState<DashboardModule[]>(DEFAULT_MODULES)
  const [editMode, setEditMode] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({ contacts: 0, opportunities: 0, conversations: 0, pipelines: 0 })
  const [activity, setActivity] = useState<{ text: string; meta: string; time: string; dot: string }[]>([])
  const [kLayerCount, setKLayerCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({})
  const dragRef = useRef<HTMLDivElement | null>(null)
  const supabase = createClient()

  // CRO9 state
  const [cro9Sites, setCro9Sites] = useState<{ id: string; domain: string; status: string; last_run_summary: Record<string, unknown> | null }[]>([])
  const [cro9Tasks, setCro9Tasks] = useState<{ bucket: string; score: number; url: string; primary_keyword: string; status: string; clicks: number; impressions: number; position: number; ctr: number; ctr_gap: number }[]>([])
  const [cro9Chart, setCro9Chart] = useState<{ date: string; clicks: number; impressions: number; position: number; ctr: number }[]>([])
  const [cro9Toggles, setCro9Toggles] = useState<Record<string, boolean>>({
    clicks: true,
    impressions: true,
    position: true,
    ctr: false,
    tasks: true,
  })
  const [cro9ActiveSite, setCro9ActiveSite] = useState<string | null>(null)
  const [cro9Loading, setCro9Loading] = useState(false)

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

  const loadDashboardData = useCallback(async () => {
    setRefreshing(true)

    // MCP health
    fetch('/api/0nmcp/health')
      .then(r => r.json())
      .then(d => setMcpStatus(d.status === 'offline' ? 'offline' : 'online'))
      .catch(() => setMcpStatus('offline'))

    // CRM stats
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => {
        if (d.stats) setStats(d.stats)
        setDebugInfo({ locationId: d.locationId, pitAvailable: d.pitAvailable, debug: d.debug, error: d.error })
      })
      .catch((err) => { setDebugInfo({ fetchError: err.message }) })

    // Activity from notifications
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        const notifs = (d.notifications || []).slice(0, 5).map((n: { title: string; message: string; created_at: string; type: string }) => {
          const ago = Math.floor((Date.now() - new Date(n.created_at).getTime()) / 60000)
          const time = ago < 1 ? 'Just now' : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago / 60)}h ago` : `${Math.floor(ago / 1440)}d ago`
          return {
            text: n.title,
            meta: n.message.slice(0, 80),
            time,
            dot: n.type === 'success' ? 'green' : n.type === 'error' ? 'red' : 'blue',
          }
        })
        setActivity(notifs)
      })
      .catch(() => {})

    // K-layer count
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) {
      const { data } = await supabase
        .from('kb_content_queue')
        .select('layer')
        .eq('user_id', u.id)
        .eq('status', 'active')
      setKLayerCount(data?.length || 0)
    }

    // CRO9 data
    fetch('/api/cro9/sites')
      .then(r => r.json())
      .then(d => {
        const sites = d.sites || []
        setCro9Sites(sites)
        if (sites.length > 0 && !cro9ActiveSite) {
          setCro9ActiveSite(sites[0].id)
          loadCro9SiteData(sites[0].id)
        }
      })
      .catch(() => {})

    setLastRefresh(new Date().toLocaleTimeString())
    setTimeout(() => setRefreshing(false), 500)
  }, [supabase, cro9ActiveSite])

  const loadCro9SiteData = useCallback(async (siteId: string) => {
    setCro9Loading(true)
    try {
      const [tasksRes, chartRes] = await Promise.all([
        fetch(`/api/cro9/sites/${siteId}/tasks?limit=10`).then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch(`/api/cro9/sites/${siteId}/chart`).then(r => r.json()).catch(() => ({ rows: [] })),
      ])
      setCro9Tasks(tasksRes.tasks || [])
      setCro9Chart(chartRes.rows || [])
    } catch {}
    setCro9Loading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User')
      }
    })
    loadDashboardData()
  }, [supabase, loadDashboardData])

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

  // ── Module Size → Tailwind col-span ─────────────────────

  function sizeToColSpan(size: string) {
    switch (size) {
      case 'full':  return 'col-span-3'
      case 'half':  return 'col-span-2'
      case 'third': return 'col-span-1'
      default:      return 'col-span-1'
    }
  }

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

      case 'cro9':
        return (
          <div className="jp-card h-full">
            <div className="jp-card-header">
              <h6 className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-core-green" />
                CRO9 Analytics
              </h6>
              <div className="flex items-center gap-2">
                {/* Site selector */}
                {cro9Sites.length > 1 && (
                  <select
                    value={cro9ActiveSite || ''}
                    onChange={e => { setCro9ActiveSite(e.target.value); loadCro9SiteData(e.target.value) }}
                    className="bg-core-card border border-core-border rounded-md px-2 py-1 text-xs text-core-text-dim outline-none"
                  >
                    {cro9Sites.map(s => (
                      <option key={s.id} value={s.id}>{s.domain}</option>
                    ))}
                  </select>
                )}
                <Link href="/dashboard/cro9-engine" className="jp-btn-outline text-xs px-3 py-1 no-underline">
                  Full View
                </Link>
              </div>
            </div>
            <div className="jp-card-body">
              {cro9Sites.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 mx-auto text-core-border mb-3" />
                  <p className="text-sm text-core-text-dim mb-2">No sites connected to CRO9</p>
                  <Link href="/dashboard/cro9-engine/new" className="text-xs text-core-green hover:underline no-underline">
                    Add your first site
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Metric toggles */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'clicks', label: 'Clicks', color: 'core-cyan' },
                      { key: 'impressions', label: 'Impressions', color: 'core-green' },
                      { key: 'position', label: 'Position', color: 'core-amber' },
                      { key: 'ctr', label: 'CTR', color: 'core-purple' },
                      { key: 'tasks', label: 'Tasks', color: 'core-red' },
                    ].map(t => (
                      <button
                        key={t.key}
                        onClick={() => setCro9Toggles(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                        className={[
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer',
                          cro9Toggles[t.key]
                            ? `bg-${t.color}/10 text-${t.color} border-${t.color}/30`
                            : 'bg-transparent text-core-text-muted border-core-border',
                        ].join(' ')}
                      >
                        {cro9Toggles[t.key]
                          ? <ToggleRight className="w-3 h-3" />
                          : <ToggleLeft className="w-3 h-3" />}
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* KPI row */}
                  {cro9Chart.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        {
                          label: 'Clicks',
                          value: cro9Chart.reduce((s, r) => s + (r.clicks || 0), 0),
                          visible: cro9Toggles.clicks,
                          icon: MousePointer,
                          color: 'core-cyan',
                        },
                        {
                          label: 'Impressions',
                          value: cro9Chart.reduce((s, r) => s + (r.impressions || 0), 0),
                          visible: cro9Toggles.impressions,
                          icon: Eye,
                          color: 'core-green',
                        },
                        {
                          label: 'Avg Position',
                          value: cro9Chart.length > 0
                            ? (cro9Chart.reduce((s, r) => s + (r.position || 0), 0) / cro9Chart.length).toFixed(1)
                            : '0',
                          visible: cro9Toggles.position,
                          icon: TrendingUp,
                          color: 'core-amber',
                        },
                        {
                          label: 'Avg CTR',
                          value: cro9Chart.length > 0
                            ? (cro9Chart.reduce((s, r) => s + (r.ctr || 0), 0) / cro9Chart.length * 100).toFixed(1) + '%'
                            : '0%',
                          visible: cro9Toggles.ctr,
                          icon: ArrowUpRight,
                          color: 'core-purple',
                        },
                      ]
                        .filter(k => k.visible)
                        .map(k => (
                          <div key={k.label} className="p-3 rounded-lg bg-core-card-hover border border-core-border">
                            <div className="flex items-center gap-1.5 mb-1">
                              <k.icon className={`w-3.5 h-3.5 text-${k.color}`} />
                              <span className="text-[11px] text-core-text-muted">{k.label}</span>
                            </div>
                            <div className={`text-lg font-bold text-${k.color}`}>
                              {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Mini sparkline chart */}
                  {cro9Toggles.clicks && cro9Chart.length > 0 && (
                    <div className="h-20 flex items-end gap-0.5">
                      {cro9Chart.slice(-28).map((row, i) => {
                        const max = Math.max(...cro9Chart.slice(-28).map(r => r.clicks || 1))
                        const pct = max > 0 ? ((row.clicks || 0) / max) * 100 : 0
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-core-cyan/30 rounded-t-sm hover:bg-core-cyan/50 transition-colors"
                            style={{ height: `${Math.max(pct, 2)}%` }}
                            title={`${row.date}: ${row.clicks} clicks`}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Top tasks */}
                  {cro9Toggles.tasks && cro9Tasks.length > 0 && (
                    <div>
                      <div className="text-[11px] text-core-text-muted font-semibold uppercase tracking-wider mb-2">
                        Top Opportunities
                      </div>
                      <div className="space-y-1.5">
                        {cro9Tasks.slice(0, 5).map((task, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-core-card-hover border border-core-border">
                            <span className={[
                              'px-1.5 py-0.5 rounded text-[10px] font-bold',
                              task.bucket === 'CTR_FIX' ? 'bg-core-cyan/10 text-core-cyan' :
                              task.bucket === 'POSITION_CLIMB' ? 'bg-core-amber/10 text-core-amber' :
                              task.bucket === 'RELEVANCE_REBUILD' ? 'bg-core-purple/10 text-core-purple' :
                              task.bucket === 'THIN_CONTENT' ? 'bg-core-red/10 text-core-red' :
                              'bg-core-green/10 text-core-green',
                            ].join(' ')}>
                              {task.bucket.replace(/_/g, ' ')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-core-text truncate">{task.primary_keyword}</div>
                              <div className="text-[10px] text-core-text-muted truncate">{task.url}</div>
                            </div>
                            <div className="flex gap-3 text-[11px] text-core-text-muted shrink-0">
                              <span title="Score">{(task.score * 100).toFixed(0)}</span>
                              <span title="Position">P{task.position?.toFixed(1)}</span>
                              <span title="CTR Gap" className={task.ctr_gap > 0.1 ? 'text-core-red' : ''}>
                                {task.ctr_gap > 0 ? `-${(task.ctr_gap * 100).toFixed(0)}%` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cro9Loading && (
                    <div className="text-center py-4 text-core-text-muted text-xs">Loading...</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )

      case 'actions':
        return (
          <div className="jp-card h-full">
            <div className="jp-card-header"><h6>Quick Actions</h6></div>
            <div className="jp-card-body flex flex-col gap-2">
              {[
                { label: 'New Contact',     href: '/dashboard/contacts',  className: 'bg-core-cyan/10 text-core-cyan border border-core-cyan/20' },
                { label: 'Run Workflow',    href: '/dashboard/workflows', className: 'bg-core-green/10 text-core-green border border-core-green/20' },
                { label: 'Chat with Jaxx', href: '/dashboard/chat',      className: 'bg-core-purple/10 text-core-purple border border-core-purple/20' },
                { label: 'Training Center', href: '/dashboard/training', className: 'bg-core-amber/10 text-core-amber border border-core-amber/20' },
              ].map(a => (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg no-underline text-sm font-semibold transition-opacity hover:opacity-80 ${a.className}`}
                >
                  {a.label}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </div>
        )

      case 'status':
        return (
          <div className="jp-card h-full">
            <div className="jp-card-header"><h6>System Status</h6></div>
            <div className="jp-card-body flex flex-col gap-3.5">
              {[
                { label: '0nMCP Engine',    active: mcpStatus === 'online' },
                { label: 'Vault Encryption', active: true },
                { label: 'Webhook Handlers', active: true },
                { label: 'CRM Sync',         active: false },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[0.8125rem] text-core-text-dim">{s.label}</span>
                    <span className={`text-[0.6875rem] font-semibold ${s.active ? 'text-core-green' : 'text-core-text-muted'}`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="jp-progress">
                    <div
                      className={`jp-progress-bar ${s.active ? 'green' : ''}`}
                      style={{ width: s.active ? '100%' : '0%', background: s.active ? undefined : 'var(--jp-border-hi)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'activity':
        return (
          <div className="jp-card h-full">
            <div className="jp-card-header"><h6>Recent Activity</h6></div>
            <ul className="jp-activity-list">
              {activity.length === 0 ? (
                <li className="jp-activity-item justify-center text-core-text-muted text-[0.8125rem]">
                  No recent activity
                </li>
              ) : (
                activity.map((a, i) => (
                  <li key={i} className="jp-activity-item">
                    <span className={`jp-activity-dot ${a.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.8125rem] font-semibold text-core-text">{a.text}</div>
                      <div className="text-xs text-core-text-muted truncate">{a.meta}</div>
                    </div>
                    <span className="text-[0.6875rem] text-core-text-muted shrink-0">{a.time}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )

      case 'training':
        return (
          <div className="jp-card h-full">
            <div className="jp-card-header">
              <h6>Training Center</h6>
              <Link href="/dashboard/training" className="jp-btn-outline text-xs px-3 py-1 no-underline">View All</Link>
            </div>
            <div className="jp-card-body">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'K-Layers',  value: String(kLayerCount),                                    colorClass: 'text-core-cyan' },
                  { label: 'Contacts',  value: stats.contacts > 0 ? stats.contacts.toLocaleString() : '0', colorClass: 'text-core-green' },
                  { label: 'Pipelines', value: String(stats.pipelines),                                 colorClass: 'text-core-amber' },
                  { label: 'Tier',      value: String(stats.tierLevel ?? 0),                            colorClass: 'text-core-purple' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-lg bg-core-card-hover border border-core-border">
                    <div className={`text-xl font-bold ${s.colorClass}`}>{s.value}</div>
                    <div className="text-xs text-core-text-muted mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'integrations':
        return (
          <div className="jp-card h-full">
            <div className="jp-card-header">
              <h6>Integrations</h6>
              <Link href="/dashboard/integrations" className="jp-btn-outline text-xs px-3 py-1 no-underline">Manage</Link>
            </div>
            <div className="jp-card-body flex flex-col gap-2">
              {[
                { name: 'CRM',     status: 'Connected',                                      online: true },
                { name: 'Stripe',  status: 'Connected',                                      online: true },
                { name: 'Supabase', status: 'Connected',                                     online: true },
                { name: '0nMCP',   status: mcpStatus === 'online' ? 'Online' : 'Offline',    online: mcpStatus === 'online' },
              ].map(s => (
                <div key={s.name} className="flex justify-between py-2 border-b border-core-border">
                  <span className="text-[0.8125rem] text-core-text-dim">{s.name}</span>
                  <span className={`text-xs font-semibold ${s.online ? 'text-core-green' : 'text-core-red'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'crm':
        return (
          <div className="jp-card h-full">
            <div className="jp-card-header">
              <h6>CRM Overview</h6>
              <Link href="/dashboard/contacts" className="jp-btn-outline text-xs px-3 py-1 no-underline">View All</Link>
            </div>
            <div className="jp-card-body flex flex-col gap-3">
              {[
                { label: 'Contacts',      value: stats.contacts.toLocaleString() },
                { label: 'Pipelines',     value: stats.pipelines.toLocaleString() },
                { label: 'Opportunities', value: stats.opportunities.toLocaleString() },
                { label: 'Conversations', value: stats.conversations.toLocaleString() },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-[0.8125rem] text-core-text-dim">{s.label}</span>
                  <span className="text-base font-bold text-core-text">{s.value}</span>
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
    <div className="max-w-[1200px] mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="jp-page-header flex items-center justify-between">
        <div>
          <h1 className="jp-page-title">
            Welcome back, <span className="text-core-green">{userName}</span>
          </h1>
          <p className="jp-page-subtitle">
            Your command center overview
            {debugInfo.locationId ? (
              <span className="ml-3 text-[0.65rem] text-core-text-muted font-mono">
                {'Location: ' + String(debugInfo.locationId).slice(0, 20) + (String(debugInfo.locationId).length > 20 ? '...' : '')}
                {debugInfo.pitAvailable ? ' · PIT ✓' : ' · PIT ✗'}
              </span>
            ) : null}
            {debugInfo.debug ? (
              <span className="ml-2 text-[0.65rem] text-core-amber font-mono">
                {'(' + String((debugInfo.debug as Record<string, string>)?.userEmail || 'unknown') + ')'}
              </span>
            ) : null}
            {debugInfo.error ? (
              <span className="ml-2 text-[0.65rem] text-core-red font-mono">
                {'Error: ' + String(debugInfo.error).slice(0, 40)}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className={[
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[0.8rem] font-semibold transition-all',
              refreshing
                ? 'border-core-green-dim bg-core-green/10 text-core-green cursor-not-allowed'
                : 'border-core-border bg-transparent text-core-text-muted hover:text-core-text cursor-pointer',
            ].join(' ')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {lastRefresh && (
            <span className="text-[0.65rem] text-core-text-muted">
              Last: {lastRefresh}
            </span>
          )}

          <button
            onClick={() => setEditMode(!editMode)}
            className={[
              'px-3.5 py-1.5 rounded-lg border text-[0.8rem] font-semibold cursor-pointer transition-all',
              editMode
                ? 'border-core-green-dim bg-core-green/10 text-core-green'
                : 'border-core-border bg-transparent text-core-text-muted hover:text-core-text',
            ].join(' ')}
          >
            {editMode ? 'Done' : 'Customize'}
          </button>

          {/* MCP Status Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={[
                'w-2 h-2 rounded-full',
                mcpStatus === 'online'  ? 'bg-core-green shadow-[0_0_8px_rgba(110,224,90,0.4)]' : '',
                mcpStatus === 'offline' ? 'bg-core-red'   : '',
                mcpStatus === 'checking'? 'bg-core-amber' : '',
              ].join(' ')}
            />
            <span className="text-[0.8125rem] text-core-text-dim">
              0nMCP {mcpStatus === 'checking' ? '...' : mcpStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Mode: Module toggle bar */}
      {editMode && (
        <div className="flex flex-wrap gap-1.5 px-4 py-3 mb-4 rounded-xl bg-core-surface border border-core-border">
          <span className="text-xs text-core-text-muted font-semibold mr-2 self-center">MODULES:</span>
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => toggleModule(m.id)}
              className={[
                'px-3 py-1 rounded-md border text-xs font-semibold cursor-pointer transition-all',
                m.visible
                  ? 'border-core-green/30 bg-core-green/10 text-core-green'
                  : 'border-core-border bg-transparent text-core-text-muted',
              ].join(' ')}
            >
              {m.visible ? '✓' : '○'} {m.title}
            </button>
          ))}
          <button
            onClick={resetLayout}
            className="px-3 py-1 rounded-md border border-core-red/30 bg-core-red/8 text-core-red text-xs font-semibold cursor-pointer ml-auto transition-all hover:bg-core-red/15"
          >
            Reset
          </button>
        </div>
      )}

      {/* Module Grid */}
      <div className="grid grid-cols-3 gap-4">
        {visibleModules.map(mod => (
          <div
            key={mod.id}
            draggable={editMode}
            onDragStart={e => handleDragStart(e, mod.id)}
            onDragEnd={handleDragEnd}
            onDragOver={e => handleDragOver(e, mod.id)}
            onDrop={e => handleDrop(e, mod.id)}
            className={[
              sizeToColSpan(mod.size),
              'relative transition-[transform,box-shadow] duration-150 rounded-xl',
              editMode ? 'cursor-grab' : 'cursor-default',
              dragOverId === mod.id ? 'outline outline-2 outline-core-green outline-offset-2' : '',
              dragId === mod.id ? 'opacity-40' : 'opacity-100',
            ].join(' ')}
          >
            {/* Edit mode controls */}
            {editMode && (
              <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
                <button
                  onClick={() => cycleSize(mod.id)}
                  title={`Size: ${mod.size}`}
                  className="w-6 h-6 rounded flex items-center justify-center border border-core-border bg-core-surface text-core-text-muted text-[0.6rem] font-bold cursor-pointer font-mono"
                >
                  {mod.size === 'full' ? '3' : mod.size === 'half' ? '2' : '1'}
                </button>
                <button
                  onClick={() => toggleModule(mod.id)}
                  title="Hide module"
                  className="w-6 h-6 rounded flex items-center justify-center border border-core-red/30 bg-core-red/8 text-core-red cursor-pointer hover:bg-core-red/15"
                >
                  <X className="w-3 h-3" />
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
