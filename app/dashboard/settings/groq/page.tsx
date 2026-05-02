'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, Loader2, KeyRound, Sparkles, AlertTriangle } from 'lucide-react'

interface Status {
  authenticated: boolean
  hasOwnKey: boolean
  source: 'user' | 'platform'
  exhausted: boolean
  ownKeyPreview?: string
  quota?: { limit: number; used: number; remaining: number; plan: string; month: string }
}

export default function GroqConnectPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function load() {
    const res = await fetch('/api/connections/groq/status', { cache: 'no-store' })
    if (res.ok) setStatus(await res.json())
  }

  useEffect(() => { load() }, [])

  async function save() {
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
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setMsg({ kind: 'err', text: data.error || `HTTP ${res.status}` })
        return
      }
      setMsg({ kind: 'ok', text: 'Verified and saved. You\'re unlimited from here.' })
      setApiKey('')
      await load()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!confirm('Remove your Groq key and fall back to the platform quota?')) return
    await fetch('/api/connections/groq', { method: 'DELETE' })
    await load()
    setMsg({ kind: 'ok', text: 'Disconnected. Your monthly quota now applies again.' })
  }

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-10 text-[#c9d1d9] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/25 bg-[#7ed957]/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
            <Sparkles className="h-3 w-3" />
            Groq · llama-3.3-70b
          </div>
          <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Bring your own Groq key.
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Free, unlimited AI inference for everything in 0nCore — VPIS scoring, post generation,
            scanner recommendations, automation drafting. <span className="text-white">Groq is free to sign up</span>{' '}
            and Mike doesn&apos;t see your key.
          </p>
        </div>

        {/* Current state */}
        {status && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
            {status.hasOwnKey ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#7ed957]" />
                <div>
                  <div className="text-sm font-semibold text-white">Your key is connected.</div>
                  <div className="text-xs text-white/55">
                    {status.ownKeyPreview} · unlimited tasks · billed by Groq directly
                  </div>
                </div>
                <button
                  onClick={disconnect}
                  className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-rose-500/40 hover:text-rose-300"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                    <AlertTriangle className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Running on the platform key.</div>
                    {status.quota && (
                      <div className="text-xs text-white/55">
                        Plan <span className="font-mono uppercase text-white/75">{status.quota.plan}</span>:
                        {' '}
                        {status.quota.used.toLocaleString()} / {status.quota.limit.toLocaleString()} tasks this month
                        {' · '}
                        {status.quota.remaining.toLocaleString()} remaining
                      </div>
                    )}
                  </div>
                </div>
                {status.exhausted && (
                  <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    Monthly quota reached. Connect your own key below for unlimited use, or upgrade your plan.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step-by-step */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
          <h2 className="text-xl font-bold text-white">Get a free Groq key in 60 seconds</h2>
          <ol className="mt-4 space-y-3 text-sm text-white/75">
            <li className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7ed957]/15 font-mono text-xs font-bold text-[#7ed957]">1</span>
              <span>
                Open{' '}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#7ed957] underline-offset-2 hover:underline"
                >
                  console.groq.com/keys
                  <ExternalLink className="h-3 w-3" />
                </a>
                {' '}and sign up (free, no credit card).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7ed957]/15 font-mono text-xs font-bold text-[#7ed957]">2</span>
              <span>Click <span className="font-semibold text-white">Create API Key</span>, name it &quot;0nCore&quot;, copy the <span className="font-mono text-[#7ed957]">gsk_...</span> string.</span>
            </li>
            <li className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7ed957]/15 font-mono text-xs font-bold text-[#7ed957]">3</span>
              <span>Paste it below and click <span className="font-semibold text-white">Save & verify</span>. We test it with one tiny call before storing — if Groq rejects it, nothing gets saved.</span>
            </li>
          </ol>
        </div>

        {/* Paste field */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
          <label className="block text-xs font-mono uppercase tracking-widest text-white/50">
            Groq API key
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_••••••••••••••••••••••••"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-[#0d1117] py-3 pl-9 pr-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-[#7ed957]/40 focus:outline-none focus:ring-1 focus:ring-[#7ed957]/20"
              />
            </div>
            <button
              onClick={save}
              disabled={busy || !apiKey.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_28px_rgba(126,217,87,0.35)] transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? 'Verifying…' : 'Save & verify'}
            </button>
          </div>
          {msg && (
            <div
              className={`mt-3 rounded-lg p-3 text-xs ${
                msg.kind === 'ok'
                  ? 'border border-[#7ed957]/30 bg-[#7ed957]/10 text-[#7ed957]'
                  : 'border border-rose-500/30 bg-rose-500/10 text-rose-200'
              }`}
            >
              {msg.text}
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-white/40">
            Stored encrypted in your account&apos;s <span className="font-mono">user_connections</span> row.
            Disconnect any time to fall back to the platform quota.
          </p>
        </div>
      </div>
    </div>
  )
}
