'use client'

/**
 * The AI layer card — locked promise, or the switched-on state.
 *
 * LOCKED IS A PROMISE, NOT A WALL. Same rule as the /x door and the Hub tiles:
 * it says what the layer does, what it costs, and the one action that turns it
 * on. A padlock and a greyed box teaches a visitor only that the product is
 * bigger than what they bought.
 *
 * THE PRICE IS PASSED IN, NEVER WRITTEN HERE. It comes from lib/client-tiers
 * through the server component, so the $5/$10 that Mike ratifies changes this
 * card without this file being touched.
 *
 * INSUFFICIENT FUNDS IS ANSWERED IN PLACE. The wallet is on the same page, so
 * a 402 says "add credits" and points at it rather than sending anyone away.
 */
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Sparkles, Lock, ArrowRight, AlertTriangle, Check } from 'lucide-react'

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function AiLayerCard({
  locationId, owned, verified, tierName, tagline, includes, deltaCents, priceCents, cadence, testModeReason,
}: {
  locationId: string
  owned: boolean
  /** false = the plan read failed. Neither "owned" nor "not owned" is claimed. */
  verified: boolean
  tierName: string
  tagline: string
  includes: string[]
  deltaCents: number
  priceCents: number
  cadence: string
  testModeReason: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function upgrade() {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(locationId)}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `${Date.now()}` }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'The upgrade did not go through.'); return }
      setDone(true)
      // The server is the truth about entitlement state; re-render from it
      // rather than flipping the card optimistically.
      router.refresh()
    } catch {
      setError('The request did not reach the server. Nothing was charged.')
    } finally {
      setBusy(false)
    }
  }

  if (!verified) {
    return (
      <section className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06] p-6">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white/85">
          <AlertTriangle className="h-4 w-4 text-[#f59e0b]" /> We could not check the AI layer
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          The plan read failed, so this card will not offer an upgrade that might already be bought. Reload in a moment.
        </p>
      </section>
    )
  }

  if (owned) {
    return (
      <section className="rounded-xl border border-[#6EE05A]/25 bg-[#6EE05A]/[0.05] p-6">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white/90">
          <Sparkles className="h-4 w-4 text-[#6EE05A]" /> {tierName} — on
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{tagline}</p>
        <ul className="mt-4 space-y-1.5">
          {includes.map((line) => (
            <li key={line} className="flex items-start gap-2 text-xs text-white/55">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#6EE05A]" /> {line}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="flex items-center gap-2 text-sm font-medium text-white/85">
        <Lock className="h-4 w-4 text-white/40" /> {tierName}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/55">{tagline}</p>

      <ul className="mt-4 space-y-1.5">
        {includes.map((line) => (
          <li key={line} className="flex items-start gap-2 text-xs text-white/45">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/25" /> {line}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={upgrade}
          disabled={busy || done}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Switching on…' : done ? 'Switched on' : `Switch it on — ${usd(deltaCents)} more`}
          {!busy && !done && <ArrowRight className="h-4 w-4" />}
        </button>
        <span className="text-xs text-white/40">
          Takes this client to {usd(priceCents)} {cadence}
        </span>
      </div>

      {testModeReason && (
        <p className="mt-4 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[#f59e0b]">
          {testModeReason}
        </p>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#f59e0b]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </section>
  )
}
