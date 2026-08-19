/**
 * The locked half of the add-on door.
 *
 * LOCKED IS A PROMISE, NOT A WALL — the same rule the Hub's tiles follow. A
 * greyed box with a padlock and no sentence teaches a visitor nothing except
 * that the product is bigger than what they bought. So this page always says
 * three things: what the add-on does, why it is shut for this location, and the
 * one action that would open it.
 *
 * "WE COULD NOT CHECK" IS NOT "YOU DO NOT OWN THIS". When the entitlement read
 * itself failed, the panel says so in those words. Telling a paying customer
 * they lack access because a query timed out is how support tickets get opened
 * about billing that is perfectly fine.
 */
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Lock, AlertTriangle } from 'lucide-react'
import type { TierSlug } from '@/lib/pricing'
import { getTier } from '@/lib/pricing'

export default function AddonLocked({
  name, blurb, reason, requiredTier, locationId, verified = true, signedOut = false,
}: {
  name: string
  blurb: string
  reason: string
  requiredTier: TierSlug
  locationId?: string
  verified?: boolean
  signedOut?: boolean
}) {
  const tier = getTier(requiredTier)

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-white/10 px-6 py-6 md:px-10">
        <div className="mx-auto max-w-[900px]">
          <Link href="/hub" className="inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Hub
          </Link>
          <h1 className="mt-3 flex items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl">
            {name}
            <Lock className="h-4 w-4 text-white/30" />
          </h1>
          {blurb && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">{blurb}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-[900px] space-y-6 px-6 py-8 md:px-10">
        <section
          className={`rounded-xl border p-6 ${
            verified ? 'border-white/10 bg-white/[0.02]' : 'border-[#f59e0b]/30 bg-[#f59e0b]/[0.06]'
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-medium text-white/85">
            {verified ? <Lock className="h-4 w-4 text-white/40" /> : <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />}
            {verified ? 'Not switched on for this location' : 'We could not check your access'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{reason}</p>

          {locationId && (
            <p className="mt-4 font-mono text-xs text-white/30">Location {locationId}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {signedOut ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90"
              >
                Sign in <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90"
                >
                  {tier ? `See the ${tier.name} plan` : 'See plans'} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-white/35 hover:text-white"
                >
                  Add it to this location
                </Link>
              </>
            )}
          </div>
        </section>

        {tier && (
          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-sm uppercase tracking-widest text-white/40">
              Included from {tier.name} up
            </h2>
            <p className="mt-2 text-sm text-white/55">
              {tier.price}
              <span className="text-white/35"> {tier.cadence}</span> — {tier.tagline}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
