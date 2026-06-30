'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles, ArrowRight, AlertTriangle, AlertCircle, Info, TrendingUp, Loader2, Sun,
} from 'lucide-react'

type Issue = { severity: 'critical' | 'warning' | 'info'; title: string; detail: string; href?: string; cta?: string }
type Highlight = { label: string; value: string; sub?: string }
type Recap = { businessName: string; date: string; summary: string; highlights: Highlight[]; issues: Issue[]; actions: { title: string; href: string }[] }

const SEV = {
  critical: { Icon: AlertCircle, color: '#f87171', ring: 'border-red-500/30 bg-red-500/[0.06]' },
  warning: { Icon: AlertTriangle, color: '#fbbf24', ring: 'border-amber-500/30 bg-amber-500/[0.06]' },
  info: { Icon: Info, color: '#00d4ff', ring: 'border-[#00d4ff]/30 bg-[#00d4ff]/[0.06]' },
} as const

export default function RecapPage() {
  const router = useRouter()
  const [recap, setRecap] = useState<Recap | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/recap')
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setRecap(d) })
      .catch(() => setErr('Could not load your briefing'))
  }, [])

  function dismiss() {
    const today = new Date().toISOString().slice(0, 10)
    document.cookie = `recap_seen=${today}; path=/; max-age=90000; samesite=lax`
    fetch('/api/recap', { method: 'POST' }).catch(() => {})
    router.push('/dashboard')
  }

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#020810] text-white">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
      <div className="relative mx-auto max-w-3xl px-6 py-16">
        {!recap && !err && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#7ed957]" />
            <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-white/45">Generating your daily briefing…</p>
          </div>
        )}

        {err && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <p className="text-white/60">{err}</p>
            <button onClick={dismiss} className="mt-5 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810]">Continue to dashboard</button>
          </div>
        )}

        {recap && (
          <>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
              <Sun className="h-3.5 w-3.5" /> Daily briefing · {recap.date}
            </div>
            <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              {greeting}{recap.businessName ? <>, <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">{recap.businessName}</span></> : ''}.
            </h1>

            {/* AI summary */}
            <div className="mt-6 flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#7ed957]/40 bg-[#0d1117]"><Sparkles className="h-[18px] w-[18px] text-[#7ed957]" /></div>
              <p className="text-[15px] leading-relaxed text-white/85">{recap.summary}</p>
            </div>

            {/* highlights */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recap.highlights.map((h) => (
                <div key={h.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="text-3xl font-black tracking-tight text-white">{h.value}</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/55">{h.label}</div>
                  {h.sub && <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-white/35">{h.sub}</div>}
                </div>
              ))}
            </div>

            {/* issues */}
            {recap.issues.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/45">Needs your attention</h2>
                <div className="space-y-2.5">
                  {recap.issues.map((i, idx) => {
                    const s = SEV[i.severity]
                    return (
                      <div key={idx} className={`flex items-start gap-3 rounded-xl border p-4 ${s.ring}`}>
                        <s.Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: s.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white">{i.title}</div>
                          <div className="mt-0.5 text-sm text-white/65">{i.detail}</div>
                        </div>
                        {i.href && (
                          <Link href={i.href} className="shrink-0 self-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/30">
                            {i.cta || 'Fix'}
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {recap.issues.length === 0 && (
              <div className="mt-8 flex items-center gap-2 rounded-xl border border-[#7ed957]/25 bg-[#7ed957]/[0.05] p-4 text-sm text-white/80">
                <TrendingUp className="h-5 w-5 text-[#7ed957]" /> No issues detected — your account is healthy.
              </div>
            )}

            {/* CTA */}
            <div className="mt-10 flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {recap.actions.map((a) => (
                  <Link key={a.title} href={a.href} className="rounded-lg border border-white/15 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/75 transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">{a.title}</Link>
                ))}
              </div>
              <button onClick={dismiss} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_28px_rgba(126,217,87,0.3)] transition-transform hover:scale-[1.03]">
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
