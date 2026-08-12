'use client'

/**
 * The tool catalogue, with a run form per tool.
 *
 * FORMS ARE GENERATED FROM THE TOOL'S OWN SCHEMA. The bridge returns JSON
 * Schema for all 120 tools, so hand-writing forms would drift the moment a tool
 * gains an argument — and that drift is invisible until a call fails on a
 * missing field.
 *
 * DISABLED TOOLS ARE SHOWN, NOT HIDDEN. 9 of 120 are switched on; hiding the
 * rest would make the ceiling look like the product. Same rule as the Actions
 * glossary: say what exists and say what is switched on.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Play, Search, X } from 'lucide-react'

interface Field { key: string; type: string; description: string; required: boolean }
interface Tool {
  name: string
  service: string
  description: string
  enabled: boolean
  fields: Field[]
}

export default function McpToolsPanel() {
  const [tools, setTools] = useState<Tool[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [service, setService] = useState('all')
  const [open, setOpen] = useState<Tool | null>(null)

  useEffect(() => {
    fetch('/api/crm/tools/mcp', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setTools(j.tools)))
      .catch(() => setErr('Could not reach the tool bridge.'))
  }, [])

  const services = useMemo(
    () => [...new Set((tools ?? []).map((t) => t.service))].sort(),
    [tools],
  )
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (tools ?? []).filter((t) => {
      if (service !== 'all' && t.service !== service) return false
      if (!term) return true
      return t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term)
    })
  }, [tools, q, service])

  const enabled = (tools ?? []).filter((t) => t.enabled).length

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--oc-ink)]">Tool catalogue</h2>
          <p className="mt-1 text-[13.5px] text-[color:var(--oc-muted)]">
            {tools
              ? <>
                  <span className="font-medium text-[color:var(--oc-green-d)]">{enabled} of {tools.length}</span>
                  {' '}switched on, across {services.length} services. The rest are listed, never hidden.
                </>
              : 'Loading…'}
          </p>
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-[color:var(--oc-red)]">{err}</p>}
      {!tools && !err && (
        <div className="mt-6 flex items-center gap-2 text-sm text-[color:var(--oc-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading the tool bridge…
        </div>
      )}

      {tools && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--oc-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${tools.length} tools`}
                className="w-full rounded-[10px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] py-2.5 pl-9 pr-3 text-[13.5px] text-[color:var(--oc-ink)] outline-none transition placeholder:text-[color:var(--oc-muted)] focus:border-[color:var(--oc-green-d)]"
              />
            </div>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="rounded-full border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-3.5 py-2 text-[12.5px] text-[color:var(--oc-text)] outline-none focus:border-[color:var(--oc-green-d)]"
            >
              <option value="all">All services</option>
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {shown.map((t) => (
              <button
                key={t.name}
                onClick={() => setOpen(t)}
                className="rounded-xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-4 text-left transition hover:border-[color:var(--oc-border-h)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[12.5px] font-medium text-[color:var(--oc-ink)]">
                      {t.name}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-[color:var(--oc-muted)]">
                      {t.description || '—'}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                      t.enabled
                        ? 'bg-[color:var(--oc-green-d)]/12 text-[color:var(--oc-green-d)]'
                        : 'bg-black/[0.05] text-[color:var(--oc-muted)]'
                    }`}
                  >
                    {t.enabled ? 'On' : 'Off'}
                  </span>
                </div>
              </button>
            ))}
            {shown.length === 0 && (
              <p className="text-sm text-[color:var(--oc-muted)]">Nothing matches that.</p>
            )}
          </div>
        </>
      )}

      {open && <ToolDialog tool={open} onClose={() => setOpen(null)} />}
    </section>
  )
}

/** One tool, one form, built from its schema. */
function ToolDialog({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const missing = tool.fields.filter((f) => f.required && !(values[f.key] ?? '').trim())

  const run = useCallback(async () => {
    setBusy(true); setResult(null)
    // Arrays are typed as comma-separated text — the schema says `array` but a
    // person types "vip, hot-lead", so split rather than demand JSON.
    const args: Record<string, unknown> = {}
    for (const f of tool.fields) {
      const raw = (values[f.key] ?? '').trim()
      if (!raw) continue
      args[f.key] = f.type === 'array' ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : f.type === 'number' ? Number(raw)
        : f.type === 'boolean' ? raw === 'true'
        : raw
    }
    try {
      const res = await fetch('/api/crm/tools/mcp/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool.name, args }),
      })
      const j = await res.json()
      setResult({ ok: res.ok && j.ok !== false, text: j.text || j.error || JSON.stringify(j).slice(0, 800) })
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : 'Could not run.' })
    } finally { setBusy(false) }
  }, [tool, values])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={tool.name}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-6 shadow-[var(--oc-shadow)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[14px] font-semibold text-[color:var(--oc-ink)]">{tool.name}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--oc-muted)]">
              {tool.description || 'No description provided.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[color:var(--oc-muted)] hover:bg-[color:var(--oc-hover)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!tool.enabled && (
          <p className="mt-4 rounded-xl bg-[color:var(--oc-amber)]/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[color:var(--oc-amber)]">
            This tool is not switched on. It is listed so you can see it exists — enabling it is a
            change to <span className="font-mono">MCP_ALLOWED_TOOLS</span>.
          </p>
        )}

        <div className="mt-5 space-y-3.5">
          {tool.fields.length === 0 && (
            <p className="text-[13px] text-[color:var(--oc-muted)]">This tool takes no arguments.</p>
          )}
          {tool.fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 flex items-baseline gap-2 text-[12px] font-medium text-[color:var(--oc-muted)]">
                <span className="font-mono text-[color:var(--oc-ink)]">{f.key}</span>
                {f.required
                  ? <span className="text-[10.5px] text-[color:var(--oc-red)]">required</span>
                  : <span className="text-[10.5px]">optional</span>}
                <span className="ml-auto font-mono text-[10.5px]">{f.type}</span>
              </label>
              <input
                value={values[f.key] ?? ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.type === 'array' ? 'comma, separated, values' : f.description || ''}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[color:var(--oc-input)] px-3.5 py-2.5 font-mono text-[12.5px] text-[#f5f5f5] outline-none transition placeholder:text-[#8a8a8a] focus:border-[color:var(--oc-green-d)]"
              />
            </div>
          ))}
        </div>

        {result && (
          <pre className={`mt-4 max-h-48 overflow-auto rounded-xl px-3.5 py-3 font-mono text-[11.5px] leading-relaxed ${
            result.ok ? 'bg-[color:var(--oc-input)] text-[#a5f3a0]' : 'bg-[color:var(--oc-red)]/10 text-[color:var(--oc-red)]'
          }`}>{result.text}</pre>
        )}

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-[12px] text-[color:var(--oc-muted)]">
            {missing.length > 0 ? `${missing.length} required field${missing.length === 1 ? '' : 's'} left` : 'Ready'}
          </span>
          <button
            onClick={run}
            disabled={busy || missing.length > 0 || !tool.enabled}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--oc-ink)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-glow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run
          </button>
        </div>
      </div>
    </div>
  )
}
