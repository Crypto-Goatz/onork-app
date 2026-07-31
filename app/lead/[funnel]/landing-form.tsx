'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function LandingForm({ funnelId }: { funnelId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [utm, setUtm] = useState<Record<string, string>>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const captured = {
      utm_source: params.get('utm_source') || 'linkedin',
      utm_medium: params.get('utm_medium') || 'social',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      linkedin_source: params.get('src') || 'post',
    }
    sessionStorage.setItem(`utm:${funnelId}`, JSON.stringify(captured))
    setUtm(captured)
  }, [funnelId])

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
          funnel_id: funnelId,
          ...utm,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Something went wrong. Try again.')
        return
      }
      sessionStorage.setItem(`sub_id:${funnelId}`, data.subscriber_id)
      router.push(`/lead/${funnelId}/check-email`)
    } catch {
      setErr('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="ln-name" className="mb-1 block text-xs font-semibold text-white/60">
          First name
        </label>
        <input
          id="ln-name"
          required
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none backdrop-blur transition-colors focus:border-[#7ed957]/50"
        />
      </div>
      <div>
        <label htmlFor="ln-email" className="mb-1 block text-xs font-semibold text-white/60">
          Email address
        </label>
        <input
          id="ln-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none backdrop-blur transition-colors focus:border-[#7ed957]/50"
        />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#7ed957] py-3.5 text-[15px] font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
      >
        {submitting ? 'Sending…' : 'Send me the free guide →'}
      </button>
    </form>
  )
}
