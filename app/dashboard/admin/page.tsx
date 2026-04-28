'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'database' | 'users' | 'training' | 'ecosystem' | 'sitemaps'

interface TableInfo {
  name: string
  row_count: number
  group: string
}

interface UserProfile {
  id: string
  email?: string
  full_name?: string
  plan?: string
  is_admin?: boolean
  stripe_customer_id?: string
  crm_contact_id?: string
  created_at?: string
  [key: string]: unknown
}

interface TrainingData {
  sources: { total: number; recent: { id: string; title: string; source_type: string; status: string; token_count: number; created_at: string }[] }
  pairs: { total: number; recent: { id: string; user_input: string; assistant_output: string; domain: string; quality_score: number; approved: boolean; human_reviewed: boolean; created_at: string }[] }
  datasets: { id: string; name: string; pair_count?: number; status: string; created_at: string }[]
  feeds: { id: string; name: string; status: string }[]
  knowledge: { total: number; avg_score: number }
  runs: { id: string; created_at: string; status?: string; [key: string]: unknown }[]
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<{ total_users: number; total_training_sources: number; total_training_pairs: number; total_knowledge: number } | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [training, setTraining] = useState<TrainingData | null>(null)
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [tableData, setTableData] = useState<{ rows: Record<string, unknown>[]; total: number }>({ rows: [], total: 0 })
  const [tableOffset, setTableOffset] = useState(0)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedLoading, setFeedLoading] = useState(false)

  const fetchApi = useCallback(async (action: string, params: Record<string, string> = {}) => {
    const sp = new URLSearchParams({ action, ...params })
    const res = await fetch(`/api/admin?${sp.toString()}`)
    return res.json()
  }, [])

  // Load stats on mount
  useEffect(() => {
    fetchApi('stats').then(d => setStats(d.stats))
  }, [fetchApi])

  // Load tab data
  useEffect(() => {
    setLoading(true)
    const load = async () => {
      switch (tab) {
        case 'database':
          if (tables.length === 0) {
            const d = await fetchApi('tables')
            setTables(d.tables || [])
          }
          break
        case 'users':
          if (users.length === 0) {
            const d = await fetchApi('users')
            setUsers(d.users || [])
            setUsersTotal(d.total || 0)
          }
          break
        case 'training':
          if (!training) {
            const d = await fetchApi('training')
            setTraining(d.training)
          }
          break
      }
      setLoading(false)
    }
    load()
  }, [tab, fetchApi, tables.length, users.length, training])

  // Load table data when selected
  useEffect(() => {
    if (!selectedTable) return
    setLoading(true)
    fetchApi('table_data', { table: selectedTable, offset: String(tableOffset), limit: '20' }).then(d => {
      setTableData({ rows: d.rows || [], total: d.total || 0 })
      setLoading(false)
    })
  }, [selectedTable, tableOffset, fetchApi])

  async function handleFeed() {
    setFeedLoading(true)
    try {
      await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feed' }),
      })
      const d = await fetchApi('training')
      setTraining(d.training)
    } catch {}
    setFeedLoading(false)
  }

  async function handleApprove(pairId: string) {
    await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', pair_id: pairId }),
    })
    const d = await fetchApi('training')
    setTraining(d.training)
  }

  async function handleReject(pairId: string) {
    await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', pair_id: pairId }),
    })
    const d = await fetchApi('training')
    setTraining(d.training)
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z' },
    { key: 'database', label: 'Database', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
    { key: 'users', label: 'Users', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'training', label: '0nAI Training', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { key: 'ecosystem', label: 'Ecosystem', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9' },
    { key: 'sitemaps', label: 'Sitemaps', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  ]

  const tableGroups = tables.reduce<Record<string, TableInfo[]>>((acc, t) => {
    const g = t.group || 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {})

  // Sub-page link color classes
  const linkAccentMap: Record<string, { text: string; border: string; bg: string; stroke: string }> = {
    green: { text: 'text-core-green', border: 'border-core-green', bg: 'bg-core-green/10', stroke: '#6EE05A' },
    cyan: { text: 'text-core-cyan', border: 'border-core-cyan', bg: 'bg-core-cyan/10', stroke: '#14b8a6' },
    purple: { text: 'text-core-purple', border: 'border-core-purple', bg: 'bg-core-purple/10', stroke: '#8b5cf6' },
  }

  const subPageLinks = [
    { href: '/dashboard/admin/workflows', label: 'Workflows', desc: 'Launch & manage', accent: 'green', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { href: '/dashboard/admin/crm', label: 'CRM Live', desc: 'Real-time data', accent: 'cyan', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { href: '/dashboard/admin/marketing', label: 'Marketing Tools', desc: 'Content & social', accent: 'purple', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    { href: '/dashboard/admin/mcp-registry', label: 'MCP Registry', desc: 'Browse & connect official MCP servers', accent: 'green', icon: 'M5 12h14M12 5l7 7-7 7' },
  ]

  // VIP location config — hardcoded for mike@rocketopp.com
  const VIP_LOCATIONS = [
    { id: '6MSqx0trfxgLxeHBJE1k', name: 'RocketOpp', pit: 'pit-0317b406-8a47-478e-ac28-a88763a9bb3f' },
    { id: 'nphConTwfHcVE1oA0uep', name: '0nCore', pit: 'pit-f5f41b5a-32e4-4aee-84f4-a130cd3aad91' },
  ]
  const [activeLocation, setActiveLocation] = useState(VIP_LOCATIONS[1])

  const VIP_APPS = [
    { name: 'CRM Dashboard', href: '/crm', badge: 'SDK' },
    { name: 'Automations', href: '/dashboard/automations', badge: 'NEW' },
    { name: 'Freelancer', href: '/dashboard/freelancer', badge: 'NEW' },
    { name: 'Market Intel', href: '/dashboard/market-intel', badge: 'NEW' },
    { name: 'LinkedIn Bot', href: '/dashboard/linkedin-bot' },
    { name: 'Social Planner', href: '/dashboard/social' },
    { name: 'Email Builder', href: '/dashboard/email/builder' },
    { name: 'Voice AI', href: '/dashboard/voice' },
    { name: 'Blog Engine', href: '/dashboard/blog' },
    { name: 'Analytics', href: '/dashboard/analytics', badge: 'CRO9' },
    { name: 'Security Scanner', href: '/dashboard/security', badge: 'HIPAA' },
    { name: 'WordPress', href: '/dashboard/wordpress' },
    { name: 'Courses', href: '/dashboard/courses' },
    { name: '0nExec', href: '/console/exec' },
    { name: 'Contacts', href: '/dashboard/contacts' },
    { name: 'Calendar', href: '/dashboard/calendar' },
    { name: 'Invoices', href: '/dashboard/invoices' },
    { name: 'Pipeline', href: '/dashboard/pipeline' },
    { name: 'Workflows', href: '/dashboard/workflows' },
    { name: 'Knowledge Base', href: '/dashboard/training' },
    { name: 'Brand Builder', href: '/dashboard/brand' },
    { name: 'Downloads', href: '/downloads' },
  ]

  return (
    <div className="pb-10 animate-fade-in max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-core-green tracking-tight m-0">
            Admin Control Panel
          </h1>
          <p className="text-core-text-muted text-xs mt-1">
            VIP access — all products, all locations, no restrictions
          </p>
        </div>
        <div className="px-3 py-1.5 bg-core-green/[0.08] border border-core-green/20 rounded text-core-green text-xs font-semibold">
          mike@rocketopp.com
        </div>
      </div>

      {/* ═══ VIP LOCATION SWITCHER ═══ */}
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Active Location</span>
        </div>
        <div className="flex gap-2 mb-4">
          {VIP_LOCATIONS.map(loc => (
            <button key={loc.id} onClick={() => setActiveLocation(loc)}
              className={`flex-1 px-4 py-3 rounded-lg border text-sm font-bold cursor-pointer transition-all ${
                activeLocation.id === loc.id
                  ? 'bg-[#7ed957]/10 border-[#7ed957]/30 text-[#7ed957]'
                  : 'bg-transparent border-white/[0.06] text-white/40 hover:text-white hover:border-white/[0.12]'
              }`}>
              {loc.name}
              <span className="block text-[10px] font-mono text-white/20 mt-0.5">{loc.id}</span>
            </button>
          ))}
          <a href={`https://app.rocketclients.com/v2/location/${activeLocation.id}`}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs text-white/50 font-semibold hover:text-white hover:border-[#00d4ff]/30 transition-colors flex items-center gap-1.5 no-underline cursor-pointer">
            Open in CRM
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          </a>
        </div>

        {/* VIP Apps Grid */}
        <div className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">All Products — VIP Access</div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {VIP_APPS.map(app => (
            <Link key={app.href} href={app.href}
              className="px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-[#7ed957]/20 hover:bg-[#7ed957]/[0.03] transition-all text-center no-underline group">
              <div className="text-[11px] font-semibold text-white/70 group-hover:text-white truncate">{app.name}</div>
              {app.badge && <span className="text-[8px] font-bold text-[#7ed957]/60 uppercase">{app.badge}</span>}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 text-[10px] text-white/15">
          <span>PIT: <code className="text-white/25 font-mono">{activeLocation.pit.slice(0, 16)}...</code></span>
          <span>Location: <code className="text-white/25 font-mono">{activeLocation.id}</code></span>
          <span className="text-[#7ed957]/40 font-semibold">VIP — All features unlocked</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-core-border mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 bg-transparent transition-all duration-150 cursor-pointer
              ${tab === t.key
                ? 'border-core-green text-core-green'
                : 'border-transparent text-core-text-dim hover:text-core-text'
              }`}
          >
            <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-Page Links */}
      <div className="flex gap-2.5 mb-6 flex-wrap">
        {subPageLinks.map((link) => {
          const accent = linkAccentMap[link.accent]
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-5 py-3 bg-core-card border border-core-border rounded-lg no-underline transition-all duration-200 flex-1 min-w-[200px] hover:bg-core-card-hover hover:${accent.border}`}
            >
              <div className={`w-9 h-9 rounded-md ${accent.bg} border border-current/20 flex items-center justify-center shrink-0`}>
                <svg width={18} height={18} fill="none" stroke={accent.stroke} viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
              </div>
              <div>
                <div className={`${accent.text} text-sm font-bold`}>{link.label}</div>
                <div className="text-core-text-muted text-[11px]">{link.desc}</div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {tab === 'overview' && (
        <div>
          {/* Stat Cards */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats?.total_users || 0, colorClass: 'text-core-green' },
              { label: 'Training Sources', value: stats?.total_training_sources || 0, colorClass: 'text-core-cyan' },
              { label: 'Training Pairs', value: stats?.total_training_pairs || 0, colorClass: 'text-core-purple' },
              { label: 'Knowledge Entries', value: stats?.total_knowledge || 0, colorClass: 'text-core-amber' },
            ].map((card, i) => (
              <div key={i} className="bg-core-card border border-core-border rounded-xl p-5">
                <div className="text-core-text-muted text-[11px] font-medium uppercase tracking-wide mb-2">
                  {card.label}
                </div>
                <div className={`text-4xl font-bold ${card.colorClass}`}>
                  {card.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Ecosystem Map */}
          <h3 className="text-base font-semibold text-core-text mb-4">Ecosystem Map</h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 mb-8">
            {[
              { name: '0nMCP', desc: 'Universal AI API Orchestrator', stats: '1,171 tools / 54 services', url: 'https://www.npmjs.com/package/0nmcp', github: 'https://github.com/0nork/0nMCP', colorClass: 'text-core-green' },
              { name: '0nmcp.com', desc: 'Marketing + Community Hub', stats: '48 pages / 33 API routes', url: 'https://0nmcp.com', vercel: 'prj_Ccq53WXdb5CQd4iIBRR0qr4QToge', colorClass: 'text-core-cyan' },
              { name: '0nCore', desc: 'Client CRM Portal', stats: 'PIN auth / Metered billing', url: 'https://0ncore.com', vercel: 'prj_OJ0gi5HItdtUmQYclXirYk1BSJnt', colorClass: 'text-core-green' },
              { name: '0nCommand', desc: 'Command Center', stats: '80 routes / 10 engines', url: 'https://0n-command-center.vercel.app', colorClass: 'text-core-purple' },
              { name: 'Marketplace', desc: 'SaaS Platform', stats: 'Pay-per-execution', url: 'https://marketplace.rocketclients.com', vercel: 'prj_fWdT7RGwoK01RqhxNN6M7USSCIZj', colorClass: 'text-core-amber' },
              { name: 'social0n', desc: 'LinkedIn Extension', stats: 'Chrome Extension', github: 'https://github.com/0nork/0n-linkedin', colorClass: 'text-core-cyan' },
            ].map((p, i) => (
              <div key={i} className="bg-core-card border border-core-border rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-base font-bold ${p.colorClass}`}>{p.name}</span>
                  <span className="text-[11px] text-core-text-muted bg-core-bg px-2 py-0.5 rounded">
                    {p.stats}
                  </span>
                </div>
                <p className="text-core-text-dim text-xs m-0">{p.desc}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-core-cyan no-underline hover:underline">
                      Open
                    </a>
                  )}
                  {p.github && (
                    <a href={p.github} target="_blank" rel="noopener noreferrer" className="text-[11px] text-core-text-muted no-underline hover:underline">
                      GitHub
                    </a>
                  )}
                  {p.vercel && (
                    <span className="text-[11px] text-core-text-muted">Vercel: {p.vercel.slice(4, 12)}...</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <h3 className="text-base font-semibold text-core-text mb-4">Quick Links</h3>
          <div className="flex flex-wrap gap-2.5">
            {[
              { label: 'Supabase', url: 'https://supabase.com/dashboard/project/yaehbwimocvvnnlojkxe' },
              { label: 'Stripe', url: 'https://dashboard.stripe.com' },
              { label: 'Vercel', url: 'https://vercel.com/cryptogoatz' },
              { label: 'GitHub (0nork)', url: 'https://github.com/0nork' },
              { label: 'GitHub (Crypto-Goatz)', url: 'https://github.com/Crypto-Goatz' },
              { label: 'CRM', url: 'https://app.clientclub.net' },
              { label: 'npm (0nmcp)', url: 'https://www.npmjs.com/package/0nmcp' },
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-core-card border border-core-border rounded-lg text-core-text-dim text-xs no-underline transition-all duration-150 hover:border-core-green hover:text-core-green"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CRM Info */}
          <div className="mt-8 bg-core-card border border-core-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-core-text mb-3 mt-0">CRM Status</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
              <div>
                <span className="text-core-text-muted text-xs">Sub-location PIT</span>
                <div className="text-core-text-dim text-xs font-mono mt-0.5">pit-bd4efaef-...-85e941572675</div>
              </div>
              <div>
                <span className="text-core-text-muted text-xs">RocketOpp Location</span>
                <div className="text-core-text-dim text-xs font-mono mt-0.5">6MSqx0trfxgLxeHBJE1k</div>
              </div>
              <div>
                <span className="text-core-text-muted text-xs">Agency PIT</span>
                <div className="text-core-text-dim text-xs font-mono mt-0.5">pit-e789d87e-...-ff46aa47a316</div>
              </div>
            </div>
          </div>

          {/* ===== Theme Components Showcase ===== */}
          <div className="mt-10">
            <h3 className="text-lg font-bold text-core-text mb-1.5">Theme Components</h3>
            <p className="text-core-text-muted text-xs mb-6">Nubra UI / Jampack dark theme reference — all jp- styled components</p>

            {/* Stat Cards — 4 colors */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Stat Cards</h4>
            <div className="grid grid-cols-4 gap-3 mb-7">
              {[
                { label: 'Revenue', value: '$12,847', change: '+14.2%', topBorder: 'border-t-core-green', colorClass: 'text-core-green' },
                { label: 'Deployments', value: '1,284', change: '+8.7%', topBorder: 'border-t-core-cyan', colorClass: 'text-core-cyan' },
                { label: 'Active Users', value: '342', change: '+23.1%', topBorder: 'border-t-core-purple', colorClass: 'text-core-purple' },
                { label: 'Uptime', value: '99.97%', change: 'Stable', topBorder: 'border-t-core-amber', colorClass: 'text-core-amber' },
              ].map((stat, i) => (
                <div key={i} className={`bg-core-card border border-core-border border-t-2 ${stat.topBorder} rounded-xl p-4`}>
                  <div className="text-core-text-muted text-[10px] font-medium uppercase tracking-wide mb-2">{stat.label}</div>
                  <div className={`text-3xl font-extrabold ${stat.colorClass} mb-1`}>{stat.value}</div>
                  <div className={`text-[10px] font-semibold ${stat.colorClass} opacity-80`}>{stat.change}</div>
                </div>
              ))}
            </div>

            {/* Progress Bars */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Progress Bars</h4>
            <div className="bg-core-card border border-core-border rounded-xl p-5 mb-7">
              {[
                { label: 'API Quota', value: 78, colorClass: 'text-core-green', barColor: 'bg-core-green' },
                { label: 'Storage', value: 45, colorClass: 'text-core-cyan', barColor: 'bg-core-cyan' },
                { label: 'Training Progress', value: 92, colorClass: 'text-core-purple', barColor: 'bg-core-purple' },
                { label: 'Bandwidth', value: 31, colorClass: 'text-core-amber', barColor: 'bg-core-amber' },
              ].map((bar, i) => (
                <div key={i} className={i < 3 ? 'mb-4' : ''}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-core-text-dim text-xs font-medium">{bar.label}</span>
                    <span className={`text-xs font-bold ${bar.colorClass}`}>{bar.value}%</span>
                  </div>
                  <div className="h-1.5 bg-core-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.barColor} rounded-full transition-all duration-1000`}
                      style={{ width: `${bar.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Badge Variants */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Badge Variants</h4>
            <div className="flex flex-wrap gap-2 mb-7">
              {[
                { label: 'Active', classes: 'bg-core-green/10 border-core-green/25 text-core-green' },
                { label: 'Processing', classes: 'bg-core-cyan/10 border-core-cyan/25 text-core-cyan' },
                { label: 'Pending', classes: 'bg-core-amber/10 border-core-amber/25 text-core-amber' },
                { label: 'Error', classes: 'bg-core-red/10 border-core-red/25 text-core-red' },
                { label: 'Premium', classes: 'bg-core-purple/10 border-core-purple/25 text-core-purple' },
                { label: 'v2.5.0', classes: 'bg-core-green/[0.06] border-core-green/15 text-core-green' },
                { label: '1,171 tools', classes: 'bg-core-cyan/[0.06] border-core-cyan/15 text-core-cyan' },
                { label: 'MIT', classes: 'bg-core-purple/[0.06] border-core-purple/15 text-core-purple' },
              ].map((badge, i) => (
                <span key={i} className={`px-3 py-1 border rounded-full text-[11px] font-semibold ${badge.classes}`}>
                  {badge.label}
                </span>
              ))}
            </div>

            {/* CSS Bar Chart */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Chart Area</h4>
            <div className="bg-core-card border border-core-border rounded-xl p-5 mb-7">
              <div className="flex justify-between mb-4">
                <span className="text-core-text text-sm font-semibold">Weekly Executions</span>
                <span className="text-core-green text-xs font-bold">+24% vs last week</span>
              </div>
              <div className="flex items-end gap-2 h-28">
                {[45, 62, 38, 78, 95, 72, 88].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-core-text-muted text-[9px] font-semibold">{val}</span>
                    <div
                      className="w-full bg-gradient-to-b from-core-green to-core-green-dim rounded-t transition-all duration-700"
                      style={{ height: `${val}%`, opacity: 0.7 + (val / 300) }}
                    />
                    <span className="text-core-text-muted text-[9px]">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Activity Timeline</h4>
            <div className="bg-core-card border border-core-border rounded-xl p-5 mb-7">
              {[
                { time: '2 min ago', event: 'Workflow executed: CRM Health Check', colorClass: 'text-core-green', iconBg: 'bg-core-green/[0.08] border-core-green/20', stroke: '#6EE05A', icon: 'M5 13l4 4L19 7' },
                { time: '15 min ago', event: 'New contact synced from CRM', colorClass: 'text-core-cyan', iconBg: 'bg-core-cyan/[0.08] border-core-cyan/20', stroke: '#14b8a6', icon: 'M12 4v16m8-8H4' },
                { time: '1 hr ago', event: 'Training batch completed (47 sources)', colorClass: 'text-core-purple', iconBg: 'bg-core-purple/[0.08] border-core-purple/20', stroke: '#8b5cf6', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707' },
                { time: '3 hrs ago', event: 'Stripe webhook: Payment succeeded ($49)', colorClass: 'text-core-amber', iconBg: 'bg-core-amber/[0.08] border-core-amber/20', stroke: '#f59e0b', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2' },
                { time: '6 hrs ago', event: 'Deploy: 0nCore v1.2.0 to production', colorClass: 'text-core-green', iconBg: 'bg-core-green/[0.08] border-core-green/20', stroke: '#6EE05A', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
              ].map((item, i) => (
                <div key={i} className={`flex gap-3.5 ${i < 4 ? 'pb-4 mb-4 border-b border-core-border' : ''}`}>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <svg width={14} height={14} fill="none" stroke={item.stroke} viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-core-text-dim text-xs">{item.event}</div>
                    <div className="text-core-text-muted text-[10px] mt-0.5">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Glassmorphism Card */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Glassmorphism Card</h4>
            <div className="relative overflow-hidden rounded-xl p-6 mb-7 border border-core-green/15 bg-gradient-to-br from-core-green/[0.06] via-core-cyan/[0.06] to-core-purple/[0.06] backdrop-blur-xl">
              <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-core-green/10 blur-2xl" />
              <div className="relative">
                <div className="text-core-green text-xl font-extrabold mb-2">0nMCP Orchestrator</div>
                <div className="text-core-text-dim text-xs leading-relaxed mb-4">
                  Universal AI API Orchestrator — 1,171 tools across 54 services. Three-level execution: Pipeline &gt; Assembly Line &gt; Radial Burst.
                </div>
                <div className="flex gap-3">
                  <span className="px-3 py-1 bg-core-green/10 border border-core-green/20 rounded-full text-core-green text-[11px] font-semibold">v2.5.0</span>
                  <span className="px-3 py-1 bg-core-cyan/10 border border-core-cyan/20 rounded-full text-core-cyan text-[11px] font-semibold">MIT License</span>
                  <span className="px-3 py-1 bg-core-purple/10 border border-core-purple/20 rounded-full text-core-purple text-[11px] font-semibold">Patent Pending</span>
                </div>
              </div>
            </div>

            {/* Gradient Button Variants */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Gradient Buttons</h4>
            <div className="flex flex-wrap gap-2.5 mb-7">
              <button className="px-6 py-2.5 bg-gradient-to-br from-core-green to-core-green-dim text-black text-xs font-bold rounded-md tracking-wide cursor-pointer border-0">Primary</button>
              <button className="px-6 py-2.5 bg-gradient-to-br from-core-cyan to-cyan-600 text-black text-xs font-bold rounded-md tracking-wide cursor-pointer border-0">Cyan</button>
              <button className="px-6 py-2.5 bg-gradient-to-br from-core-purple to-violet-700 text-white text-xs font-bold rounded-md tracking-wide cursor-pointer border-0">Purple</button>
              <button className="px-6 py-2.5 bg-gradient-to-br from-core-amber to-amber-600 text-black text-xs font-bold rounded-md tracking-wide cursor-pointer border-0">Amber</button>
              <button className="px-6 py-2.5 bg-gradient-to-br from-core-red to-red-700 text-white text-xs font-bold rounded-md tracking-wide cursor-pointer border-0">Danger</button>
              <button className="px-6 py-2.5 bg-transparent text-core-text-dim text-xs font-bold rounded-md tracking-wide cursor-pointer border border-core-border">Ghost</button>
            </div>

            {/* Alert/Toast Examples */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Alerts</h4>
            <div className="flex flex-col gap-2 mb-7">
              {[
                { type: 'Success', message: 'Workflow executed successfully. 47 contacts processed.', classes: 'bg-core-green/[0.06] border-core-green/15 border-l-core-green text-core-green' },
                { type: 'Info', message: 'CRM sync running in background. ETA: 2 minutes.', classes: 'bg-core-cyan/[0.06] border-core-cyan/15 border-l-core-cyan text-core-cyan' },
                { type: 'Warning', message: '15 stale contacts detected. Consider running a nurture sequence.', classes: 'bg-core-amber/[0.06] border-core-amber/15 border-l-core-amber text-core-amber' },
                { type: 'Error', message: 'CRM API rate limit exceeded. Retrying in 30 seconds.', classes: 'bg-core-red/[0.06] border-core-red/15 border-l-core-red text-core-red' },
              ].map((alert, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-4 py-3 border border-l-[3px] rounded-lg ${alert.classes}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${alert.classes.split(' ').find(c => c.startsWith('text-'))}`}>{alert.type}</span>
                  <span className="text-core-text-dim text-xs">{alert.message}</span>
                </div>
              ))}
            </div>

            {/* Data Table */}
            <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-3">Data Table</h4>
            <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {['Service', 'Tools', 'Status', 'Latency', 'Uptime'].map(col => (
                      <th key={col} className="px-3.5 py-2.5 text-left text-core-text-muted font-semibold border-b border-core-border text-[10px] uppercase tracking-wide cursor-pointer select-none">
                        <span className="flex items-center gap-1">
                          {col}
                          <svg width={10} height={10} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
                          </svg>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { service: 'Stripe', tools: 38, status: 'Active', latency: '45ms', uptime: '99.99%', statusClasses: 'bg-core-green/[0.08] border-core-green/20 text-core-green', uptimeClass: 'text-core-green' },
                    { service: 'CRM', tools: 245, status: 'Active', latency: '120ms', uptime: '99.95%', statusClasses: 'bg-core-green/[0.08] border-core-green/20 text-core-green', uptimeClass: 'text-core-green' },
                    { service: 'SendGrid', tools: 24, status: 'Active', latency: '89ms', uptime: '99.98%', statusClasses: 'bg-core-green/[0.08] border-core-green/20 text-core-green', uptimeClass: 'text-core-green' },
                    { service: 'Supabase', tools: 32, status: 'Active', latency: '33ms', uptime: '99.99%', statusClasses: 'bg-core-green/[0.08] border-core-green/20 text-core-green', uptimeClass: 'text-core-green' },
                    { service: 'Shopify', tools: 42, status: 'Degraded', latency: '340ms', uptime: '98.2%', statusClasses: 'bg-core-amber/[0.08] border-core-amber/20 text-core-amber', uptimeClass: 'text-core-text-dim' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-core-border">
                      <td className="px-3.5 py-2.5 text-core-text font-medium">{row.service}</td>
                      <td className="px-3.5 py-2.5 text-core-cyan font-semibold">{row.tools}</td>
                      <td className="px-3.5 py-2.5">
                        <span className={`px-2 py-0.5 border rounded-full text-[10px] font-semibold ${row.statusClasses}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-core-text-dim font-mono text-[11px]">{row.latency}</td>
                      <td className={`px-3.5 py-2.5 font-semibold ${row.uptimeClass}`}>{row.uptime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── DATABASE TAB ─── */}
      {tab === 'database' && (
        <div>
          <div className="flex gap-4 mb-5 items-center flex-wrap">
            <select
              value={selectedTable}
              onChange={e => { setSelectedTable(e.target.value); setTableOffset(0) }}
              className="px-3.5 py-2 bg-core-card border border-core-border rounded-md text-core-text text-xs min-w-[260px] outline-none focus:border-core-green"
            >
              <option value="">Select a table...</option>
              {Object.entries(tableGroups).sort(([a], [b]) => a.localeCompare(b)).map(([group, items]) => (
                <optgroup key={group} label={group.toUpperCase()}>
                  {items.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.row_count} rows)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="text-core-text-muted text-xs">
              {tables.length} tables found
            </span>
          </div>

          {/* Table list badges */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {tables.sort((a, b) => b.row_count - a.row_count).slice(0, 20).map(t => (
              <button
                key={t.name}
                onClick={() => { setSelectedTable(t.name); setTableOffset(0) }}
                className={`px-2.5 py-1 border rounded-full text-[11px] cursor-pointer transition-all
                  ${selectedTable === t.name
                    ? 'bg-core-green/10 border-core-green text-core-green'
                    : 'bg-core-card border-core-border text-core-text-dim hover:border-core-border-hi'
                  }`}
              >
                {t.name} <span className="opacity-60">({t.row_count})</span>
              </button>
            ))}
          </div>

          {/* Table data */}
          {selectedTable && (
            <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-core-border flex justify-between items-center">
                <span className="text-core-green font-semibold text-sm">{selectedTable}</span>
                <span className="text-core-text-muted text-xs">{tableData.total} total rows</span>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-10 text-center text-core-text-muted text-xs">Loading...</div>
                ) : tableData.rows.length === 0 ? (
                  <div className="py-10 text-center text-core-text-muted text-xs">No rows</div>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {Object.keys(tableData.rows[0]).map(col => (
                          <th key={col} className="px-3 py-2 text-left text-core-text-muted font-semibold border-b border-core-border whitespace-nowrap text-[10px] uppercase tracking-wide">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-core-border">
                          {Object.values(row).map((val, ci) => (
                            <td key={ci} className="px-3 py-2 text-core-text-dim max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {val === null
                                ? <span className="text-core-text-muted italic">null</span>
                                : typeof val === 'object'
                                  ? <span className="text-core-purple font-mono">{JSON.stringify(val).slice(0, 80)}</span>
                                  : typeof val === 'boolean'
                                    ? <span className={val ? 'text-core-green' : 'text-core-red'}>{String(val)}</span>
                                    : String(val).slice(0, 100)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Pagination */}
              {tableData.total > 20 && (
                <div className="px-5 py-3 border-t border-core-border flex justify-between items-center">
                  <button
                    disabled={tableOffset === 0}
                    onClick={() => setTableOffset(Math.max(0, tableOffset - 20))}
                    className={`px-3.5 py-1.5 border border-core-border rounded-md text-xs transition-all
                      ${tableOffset === 0
                        ? 'bg-core-bg text-core-text-muted cursor-default'
                        : 'bg-core-card text-core-text cursor-pointer hover:border-core-border-hi'
                      }`}
                  >
                    Previous
                  </button>
                  <span className="text-core-text-muted text-xs">
                    {tableOffset + 1}–{Math.min(tableOffset + 20, tableData.total)} of {tableData.total}
                  </span>
                  <button
                    disabled={tableOffset + 20 >= tableData.total}
                    onClick={() => setTableOffset(tableOffset + 20)}
                    className={`px-3.5 py-1.5 border border-core-border rounded-md text-xs transition-all
                      ${tableOffset + 20 >= tableData.total
                        ? 'bg-core-bg text-core-text-muted cursor-default'
                        : 'bg-core-card text-core-text cursor-pointer hover:border-core-border-hi'
                      }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── USERS TAB ─── */}
      {tab === 'users' && (
        <div>
          <div className="mb-4 text-core-text-muted text-xs">
            {usersTotal} total users
          </div>
          <div className="flex flex-col gap-2">
            {users.map(user => (
              <div
                key={user.id}
                className="bg-core-card border border-core-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  className="w-full px-5 py-3.5 bg-transparent border-0 flex items-center justify-between cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold
                      ${user.is_admin
                        ? 'bg-core-green/10 border-core-green text-core-green'
                        : 'bg-core-bg border-core-border text-core-text-muted'
                      }`}>
                      {(user.full_name || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-core-text text-sm font-semibold">
                        {user.full_name || 'No name'}
                      </div>
                      <div className="text-core-text-muted text-xs">
                        {user.email || user.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.is_admin && (
                      <span className="px-2 py-0.5 bg-core-green/10 border border-core-green/20 rounded text-core-green text-[10px] font-semibold">ADMIN</span>
                    )}
                    {user.plan && (
                      <span className="px-2 py-0.5 bg-core-cyan/10 border border-core-cyan/20 rounded text-core-cyan text-[10px] font-semibold">{user.plan}</span>
                    )}
                    <span className="text-core-text-muted text-[11px]">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                    </span>
                    <svg
                      width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                      className={`text-core-text-muted transition-transform duration-150 ${expandedUser === user.id ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedUser === user.id && (
                  <div className="px-5 pb-4 border-t border-core-border">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 pt-4">
                      {Object.entries(user).filter(([k]) => !['id'].includes(k)).map(([key, val]) => (
                        <div key={key}>
                          <div className="text-core-text-muted text-[10px] uppercase tracking-wide mb-0.5">{key}</div>
                          <div className={`text-core-text-dim text-xs break-all ${typeof val === 'string' && val.length > 20 ? 'font-mono' : ''}`}>
                            {val === null
                              ? <span className="text-core-text-muted italic">null</span>
                              : typeof val === 'boolean'
                                ? <span className={val ? 'text-core-green' : 'text-core-red'}>{String(val)}</span>
                                : typeof val === 'object'
                                  ? JSON.stringify(val)
                                  : String(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TRAINING TAB ─── */}
      {tab === 'training' && training && (
        <div>
          {/* Training Stats */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-6">
            {[
              { label: 'Sources', value: training.sources.total, colorClass: 'text-core-green' },
              { label: 'Pairs', value: training.pairs.total, colorClass: 'text-core-cyan' },
              { label: 'Datasets', value: training.datasets.length, colorClass: 'text-core-purple' },
              { label: 'Knowledge', value: training.knowledge.total, colorClass: 'text-core-amber' },
              { label: 'Avg Score', value: training.knowledge.avg_score, colorClass: 'text-core-green' },
            ].map((s, i) => (
              <div key={i} className="bg-core-card border border-core-border rounded-lg p-4">
                <div className="text-core-text-muted text-[10px] uppercase tracking-wide mb-1.5">{s.label}</div>
                <div className={`text-2xl font-bold ${s.colorClass}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 mb-6">
            <button
              onClick={handleFeed}
              disabled={feedLoading}
              className={`px-5 py-2.5 border-0 rounded-md text-xs font-semibold transition-all
                ${feedLoading
                  ? 'bg-core-bg text-core-text-muted cursor-default'
                  : 'bg-core-green text-black cursor-pointer hover:opacity-90'
                }`}
            >
              {feedLoading ? 'Running Feed...' : 'Run Feed Now'}
            </button>
          </div>

          {/* Feed Sources */}
          <h3 className="text-sm font-semibold text-core-text mb-3">Feed Sources (11)</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {training.feeds.map(f => (
              <div key={f.id} className={`flex items-center gap-1.5 px-3 py-1.5 bg-core-card rounded-full border
                ${f.status === 'active' ? 'border-core-green/30' : 'border-core-border'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${f.status === 'active' ? 'bg-core-green' : 'bg-core-text-muted'}`} />
                <span className="text-core-text-dim text-xs">{f.name}</span>
              </div>
            ))}
          </div>

          {/* Recent Sources */}
          <h3 className="text-sm font-semibold text-core-text mb-3">Recent Sources</h3>
          <div className="bg-core-card border border-core-border rounded-xl overflow-hidden mb-6">
            {training.sources.recent.map((s, i) => (
              <div key={s.id} className={`flex justify-between items-center px-4 py-2.5 ${i < training.sources.recent.length - 1 ? 'border-b border-core-border' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-core-text-dim text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                    {s.title}
                  </div>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  <span className="px-2 py-0.5 bg-core-bg rounded text-core-text-muted text-[10px]">{s.source_type}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${s.status === 'raw' ? 'bg-core-amber/10 text-core-amber' : 'bg-core-green/10 text-core-green'}`}>
                    {s.status}
                  </span>
                  <span className="text-core-text-muted text-[10px]">{s.token_count} tok</span>
                </div>
              </div>
            ))}
            {training.sources.recent.length === 0 && (
              <div className="py-6 text-center text-core-text-muted text-xs">No sources yet</div>
            )}
          </div>

          {/* Recent Pairs with Approve/Reject */}
          <h3 className="text-sm font-semibold text-core-text mb-3">Recent Training Pairs</h3>
          <div className="flex flex-col gap-2 mb-6">
            {training.pairs.recent.map(p => (
              <div key={p.id} className="bg-core-card border border-core-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-core-text-muted text-[10px] uppercase tracking-wide mb-1">User Input</div>
                    <div className="text-core-text-dim text-xs">{p.user_input?.slice(0, 200)}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    {p.approved ? (
                      <span className="px-2.5 py-0.5 bg-core-green/10 text-core-green rounded text-[11px] font-semibold">Approved</span>
                    ) : p.human_reviewed ? (
                      <span className="px-2.5 py-0.5 bg-core-red/10 text-core-red rounded text-[11px] font-semibold">Rejected</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="px-2.5 py-0.5 bg-core-green/10 border border-core-green/30 text-core-green rounded text-[11px] font-semibold cursor-pointer"
                        >Approve</button>
                        <button
                          onClick={() => handleReject(p.id)}
                          className="px-2.5 py-0.5 bg-core-red/10 border border-core-red/30 text-core-red rounded text-[11px] font-semibold cursor-pointer"
                        >Reject</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-core-text-muted text-[10px] uppercase tracking-wide mb-1">Assistant Output</div>
                <div className="text-core-text-dim text-xs">{p.assistant_output?.slice(0, 200)}</div>
                <div className="flex gap-3 mt-2">
                  <span className="text-core-text-muted text-[10px]">Domain: {p.domain}</span>
                  {p.quality_score && <span className="text-core-text-muted text-[10px]">Score: {p.quality_score}</span>}
                </div>
              </div>
            ))}
            {training.pairs.recent.length === 0 && (
              <div className="py-6 text-center text-core-text-muted text-xs bg-core-card border border-core-border rounded-lg">No training pairs yet</div>
            )}
          </div>

          {/* Datasets */}
          <h3 className="text-sm font-semibold text-core-text mb-3">Datasets</h3>
          <div className="bg-core-card border border-core-border rounded-xl overflow-hidden mb-6">
            {training.datasets.length === 0 ? (
              <div className="py-6 text-center text-core-text-muted text-xs">No datasets yet</div>
            ) : training.datasets.map((d, i) => (
              <div key={d.id} className={`flex justify-between items-center px-4 py-2.5 ${i < training.datasets.length - 1 ? 'border-b border-core-border' : ''}`}>
                <span className="text-core-text-dim text-xs">{d.name}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-core-text-muted text-[11px]">{d.pair_count || 0} pairs</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${d.status === 'ready' ? 'bg-core-green/10 text-core-green' : 'bg-core-amber/10 text-core-amber'}`}>
                    {d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Training Runs */}
          <h3 className="text-sm font-semibold text-core-text mb-3">Training Runs</h3>
          <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
            {training.runs.length === 0 ? (
              <div className="py-6 text-center text-core-text-muted text-xs">No training runs yet</div>
            ) : training.runs.map((r, i) => (
              <div key={r.id} className={`flex justify-between items-center px-4 py-2.5 ${i < training.runs.length - 1 ? 'border-b border-core-border' : ''}`}>
                <span className="text-core-text-dim text-xs font-mono">{String(r.id).slice(0, 8)}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-core-text-muted text-[11px]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-core-green/10 text-core-green">{r.status || 'completed'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'training' && !training && (
        <div className="py-10 text-center text-core-text-muted text-xs">Loading training data...</div>
      )}

      {/* ─── ECOSYSTEM TAB ─── */}
      {tab === 'ecosystem' && (
        <div>
          <h3 className="text-base font-semibold text-core-text mb-4">All Ecosystem Links</h3>

          {[
            {
              title: 'Supabase Projects',
              links: [
                { label: '0nmcp.com + Marketplace (pwujhhmlrtxjmjzyttwn)', url: 'https://supabase.com/dashboard/project/pwujhhmlrtxjmjzyttwn' },
                { label: '0nork Customers (yaehbwimocvvnnlojkxe)', url: 'https://supabase.com/dashboard/project/yaehbwimocvvnnlojkxe' },
                { label: 'Rocket+ Master DB (rtwtaisjtvdajrdyivkn)', url: 'https://supabase.com/dashboard/project/rtwtaisjtvdajrdyivkn' },
              ],
            },
            {
              title: 'Vercel Projects',
              links: [
                { label: '0nmcp.com', url: 'https://vercel.com/cryptogoatz/0nmcp-website' },
                { label: '0nCore', url: 'https://vercel.com/cryptogoatz/onork-app' },
                { label: 'Marketplace', url: 'https://vercel.com/cryptogoatz/0n-marketplace' },
                { label: 'Vercel Dashboard', url: 'https://vercel.com/cryptogoatz' },
              ],
            },
            {
              title: 'GitHub',
              links: [
                { label: '0nork Organization', url: 'https://github.com/0nork' },
                { label: 'Crypto-Goatz Organization', url: 'https://github.com/Crypto-Goatz' },
                { label: '0nMCP Repository', url: 'https://github.com/0nork/0nMCP' },
              ],
            },
            {
              title: 'Payments & CRM',
              links: [
                { label: 'Stripe Dashboard', url: 'https://dashboard.stripe.com' },
                { label: 'CRM Dashboard', url: 'https://app.clientclub.net' },
              ],
            },
            {
              title: 'Products',
              links: [
                { label: 'npm: 0nmcp', url: 'https://www.npmjs.com/package/0nmcp' },
                { label: '0nmcp.com', url: 'https://0nmcp.com' },
                { label: '0nCore', url: 'https://0ncore.com' },
                { label: 'Marketplace', url: 'https://marketplace.rocketclients.com' },
                { label: '0nCommand', url: 'https://0n-command-center.vercel.app' },
              ],
            },
          ].map((group, gi) => (
            <div key={gi} className="mb-6">
              <h4 className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-2.5">{group.title}</h4>
              <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
                {group.links.map((link, li) => (
                  <a
                    key={li}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between px-4 py-3 text-core-text-dim text-xs no-underline transition-all duration-150 hover:bg-core-card-hover
                      ${li < group.links.length - 1 ? 'border-b border-core-border' : ''}`}
                  >
                    <span>{link.label}</span>
                    <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="text-core-text-muted">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── SITEMAPS TAB ─── */}
      {tab === 'sitemaps' && (
        <div>
          {[
            {
              title: '0nCore Routes',
              routes: [
                '/dashboard', '/dashboard/contacts', '/dashboard/pipeline', '/dashboard/workflows',
                '/dashboard/training', '/dashboard/chat', '/dashboard/email', '/dashboard/social',
                '/dashboard/files', '/dashboard/calendar', '/dashboard/integrations', '/dashboard/invoices',
                '/dashboard/settings', '/dashboard/admin', '/dashboard/admin/workflows',
                '/dashboard/admin/crm', '/dashboard/admin/marketing',
              ],
            },
            {
              title: '0nCore API Routes',
              routes: [
                '/api/admin', '/api/admin/workflows', '/api/auth/callback', '/api/chat',
                '/api/crm/contacts', '/api/crm/conversations', '/api/crm/pipeline',
                '/api/crm/calendar', '/api/crm/invoices', '/api/dashboard/stats', '/api/health',
                '/api/provision', '/api/stripe', '/api/training', '/api/workflows',
                '/api/0nmcp/execute', '/api/0nmcp/health', '/api/0nmcp/workflows',
              ],
            },
            {
              title: '0nmcp.com Key Pages',
              routes: [
                '/', '/login', '/signup', '/forgot-password', '/reset-password', '/0nboarding',
                '/forum', '/forum/new', '/community', '/builder', '/store/onork-mini', '/convert',
                '/learn', '/downloads', '/examples', '/0n-standard', '/partners', '/sponsor',
                '/integrations', '/compare', '/glossary', '/turn-it-on', '/admin', '/app',
                '/products/social0n', '/products/app0n', '/products/web0n',
              ],
            },
            {
              title: 'Marketplace Routes',
              routes: [
                '/', '/login', '/register', '/store', '/store/[slug]', '/builder', '/dashboard',
                '/setup/[workflowId]', '/admin/setup', '/api/chat', '/api/execute', '/api/checkout',
                '/api/workflows', '/api/webhooks/stripe',
              ],
            },
          ].map((section, si) => (
            <div key={si} className="mb-6">
              <h3 className="text-sm font-semibold text-core-text mb-3">
                {section.title}
                <span className="text-core-text-muted font-normal text-xs ml-2">({section.routes.length})</span>
              </h3>
              <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
                {section.routes.map((route, ri) => (
                  <div
                    key={ri}
                    className={`px-4 py-2 font-mono text-xs
                      ${ri < section.routes.length - 1 ? 'border-b border-core-border' : ''}
                      ${route.startsWith('/api') ? 'text-core-cyan' : route.includes('[') ? 'text-core-purple' : 'text-core-text-dim'}
                    `}
                  >
                    {route}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
