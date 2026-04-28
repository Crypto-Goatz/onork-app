'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Loader2, Star, Bookmark, Package, ExternalLink, Server, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface CachedServer {
  id: string
  server_name: string
  server_title: string | null
  description: string | null
  version: string | null
  has_remote: boolean
  remote_url: string | null
  remote_type: string | null
  repository_url: string | null
  category: string | null
  recommended: boolean
  featured: boolean
  admin_notes: string | null
  tools_count: number | null
  last_synced_at: string | null
}

interface ApiResponse {
  servers: CachedServer[]
  total: number
}

const CATEGORIES = [
  'all', 'marketing', 'sales', 'finance', 'development', 'data', 'ai',
  'commerce', 'communication', 'compliance', 'productivity', 'other',
]

export default function McpRegistryCacheAdmin() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [filter, setFilter] = useState<'all' | 'recommended' | 'featured' | 'remote'>('all')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({ limit: '200' })
      if (search) sp.set('search', search)
      if (category !== 'all') sp.set('category', category)
      if (filter === 'recommended') sp.set('recommended', '1')
      if (filter === 'featured') sp.set('featured', '1')
      if (filter === 'remote') sp.set('remote', '1')
      const res = await fetch(`/api/admin/mcp-registry-cache?${sp}`)
      if (res.status === 403 || res.status === 401) {
        toast.error('Admin access required')
        window.location.href = '/dashboard'
        return
      }
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [search, category, filter])

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function toggle(id: string, field: 'recommended' | 'featured', value: boolean) {
    const res = await fetch('/api/admin/mcp-registry-cache', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    })
    if (res.ok) {
      toast.success(`${field}: ${value ? 'on' : 'off'}`)
      load()
    } else toast.error('Update failed')
  }

  async function syncNow() {
    setSyncing(true)
    try {
      const res = await fetch('/api/cron/mcp-registry-sync')
      const d = await res.json()
      if (res.ok) {
        toast.success(`Synced — upserts: ${d.upserts}, pages: ${d.pages}`)
        load()
      } else {
        toast.error(d.error || 'Sync failed')
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6 text-[#7ed957]" />
            MCP Registry Cache
            <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-white/55">
              Admin
            </span>
          </h1>
          <p className="text-sm text-white/55 mt-1">
            {data ? `${data.total.toLocaleString()} cached servers` : 'Loading…'} from the official MCP Registry. Curate which ones surface in the user-facing store.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync now
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search 800+ MCP servers…" className="pl-9" />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-white/10 bg-white/[0.02] px-3 text-sm focus:border-white/30 focus:outline-none"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
        </select>
        {(['all', 'recommended', 'featured', 'remote'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'border-[#7ed957]/40 bg-[#7ed957]/10 text-[#7ed957]'
                : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white/80'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (data?.servers ?? []).length === 0 ? (
        <Card className="p-8 text-center text-white/55">No servers match.</Card>
      ) : (
        <div className="space-y-2">
          {data!.servers.map((s) => (
            <Card key={s.id} className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-semibold text-sm">{s.server_title || s.server_name}</span>
                  <span className="text-[10px] font-mono text-white/40 truncate">{s.server_name}</span>
                  {s.category && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
                      {s.category}
                    </span>
                  )}
                  {s.has_remote ? (
                    <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">HTTP</span>
                  ) : (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">STDIO</span>
                  )}
                  {s.featured && <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">FEATURED</span>}
                  {s.recommended && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">RECOMMENDED</span>}
                </div>
                {s.description && <p className="text-xs text-white/55 line-clamp-1">{s.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => toggle(s.id, 'recommended', !s.recommended)} title="Toggle recommended">
                  <Bookmark className={`h-4 w-4 ${s.recommended ? 'fill-emerald-400 text-emerald-400' : 'text-white/40'}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(s.id, 'featured', !s.featured)} title="Toggle featured">
                  <Star className={`h-4 w-4 ${s.featured ? 'fill-purple-400 text-purple-400' : 'text-white/40'}`} />
                </Button>
                <a
                  href={`/dashboard/service-packager?source=mcp&server=${encodeURIComponent(s.server_name)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-xs hover:border-white/30"
                  title="Package as service"
                >
                  <Package className="h-3.5 w-3.5" />
                  Package
                </a>
                {s.repository_url && (
                  <a href={s.repository_url} target="_blank" rel="noreferrer" className="rounded p-1 text-white/40 hover:text-white">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
