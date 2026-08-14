'use client'

/**
 * Setup & Keys — shown as STATE, not a wizard.
 *
 * A wizard implies you pass through once. This is also the repair surface: a
 * revoked key, a rotated token, a new device all land here, and a screen that
 * only makes sense on first run is useless the second time. So every step shows
 * its own state and stays reachable.
 *
 * Two columns per crm-09: steps on the left, the two how-tos pinned right. The
 * instructions have to stay on screen WHILE you follow them — that is the whole
 * reason they are not a modal or a link.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, KeyRound, Loader2, Search, TriangleAlert } from 'lucide-react'
import AppSidebar from './AppSidebar'
import ProofOfLife from './ProofOfLife'
import { CONNECT_HOWTO, REQUIRED_SCOPES } from '@/lib/connect/instructions'

type Step = 'agency' | 'pick_free' | 'need_pit' | 'done'
const ORDER: Step[] = ['agency', 'pick_free', 'need_pit', 'done']

interface Status {
  step: Step
  complete: boolean
  freeLocationName?: string | null
  accountCount?: number
}

interface Device { id: string; name: string; prefix: string; lastUsedAt: string | null }

export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [issued, setIssued] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [s, d] = await Promise.all([
      fetch('/api/connect/status', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/auth/device', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ])
    if (s?.step) setStatus(s)
    if (Array.isArray(d?.devices)) setDevices(d.devices)
  }, [])

  useEffect(() => { void load() }, [load])

  const reached = (s: Step) => {
    if (!status) return false
    return ORDER.indexOf(s) < ORDER.indexOf(status.step) || status.complete
  }
  const current = (s: Step) => status?.step === s && !status.complete

  async function issueDevice() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/auth/device', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Chrome extension' }),
      })
      const j = await res.json()
      if (!res.ok) setErr(j.error || 'Could not issue a device key.')
      else { setIssued(j.token); void load() }
    } finally { setBusy(false) }
  }

  async function revoke(id: string) {
    if (!window.confirm('Revoke this device? That browser will stop working immediately.')) return
    await fetch(`/api/auth/device?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    void load()
  }

  const STEPS: { key: Step; title: string; body: string }[] = [
    { key: 'agency', title: 'Agency token + company ID',
      body: 'We read your client list; nothing in your CRM is changed.' },
    { key: 'pick_free', title: 'Choose your free account',
      body: status?.freeLocationName
        ? `${status.freeLocationName} — now the default target for any command that does not name a client. Chosen once; changing it is a support email.`
        : 'One account is included. We recommend your own agency sub-account — it becomes the default target. You can only choose once.' },
    { key: 'need_pit', title: 'Connect that account',
      body: 'Paste that sub-account’s key. Until it is in, anything that writes to this client fails at the last step.' },
    { key: 'done', title: 'Connect Extension',
      body: 'Device keys are shown once and can be revoked one browser at a time.' },
  ]

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="setup" activeCount={0} totalCount={0} usageLabel="$0" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-10 py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">
            Setup &amp; Keys
          </h1>
          <p className="mt-1 text-[13.5px] text-[color:var(--oc-muted)]">
            Shown as state, not a wizard — this is also the repair surface.
          </p>

          {/* Salvaged from the legacy chrome before it was retired. This is the
              repair surface, so the thing that proves a key works belongs at the
              top of it — not buried behind a sidebar nobody was meant to reach. */}
          <div className="mt-6">
            <ProofOfLife />
          </div>

          {!status && (
            <div className="mt-8 flex items-center gap-2 text-sm text-[color:var(--oc-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading setup…
            </div>
          )}

          {status && (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
              {/* ── steps ── */}
              <div className="space-y-3">
                {STEPS.map((st, i) => {
                  const done = reached(st.key) || (st.key === 'done' && devices.length > 0)
                  const now = current(st.key)
                  return (
                    <div
                      key={st.key}
                      className={[
                        'rounded-2xl border p-5 transition-colors duration-150',
                        now
                          ? 'border-[color:var(--oc-green-d)]/40 bg-[color:var(--oc-card)]'
                          : 'border-[color:var(--oc-border)] bg-[color:var(--oc-card)]',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          className={[
                            'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold',
                            done
                              ? 'bg-[color:var(--oc-green-d)]/15 text-[color:var(--oc-green-d)]'
                              : now
                                ? 'bg-[color:var(--oc-green-d)] text-[#0d1117] shadow-glow-sm'
                                : 'bg-[color:var(--oc-hover)] text-[color:var(--oc-muted)]',
                          ].join(' ')}
                        >
                          {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-[color:var(--oc-ink)]">
                            {st.title}
                          </div>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">
                            {st.body}
                          </p>

                          {st.key === 'done' && (
                            <div className="mt-3 space-y-2">
                              {devices.map((d) => (
                                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] px-3 py-2">
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[12.5px] text-[color:var(--oc-ink)]">{d.name}</span>
                                    <span className="block font-mono text-[11px] text-[color:var(--oc-muted)]">
                                      {d.prefix}…{d.lastUsedAt ? ' · used' : ' · never used'}
                                    </span>
                                  </span>
                                  <button onClick={() => revoke(d.id)}
                                    className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-[color:var(--oc-red)] transition hover:bg-[color:var(--oc-red)]/10">
                                    Revoke
                                  </button>
                                </div>
                              ))}

                              {issued && (
                                <div className="rounded-xl border border-[color:var(--oc-green-d)]/40 bg-[color:var(--oc-bg)] p-3">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--oc-green-d)]">
                                    Copy this now — it is shown once
                                  </div>
                                  <p className="mt-1.5 break-all font-mono text-[11.5px] text-[color:var(--oc-ink)]">{issued}</p>
                                </div>
                              )}
                              {err && <p className="text-[12px] text-[color:var(--oc-red)]">{err}</p>}

                              <button onClick={issueDevice} disabled={busy}
                                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--oc-green-d)] px-3.5 py-2 text-[12.5px] font-semibold text-[#0d1117] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                New device key
                              </button>
                            </div>
                          )}

                          {now && st.key !== 'done' && (
                            <Link href="/connect"
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--oc-green-d)] px-3.5 py-2 text-[12.5px] font-semibold text-[#0d1117] transition hover:opacity-90 active:scale-[0.98]">
                              Continue
                            </Link>
                          )}
                        </div>

                        {done && (
                          <span className="shrink-0 text-[12px] font-medium text-[color:var(--oc-muted)]">Done</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── how-tos, pinned beside the steps ── */}
              <div className="space-y-3 lg:sticky lg:top-8 lg:self-start">
                {CONNECT_HOWTO.map((h, i) => (
                  <div key={h.title} className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
                    <div className="flex items-center gap-2">
                      {i === 0
                        ? <Search className="h-4 w-4 text-[color:var(--oc-green-d)]" strokeWidth={2} />
                        : <KeyRound className="h-4 w-4 text-[color:var(--oc-green-d)]" strokeWidth={2} />}
                      <span className="text-[14px] font-semibold text-[color:var(--oc-ink)]">{h.title}</span>
                    </div>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                      {h.steps.map((s) => (
                        <li key={s} className="text-[12.5px] leading-relaxed text-[color:var(--oc-text)]">{s}</li>
                      ))}
                    </ol>
                    {h.gotcha && (
                      <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-[color:var(--oc-amber)]">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {h.gotcha}
                      </p>
                    )}
                  </div>
                ))}

                <div className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--oc-muted)]">
                    Scopes to tick
                  </div>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-[color:var(--oc-text)]">
                    {REQUIRED_SCOPES.join('  ·  ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
