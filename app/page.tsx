import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Shield,
  Zap,
  Plug,
  Sparkles,
  Database,
  Server,
  Cloud,
  CheckCircle2,
  Code2,
} from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: '0nCore — Universal AI Orchestration',
  description:
    '0nCore connects your CRM to 100+ services with 1,500+ AI-powered capabilities. Encrypted credential vault, time-delayed flows, codeless integrations.',
}

const FEATURES = [
  {
    icon: Shield,
    title: 'Encrypted credential vault',
    desc: 'AES-256 storage with hardware fingerprint binding. API keys never leave the vault.',
  },
  {
    icon: Zap,
    title: 'Time-delayed flows',
    desc: 'Describe outcomes in plain English. 0nMCP routes across 100+ services with native scheduling and retries.',
  },
  {
    icon: Plug,
    title: 'Codeless integrations',
    desc: 'Drag, connect, deploy. 1,500+ capabilities across CRM, email, social, payments, analytics — wired in minutes.',
  },
  {
    icon: Sparkles,
    title: 'Agentic generator',
    desc: 'Tell it the outcome. The agent decomposes the work, picks the tools, configures the inputs, runs the plan.',
  },
  {
    icon: Code2,
    title: '.0n SWITCH files',
    desc: 'Workflows live in a portable, signed file format. Versioned, diffable, shareable across machines.',
  },
  {
    icon: CheckCircle2,
    title: 'Live + free to start',
    desc: 'Generous free tier. No credit card. Upgrade when you need more capacity. Cancel anytime.',
  },
]

const TRUSTED = [
  'GitHub',
  'Stripe',
  'Vercel',
  'Supabase',
  'Slack',
  'Linear',
  'Shopify',
  'Cloudflare',
]

const STATS = [
  { v: '1,589+', l: 'Tools' },
  { v: '102', l: 'Services' },
  { v: '5', l: 'Patents pending' },
  { v: '$0', l: 'To start' },
]

const PILLARS = [
  {
    icon: Database,
    href: '/dashboard/automations',
    title: 'Automations',
    desc: 'Visual builder for time-delayed flows. Drag a trigger, drop steps, ship.',
  },
  {
    icon: Cloud,
    href: '/marketplace',
    title: 'Marketplace',
    desc: 'Every MCP server and UCP product in one searchable surface. One-click install.',
  },
  {
    icon: Server,
    href: '/dashboard/enrich',
    title: 'List enrichment',
    desc: 'Detect 40+ tools on any site. Surface platform, CRM, analytics, gaps. Export CSV.',
  },
]

export default function HomePage() {
  return (
    <main className="bg-[#0d1117] text-[#c9d1d9] font-sans antialiased min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: '0nCore',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            description:
              'Universal AI orchestration. 1,589+ tools across 102 services. Free tier. Live now.',
            url: 'https://www.0ncore.com',
            author: {
              '@type': 'Organization',
              name: 'RocketOpp LLC',
              url: 'https://rocketopp.com',
            },
          }),
        }}
      />

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/30 bg-[#6EE05A]/10 px-3 py-1 text-xs font-medium text-[#6EE05A]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6EE05A] opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6EE05A]" />
              </span>
              Live now · v4.10
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#e6edf3] leading-[1.1]">
              Stop building workflows.
              <br />
              Start describing outcomes.
            </h1>

            <p className="text-lg text-[#c9d1d9] leading-relaxed max-w-2xl">
              0nCore is the universal AI orchestrator for your business. One brain, every
              service, zero glue code. {STATS[0].v} tools across {STATS[1].v} services,
              wired into your CRM out of the box.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
              >
                Start free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-5 py-2.5 hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
              >
                See pricing
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#30363d]">
              {STATS.map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-semibold text-[#e6edf3] font-mono tabular-nums">
                    {s.v}
                  </div>
                  <div className="text-xs text-[#8b949e] mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE GRID ═════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
              Everything you need to ship AI into your business
            </h2>
            <p className="text-[#8b949e]">
              The pieces other platforms ship as add-ons are core to 0nCore.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#484f58] hover:bg-[#1c2128] hover:-translate-y-px hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
              >
                <f.icon className="w-8 h-8 text-[#6EE05A]" />
                <div className="mt-4 text-base font-medium text-[#e6edf3]">{f.title}</div>
                <p className="mt-2 text-sm text-[#c9d1d9] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DEEP LINKS ═══════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
              Three doors in
            </h2>
            <p className="text-[#8b949e]">
              Pick the surface that matches the work you want done today.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {PILLARS.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                className="group bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#6EE05A]/40 hover:bg-[#6EE05A]/5 hover:-translate-y-px hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
              >
                <p.icon className="w-8 h-8 text-[#6EE05A]" />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-base font-medium text-[#e6edf3]">{p.title}</span>
                  <ArrowRight className="w-4 h-4 text-[#8b949e] group-hover:text-[#6EE05A] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="mt-2 text-sm text-[#c9d1d9] leading-relaxed">{p.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ══════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-6">
            Wires into the tools you already use
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRUSTED.map((name) => (
              <span
                key={name}
                className="text-sm font-mono text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
              >
                {name}
              </span>
            ))}
            <span className="text-sm font-mono text-[#6EE05A]">
              + {Number(STATS[1].v.replace('+', '')) - TRUSTED.length} more
            </span>
          </div>
        </div>
      </section>

      {/* ═══ CTA ══════════════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 md:p-14 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#e6edf3]">
              Ready to ship the AI layer?
            </h2>
            <p className="text-[#c9d1d9] max-w-2xl mx-auto">
              Free tier. No credit card. Connect your CRM and run your first .0n flow in
              under ten minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
              >
                Start free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/install"
                className="inline-flex items-center gap-2 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-5 py-2.5 hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
              >
                Browse integrations
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
