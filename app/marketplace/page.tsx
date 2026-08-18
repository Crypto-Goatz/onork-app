import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  BrainCog,
  ChartBar,
  CreditCard,
  Database,
  Megaphone,
  Package,
  Pencil,
  Phone,
  Settings,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import { CATEGORIES, ADDONS, PUBLIC_ADDON_COUNT, getAddonBySlug } from '@/lib/marketplace-data'
import AnimatedGrid from '@/components/animated-grid'
import AnimatedConnectors from '@/components/animated-connectors'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: '0nCore Marketplace — AI-Powered Business Add-ons',
  description:
    'Browse 31 add-ons that plug into your CRM. Voice AI, social media, email, analytics, course builder, and more. Install in one click. Pay for what you use.',
  openGraph: {
    title: '0nCore Marketplace — AI-Powered Business Add-ons',
    description:
      'Browse 31 add-ons that plug into your CRM. Install in one click. Pay for what you use.',
    url: 'https://0ncore.com/marketplace',
  },
  alternates: { canonical: 'https://0ncore.com/marketplace' },
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  database: Database,
  megaphone: Megaphone,
  brain: BrainCog,
  chart: ChartBar,
  phone: Phone,
  dollar: CreditCard,
  pencil: Pencil,
  settings: Settings,
}

const STEPS = [
  {
    num: '01',
    title: 'Install',
    desc: 'Pick an add-on from the marketplace and add it to your account in a click.',
    icon: Package,
    color: '#7ed957',
  },
  {
    num: '02',
    title: 'Activate',
    desc: 'It connects to your CRM sub-location automatically — zero configuration, no API keys.',
    icon: Zap,
    color: '#00d4ff',
  },
  {
    num: '03',
    title: 'Automate',
    desc: 'The add-on runs on autopilot using your K-layer AI crew. Watch the work get done.',
    icon: Bot,
    color: '#a78bfa',
  },
]

const featured = getAddonBySlug('content-engine')!

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#020810] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: '0nCore Marketplace Categories',
            description: 'AI-powered add-ons for CRM automation',
            url: 'https://0ncore.com/marketplace',
            numberOfItems: CATEGORIES.length,
            itemListElement: CATEGORIES.map((cat, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: cat.name,
              url: `https://0ncore.com/marketplace/${cat.slug}`,
            })),
          }),
        }}
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
            {PUBLIC_ADDON_COUNT} Add-ons · {CATEGORIES.length} Categories · Powered by 0nMCP
          </div>

          <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              The 0nCore
            </span>
            <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Marketplace.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
            AI-powered add-ons that plug into your CRM. Each one unlocks a capability — install
            what you need, activate instantly. <strong className="text-white">No API keys. No code. No glue work.</strong>
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#categories"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
            >
              Browse all add-ons
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/marketplace/all"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
            >
              See the full {PUBLIC_ADDON_COUNT}
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { v: PUBLIC_ADDON_COUNT.toString(), l: 'Add-ons live' },
              { v: CATEGORIES.length.toString(), l: 'Categories' },
              { v: '1-click', l: 'Install' },
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

      {/* ═══ How Add-ons Work ═════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-y border-white/5 bg-white/[0.015]">
        <AnimatedConnectors intensity={0.22} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-white/15 font-mono text-[10px] uppercase tracking-widest text-white/65">
              How add-ons work
            </Badge>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Three steps. About 60 seconds.
              </span>
            </h2>
          </div>

          <div className="relative mt-14">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[26px] top-2 bottom-2 w-px bg-gradient-to-b from-[#7ed957]/40 via-[#00d4ff]/40 to-[#a78bfa]/40 sm:left-[36px] lg:hidden"
            />
            <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                return (
                  <div key={s.num} className="relative pl-16 lg:pl-0">
                    <div
                      className="absolute left-0 top-0 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border bg-[#0d1117] shadow-lg backdrop-blur sm:h-[72px] sm:w-[72px] lg:relative lg:mb-5 lg:h-16 lg:w-16"
                      style={{ borderColor: `${s.color}40`, boxShadow: `0 0 28px ${s.color}25` }}
                    >
                      <Icon className="h-5 w-5 sm:h-7 sm:w-7" style={{ color: s.color }} />
                    </div>
                    <Card className="border-white/10 bg-white/[0.02] backdrop-blur">
                      <CardHeader>
                        <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: s.color }}>
                          {s.num}
                        </p>
                        <CardTitle className="text-lg text-white">{s.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed text-white/65">{s.desc}</p>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Featured add-on ═════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Card className="relative overflow-hidden border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.04] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.04] backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/10 blur-[120px]"
          />
          <CardContent className="relative grid gap-10 px-6 py-12 lg:grid-cols-[1.4fr_1fr] lg:gap-12 lg:px-12 lg:py-16">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#7ed957]/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
                  <Sparkles className="h-3 w-3" />
                  Featured
                </span>
                {featured.badge && (
                  <span className="rounded-md bg-[#00d4ff]/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#00d4ff]">
                    {featured.badge}
                  </span>
                )}
              </div>
              <h2 className="text-balance text-3xl font-black tracking-tight sm:text-4xl">
                <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  {featured.name}
                </span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/70">{featured.shortDesc}</p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {featured.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ed957]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={`/marketplace/addon/${featured.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_24px_rgba(126,217,87,0.35)] transition-transform hover:scale-[1.02]"
                >
                  View details
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="font-mono text-xs uppercase tracking-widest text-white/40">
                  Requires {featured.requiredPlan} plan
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-7xl font-black leading-none">
                <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  {featured.priceLabel}
                </span>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
                Pay-as-you-go · Stripe billing
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-1.5">
                {featured.integrations.slice(0, 8).map((i) => (
                  <span
                    key={i}
                    className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] font-medium text-white/65"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══ Category grid ═══════════════════════════════════════════ */}
      <section id="categories" className="relative overflow-hidden border-t border-white/5 bg-white/[0.015]">
        <AnimatedConnectors intensity={0.16} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-white/15 font-mono text-[10px] uppercase tracking-widest text-white/65">
              Browse by category
            </Badge>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                {CATEGORIES.length} categories. {PUBLIC_ADDON_COUNT} add-ons. One dashboard.
              </span>
            </h2>
            <p className="mt-4 text-base text-white/65">
              Each category groups related capabilities for your CRM. Click in to see what&rsquo;s
              installable today.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.icon] ?? Package
              return (
                <Link
                  key={cat.slug}
                  href={`/marketplace/${cat.slug}`}
                  className="group block"
                  style={{ ['--cat' as string]: cat.color } as React.CSSProperties}
                >
                  <Card className="relative h-full overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur transition-all hover:scale-[1.01]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
                      style={{ background: cat.color }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ boxShadow: `inset 0 0 0 1px ${cat.color}40` }}
                    />
                    <CardHeader className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-colors"
                          style={{
                            background: `${cat.color}15`,
                            borderColor: `${cat.color}30`,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest"
                          style={{
                            background: `${cat.color}15`,
                            color: cat.color,
                            border: `1px solid ${cat.color}30`,
                          }}
                        >
                          {cat.count} add-ons
                        </span>
                      </div>
                      <CardTitle className="mt-3 text-lg text-white transition-colors group-hover:text-[var(--cat)]">
                        {cat.name}
                      </CardTitle>
                      <CardDescription className="text-white/65">{cat.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="relative">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40 transition-colors group-hover:text-[var(--cat)]">
                        Browse {cat.name}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/marketplace/all"
              className="inline-flex items-center gap-2 rounded-xl border border-[#7ed957]/30 bg-[#7ed957]/8 px-6 py-3 text-sm font-semibold text-[#7ed957] transition-colors hover:bg-[#7ed957]/15"
            >
              View all {PUBLIC_ADDON_COUNT} add-ons
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Final CTA ═══════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Card className="relative overflow-hidden border-[#7ed957]/25 bg-gradient-to-br from-[#0d1117] via-[#0d1117] to-[#161b22] backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#7ed957]/15 blur-[100px]"
          />
          <CardContent className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
            <Wand2 className="mx-auto mb-6 h-12 w-12 text-[#7ed957]" />
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Install your first add-on in seconds.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
              No contracts. Cancel anytime. Pay only for what you use.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-8 py-3.5 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:mike@rocketopp.com"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-8 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
              >
                Contact sales
              </a>
            </div>
            <p className="mt-8 font-mono text-xs uppercase tracking-widest text-white/30">
              Live now · Free tier available · Upgrade anytime
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
