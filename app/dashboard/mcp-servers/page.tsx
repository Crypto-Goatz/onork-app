'use client'

import { useEffect, useState } from 'react'
import {
  Server, Plus, RefreshCw, Loader2, AlertCircle, CheckCircle2, X, Play, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ServerRow {
  id: string
  slug: string
  name: string
  description: string | null
  transport: string
  url: string | null
  status: string
  tools: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>
  tools_listed_at: string | null
  last_used_at: string | null
  use_count: number
  tool_count: number
  created_at: string
  updated_at: string
}

interface Preset {
  slug: string
  name: string
  description: string
  url: string
  authMode: 'env' | 'bearer'
  envFields?: Array<{ key: string; label: string; required: boolean; secret: boolean }>
  bearerLabel?: string
  docs: string
  iconChar?: string
}

export default function McpServersPage() {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [openPreset, setOpenPreset] = useState<Preset | null>(null)

  async function load() {
    setLoading(true)
    try {
      const sRes = await fetch('/api/mcp/servers')
      if (sRes.status === 403) {
        toast.error('Admin access required')
        window.location.href = '/dashboard'
        return
      }
      const s = await sRes.json()
      const p = await fetch('/api/mcp/presets').then((r) => r.json())
      setServers(s.servers ?? [])
      setPresets(p.presets ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function disconnect(id: string) {
    const res = await fetch(`/api/mcp/servers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Disconnected')
      load()
    } else {
      toast.error('Disconnect failed')
    }
  }

  async function refreshTools(id: string) {
    const res = await fetch(`/api/mcp/servers/${id}/tools?refresh=1`)
    const data = await res.json()
    if (res.ok) {
      toast.success(`Listed ${data.tools?.length ?? 0} tools`)
      load()
    } else {
      toast.error(data.error || 'List failed')
    }
  }

  return (
    <div className="px-6 py-5 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Server className="h-6 w-6 text-[#7ed957]" />
          MCP Servers
        </h1>
        <p className="text-sm text-white/55 mt-1">
          Connect external MCP servers to 0nCore. Their tools become available across the workflow builder, Switches, and Jaxx.
        </p>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/55 mb-3">One-click connect</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => {
            const installed = servers.find((s) => s.slug === p.slug)
            return (
              <Card key={p.slug} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-base">
                    {p.iconChar ?? p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/55">{p.description}</p>
                  </div>
                </div>
                {installed ? (
                  <Button size="sm" variant="outline" disabled className="w-full">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                    Connected
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setOpenPreset(p)} className="w-full">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Connect
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Connected */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/55">
            Connected ({servers.length})
          </h2>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading && servers.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : servers.length === 0 ? (
          <Card className="p-8 text-center">
            <Server className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="text-white/60">No MCP servers connected yet.</p>
            <p className="mt-1 text-sm text-white/40">Pick a preset above or connect a custom one.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {servers.map((s) => (
              <ConnectedRow key={s.id} server={s} onDisconnect={disconnect} onRefresh={refreshTools} />
            ))}
          </div>
        )}
      </div>

      {openPreset && (
        <ConnectModal
          preset={openPreset}
          onClose={() => setOpenPreset(null)}
          onConnected={() => {
            setOpenPreset(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function ConnectedRow({
  server,
  onDisconnect,
  onRefresh,
}: {
  server: ServerRow
  onDisconnect: (id: string) => void
  onRefresh: (id: string) => void
}) {
  const [showTools, setShowTools] = useState(false)
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold truncate">{server.name}</h3>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-white/55">
              {server.transport}
            </span>
            {server.status === 'active' ? (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-emerald-300">
                active
              </span>
            ) : server.status === 'error' ? (
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-red-300">
                error
              </span>
            ) : (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-white/55">
                {server.status}
              </span>
            )}
          </div>
          {server.description && <p className="text-xs text-white/55 line-clamp-1">{server.description}</p>}
          <p className="mt-0.5 text-[11px] font-mono text-white/40 truncate">{server.url}</p>
        </div>
        <div className="text-xs text-white/55 text-right shrink-0">
          {server.tool_count} tool{server.tool_count === 1 ? '' : 's'}
          {server.use_count > 0 && (
            <div className="text-[10px] text-white/40 mt-0.5">
              {server.use_count} call{server.use_count === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onRefresh(server.id)}>
          <RefreshCw className="mr-1 h-3 w-3" />
          {server.tool_count > 0 ? 'Re-list tools' : 'List tools'}
        </Button>
        {server.tool_count > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setShowTools((v) => !v)}>
            {showTools ? 'Hide' : 'Show'} tools
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDisconnect(server.id)}
          className="ml-auto text-red-400 hover:text-red-300"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Disconnect
        </Button>
      </div>

      {showTools && server.tools.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {server.tools.map((t) => (
            <div key={t.name} className="rounded border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] font-semibold">{t.name}</span>
              </div>
              {t.description && <div className="mt-0.5 text-white/55">{t.description}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function ConnectModal({
  preset,
  onClose,
  onConnected,
}: {
  preset: Preset
  onClose: () => void
  onConnected: () => void
}) {
  const [envs, setEnvs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function connect() {
    setErr(null)
    // Validate required
    for (const f of preset.envFields ?? []) {
      if (f.required && !envs[f.key]?.trim()) {
        setErr(`${f.label} is required`)
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: preset.slug,
          name: preset.name,
          description: preset.description,
          transport: 'http',
          url: preset.url,
          envVars: envs,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Connect failed')
        return
      }
      // Trigger an initial tool list
      await fetch(`/api/mcp/servers/${data.server.id}/tools?refresh=1`).catch(() => null)
      toast.success(`${preset.name} connected`)
      onConnected()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1117] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">{preset.iconChar}</span>
            Connect {preset.name}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-white/55 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-white/55">{preset.description}</p>

        <div className="space-y-3">
          {(preset.envFields ?? []).map((f) => (
            <div key={f.key}>
              <Label>
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </Label>
              <Input
                type={f.secret ? 'password' : 'text'}
                value={envs[f.key] || ''}
                onChange={(e) => setEnvs({ ...envs, [f.key]: e.target.value })}
                placeholder={f.key}
                className="font-mono text-sm"
              />
            </div>
          ))}
        </div>

        {err && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <p className="mt-3 text-xs text-white/40">
          <a href={preset.docs} target="_blank" rel="noopener noreferrer" className="text-[#7ed957] hover:underline">
            View {preset.name} docs →
          </a>
        </p>

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
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Connect
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
