'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

export function EarlyAccessForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/lead-magnet/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          funnel_id: 'early-access',
          utm_source: 'early-access-page',
          utm_medium: 'organic',
          utm_campaign: 'launch-2026-05-01',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Something went wrong')
        return
      }
      setDone(true)
    } catch {
      setErr('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-2 text-emerald-300">
          <Check className="h-5 w-5" />
          <span className="font-semibold">You&rsquo;re on the list.</span>
        </div>
        <p className="mt-2 text-sm text-emerald-100/80">
          We&rsquo;ll send your day-one onboarding link the morning of May 1, 2026.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="given-name"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] outline-none transition-colors focus:border-emerald-500/40"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] outline-none transition-colors focus:border-emerald-500/40"
        />
      </div>
      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-lg bg-emerald-500 py-3 text-[15px] font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </span>
        ) : (
          'Register for early access →'
        )}
      </button>
      <p className="mt-3 text-xs text-white/40">No spam. Unsubscribe any time.</p>
    </form>
  )
}
