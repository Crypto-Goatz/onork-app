'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ShieldX,
  Zap,
  Star,
  Download,
  Loader2,
  ExternalLink,
  Server,
  Package,
} from 'lucide-react'

interface RegistryItem {
  kind: 'mcp' | 'ucp'
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  icon: string | null
  price_cents: number | null
  price_type: string | null
  fulfillment_type?: string | null
  npm_name?: string | null
  install_url?: string | null
  install_count: number | null
  rating: number | null
  scan_status: 'passed' | 'flagged' | 'pending' | 'error' | 'skipped'
  scan_engines_total: number
  scan_engines_flagged: number
  scan_threats: string[]
  install_allowed: boolean
  install_blocked_reason: string | null
  one_click_eligible: boolean
  scanned_at: string | null
}

interface ListResponse {
  items: RegistryItem[]
  counts: {
    total: number
    mcp: number
    ucp: number
    passed: number
    flagged: number
    pending: number
    one_click: number
  }
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'mcp', label: 'MCP' },
  { key: 'ucp', label: 'UCP' },
  { key: 'one_click', label: 'One-click' },
]

function ScanBadge({ item }: { item: RegistryItem }) {
  const s = item.scan_status
  if (s === 'passed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
        <ShieldCheck className="h-3 w-3" />
        {item.scan_engines_total > 0 ? `${item.scan_engines_total} engines` : 'Scanned'}
      </span>
    )
  }
  if (s === 'flagged') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300"
        title={item.install_blocked_reason || ''}
      >
        <ShieldX className="h-3 w-3" />
        {item.scan_engines_flagged}/{item.scan_engines_total} flagged
      </span>
    )
  }
  if (s === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Scanning…
      </span>
    )
  }
  if (s === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
        <ShieldAlert className="h-3 w-3" />
        Scan error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#161b22] px-1.5 py-0.5 text-[10px] font-medium text-[#9ca3af]">
      <ShieldQuestion className="h-3 w-3" />
      Unscanned
    </span>
  )
}

export default function RegistryPage() {
  const [items, setItems] = useState<RegistryItem[]>([])
  const [counts, setCounts] = useState<ListResponse['counts'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter === 'mcp' || filter === 'ucp') params.set('type', filter)
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/registry/list?${params.toString()}`, { cache: 'no-store' })
      const data = (await res.json()) as ListResponse | { error: string }
      if (!res.ok || 'error' in data) throw new Error(('error' in data && data.error) || `HTTP ${res.status}`)
      setItems(data.items)
      setCounts(data.counts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load registry')
    } finally {
      setLoading(false)
    }
  }, [filter, query])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((i) => filter !== 'one_click' || i.one_click_eligible)

  async function handleScan(item: RegistryItem) {
    const key = `${item.kind}:${item.id}`
    setBusy((b) => ({ ...b, [key]: 'Scanning…' }))
    setResults((r) => ({ ...r, [key]: '' }))
    try {
      const targetUrl =
        item.kind === 'mcp'
          ? item.install_url || (item.npm_name ? `https://www.npmjs.com/package/${item.npm_name}` : null)
          : `https://0nmcp.com/store/${item.slug}`
      if (!targetUrl) {
        setResults((r) => ({ ...r, [key]: 'No URL to scan' }))
        return
      }
      const res = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: item.kind === 'mcp' ? 'mcp' : 'ucp_product',
          target_id: item.id,
          target_url: targetUrl,
          force: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setResults((r) => ({ ...r, [key]: `Scan: ${data.gate.status}` }))
      await load()
    } catch (e) {
      setResults((r) => ({ ...r, [key]: e instanceof Error ? e.message : 'Scan failed' }))
    } finally {
      setBusy((b) => {
        const { [key]: _, ...rest } = b
        return rest
      })
    }
  }

  async function handleInstall(item: RegistryItem) {
    if (item.kind !== 'ucp') return
    const key = `${item.kind}:${item.id}`
    setBusy((b) => ({ ...b, [key]: 'Installing…' }))
    setResults((r) => ({ ...r, [key]: '' }))
    try {
      const res = await fetch('/api/ucp/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: item.slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setResults((r) => ({
        ...r,
        [key]: data.already_installed ? 'Already installed' : 'Installed',
      }))
    } catch (e) {
      setResults((r) => ({ ...r, [key]: e instanceof Error ? e.message : 'Install failed' }))
    } finally {
      setBusy((b) => {
        const { [key]: _, ...rest } = b
        return rest
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f4f8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Registry</h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              MCP servers and UCP products. All entries virus-scanned. One-click install for free items that don&apos;t need API keys.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm hover:bg-[#1f242c]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {counts && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Total', value: counts.total, tone: 'text-[#f0f4f8]' },
              { label: 'MCP', value: counts.mcp, tone: 'text-cyan-300' },
              { label: 'UCP', value: counts.ucp, tone: 'text-violet-300' },
              { label: 'One-click', value: counts.one_click, tone: 'text-emerald-300' },
              { label: 'Flagged', value: counts.flagged, tone: 'text-rose-300' },
            ].map((c) => (
              <div key={c.label} className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
                <div className="text-xs uppercase tracking-wider text-[#6b7280]">{c.label}</div>
                <div className={`mt-1 text-2xl font-bold ${c.tone}`}>{c.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search registry"
              className="w-full rounded-md border border-[#30363d] bg-[#161b22] py-2 pl-9 pr-3 text-sm placeholder:text-[#6b7280] focus:border-[#6EE05A] focus:outline-none"
            />
          </div>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md border px-3 py-2 text-sm ${
                filter === f.key
                  ? 'border-[#6EE05A] bg-[#6EE05A]/10 text-[#6EE05A]'
                  : 'border-[#30363d] bg-[#161b22] text-[#9ca3af] hover:bg-[#1f242c]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] p-12 text-sm text-[#6b7280]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading registry…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-12 text-center text-sm text-[#9ca3af]">
            No items match the current filter.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => {
              const key = `${item.kind}:${item.id}`
              const KindIcon = item.kind === 'mcp' ? Server : Package
              const isBusy = !!busy[key]
              const result = results[key]
              return (
                <div key={key} className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#30363d] bg-[#0d1117]">
                      <KindIcon className={`h-5 w-5 ${item.kind === 'mcp' ? 'text-cyan-300' : 'text-violet-300'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{item.name}</span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                            item.kind === 'mcp'
                              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                              : 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                          }`}
                        >
                          {item.kind}
                        </span>
                        <ScanBadge item={item} />
                        {item.one_click_eligible && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                            <Zap className="h-3 w-3" />
                            One-click
                          </span>
                        )}
                        {item.rating != null && item.rating > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#9ca3af]">
                            <Star className="h-3 w-3 text-amber-300" />
                            {item.rating.toFixed(1)}
                          </span>
                        )}
                        {item.install_count != null && item.install_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#9ca3af]">
                            <Download className="h-3 w-3" />
                            {item.install_count}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="mt-1 line-clamp-2 text-xs text-[#9ca3af]">{item.description}</div>
                      )}
                      {item.npm_name && (
                        <div className="mt-1 font-mono text-[11px] text-[#6b7280]">npm: {item.npm_name}</div>
                      )}
                      {item.install_blocked_reason && (
                        <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200">
                          {item.install_blocked_reason}
                        </div>
                      )}
                      {result && (
                        <div className="mt-2 text-[11px] text-[#9ca3af]">{result}</div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {item.kind === 'ucp' && item.one_click_eligible && (
                        <button
                          onClick={() => handleInstall(item)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          {isBusy ? busy[key] : 'Install'}
                        </button>
                      )}
                      <button
                        onClick={() => handleScan(item)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs text-[#9ca3af] hover:bg-[#1f242c] disabled:opacity-50"
                      >
                        {isBusy && busy[key] === 'Scanning…' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3 w-3" />
                        )}
                        Re-scan
                      </button>
                      {item.install_url && (
                        <a
                          href={item.install_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs text-[#9ca3af] hover:bg-[#1f242c]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
