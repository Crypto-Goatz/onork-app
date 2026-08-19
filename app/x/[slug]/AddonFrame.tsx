'use client'

/**
 * The add-on frame: configure it, run it, see what it actually produced.
 *
 * ONE SCREEN, THREE STATES, and no fourth. Configure → running → a result you
 * can read. The old surface had a fourth state — a page that looked alive and
 * did nothing — which is the one this is built to make impossible.
 *
 * A RUN REPORTS WHAT IT MADE, not that it finished. `ExecutionResult` carries
 * `items[]`, so the result panel lists the things produced with their status
 * and links where they exist. "Completed successfully" with nothing to show for
 * it is how a customer learns not to trust the button.
 *
 * FAILURE IS PRINTED IN FULL. An add-on that fails tells you what the server
 * said, because the alternative — a red toast saying "something went wrong" —
 * sends people to support with nothing useful, and this ecosystem has already
 * paid for a status code standing in for four different causes.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, Clock, Loader2, Play, AlertTriangle, ExternalLink, ShieldAlert,
} from 'lucide-react'
import type { ConfigField } from '@/lib/addon-registry'
import ReconsentPrompt, { type ReconsentPromptData } from '@/components/addons/ReconsentPrompt'

type Item = { type: string; title: string; url?: string; status: string }
type Result = { success: boolean; summary: string; items?: Item[]; outputs?: Record<string, unknown> }

export default function AddonFrame({
  slug, name, schedule, fields, blurb, grace = null, access, reconsent = null,
}: {
  slug: string
  name: string
  schedule: string
  fields: ConfigField[]
  blurb: string
  /** Set when the entitlement has lapsed but has not run out. */
  grace?: { reason: string; daysLeft: number; endsAt: string } | null
  /** What opened this door, so the frame never claims more than the gate found. */
  access?: { source: string | null; reason: string }
  /**
   * Set when the CRM connection behind this add-on is dying or absent — it
   * still works, so this is a banner and never a wall. A DEAD connection never
   * reaches here: /x/[slug] renders the blocking prompt instead of this frame.
   */
  reconsent?: ReconsentPromptData | null
}) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Seed from defaults so a first run is possible without filling a form —
    // a required field with a sensible default should not be a gate.
    const seed: Record<string, unknown> = {}
    for (const f of fields) if (f.default !== undefined) seed[f.key] = f.default
    setConfig(seed)

    fetch(`/api/addons/${slug}/config`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.config) setConfig((c) => ({ ...c, ...d.config })) })
      .catch(() => {})
  }, [slug, fields])

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const r = await fetch(`/api/addons/${slug}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ config }),
      })
      if (!r.ok) setError(`Could not save your settings (HTTP ${r.status}).`)
    } catch (e) {
      setError((e as Error).message)
    } finally { setSaving(false) }
  }

  const run = async () => {
    setRunning(true); setError(null); setResult(null)
    try {
      const r = await fetch(`/api/addons/${slug}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ config }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        // The server's own words, not a generic apology.
        setError(d?.error || `The run failed (HTTP ${r.status}).`)
      } else {
        setResult(d.result ?? d)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally { setRunning(false) }
  }

  const set = (k: string, v: unknown) => setConfig((c) => ({ ...c, [k]: v }))

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-white/10 px-6 py-6 md:px-10">
        <div className="mx-auto max-w-[900px]">
          <Link href="/hub" className="inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Hub
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{name}</h1>
          {blurb && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">{blurb}</p>}
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">
            <Clock className="h-3 w-3" />
            {schedule === 'manual' ? 'Runs when you press the button' : `Runs ${schedule}`}
          </p>
          {/* Why this is open, in the frame's own words. An operator override
              must never read as a purchase. */}
          {access?.source && (
            <p className="mt-2 text-xs text-white/35">{access.reason}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[900px] space-y-6 px-6 py-8 md:px-10">
        {/*
          FIRST THING IN THE COLUMN, ABOVE THE SETTINGS AND THE RUN BUTTON.
          A warning that the connection dies on Thursday is worth nothing
          underneath the form someone is about to fill in.
        */}
        {reconsent && <ReconsentPrompt data={reconsent} appName={name} />}

        {/*
          GRACE IS SHOWN, NEVER SILENT. A subscription that lapsed keeps the
          add-on working for seven days; a customer who is not told simply
          discovers it is off on day eight, which is the worst possible moment
          to learn there was a window.
        */}
        {grace && (
          <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.07] p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-[#f59e0b]">
              <ShieldAlert className="h-4 w-4" />
              {grace.daysLeft === 1 ? '1 day left' : `${grace.daysLeft} days left`}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{grace.reason}</p>
            <a href="/pricing" className="mt-3 inline-block text-xs text-[#6EE05A] hover:underline">
              Sort out billing
            </a>
          </div>
        )}

        {fields.length > 0 && (
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-sm uppercase tracking-widest text-white/40">Settings</h2>
            <div className="mt-5 space-y-5">
              {fields.map((f) => (
                <div key={f.key}>
                  <label htmlFor={f.key} className="block text-sm font-medium text-white/85">
                    {f.label}
                    {f.required && <span className="ml-1 text-[#f59e0b]">*</span>}
                  </label>
                  {f.description && <p className="mt-1 text-xs text-white/40">{f.description}</p>}

                  {f.type === 'textarea' ? (
                    <textarea
                      id={f.key}
                      rows={4}
                      value={String(config[f.key] ?? '')}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0f14] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#6EE05A] focus:outline-none"
                    />
                  ) : f.type === 'select' ? (
                    <select
                      id={f.key}
                      value={String(config[f.key] ?? '')}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0f14] px-3 py-2 text-sm text-white focus:border-[#6EE05A] focus:outline-none"
                    >
                      <option value="">Choose…</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.type === 'toggle' ? (
                    <button
                      id={f.key}
                      type="button"
                      onClick={() => set(f.key, !config[f.key])}
                      className={`mt-2 flex h-6 w-11 items-center rounded-full p-0.5 transition ${config[f.key] ? 'bg-[#6EE05A]' : 'bg-white/15'}`}
                      aria-pressed={!!config[f.key]}
                    >
                      <span className={`h-5 w-5 rounded-full bg-white transition ${config[f.key] ? 'translate-x-5' : ''}`} />
                    </button>
                  ) : (
                    <input
                      id={f.key}
                      type={f.type === 'number' ? 'number' : 'text'}
                      value={String(config[f.key] ?? '')}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0f14] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#6EE05A] focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="mt-6 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-white/35 hover:text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </section>
        )}

        <button
          onClick={run}
          disabled={running}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6EE05A] px-6 py-4 text-sm font-semibold text-[#062312] transition hover:opacity-90 disabled:opacity-60"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Running…' : 'Run now'}
        </button>

        {error && (
          <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/[0.07] p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-[#ef4444]">
              <AlertTriangle className="h-4 w-4" /> It didn&apos;t run
            </p>
            {/* Verbatim. A generic apology sends people to support with nothing. */}
            <p className="mt-2 font-mono text-xs leading-relaxed text-white/60">{error}</p>
          </div>
        )}

        {result && (
          <div className={`rounded-xl border p-5 ${result.success ? 'border-[#6EE05A]/30 bg-[#6EE05A]/[0.06]' : 'border-[#f59e0b]/30 bg-[#f59e0b]/[0.06]'}`}>
            <p className="flex items-center gap-2 text-sm font-medium">
              {result.success
                ? <CheckCircle2 className="h-4 w-4 text-[#6EE05A]" />
                : <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />}
              {result.summary || (result.success ? 'Finished.' : 'Finished with problems.')}
            </p>

            {/* What it MADE. "Success" with nothing to show teaches distrust. */}
            {result.items?.length ? (
              <ul className="mt-4 space-y-2">
                {result.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2">
                    <span className="min-w-0 truncate text-sm text-white/80">
                      <span className="mr-2 text-xs uppercase tracking-wider text-white/35">{it.type}</span>
                      {it.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-white/45">{it.status}</span>
                      {it.url && (
                        <a href={it.url} target="_blank" rel="noreferrer" className="text-[#6EE05A]">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-white/45">
                It reported success but listed nothing it produced. Worth checking before relying on this run.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
