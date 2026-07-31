'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, Upload, AlertTriangle, ArrowRight } from 'lucide-react'

function SubmitInner() {
  const params = useSearchParams()
  const sessionId = params.get('session_id') || ''

  const [status, setStatus] = useState<any>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [err, setErr] = useState('')

  async function loadStatus() {
    if (!sessionId) return
    const r = await fetch(`/api/services/stack-scan/submit?session_id=${encodeURIComponent(sessionId)}`)
    setStatus(await r.json())
  }
  useEffect(() => { loadStatus() }, [sessionId])

  // Poll progress after submission until complete
  useEffect(() => {
    if (!result || result.done) return
    const t = setInterval(loadStatus, 8000)
    return () => clearInterval(t)
  }, [result])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setText(await f.text())
  }

  async function submit() {
    setErr(''); setSubmitting(true)
    try {
      const r = await fetch('/api/services/stack-scan/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, text }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j.error || 'Submission failed'); return }
      setResult(j); loadStatus()
    } catch { setErr('Network error') } finally { setSubmitting(false) }
  }

  const card = 'rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur sm:p-10'

  if (!sessionId) {
    return <Shell><div className={card}><p className="text-white/70">Missing checkout session. Start from the <a href="/stack-scan" className="text-[#7ed957] underline">scan page</a>.</p></div></Shell>
  }
  if (status && status.paid === false) {
    return <Shell><div className={card}><div className="flex items-center gap-2 text-amber-400"><AlertTriangle className="h-5 w-5" /> Payment not found for this session yet.</div><p className="mt-2 text-sm text-white/55">If you just paid, give it a moment and refresh.</p></div></Shell>
  }

  const allowance = status?.contactsPaid ?? 1500
  const scanned = status?.scanned ?? 0
  const total = status?.total ?? 0
  const done = status?.status === 'complete'

  return (
    <Shell>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
        <CheckCircle2 className="h-3.5 w-3.5" /> Payment confirmed
      </div>
      <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
        <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">Submit your list.</span>
      </h1>
      <p className="mt-3 text-white/70">You're covered for up to <strong className="text-white">{allowance.toLocaleString()}</strong> sites. Paste URLs (one per line) or upload a CSV.</p>

      {!result ? (
        <div className={`mt-8 ${card}`}>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={10}
            placeholder={'example.com\nhttps://acme.io\nclinic-website.com'}
            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-[#7ed957]/50"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#7ed957]/40">
              <Upload className="h-4 w-4" /> Upload CSV
              <input type="file" accept=".csv,.txt" onChange={onFile} className="hidden" />
            </label>
            {err && <span className="text-sm text-red-400">{err}</span>}
            <button onClick={submit} disabled={submitting || !text.trim()} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-6 py-2.5 text-sm font-bold text-[#020810] shadow-[0_0_24px_rgba(126,217,87,0.35)] disabled:opacity-50">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : <>Start scanning <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      ) : (
        <div className={`mt-8 ${card}`}>
          <div className="flex items-center gap-3">
            {done ? <CheckCircle2 className="h-6 w-6 text-[#7ed957]" /> : <Loader2 className="h-6 w-6 animate-spin text-[#00d4ff]" />}
            <div>
              <div className="text-lg font-black text-white">{done ? 'Scan complete' : 'Scanning in progress'}</div>
              <div className="text-sm text-white/55">{scanned.toLocaleString()} / {total.toLocaleString()} sites scanned{result.overageDropped ? ` · ${result.overageDropped} over allowance dropped` : ''}</div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7ed957] to-[#00d4ff] transition-all" style={{ width: `${total ? Math.round((scanned / total) * 100) : 0}%` }} />
          </div>
          <p className="mt-4 text-sm text-white/60">{done ? 'Your full report is ready — we\'ll also email it to you.' : 'The rest process automatically (about 1,500 sites/hour). This page updates live; you can also close it and we\'ll email the report.'}</p>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[140px]" />
        <div className="relative mx-auto max-w-2xl px-6 py-24">{children}</div>
      </section>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<Shell><Loader2 className="h-6 w-6 animate-spin text-white/40" /></Shell>}>
      <SubmitInner />
    </Suspense>
  )
}
