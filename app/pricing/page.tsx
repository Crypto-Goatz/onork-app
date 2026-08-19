import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Crown,
  Layers,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { TIERS } from '@/lib/pricing'
import { SITE, faqPage, graph, jsonLdScript } from '@/lib/seo/jsonld'
import AnimatedGrid from '@/components/animated-grid'
import AnimatedConnectors from '@/components/animated-connectors'
import PricingComparison from '@/components/pricing/PricingComparison'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: '0nCore Pricing — One platform. Every capability.',
  description:
    '1,598 tools across 106 services. Visual automation builder. AI agent crews. Course builder. Lead magnet loop. From $0 to enterprise — pick your tier.',
  openGraph: {
    title: '0nCore Pricing — Every capability, one platform',
    description: 'From $0 to enterprise. The full 0nMCP v4.10 stack — UCP, Marketplace, Course Builder, App Builder, Website Builder, SaaS Factory, and the Agentic Automation Generator.',
    url: `${SITE}/pricing`,
  },
  alternates: { canonical: `${SITE}/pricing` },
}

export const dynamic = 'force-static'
export const revalidate = 3600

const TIER_ICON: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  free: { icon: Sparkles, color: '#94a3b8' },
  starter: { icon: Zap, color: '#7ed957' },
  pro: { icon: Rocket, color: '#00d4ff' },
  agency: { icon: Users, color: '#a78bfa' },
  enterprise: { icon: Crown, color: '#f59e0b' },
}

const COMPARE_ROWS = [
  { name: 'HubSpot Starter', price: '$20/seat', sub: 'CRM only' },
  { name: 'Make.com Pro', price: '$29/mo', sub: 'Workflows only' },
  { name: 'Bubble.io Pro', price: '$134/mo', sub: 'App builder only' },
  { name: 'Retool Team', price: '$50/seat', sub: 'Internal tools only' },
  { name: 'CrewAI Cloud', price: '$99/mo', sub: 'Agents only' },
]

const PILLARS = [
  {
    icon: Layers,
    title: '1,598 tools',
    desc: 'Every API, every service, one orchestrator. Auto-imported credentials, zero glue work.',
    color: '#7ed957',
  },
  {
    icon: Rocket,
    title: '9 capability families',
    desc: 'UCP, Marketplace, Course Builder, Lead Magnet Loop, Automation, App Factory, SaaS Factory, Website Factory, Agentic Generator.',
    color: '#00d4ff',
  },
  {
    icon: ShieldCheck,
    title: '5 patents pending',
    desc: 'Vault Containers, Three-Level Execution, Seal of Truth — defensible IP, not vapor.',
    color: '#a78bfa',
  },
]

const PRICING_FAQ = [
  {
    q: 'Is the Free tier actually free forever?',
    a: 'Yes. 0nMCP itself is open source — npm i 0nmcp. The Free tier on 0nCore stays free as long as you stay under 100 monthly tool executions.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — no annual lock-in. Stripe-hosted billing portal handles cancel/upgrade/downgrade in two clicks.',
  },
  {
    q: 'Can I bring my own MCP servers?',
    a: 'Yes. The admin-side custom-connector ships in v4.10. Drop in your own MCP server and 0nCore registers it alongside the catalog.',
  },
  {
    q: 'Is 0nCore live?',
    a: 'Yes — 0nCore launched May 1, 2026. Sign up free and start building today.',
  },
  {
    q: 'Refund policy?',
    a: '30-day money-back, no questions asked. Email mike@rocketopp.com.',
  },
  {
    q: 'How does the metered overage work?',
    a: 'Each tier has a soft monthly cap on tool executions. Going over auto-bills $0.10/execution — or you can upgrade in one click.',
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#020810] text-white">
      <script
        {...jsonLdScript(
          graph(
            {
              '@type': 'Product',
              name: '0nCore',
              description:
                '1,598 tools across 106 services. Visual automation builder. AI agent crews. From $0 to enterprise.',
              brand: { '@type': 'Brand', name: '0nORK' },
              url: `${SITE}/pricing`,
              // EVERY tier, free included. The free tier was filtered out, which
              // made the cheapest advertised price $47 — the one number the whole
              // site is built to contradict. An Offer at 0 is valid and is what a
              // price-range rich result reads.
              offers: TIERS.filter((t) => t.priceCents !== null).map((t) => ({
                '@type': 'Offer',
                name: `0nCore ${t.name}`,
                price: ((t.priceCents ?? 0) / 100).toFixed(2),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: `${SITE}/pricing#${t.slug}`,
              })),
            },
            // BreadcrumbList comes from the root layout (SiteBreadcrumbJsonLd),
            // sitewide — not restated here.
            faqPage(PRICING_FAQ),
          ),
        )}
      />

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <AnimatedGrid />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[140px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[20%] right-[10%] h-[400px] w-[400px] rounded-full bg-[#00d4ff]/[0.05] blur-[120px]"
        />

        <div className="relative mx-auto max-w-5xl px-4 pt-28 pb-16 text-center sm:px-6 lg:px-8 lg:pt-36 lg:pb-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ed957] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7ed957]" />
            </span>
            Live now · Start free, upgrade anytime
          </div>

          <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              One platform.
            </span>
            <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Every capability.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
            1,598 tools across 106 services. Visual automation builder. AI agent crews via CrewAI.
            Course builder. Lead magnet loop. <strong className="text-white">All on one bill.</strong>
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#tiers"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
            >
              Compare tiers
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
            >
              Start free
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { v: '1,598', l: 'Tools' },
              { v: '106', l: 'Services' },
              { v: '9', l: 'Capability families' },
              { v: '$0', l: 'Setup cost' },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-4 text-center backdrop-blur"
              >
                <div className="font-mono text-2xl font-black tabular-nums sm:text-3xl">
                  <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                    {s.v}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Why this exists (pillars) ═══════════════════════════════ */}
      <section className="relative overflow-hidden border-y border-white/5 bg-white/[0.015]">
        <AnimatedConnectors intensity={0.22} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-white/15 font-mono text-[10px] uppercase tracking-widest text-white/65">
              What you're paying for
            </Badge>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                The most capability per dollar in software.
              </span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
            {PILLARS.map((p) => {
              const Icon = p.icon
              return (
                <Card key={p.title} className="border-white/10 bg-white/[0.02] backdrop-blur">
                  <CardHeader>
                    <div
                      className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border bg-[#0d1117]"
                      style={{ borderColor: `${p.color}40`, boxShadow: `0 0 28px ${p.color}25` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: p.color }} />
                    </div>
                    <CardTitle className="text-xl text-white">{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-white/65">{p.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ Tier grid ═══════════════════════════════════════════════ */}
      <section id="tiers" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-white/15 font-mono text-[10px] uppercase tracking-widest text-white/65">
            Pick your tier
          </Badge>
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              From solo to enterprise.
            </span>
          </h2>
        </div>

        {(() => {
          const topTiers = TIERS.filter((t) => ['free', 'starter', 'pro'].includes(t.slug))
          const bottomTiers = TIERS.filter((t) => ['agency', 'enterprise'].includes(t.slug))

          const renderTier = (tier: typeof TIERS[number]) => {
            const accent = TIER_ICON[tier.slug] ?? TIER_ICON.starter
            const Icon = accent.icon
            return (
              <div
                key={tier.slug}
                id={tier.slug}
                className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 backdrop-blur transition-colors ${
                  tier.highlight
                    ? 'border-[#7ed957]/50 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.04] ring-1 ring-[#7ed957]/30'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]'
                }`}
              >
                {tier.highlight && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 left-1/2 h-[200px] w-[200px] -translate-x-1/2 rounded-full bg-[#7ed957]/15 blur-[80px]"
                  />
                )}

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[#0d1117]"
                      style={{ borderColor: `${accent.color}40`, boxShadow: `0 0 20px ${accent.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: accent.color }} />
                    </div>
                    {tier.highlight && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#7ed957]/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7ed957]">
                        Most popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black tracking-tight">{tier.name}</h3>
                  <p className="mt-1 text-sm text-white/55">{tier.tagline}</p>

                  <div className="mt-5 mb-5">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-4xl font-black ${
                          tier.highlight
                            ? 'bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent'
                            : 'text-white'
                        }`}
                      >
                        {tier.price}
                      </span>
                      {tier.cadence && (
                        <span className="text-sm text-white/55">{tier.cadence}</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-white/[0.02] p-3 text-[11px]">
                    {tier.limits.map((l) => (
                      <div key={l.tag}>
                        <div className="font-mono uppercase tracking-wider text-white/40">{l.tag}</div>
                        <div className="font-mono font-semibold text-white">{l.value}</div>
                      </div>
                    ))}
                  </div>

                  {tier.ctaHref.startsWith('mailto:') ? (
                    <a
                      href={tier.ctaHref}
                      className={`mb-5 inline-flex w-full items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                        tier.highlight
                          ? 'bg-[#7ed957] text-black shadow-[0_0_24px_rgba(126,217,87,0.35)] hover:bg-[#7ed957]/90'
                          : 'border border-white/15 hover:border-white/40'
                      }`}
                    >
                      {tier.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Link
                      href={tier.ctaHref}
                      className={`mb-5 inline-flex w-full items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                        tier.highlight
                          ? 'bg-[#7ed957] text-black shadow-[0_0_24px_rgba(126,217,87,0.35)] hover:bg-[#7ed957]/90'
                          : 'border border-white/15 hover:border-white/40'
                      }`}
                    >
                      {tier.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}

                  <ul className="space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent.color }} />
                        <span className={f.startsWith('Everything in') ? 'font-semibold text-white/85' : 'text-white/70'}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          }

          return (
            <>
              {/* Top row — Free / Starter / Pro */}
              <div className="grid gap-5 lg:grid-cols-3">
                {topTiers.map(renderTier)}
              </div>

              {/* Bottom row — Agency / Enterprise */}
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {bottomTiers.map(renderTier)}
              </div>
            </>
          )
        })()}
      </section>

      {/* ═══ Full feature comparison matrix ══════════════════════════ */}
      <PricingComparison />

      {/* ═══ Replaces this stack ═════════════════════════════════════ */}
      <section className="relative overflow-hidden border-y border-white/5 bg-white/[0.015]">
        <AnimatedConnectors intensity={0.18} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-white/15 font-mono text-[10px] uppercase tracking-widest text-white/65">
              What it replaces
            </Badge>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Pro at $97 replaces all of these.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">
              Five tools, five logins, five bills. Or one 0nCore. Math's the same either way.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {COMPARE_ROWS.map((row) => (
              <div
                key={row.name}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur"
              >
                <p className="text-sm font-semibold text-white/85">{row.name}</p>
                <p className="mt-2 font-mono text-lg font-black text-white/45 line-through">{row.price}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">{row.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-[#7ed957]/30 bg-[#7ed957]/[0.04] px-6 py-4 backdrop-blur">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[#0d1117]"
                style={{ borderColor: '#7ed95740', boxShadow: '0 0 24px rgba(126,217,87,0.25)' }}
              >
                <Rocket className="h-5 w-5 text-[#7ed957]" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#7ed957]">0nCore Pro</p>
                <p className="text-lg font-black">
                  <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                    $97/mo
                  </span>
                  <span className="ml-2 text-sm font-normal text-white/55">— all of the above + 9 more</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-4 border-white/15 font-mono text-[10px] uppercase tracking-widest text-white/65">
            Common questions
          </Badge>
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Quick answers.
            </span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PRICING_FAQ.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur transition-colors hover:border-white/20"
            >
              <p className="font-semibold text-white">{f.q}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Final CTA ═══════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.05] backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/10 blur-[120px]"
          />
          <CardContent className="relative px-6 py-12 text-center sm:px-12 sm:py-16">
            <Badge variant="outline" className="mb-4 border-[#7ed957]/30 bg-[#7ed957]/8 font-mono text-[10px] uppercase tracking-widest text-[#7ed957]">
              Live now
            </Badge>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Start building today.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/65 sm:text-base">
              The full v4.10 stack is live — UCP, Marketplace, Course Builder, App Builder,
              Website Builder, SaaS Factory, and the Agentic Automation Generator.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
              >
                Browse marketplace
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
