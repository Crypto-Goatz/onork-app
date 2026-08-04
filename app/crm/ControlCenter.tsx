'use client'

import { useEffect, useState } from 'react'
import {
  Workflow, Bot, Eye, Sparkles, Loader2, AlertCircle, Copy, Check,
  RefreshCw, ShieldCheck, X,
} from 'lucide-react'
import { authHeaders } from './useSso'

/**
 * Automations & AI — one place for everything that runs outside the command bar.
 *
 * FOUR SECTIONS, and each is honest about its own state rather than presenting a
 * uniform surface of switches:
 *   Workflow Actions  the steps in the agency's own builder
 *   Agent Connect     the endpoint + key for their native agents, and tool policy
 *   Visualizer        native automations, read-only by platform law
 *   Insights          one question across every client
 *
 * NOTHING HERE PRETENDS. An action whose executor is unfinished shows "coming"
 * and its switch refuses. The visualizer has no edit control because the API has
 * no edit endpoint. Insight findings become PREFILLED COMMANDS rather than
 * actions, so they land in the same plan → approve → run gate as everything else.
 */

type Section = 'actions' | 'agents' | 'visualizer' | 'insights'

interface ActionRow {
  key: string; name: string; blurb: string; live: boolean
  priceCents: number; enabled: boolean; usage: { runs: number; failures: number }
}
interface ToolRow { id: string; intent: string; priceCents: number; writes: boolean; mode: string }
interface Finding { client: string; observation: string; command: string | null }

const SECTIONS: { id: Section; icon: typeof Workflow; label: string; blurb: string }[] = [
  { id: 'actions', icon: Workflow, label: 'Workflow Actions', blurb: '0nCORE steps inside your own builder' },
  { id: 'agents', icon: Bot, label: 'AI Agent Connect', blurb: 'Give your agents 0nCORE tools' },
  { id: 'visualizer', icon: Eye, label: 'Automation Viewer', blurb: 'See any client\'s automations' },
  { id: 'insights', icon: Sparkles, label: 'Insights', blurb: 'One question, every client' },
]

export default function ControlCenter({
  token, locations, onCommand, onClose,
}: {
  token: string | null
  locations: { id: string; name: string }[]
  onCommand: (command: string) => void
  onClose: () => void
}) {
  const [section, setSection] = useState<Section>('actions')

  return (
    <div className="oc-card oc-rise p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[color:var(--oc-ink)]">Automations &amp; AI</h2>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--oc-text)]/70">
            Everything 0nCORE can run without you typing a command.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const on = section === s.id
          return (
            <button key={s.id} type="button" onClick={() => setSection(s.id)}
              className={`oc-chip inline-flex items-center gap-2 border px-3 py-2 transition-colors ${
                on ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/12 text-[color:var(--oc-ink)]'
                   : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)] hover:border-[color:var(--oc-green-d)]'}`}>
              <Icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          )
        })}
      </div>

      {section === 'actions' && <Actions token={token} />}
      {section === 'agents' && <Agents token={token} />}
      {section === 'visualizer' && <Visualizer token={token} locations={locations} />}
      {section === 'insights' && <Insights token={token} onCommand={onCommand} />}
    </div>
  )
}

/* ─────────────────────────── Workflow Actions ─────────────────────────── */

function Actions({ token }: { token: string | null }) {
  const [rows, setRows] = useState<ActionRow[] | null>(null)
  const [ready, setReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/actions', { headers: authHeaders(token) })
      .then((r) => r.json())
      .then((j) => { setRows(j.actions ?? []); setReady(Boolean(j.endpointReady)) })
      .catch(() => setRows([]))
  }, [token])

  async function toggle(a: ActionRow) {
    setBusy(a.key); setErr(null)
    try {
      const r = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ actionKey: a.key, enabled: !a.enabled }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Could not save that.')
      setRows((prev) => prev?.map((x) => (x.key === a.key ? { ...x, enabled: !a.enabled } : x)) ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that.')
    } finally { setBusy(null) }
  }

  if (!rows) return <Loading />

  return (
    <div className="space-y-3">
      {/* The endpoint is not live until the callback contract is captured from
          the portal. Saying so beats switches that appear to work. */}
      {ready === false && (
        <div className="flex items-start gap-2 rounded-[14px] border border-[color:var(--oc-amber)]/45 bg-[color:var(--oc-amber)]/[0.07] p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-amber)]" />
          <p className="text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/85">
            <b className="text-[color:var(--oc-ink)]">Not connected yet.</b> These steps will appear in
            your workflow builder once we finish registering them. Nothing here will run before then —
            you can still see what is coming.
          </p>
        </div>
      )}
      {err && <p className="flex items-center gap-2 text-sm text-[color:var(--oc-red)]"><AlertCircle className="h-4 w-4" /> {err}</p>}

      {rows.map((a) => (
        <div key={a.key} className="rounded-[14px] border border-[color:var(--oc-border)] bg-white p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-[color:var(--oc-ink)]">{a.name}</span>
                {!a.live && <span className="oc-chip border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] px-2 py-0.5 text-[color:var(--oc-text)]/70">coming</span>}
                {a.priceCents > 0 && <span className="oc-mono text-[11px] text-[color:var(--oc-text)]/60">${(a.priceCents / 100).toFixed(2)} each</span>}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/75">{a.blurb}</p>
              {a.usage.runs > 0 && (
                <p className="oc-mono mt-1.5 text-[11px] text-[color:var(--oc-text)]/55">
                  {a.usage.runs} run{a.usage.runs === 1 ? '' : 's'}
                  {a.usage.failures > 0 && <span className="text-[color:var(--oc-amber)]"> · {a.usage.failures} failed</span>}
                </p>
              )}
            </div>
            <button type="button" disabled={!a.live || busy === a.key} onClick={() => toggle(a)}
              className={`oc-chip shrink-0 border px-3 py-2 transition-colors ${
                a.enabled ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/15 text-[color:var(--oc-green-d)]'
                          : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]'} ${!a.live ? 'opacity-40' : ''}`}>
              {busy === a.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.enabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────────── Agent Connect ──────────────────────────── */

function Agents({ token }: { token: string | null }) {
  const [conn, setConn] = useState<{ endpoint: string; hasKey: boolean; keyHint?: string | null; instructions: string[]; broken?: boolean } | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [tools, setTools] = useState<ToolRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agents/connection', { headers: authHeaders(token) }).then((r) => r.json()).then(setConn).catch(() => setConn(null))
    fetch('/api/agents/policy', { headers: authHeaders(token) }).then((r) => r.json()).then((j) => setTools(j.tools ?? [])).catch(() => setTools([]))
  }, [token])

  async function rotate() {
    setBusy(true)
    try {
      const r = await fetch('/api/agents/connection', { method: 'POST', headers: authHeaders(token) })
      const j = await r.json()
      if (j?.key) { setFresh(j.key); setConn((c) => (c ? { ...c, hasKey: true, broken: false } : c)) }
    } finally { setBusy(false) }
  }

  async function setMode(t: ToolRow, mode: string) {
    setTools((prev) => prev?.map((x) => (x.id === t.id ? { ...x, mode } : x)) ?? null)
    await fetch('/api/agents/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ tool: t.id, mode }),
    }).catch(() => {})
  }

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(null), 1600) }).catch(() => {})
  }

  if (!conn) return <Loading />

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-[color:var(--oc-border)] bg-white p-3.5">
        <h3 className="text-[14px] font-semibold text-[color:var(--oc-ink)]">Connect an agent</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/75">
          Your CRM has no way to wire this up automatically, so it is a copy and paste — once per agent.
        </p>

        <div className="mt-3 space-y-2">
          <Field label="Endpoint" value={conn.endpoint} onCopy={() => copy(conn.endpoint, 'endpoint')} copied={copied === 'endpoint'} />
          {fresh ? (
            <>
              <Field label="Key" value={fresh} mono onCopy={() => copy(fresh, 'key')} copied={copied === 'key'} />
              {/* Said plainly, because we cannot show it again. */}
              <p className="text-[12px] text-[color:var(--oc-amber)]">
                Copy this now — it is not shown again. You can always make a new one.
              </p>
            </>
          ) : conn.hasKey ? (
            <div className="rounded-[12px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] px-3 py-2.5">
              <div className="oc-mono text-[10px] uppercase tracking-[.12em] text-[color:var(--oc-text)]/55">Key</div>
              <div className="mt-0.5 text-[13px] text-[color:var(--oc-text)]">
                {conn.broken
                  ? 'This key cannot be read any more — make a new one.'
                  : `In use, ending ${conn.keyHint}. Make a new one if you have lost it.`}
              </div>
            </div>
          ) : null}
          <button type="button" onClick={rotate} disabled={busy}
            className="oc-btn inline-flex items-center gap-2 px-3.5 py-2 text-[13px]">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {conn.hasKey ? 'Make a new key' : 'Create a key'}
          </button>
        </div>

        <ol className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/75">
          {conn.instructions.map((s, i) => (
            <li key={i} className="flex gap-2"><span className="oc-mono shrink-0 text-[color:var(--oc-green-d)]">{i + 1}.</span>{s}</li>
          ))}
        </ol>
      </div>

      <div className="rounded-[14px] border border-[color:var(--oc-border)] bg-white p-3.5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
          <div>
            <h3 className="text-[14px] font-semibold text-[color:var(--oc-ink)]">What your agents may do alone</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/75">
              Anything that changes a client account or costs money needs your approval by default.
              An agent runs unattended — this is the difference between it helping and it surprising you.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {(tools ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-[color:var(--oc-border)] px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] text-[color:var(--oc-ink)]">{t.intent}</div>
                <div className="oc-mono text-[10.5px] text-[color:var(--oc-text)]/55">
                  {t.writes ? 'changes things' : 'read only'}{t.priceCents > 0 ? ` · ${t.priceCents}¢` : ''}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {(['auto', 'approve', 'block'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(t, m)}
                    className={`oc-chip border px-2 py-1 text-[11px] transition-colors ${
                      t.mode === m ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/15 text-[color:var(--oc-green-d)]'
                                   : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]/70'}`}>
                    {m === 'auto' ? 'Allow' : m === 'approve' ? 'Ask me' : 'Never'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, mono, onCopy, copied }: { label: string; value: string; mono?: boolean; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="oc-mono text-[10px] uppercase tracking-[.12em] text-[color:var(--oc-text)]/55">{label}</div>
        <div className={`truncate text-[13px] text-[color:var(--oc-ink)] ${mono ? 'oc-mono' : ''}`}>{value}</div>
      </div>
      <button type="button" onClick={onCopy} aria-label={`Copy ${label}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]">
        {copied ? <Check className="h-3.5 w-3.5 text-[color:var(--oc-green-d)]" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

/* ────────────────────────────── Visualizer ────────────────────────────── */

function Visualizer({ token, locations }: { token: string | null; locations: { id: string; name: string }[] }) {
  const [pick, setPick] = useState<string>('')
  const [data, setData] = useState<{ workflows: { id?: string; name?: string; status?: string }[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load(id: string) {
    setPick(id); setData(null); setErr(null)
    if (!id) return
    setLoading(true)
    try {
      const r = await fetch(`/api/workflows/${encodeURIComponent(id)}`, { headers: authHeaders(token) })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Could not read that client.')
      setData(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read that client.')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <select value={pick} onChange={(e) => load(e.target.value)} className="oc-input w-full">
        <option value="">Pick a client…</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {loading && <Loading />}
      {err && <p className="flex items-center gap-2 text-sm text-[color:var(--oc-red)]"><AlertCircle className="h-4 w-4" /> {err}</p>}

      {data && (
        <>
          {/* Stated once, plainly. There is no edit control anywhere in this
              section because the platform exposes no way to write one. */}
          <p className="text-[12px] text-[color:var(--oc-text)]/65">
            Read-only. Your CRM does not allow these to be edited from outside — open it there to change
            anything, or build it as a 0nCORE flow instead.
          </p>
          <div className="space-y-1.5">
            {data.workflows.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-[color:var(--oc-border)] bg-white px-3 py-2.5">
                <span className="truncate text-[13.5px] text-[color:var(--oc-ink)]">{w.name || 'Untitled'}</span>
                <span className={`oc-chip shrink-0 border px-2 py-0.5 text-[11px] ${
                  w.status === 'published'
                    ? 'border-[color:var(--oc-green-d)]/40 bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                    : 'border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] text-[color:var(--oc-text)]/70'}`}>
                  {w.status || 'draft'}
                </span>
              </div>
            ))}
            {data.workflows.length === 0 && (
              <p className="text-[13px] text-[color:var(--oc-text)]/70">No automations in this client yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────── Insights ─────────────────────────────── */

function Insights({ token, onCommand }: { token: string | null; onCommand: (c: string) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ summary: string; findings: Finding[]; covered: number; couldNotRead: string[]; notLookedAt?: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function ask() {
    if (!q.trim() || busy) return
    setBusy(true); setErr(null); setRes(null)
    try {
      const r = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ question: q.trim() }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'That did not work.')
      setRes(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That did not work.')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
          placeholder="Ask about every client at once — who is quiet, who needs attention…"
          className="oc-input min-h-[52px] flex-1 resize-none" />
        <button type="button" onClick={ask} disabled={busy || !q.trim()} className="oc-btn grid h-11 w-11 shrink-0 place-items-center">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </button>
      </div>

      {err && <p className="flex items-center gap-2 text-sm text-[color:var(--oc-red)]"><AlertCircle className="h-4 w-4" /> {err}</p>}

      {res && (
        <div className="space-y-2.5">
          <p className="text-[13.5px] leading-relaxed text-[color:var(--oc-ink)]">{res.summary}</p>

          {res.findings.map((f, i) => (
            <div key={i} className="rounded-[14px] border border-[color:var(--oc-border)] bg-white p-3.5">
              <div className="oc-chip mb-1 inline-block border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] px-2 py-0.5 text-[color:var(--oc-text)]">{f.client}</div>
              <p className="text-[13px] leading-relaxed text-[color:var(--oc-text)]/85">{f.observation}</p>
              {f.command && (
                // A finding becomes a COMMAND, never an action. It goes back
                // through plan → approve → run like anything else.
                <button type="button" onClick={() => onCommand(f.command!)}
                  className="oc-chip mt-2 border border-[color:var(--oc-border)] bg-white px-3 py-2 text-left font-normal text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-green-d)]">
                  {f.command}
                </button>
              )}
            </div>
          ))}

          {/* Coverage, always. An agency-wide answer that quietly skipped
              clients is worse than no answer. */}
          <p className="oc-mono text-[11px] text-[color:var(--oc-text)]/55">
            Looked at {res.covered} client{res.covered === 1 ? '' : 's'}
            {res.couldNotRead.length > 0 && <span className="text-[color:var(--oc-amber)]"> · could not read {res.couldNotRead.join(', ')}</span>}
            {res.notLookedAt ? ` · ${res.notLookedAt} more not checked` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-6 text-[13px] text-[color:var(--oc-text)]/60">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  )
}
