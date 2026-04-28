import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ArrowRight, Sparkles } from 'lucide-react'
import { TIERS } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Pricing — 0nCore',
  description:
    '1,598 tools across 106 services. Automation builder. AI agent crews. Course builder. Lead magnet loop. From $0 to enterprise — pick your tier.',
  openGraph: {
    title: '0nCore Pricing — Every capability, one platform',
    description: 'From $0 to enterprise. The full 0nMCP stack with the May 1, 2026 v4.10 release.',
    url: 'https://0ncore.com/pricing',
  },
}

export const dynamic = 'force-static'
export const revalidate = 3600

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-14 text-center max-w-3xl mx-auto">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#7ed957]/40 bg-[#7ed957]/10 px-3 py-1 text-xs font-semibold text-[#7ed957]">
            <Sparkles className="h-3 w-3" />
            Public availability May 1, 2026
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
            One platform.<br />
            <span className="text-[#7ed957]">Every capability.</span>
          </h1>
          <p className="text-lg leading-relaxed text-white/65">
            1,598 tools across 106 services. Visual automation builder. AI agent crews via CrewAI.
            Course builder. Lead magnet loop. Free MCP server marketplace. All on one bill.
          </p>
        </div>

        {/* Tier grid */}
        <div className="grid gap-5 lg:grid-cols-5">
          {TIERS.map((tier) => (
            <div
              key={tier.slug}
              className={`flex flex-col rounded-2xl border p-6 transition-colors ${
                tier.highlight
                  ? 'border-[#7ed957]/50 bg-[#7ed957]/[0.03] ring-1 ring-[#7ed957]/30'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]'
              }`}
            >
              {tier.highlight && (
                <div className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#7ed957]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7ed957]">
                  Most popular
                </div>
              )}

              <div className="mb-2">
                <h2 className="text-2xl font-bold">{tier.name}</h2>
                <p className="mt-1 text-sm text-white/55">{tier.tagline}</p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.cadence && (
                    <span className="text-sm text-white/55">{tier.cadence}</span>
                  )}
                </div>
              </div>

              {/* Limits row */}
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-white/[0.02] p-3 text-[11px]">
                {tier.limits.map((l) => (
                  <div key={l.tag}>
                    <div className="text-white/40 uppercase tracking-wider">{l.tag}</div>
                    <div className="font-mono font-semibold text-white">{l.value}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {tier.ctaHref.startsWith('mailto:') ? (
                <a
                  href={tier.ctaHref}
                  className={`mb-5 inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    tier.highlight
                      ? 'bg-[#7ed957] text-black hover:bg-[#7ed957]/90'
                      : 'border border-white/15 hover:border-white/40'
                  }`}
                >
                  {tier.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className={`mb-5 inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    tier.highlight
                      ? 'bg-[#7ed957] text-black hover:bg-[#7ed957]/90'
                      : 'border border-white/15 hover:border-white/40'
                  }`}
                >
                  {tier.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}

              {/* Features */}
              <ul className="space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7ed957]" />
                    <span className={f.startsWith('Everything in') ? 'font-semibold text-white/80' : 'text-white/70'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#7ed957]">
              The numbers
            </h3>
            <ul className="space-y-1.5 text-sm text-white/65">
              <li>
                <span className="font-bold text-white">1,598</span> tools across{' '}
                <span className="font-bold text-white">106</span> services
              </li>
              <li>
                <span className="font-bold text-white">9</span> capability families in v4.10
              </li>
              <li>
                <span className="font-bold text-white">5</span> patents pending
              </li>
              <li>
                Free + open source: <code className="text-[#7ed957]">npm i 0nmcp</code>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#7ed957]">
              What you save
            </h3>
            <ul className="space-y-1.5 text-sm text-white/65">
              <li>HubSpot Starter: <span className="line-through opacity-50">$20/mo</span> per seat</li>
              <li>Make.com Pro: <span className="line-through opacity-50">$29/mo</span></li>
              <li>Bubble.io Pro: <span className="line-through opacity-50">$134/mo</span></li>
              <li>Retool Team: <span className="line-through opacity-50">$50/seat</span></li>
              <li className="pt-1.5 border-t border-white/10 mt-2">
                <span className="font-bold text-white">Pro at $97</span> replaces all of these.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#7ed957]">
              FAQ
            </h3>
            <ul className="space-y-2 text-xs text-white/65">
              <li>
                <span className="font-semibold text-white">Free forever?</span> Yes. 0nMCP itself is open source.
              </li>
              <li>
                <span className="font-semibold text-white">Cancel anytime?</span> Yes. No annual lock-in.
              </li>
              <li>
                <span className="font-semibold text-white">Custom MCP servers?</span> Bring your own — admin-side connector ships in v4.10.
              </li>
              <li>
                <span className="font-semibold text-white">Refund policy?</span> 30-day money-back, no questions.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#7ed957]/[0.04] to-transparent p-10 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight">
            Public launch May 1, 2026.
          </h2>
          <p className="mb-6 text-white/65">
            Register for early access — get day-one onboarding and a permanent founder rate.
          </p>
          <Link
            href="/early-access"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7ed957] px-7 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Register for early access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
