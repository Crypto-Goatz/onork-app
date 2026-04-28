'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Loader2,
  Wrench,
  Plug,
  Package,
  Power,
  Server,
  ArrowRight,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

type Kind = 'tool' | 'service' | 'app' | 'switch' | 'mcp_tool'

interface CapabilityRow {
  kind: Kind
  id: string
  name: string
  description: string
  source: string
  runHref?: string
  tags: string[]
  method?: string
  iconChar?: string
}

interface Response {
  total: number
  counts: Partial<Record<Kind, number>>
  capabilities: CapabilityRow[]
}

const KIND_META: Record<Kind, { label: string; Icon: typeof Wrench; tint: string; tintBorder: string }> = {
  tool: { label: 'Tool', Icon: Wrench, tint: 'bg-cyan-500/10 text-cyan-300', tintBorder: 'border-cyan-500/30' },
  service: { label: 'Service', Icon: Plug, tint: 'bg-emerald-500/10 text-emerald-300', tintBorder: 'border-emerald-500/30' },
  app: { label: 'App', Icon: Package, tint: 'bg-purple-500/10 text-purple-300', tintBorder: 'border-purple-500/30' },
  switch: { label: 'Switch', Icon: Power, tint: 'bg-amber-500/10 text-amber-300', tintBorder: 'border-amber-500/30' },
  mcp_tool: { label: 'MCP', Icon: Server, tint: 'bg-blue-500/10 text-blue-300', tintBorder: 'border-blue-500/30' },
}

const METHOD_TINT: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300',
  POST: 'bg-cyan-500/15 text-cyan-300',
  PUT: 'bg-amber-500/15 text-amber-300',
  PATCH: 'bg-violet-500/15 text-violet-300',
  DELETE: 'bg-rose-500/15 text-rose-300',
}

export default function CapabilitiesPage() {
  const [q, setQ] = useState('')
  const [kindFilter, setKindFilter] = useState<Kind | 'all'>('all')
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (q) sp.set('q', q)
      if (kindFilter !== 'all') sp.set('kind', kindFilter)
      const res = await fetch(`/api/capabilities?${sp}`)
      const d = (await res.json()) as Response
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [q, kindFilter])

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  const counts = data?.counts ?? {}
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6 text-[#7ed957]" />
          Capabilities
        </h1>
        <p className="text-sm text-white/55 mt-1">
          Everything 0nCore can do for you, in one searchable index. Tools, services, apps, your saved Switches, and connected MCP servers.
        </p>
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${total > 0 ? total.toLocaleString() : '1,500+'} capabilities — name, description, tag…`}
            className="pl-9"
          />
        </div>

        <KindChip kind="all" current={kindFilter} onClick={() => setKindFilter('all')} count={total} label="All" />
        <KindChip kind="tool" current={kindFilter} onClick={() => setKindFilter('tool')} count={counts.tool ?? 0} />
        <KindChip kind="service" current={kindFilter} onClick={() => setKindFilter('service')} count={counts.service ?? 0} />
        <KindChip kind="app" current={kindFilter} onClick={() => setKindFilter('app')} count={counts.app ?? 0} />
        <KindChip kind="switch" current={kindFilter} onClick={() => setKindFilter('switch')} count={counts.switch ?? 0} />
        <KindChip kind="mcp_tool" current={kindFilter} onClick={() => setKindFilter('mcp_tool')} count={counts.mcp_tool ?? 0} />
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (data?.capabilities.length ?? 0) === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 px-3 py-8 text-center text-sm text-white/40">
          No capabilities match.
        </div>
      ) : (
        <div className="grid gap-2">
          {data!.capabilities.map((row) => (
            <CapRow key={`${row.kind}:${row.id}`} row={row} />
          ))}
        </div>
      )}

      {data && data.capabilities.length === 500 && (
        <p className="mt-4 text-center text-xs text-white/40">
          Showing the first 500 results — refine your search to see more specific matches.
        </p>
      )}
    </div>
  )
}

function KindChip({
  kind,
  current,
  count,
  label,
  onClick,
}: {
  kind: Kind | 'all'
  current: Kind | 'all'
  count: number
  label?: string
  onClick: () => void
}) {
  const meta = kind === 'all' ? null : KIND_META[kind]
  const text = label ?? (meta?.label ?? kind)
  const active = current === kind
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? meta
            ? `${meta.tint} ${meta.tintBorder}`
            : 'border-[#7ed957]/40 bg-[#7ed957]/10 text-[#7ed957]'
          : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white/80'
      }`}
    >
      {meta && <meta.Icon className="h-3 w-3" />}
      <span>{text}</span>
      <span className="text-[10px] opacity-60">{count.toLocaleString()}</span>
    </button>
  )
}

function CapRow({ row }: { row: CapabilityRow }) {
  const meta = KIND_META[row.kind]
  const Icon = meta.Icon
  const inner = (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${meta.tint} ${meta.tintBorder} border`}>
          {row.iconChar ? <span className="text-xs">{row.iconChar}</span> : <Icon className="h-3.5 w-3.5" />}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={row.kind === 'tool' || row.kind === 'mcp_tool' ? 'font-mono text-sm font-semibold' : 'text-sm font-semibold'}>
            {row.name}
          </span>
          {row.method && (
            <span className={`text-[10px] px-1 py-px rounded font-mono ${METHOD_TINT[row.method] ?? 'bg-white/10 text-white/60'}`}>
              {row.method}
            </span>
          )}
          <span className="text-[10px] text-white/40">{row.source}</span>
        </div>
        {row.description && (
          <p className="mt-0.5 text-xs text-white/55 line-clamp-1">{row.description}</p>
        )}
      </div>
      {row.runHref && (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/30 transition-colors group-hover:text-white" />
      )}
    </>
  )

  const className =
    'group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/20 hover:bg-white/[0.04]'

  return row.runHref ? (
    <Link href={row.runHref} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  )
}
