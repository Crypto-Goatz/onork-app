/**
 * /clients/new — the creation chooser: $5 bare, or $10 born with the AI layer.
 *
 * THE CHOOSER IS THE PRODUCT DECISION, AND IT IS LIVE. Both tiers render from
 * lib/client-tiers, so the amounts, the names and the bullet lists all move
 * when config moves. Nothing about the price is written into this file.
 *
 * THE CREATE BUTTON IS DELIBERATELY HELD, AND SAYS WHY. Creating the account is
 * the PIT provisioning path, and there is a standing hold on touching
 * crm-provision's live key until its open endpoints are authenticated. A
 * chooser that fired anyway would be the exact thing the hold forbids; a
 * chooser that pretended the hold did not exist would be worse. So the page
 * ships, the decision surface is real, and the button states the blocker in the
 * words of the thing that is blocked.
 *
 * The upgrade path is NOT held, and that is the point Mike made: buying the AI
 * layer later runs the same seeding as buying it at signup. An agency that
 * cannot yet create an account from here can still switch the layer on for
 * every client they already have, from the client page.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, Lock } from 'lucide-react'
import { SUBLOCATION_TIERS, usdShort, testModeReason } from '@/lib/client-tiers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Add a client — 0nCORE', robots: { index: false } }

export default function NewClientPage() {
  const testMode = testModeReason()

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <main className="mx-auto max-w-[900px] px-6 py-10 md:px-10">
        <Link href="/clients" className="inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Clients
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Add a client</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Two ways to start an account. The difference is whether the AI knows the business on day one — and
          it is five dollars.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {SUBLOCATION_TIERS.map((tier) => (
            <section
              key={tier.slug}
              className={`rounded-xl border p-6 ${
                tier.aiLayer
                  ? 'border-[#6EE05A]/30 bg-[#6EE05A]/[0.04]'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-medium text-white/90">
                  {tier.aiLayer && <Sparkles className="h-4 w-4 text-[#6EE05A]" />}
                  {tier.name}
                </h2>
                <p className="text-lg font-semibold text-white/90">
                  {usdShort(tier.priceCents)}
                  <span className="ml-1 text-xs font-normal text-white/40">{tier.cadence}</span>
                </p>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-white/55">{tier.tagline}</p>

              <ul className="mt-4 space-y-1.5">
                {tier.includes.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-white/50">
                    <Check className={`mt-0.5 h-3 w-3 shrink-0 ${tier.aiLayer ? 'text-[#6EE05A]' : 'text-white/25'}`} />
                    {line}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled
                title="Account creation is held until the provisioning service is authenticated."
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/40"
              >
                <Lock className="h-3.5 w-3.5" /> Create — held
              </button>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06] p-5">
          <h2 className="text-sm font-medium text-[#f59e0b]">Why creation is held</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            Creating an account provisions it through the CRM provisioning service, and that service has open
            endpoints that are not yet authenticated. Until they are, nothing here touches its live key —
            deliberately, because a creation surface that fires into an unauthenticated provisioner is the
            failure this hold exists to prevent. The chooser, the prices and every upgrade path are live in the
            meantime.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/60">
            Switching the AI layer on later is not a lesser product: it runs the same knowledge-base seeding
            that a {SUBLOCATION_TIERS[1].name} account gets at creation.{' '}
            <Link href="/clients" className="text-[#6EE05A] hover:underline">Do it from any client page</Link>.
          </p>
        </section>

        {testMode && (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-white/45">
            {testMode}
          </p>
        )}
      </main>
    </div>
  )
}
