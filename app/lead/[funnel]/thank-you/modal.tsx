'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface Recommendation {
  id: string
  slot_order: number
  name: string
  byline: string | null
  bio: string | null
  image_url: string | null
  cta_label: string
  is_sponsored: boolean
}

interface FunnelConfig {
  funnel_id: string
  confirmation_heading: string
  confirmation_subtext: string
  modal_theme: 'light' | 'dark'
  post_subscribe_redirect: string
}

export function RecommendationsModal({ funnelId }: { funnelId: string }) {
  const params = useSearchParams()
  const subId = params.get('sub') ?? undefined

  const [recs, setRecs] = useState<Recommendation[]>([])
  const [config, setConfig] = useState<FunnelConfig | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ redirectUrl: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lead-magnet/recommendations?funnel_id=${funnelId}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      setConfig(data.config ?? null)
      setRecs(data.recommendations ?? [])
      setSelected(new Set((data.recommendations ?? []).map((r: Recommendation) => r.id)))
    } finally {
      setLoading(false)
    }
  }, [funnelId])

  useEffect(() => {
    load()
  }, [load])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function subscribe() {
    if (!subId) {
      // No subscriber id — skip and redirect anyway
      const url = config?.post_subscribe_redirect || 'https://0ncore.com/builtwith'
      window.location.href = url
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/lead-magnet/modal-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriber_id: subId,
          selected_recommendation_ids: Array.from(selected),
        }),
      })
      const data = await res.json()
      const redirectUrl = data.redirect_url || config?.post_subscribe_redirect || 'https://0ncore.com/builtwith'
      setDone({ redirectUrl })
    } finally {
      setSubmitting(false)
    }
  }

  function skip() {
    const url = config?.post_subscribe_redirect || 'https://0ncore.com/builtwith'
    window.location.href = url
  }

  const isDark = config?.modal_theme === 'dark'

  if (loading) {
    return (
      <div className="flex h-32 w-full max-w-xl items-center justify-center rounded-2xl bg-white shadow-2xl">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (done) {
    return (
      <div className={`w-full max-w-xl rounded-2xl p-12 text-center shadow-2xl ${isDark ? 'bg-zinc-900 text-zinc-50' : 'bg-white'}`}>
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">You&rsquo;re all set!</h2>
        <p className={`mb-6 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Your free guide is on its way.
        </p>
        <button
          onClick={() => (window.location.href = done.redirectUrl)}
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Done →
        </button>
      </div>
    )
  }

  return (
    <div
      className={`w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl ${
        isDark ? 'bg-zinc-900 text-zinc-50' : 'bg-white'
      }`}
    >
      <div className="px-6 pt-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className={`mt-0.5 h-7 w-7 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
          <div>
            <h2 className="text-xl font-bold leading-tight">
              {config?.confirmation_heading ?? 'Thanks for subscribing!'}
            </h2>
            <p className={`mt-1.5 text-[14px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {config?.confirmation_subtext ?? 'These are resources I recommend. Check them out!'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end px-6 pt-3">
        <button
          onClick={deselectAll}
          className={`text-[13px] font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'} hover:underline`}
        >
          Deselect all
        </button>
      </div>

      <ul className="px-2 py-2">
        {recs.map((rec) => {
          const isSel = selected.has(rec.id)
          return (
            <li
              key={rec.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg p-4 transition-colors ${
                isSel
                  ? isDark
                    ? 'bg-emerald-950'
                    : 'bg-emerald-50'
                  : isDark
                  ? 'hover:bg-zinc-800'
                  : 'hover:bg-zinc-50'
              }`}
              onClick={() => toggle(rec.id)}
            >
              <img
                src={
                  rec.image_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.name)}`
                }
                alt={rec.name}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                {rec.is_sponsored && (
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Sponsored
                  </div>
                )}
                <div className="text-[15px] font-semibold leading-tight">{rec.name}</div>
                {rec.byline && (
                  <div className={`mt-0.5 text-[13px] font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {rec.byline}
                  </div>
                )}
                {rec.bio && (
                  <p className={`mt-1 line-clamp-2 text-[13px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {rec.bio}
                  </p>
                )}
              </div>
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => toggle(rec.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-emerald-500"
              />
            </li>
          )
        })}
      </ul>

      <div
        className={`flex items-center justify-between gap-2 border-t px-6 py-4 ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}
      >
        <span className={`text-[13px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          You can unsubscribe at any time.
        </span>
        <div className="flex gap-2">
          <button
            onClick={skip}
            className={`rounded-lg border px-4 py-2 text-[14px] font-semibold ${
              isDark
                ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Maybe Later
          </button>
          <button
            onClick={subscribe}
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-5 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400"
          >
            {submitting ? 'Subscribing…' : 'Subscribe'}
          </button>
        </div>
      </div>
    </div>
  )
}
