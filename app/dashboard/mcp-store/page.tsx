'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Loader2, Package, ExternalLink, Server, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface StoreServer {
  id: string
  server_name: string
  server_title: string | null
  description: string | null
  category: string | null
  has_remote: boolean
  remote_url: string | null
  remote_type: string | null
  repository_url: string | null
  recommended: boolean
  featured: boolean
}

interface ApiResponse {
  featured: StoreServer[]
  servers: StoreServer[]
}

const CATS = ['all', 'marketing', 'sales', 'finance', 'development', 'data', 'ai', 'commerce', 'communication', 'compliance', 'productivity']

export default function McpStorePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (search) sp.set('search', search)
      if (category !== 'all') sp.set('category', category)
      const res = await fetch(`/api/mcp-store?${sp}`)
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Server className="h-6 w-6 text-[#7ed957]" />
          MCP Store
        </h1>
        <p className="text-sm text-white/55 mt-1">
          Connect new capabilities to 0nCore in one click. Curated from the official MCP Registry — every server here is reviewed and recommended.
        </p>
      </div>

      {/* Search + categories */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recommended MCP servers…" className="pl-9" />
        </div>
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              category === c
                ? 'border-[#7ed957]/40 bg-[#7ed957]/10 text-[#7ed957]'
                : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white/80'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {data.featured.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
                <Sparkles className="h-3.5 w-3.5" />
                Featured
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.featured.map((s) => <ServerCard key={s.id} s={s} featured />)}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/55">
              Recommended ({data.servers.length})
            </h2>
            {data.servers.length === 0 ? (
              <Card className="p-8 text-center text-white/55">
                No recommended servers in this category yet.
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.servers.map((s) => <ServerCard key={s.id} s={s} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ServerCard({ s, featured }: { s: StoreServer; featured?: boolean }) {
  return (
    <Card className={`p-4 flex flex-col ${featured ? 'border-purple-500/30 bg-purple-500/[0.03]' : ''}`}>
      <div className="mb-2 flex items-center gap-1.5 flex-wrap">
        <Server className="h-3.5 w-3.5 text-[#7ed957] shrink-0" />
        <span className="font-semibold text-sm truncate flex-1">{s.server_title || s.server_name}</span>
        {s.has_remote ? (
          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">HTTP</span>
        ) : (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">STDIO</span>
        )}
      </div>
      <p className="font-mono text-[10px] text-white/40 truncate mb-1">{s.server_name}</p>
      {s.description && <p className="line-clamp-3 text-xs text-white/55 mb-3">{s.description}</p>}
      {s.category && (
        <span className="self-start mb-3 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
          {s.category}
        </span>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        {s.has_remote ? (
          <Link
            href="/dashboard/admin/mcp-registry"
            className="inline-flex items-center gap-1 rounded-md border border-[#7ed957]/30 bg-[#7ed957]/10 px-3 py-1.5 text-xs font-semibold text-[#7ed957] hover:border-[#7ed957]/60"
          >
            Connect
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/55">
            STDIO only
          </span>
        )}
        <Link
          href={`/dashboard/service-packager?source=mcp&server=${encodeURIComponent(s.server_name)}`}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1.5 text-xs hover:border-white/30"
        >
          <Package className="h-3 w-3" />
          Package as service
        </Link>
        {s.repository_url && (
          <a href={s.repository_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-white">
            Repo <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </Card>
  )
}
