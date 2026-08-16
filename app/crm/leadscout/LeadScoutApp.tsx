'use client'

/**
 * LeadScout — the marketplace Custom Page.
 *
 * WHO IS LOOKING AT THIS. Someone who installed LeadScout from the marketplace
 * and opened it inside their own CRM. They have no account with us. Their
 * identity arrives through the SSO handshake, which yields a short-lived
 * company-scoped JWT — that token is the only auth on every call below.
 *
 * IT NEVER RENDERS AN OAUTH BUTTON. This runs framed, and OAuth in an iframe is
 * refused outright. A sign-in fallback here would be a button that cannot work,
 * so when SSO fails the page says so plainly instead.
 *
 * SEARCH, THEN LOOK, THEN SAVE — three states, and saving is last on purpose.
 * These writes land in a live CRM someone's business runs on. A single button
 * that searched and imported would be faster and would eventually import forty
 * wrong businesses into a client's account.
 *
 * THE BATCH WARNING IS THE HOUSE RULE. Any time a lot of writes are about to
 * fire at once, say so and offer a smaller first batch to audit. The cap is
 * enforced server-side too — a limit that only exists in the UI is a suggestion
 * to anyone holding the URL.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Building2, Check, Loader2, MapPin, Phone, Radar, Search,
  Star, TriangleAlert, Globe,
} from 'lucide-react'
import { useSso, authHeaders } from '@/app/crm/useSso'

interface Lead {
  key: string
  name: string
  address?: string
  phone?: string
  website?: string
  domain?: string
  rating?: number
  reviews?: number
  category?: string
  signal?: string
  known?: boolean
}

const BATCH = 25

export default function LeadScoutApp() {
  const sso = useSso()
  const [trade, setTrade] = useState('')
  const [where, setWhere] = useState('')
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [meta, setMeta] = useState<{ fresh: number; known: number; dedupeNote: string } | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'find' | 'save' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ saved: number; failed: { name: string; error: string }[] } | null>(null)

  const locationId = (sso as { activeLocationId?: string }).activeLocationId ?? ''

  useEffect(() => { document.title = 'LeadScout by RocketOpp' }, [])

  const selected = useMemo(() => (leads ?? []).filter((l) => picked.has(l.key)), [leads, picked])
  const overCap = selected.length > BATCH

  async function call(step: 'find' | 'save', body: Record<string, unknown>) {
    const res = await fetch('/api/leadscout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token ?? '') },
      body: JSON.stringify({ step, locationId, ...body }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Something went wrong (${res.status}).`)
    return json
  }

  async function find() {
    setBusy('find'); setError(null); setResult(null); setPicked(new Set())
    try {
      const d = await call('find', { trade, where, limit: 20 })
      setLeads(d.leads ?? [])
      setMeta({ fresh: d.fresh ?? 0, known: d.known ?? 0, dedupeNote: d.dedupeNote ?? '' })
      // Pre-select only what is genuinely new. Pre-selecting known contacts
      // would make the safe action the one that needs work.
      setPicked(new Set((d.leads as Lead[] ?? []).filter((l) => !l.known).map((l) => l.key)))
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(null) }
  }

  async function save(batch: Lead[]) {
    setBusy('save'); setError(null)
    try {
      const d = await call('save', { leads: batch })
      setResult({ saved: d.saved ?? 0, failed: d.failed ?? [] })
      // Anything that landed leaves the selection, so a second press cannot
      // re-send it.
      const done = new Set(batch.map((b) => b.key))
      setPicked((prev) => new Set([...prev].filter((k) => !done.has(k))))
      setLeads((prev) => (prev ?? []).map((l) => (done.has(l.key) ? { ...l, known: true } : l)))
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(null) }
  }

  if (sso.state === 'pending') {
    return <Shell><Loader2 className="h-5 w-5 animate-spin text-[color:var(--oc-muted)]" /></Shell>
  }
  if (sso.state !== 'authed') {
    return (
      <Shell>
        <p className="text-[15px] font-semibold text-[color:var(--oc-ink)]">Open LeadScout from your account</p>
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[color:var(--oc-muted)]">
          This page signs you in automatically when you open it from the menu inside your CRM.
        </p>
      </Shell>
    )
  }

  return (
    <div className="oncore-app min-h-screen bg-[color:var(--oc-bg)]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--0n-soft)]">
            <Radar className="h-5 w-5 text-[color:var(--oc-green-d)]" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--oc-ink)]">LeadScout</h1>
            <p className="mt-0.5 text-[13.5px] text-[color:var(--oc-muted)]">
              Find real local businesses and put the good ones in your pipeline.
            </p>
          </div>
        </header>

        {/* ── SEARCH ── */}
        <section className="oc-card mt-7 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--oc-muted)]">
                What kind of business
              </span>
              <input value={trade} onChange={(e) => setTrade(e.target.value)}
                placeholder="dentists"
                className="oc-input w-full px-3 py-2 text-[14px]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--oc-muted)]">
                Where
              </span>
              <input value={where} onChange={(e) => setWhere(e.target.value)}
                placeholder="Pittsburgh, Pennsylvania"
                onKeyDown={(e) => { if (e.key === 'Enter' && trade && where) void find() }}
                className="oc-input w-full px-3 py-2 text-[14px]" />
            </label>
          </div>
          <button onClick={find} disabled={busy !== null || !trade.trim() || !where.trim()}
            className="oc-btn mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-[14px] disabled:opacity-60">
            {busy === 'find' ? <><Loader2 className="h-4 w-4 animate-spin" />Looking…</> : <><Search className="h-4 w-4" />Find leads</>}
          </button>
        </section>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-[color:var(--oc-amber)]/10 px-4 py-3 text-[13px] text-[color:var(--oc-amber)]">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}
          </p>
        )}

        {result && (
          <div className="mt-4 rounded-xl bg-[color:var(--0n-soft)] px-4 py-3">
            <p className="text-[13.5px] font-semibold text-[color:var(--oc-green-d)]">
              {result.saved} added to your CRM.
            </p>
            {result.failed.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {result.failed.map((f) => (
                  <li key={f.name} className="text-[12.5px] text-[color:var(--oc-muted)]">{f.name} — {f.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {leads && (
          <section className="mt-7">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[color:var(--oc-ink)]">
                {leads.length} found · <span className="text-[color:var(--oc-green-d)]">{meta?.fresh ?? 0} new</span>
                {(meta?.known ?? 0) > 0 && <span className="text-[color:var(--oc-muted)]"> · {meta?.known} already yours</span>}
              </h2>
              <span className="text-[11.5px] text-[color:var(--oc-faint)]">{meta?.dedupeNote}</span>
            </div>

            {leads.length === 0 && (
              <p className="oc-card p-6 text-center text-[13.5px] text-[color:var(--oc-muted)]">
                Nothing came back for that. Try a broader trade or a larger city.
              </p>
            )}

            <ul className="space-y-2">
              {leads.map((l) => {
                const on = picked.has(l.key)
                return (
                  <li key={l.key}>
                    <button
                      onClick={() => setPicked((p) => { const n = new Set(p); n.has(l.key) ? n.delete(l.key) : n.add(l.key); return n })}
                      className={`oc-card flex w-full gap-3 p-4 text-left transition-colors ${on ? 'border-[color:var(--oc-green-d)]' : ''}`}
                    >
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                        on ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green-d)] text-white' : 'border-[color:var(--oc-border)]'}`}>
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[14.5px] font-semibold text-[color:var(--oc-ink)]">{l.name}</span>
                          {l.known && (
                            <span className="rounded-full bg-[color:var(--oc-hover)] px-2 py-0.5 text-[10.5px] font-semibold text-[color:var(--oc-muted)]">
                              already in your CRM
                            </span>
                          )}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[color:var(--oc-muted)]">
                          {l.category && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{l.category}</span>}
                          {l.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.address}</span>}
                          {l.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                          {l.domain && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{l.domain}</span>}
                          {typeof l.rating === 'number' && (
                            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{l.rating}{typeof l.reviews === 'number' ? ` (${l.reviews})` : ''}</span>
                          )}
                        </span>
                        {l.signal && (
                          <span className="mt-1.5 block text-[12.5px] leading-relaxed text-[color:var(--oc-green-d)]">{l.signal}</span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      {/* ── SAVE BAR ── sticky, because the decision is made while scrolling ── */}
      {selected.length > 0 && (
        <div className="sticky bottom-0 border-t border-[color:var(--oc-border)] bg-[color:var(--oc-card)]/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
            <span className="text-[13.5px] font-semibold text-[color:var(--oc-ink)]">
              {selected.length} selected
            </span>

            {overCap ? (
              // The house rule: a large batch is announced, and the smaller
              // first run is offered as the primary action, not the fallback.
              <>
                <span className="flex items-center gap-1.5 text-[12.5px] text-[color:var(--oc-amber)]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  That is a lot of contacts to write into a live CRM at once.
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => void save(selected.slice(0, BATCH))} disabled={busy !== null}
                    className="oc-btn inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px] disabled:opacity-60">
                    {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Add the first {BATCH} and check them
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => void save(selected)} disabled={busy !== null}
                className="oc-btn ml-auto inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px] disabled:opacity-60">
                {busy === 'save' ? <><Loader2 className="h-4 w-4 animate-spin" />Adding…</> : `Add ${selected.length} to your CRM`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="oncore-app grid min-h-screen place-items-center bg-[color:var(--oc-bg)] px-6 text-center">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  )
}
