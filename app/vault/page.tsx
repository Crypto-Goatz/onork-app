'use client'

/**
 * The vault door — served at vault.0ncore.com (Mike's ruling, 2026-08-23:
 * www is the user front end, /dashboard is LEGACY and must not be extended,
 * and this is THE ONE door for connecting an app).
 *
 * It is one page on purpose. The subdomain root is the only path middleware
 * rewrites here, so there is no second surface to keep in sync and no matcher
 * entry to forget — the failure mode that has 404'd new pages on the app host
 * twice. A service that needs its own step gets a panel, not a route.
 *
 * WHAT IS SHOWN IS WHAT IS STORED. The connected list comes from
 * `on_connections` — the same rows 0nMCP and the hosted apps resolve against —
 * not from a second table that might disagree. An unconfigured or unreadable
 * vault says so in words rather than rendering an empty, confident "nothing
 * connected".
 */
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, ExternalLink, KeyRound,
  Loader2, Plug, ShieldCheck, Trash2,
} from 'lucide-react'

interface VaultConn {
  service: string
  label: string | null
  kind: string
  status: string
  lastVerifiedAt: string | null
}

interface VaultState {
  authed: boolean
  firstName?: string
  vaultConfigured?: boolean
  connections: VaultConn[]
  note?: string
  error?: string
}

interface GroqStatus {
  authenticated: boolean
  hasOwnKey: boolean
  source: 'user' | 'platform'
  exhausted: boolean
  ownKeyPreview?: string
  quota?: { limit: number; used: number; remaining: number; plan: string; month: string }
}

/** Titles for services the vault already knows how to hold. */
const SERVICE_NAMES: Record<string, string> = {
  groq: 'Groq',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  stripe: 'Stripe',
  slack: 'Slack',
  google: 'Google',
}

const title = (service: string) =>
  SERVICE_NAMES[service] ?? service.charAt(0).toUpperCase() + service.slice(1)

export default function VaultPage() {
  const [vault, setVault] = useState<VaultState | null>(null)
  const [groq, setGroq] = useState<GroqStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const [v, g] = await Promise.all([
      fetch('/api/vault/connections', { cache: 'no-store', credentials: 'same-origin' })
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/connections/groq/status', { cache: 'no-store', credentials: 'same-origin' })
        .then((r) => r.json())
        .catch(() => null),
    ])
    setVault(v)
    setGroq(g)
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function saveGroq() {
    if (!apiKey.trim()) {
      setMsg({ kind: 'err', text: 'Paste your Groq API key first.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/connections/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setMsg({ kind: 'err', text: data.error || `HTTP ${res.status}` })
        return
      }
      setApiKey('')
      setMsg({ kind: 'ok', text: 'Verified against Groq and stored encrypted in your vault.' })
      await load()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setBusy(false)
    }
  }

  async function disconnectGroq() {
    if (!confirm('Remove your Groq key from the vault? AI features fall back to the shared platform allowance.')) return
    setBusy(true)
    try {
      await fetch('/api/connections/groq', { method: 'DELETE', credentials: 'same-origin' })
      await load()
      setMsg({ kind: 'ok', text: 'Disconnected. The shared monthly allowance applies again.' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0d1117]">
        <Loader2 className="h-7 w-7 animate-spin text-[#6EE05A]" />
      </div>
    )
  }

  // Middleware gates this host, so an unauthed render means the session cookie
  // did not arrive (a different apex, or cookies blocked). Say that plainly
  // instead of showing an empty vault.
  if (!vault?.authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0d1117] px-6 text-center text-white">
        <div>
          <ShieldCheck className="mx-auto h-9 w-9 text-[#6EE05A]" />
          <h1 className="mt-5 text-2xl font-semibold">Sign in to open your vault</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
            The vault holds your connected apps and keys. It never renders without a session.
          </p>
          <a
            href="/login?next=/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-6 py-3 text-sm font-semibold text-[#062312]"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    )
  }

  const conns = vault.connections ?? []
  const others = conns.filter((c) => c.service !== 'groq')

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-white/10 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-[860px]">
          <span className="text-lg font-extrabold tracking-tight">
            0n<span className="text-[#6EE05A]">Vault</span>
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Hi, {vault.firstName}. Connect an app.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Connect it once here and every 0n product uses it — 0nCore, 0nTask, CRO9, 0nMCP.
            Keys are encrypted at rest and every read is audited.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-6 py-8 md:px-10">
        {vault.vaultConfigured === false && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-4 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{vault.note}</p>
          </div>
        )}
        {vault.error && (
          <div className="mb-6 flex gap-3 rounded-xl border border-red-400/30 bg-red-400/[0.07] p-4 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The vault is configured but could not be read, so this list is incomplete —
              it is <strong>not</strong> proof that nothing is connected. {vault.error}
            </p>
          </div>
        )}

        {/* ── Groq: the one connect flow that is live end to end ── */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#6EE05A]/15 text-[#6EE05A]">
              <KeyRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">Groq — your AI key</h2>
                {groq?.hasOwnKey ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#6EE05A]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6EE05A]">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    Not connected
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-white/55">
                Free, no credit card, about a minute. With your own key every AI feature runs on
                your Groq account instead of the shared platform allowance.
              </p>

              {groq?.hasOwnKey ? (
                <div className="mt-4">
                  <p className="text-sm text-white/70">
                    Key on file: <code className="font-mono text-white/90">{groq.ownKeyPreview || '••••'}</code>
                  </p>
                  <button
                    onClick={disconnectGroq}
                    disabled={busy}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/30 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Disconnect
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6EE05A] hover:underline"
                  >
                    Create your free Groq key <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="gsk_…"
                      autoComplete="off"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080b10] px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/25 focus:border-[#6EE05A]/50 focus:outline-none"
                    />
                    <button
                      onClick={saveGroq}
                      disabled={busy || !apiKey.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6EE05A] px-5 py-2.5 text-sm font-bold text-[#062312] transition disabled:opacity-40"
                    >
                      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <><Check className="h-4 w-4" /> Verify &amp; connect</>}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    The key is checked against Groq before it is stored. An invalid key is refused,
                    never saved.
                  </p>
                </div>
              )}

              {msg && (
                <p className={`mt-3 text-sm font-semibold ${msg.kind === 'ok' ? 'text-[#6EE05A]' : 'text-red-300'}`}>
                  {msg.text}
                </p>
              )}

              {!groq?.hasOwnKey && groq?.quota && (
                <p className="mt-3 text-xs text-white/40">
                  Running on the shared allowance: {groq.quota.used}/{groq.quota.limit} used this
                  month ({groq.quota.month}).
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Everything else already in this tenant's vault ── */}
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">
            Also in your vault
          </h2>
          {others.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/50">
              Nothing else connected yet. Groq is the only service with a self-serve connect flow
              today — the rest are wired by 0nMCP and appear here the moment they are stored.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {others.map((c) => (
                <li
                  key={c.service}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white/70">
                    <Plug className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{title(c.service)}</div>
                    <p className="truncate text-xs text-white/45">
                      {c.label || c.kind}
                      {c.lastVerifiedAt
                        ? ` · verified ${new Date(c.lastVerifiedAt).toLocaleDateString()}`
                        : ' · never verified'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      c.status === 'active'
                        ? 'bg-[#6EE05A]/15 text-[#6EE05A]'
                        : 'bg-amber-400/15 text-amber-300'
                    }`}
                  >
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-xs text-white/30">
          Your 0n key and device security live at{' '}
          <a href="/account/security" className="font-semibold text-white/50 hover:text-[#6EE05A]">
            /account/security
          </a>
          .
        </p>
      </main>
    </div>
  )
}
