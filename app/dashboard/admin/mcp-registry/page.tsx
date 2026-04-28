'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Server, Search, Loader2, Plus, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw, Filter, Power,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RegistryHeader {
  name: string
  description: string
  required: boolean
  secret: boolean
  template: string
  placeholders: string[]
}

interface RegistryRemote {
  type: string
  url: string
  headers: RegistryHeader[]
}

interface RegistryServer {
  name: string
  title: string
  description: string
  version: string
  repository?: string
  remotes: RegistryRemote[]
  hasStreamableHttp: boolean
  hasStdio: boolean
  registry: { publishedAt?: string; isLatest?: boolean }
}

interface ConnectedServer {
  id: string
  slug: string
  name: string
  url: string | null
  status: string
  tool_count: number
  use_count: number
}

export default function McpRegistryPage() {
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [servers, setServers] = useState<RegistryServer[]>([])
  const [connected, setConnected] = useState<ConnectedServer[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [openServer, setOpenServer] = useState<RegistryServer | null>(null)

  const loadConnected = useCallback(async () => {
    const res = await fetch('/api/mcp/servers')
    const data = await res.json()
    setConnected(data.servers ?? [])
  }, [])

  const loadRegistry = useCallback(
    async (opts?: { cursor?: string | null; reset?: boolean }) => {
      setLoading(true)
      try {
        const sp = new URLSearchParams({ limit: '50' })
        if (search.trim()) sp.set('search', search.trim())
        if (opts?.cursor) sp.set('cursor', opts.cursor)
        if (showAll) sp.set('transport', 'all')
        const res = await fetch(`/api/admin/mcp-registry?${sp}`)
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Registry fetch failed')
          return
        }
        setServers(opts?.reset === false ? [...servers, ...(data.servers ?? [])] : data.servers ?? [])
        setNextCursor(data.nextCursor ?? null)
      } finally {
        setLoading(false)
      }
    },
    [search, showAll, servers]
  )

  useEffect(() => {
    loadConnected()
  }, [loadConnected])

  // Initial + search-debounced fetch
  useEffect(() => {
    const t = setTimeout(() => {
      loadRegistry({ reset: true })
    }, search ? 300 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showAll])

  const connectedSlugs = new Set(
    connected.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60))
  )

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Server className="h-6 w-6 text-[#7ed957]" />
          MCP Registry
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-white/55">
            Admin
          </span>
        </h1>
        <p className="text-sm text-white/55 mt-1">
          The official Model Context Protocol registry. Browse, search, and one-click connect any
          server. Connected servers expose their tools across the workflow builder, Switches, and
          Jaxx.
        </p>
        <p className="mt-1 text-xs text-white/40">
          Source:{' '}
          <a
            href="https://registry.modelcontextprotocol.io"
            target="_blank"
            rel="noreferrer"
            className="text-[#7ed957] hover:underline"
          >
            registry.modelcontextprotocol.io
          </a>
        </p>
      </div>

      {/* Connected snapshot */}
      {connected.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/55">
              Connected ({connected.length})
            </h2>
            <a href="/dashboard/mcp-servers" className="text-xs text-[#7ed957] hover:underline">
              Manage →
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {connected.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-emerald-100">{c.name}</span>
                <span className="text-emerald-300/60">{c.tool_count} tools</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 1,000+ MCP servers — Sanity, Linear, Notion, GitHub…"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll((v) => !v)}
          className={showAll ? 'border-[#7ed957]/40 text-[#7ed957]' : ''}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          {showAll ? 'All transports' : 'SHTTP-ready only'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => loadRegistry({ reset: true })} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Grid */}
      {loading && servers.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <Card className="p-8 text-center text-white/55">
          No matching servers. Try a different query or toggle &ldquo;All transports&rdquo;.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((s) => {
            const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
            const isConnected = connectedSlugs.has(slug)
            const canConnect = s.hasStreamableHttp && s.remotes.length > 0
            return (
              <Card key={s.name} className="flex flex-col p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Power className="mt-0.5 h-4 w-4 shrink-0 text-[#7ed957]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{s.title}</div>
                    <div className="font-mono text-[10px] text-white/40 truncate">{s.name}</div>
                  </div>
                  {s.hasStreamableHttp && (
                    <span className="shrink-0 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                      HTTP
                    </span>
                  )}
                  {!s.hasStreamableHttp && s.hasStdio && (
                    <span
                      className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono text-amber-300"
                      title="STDIO transport — not wireable from a hosted dashboard"
                    >
                      STDIO
                    </span>
                  )}
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-white/55">{s.description || '—'}</p>
                <div className="mt-auto flex items-center justify-between gap-2 text-[10px] text-white/40">
                  <span>v{s.version}</span>
                  {s.repository && (
                    <a
                      href={s.repository}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 hover:text-white/70"
                    >
                      Repo <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <div className="mt-3">
                  {isConnected ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                      Connected
                    </Button>
                  ) : !canConnect ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      Not wireable yet
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setOpenServer(s)} className="w-full">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Connect
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadRegistry({ cursor: nextCursor, reset: false })}
            disabled={loading}
          >
            Load more
          </Button>
        </div>
      )}

      {openServer && (
        <ConnectModal
          server={openServer}
          onClose={() => setOpenServer(null)}
          onConnected={() => {
            setOpenServer(null)
            loadConnected()
          }}
        />
      )}
    </div>
  )
}

function ConnectModal({
  server,
  onClose,
  onConnected,
}: {
  server: RegistryServer
  onClose: () => void
  onConnected: () => void
}) {
  const httpRemote = server.remotes.find((r) => r.type === 'streamable-http' || r.type === 'http')
  const remoteIndex = httpRemote ? server.remotes.indexOf(httpRemote) : -1
  const remote = remoteIndex >= 0 ? server.remotes[remoteIndex] : null

  // Collect every distinct placeholder across all headers — that's what the user fills
  const allPlaceholders = Array.from(
    new Set((remote?.headers ?? []).flatMap((h) => h.placeholders))
  )

  // Map placeholder → metadata (prefer the first header that introduced it)
  const placeholderMeta: Record<string, { label: string; secret: boolean; required: boolean; description: string }> = {}
  for (const h of remote?.headers ?? []) {
    for (const p of h.placeholders) {
      if (!placeholderMeta[p]) {
        placeholderMeta[p] = {
          label: p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          secret: h.secret,
          required: h.required,
          description: h.description,
        }
      }
    }
  }

  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function connect() {
    setErr(null)
    if (!remote) {
      setErr('No streamable-http remote on this server')
      return
    }
    for (const p of allPlaceholders) {
      if (placeholderMeta[p]?.required && !values[p]?.trim()) {
        setErr(`${placeholderMeta[p].label} is required`)
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/mcp-registry/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: server.name,
          title: server.title,
          description: server.description,
          url: remote.url,
          headerTemplates: remote.headers.map((h) => ({
            name: h.name,
            template: h.template,
            secret: h.secret,
          })),
          placeholders: values,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Connect failed')
        return
      }
      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success(`${server.title} connected — ${data.toolsCount} tools listed`)
      }
      onConnected()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0d1117] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Power className="h-4 w-4 text-[#7ed957]" />
              {server.title}
            </h2>
            <p className="font-mono text-[11px] text-white/40 truncate">{server.name}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-white/55 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {server.description && (
          <p className="mb-4 text-sm text-white/65">{server.description}</p>
        )}

        <div className="mb-4 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
          <div className="text-white/45">Endpoint</div>
          <div className="font-mono text-white/85 break-all">{remote?.url}</div>
        </div>

        {allPlaceholders.length === 0 ? (
          <p className="text-sm text-white/55">This server requires no auth — connecting directly.</p>
        ) : (
          <div className="space-y-3">
            {allPlaceholders.map((p) => {
              const meta = placeholderMeta[p]
              return (
                <div key={p}>
                  <Label>
                    {meta.label}
                    {meta.required && <span className="ml-1 text-red-400">*</span>}
                  </Label>
                  {meta.description && (
                    <p className="mb-1 text-[11px] text-white/45">{meta.description}</p>
                  )}
                  <Input
                    type={meta.secret ? 'password' : 'text'}
                    value={values[p] ?? ''}
                    onChange={(e) => setValues({ ...values, [p]: e.target.value })}
                    placeholder={`{${p}}`}
                    className="font-mono text-sm"
                  />
                </div>
              )
            })}
          </div>
        )}

        {err && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {server.repository && (
          <p className="mt-3 text-xs text-white/40">
            <a
              href={server.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7ed957] hover:underline"
            >
              View {server.title} repository →
            </a>
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={connect} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Connect
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
