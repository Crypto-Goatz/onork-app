import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Shield,
  Zap,
  Plug,
  Sparkles,
  Github,
  Server,
  Cloud,
  Database,
} from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'
import AuroraBg from '@/components/bg/AuroraBg'
import ConicMeshBg from '@/components/bg/ConicMeshBg'
import ParticleField from '@/components/bg/ParticleField'

export const metadata: Metadata = {
  title: '0nCore — Universal AI Orchestration',
  description:
    '0nCore connects your CRM to 150+ services with 2,000+ AI-powered capabilities. Security vault, time-delayed flows, codeless integrations.',
}

const FEATURES = [
  {
    icon: Shield,
    color: '#7ed957',
    title: 'Security Vault',
    desc: 'AES-256 encrypted credential storage with hardware fingerprinting. Your API keys never leave the vault.',
  },
  {
    icon: Zap,
    color: '#00d4ff',
    title: 'Time-Delayed Flows',
    desc: 'Describe outcomes in plain English. 0nMCP routes across 150+ services with native scheduling and retries.',
  },
  {
    icon: Plug,
    color: '#a78bfa',
    title: 'Codeless Integrations',
    desc: 'Drag, connect, deploy. 2,000+ capabilities across CRM, email, social, payments, analytics — wired in minutes.',
  },
]

const TRUSTED_LOGOS = [
  { name: 'GitHub', src: '/logos/github.svg' },
  { name: 'Stripe', src: '/logos/stripe.svg' },
  { name: 'Vercel', src: '/logos/vercel.svg' },
  { name: 'Supabase', src: '/logos/supabase.svg' },
  { name: 'Slack', src: '/logos/slack.svg' },
  { name: 'Linear', src: '/logos/linear.svg' },
  { name: 'Shopify', src: '/logos/shopify.svg' },
  { name: 'Cloudflare', src: '/logos/cloudflare.svg' },
]

const STATS = [
  { v: '2,000+', l: 'Capabilities' },
  { v: '150+', l: 'Services' },
  { v: '5', l: 'Patents pending' },
  { v: '$0', l: 'Setup cost' },
]

const DEEP_LINKS = [
  {
    icon: Database,
    href: '/dashboard/automations',
    color: '#7ed957',
    title: 'Automations',
    desc: 'Visual builder for time-delayed flows. Drag a trigger, drop steps, ship.',
  },
  {
    icon: Cloud,
    href: '/dashboard/registry',
    color: '#00d4ff',
    title: 'Registry',
    desc: 'Every MCP server and UCP product in one searchable surface. One-click install for free, no-API entries.',
  },
  {
    icon: Server,
    href: '/dashboard/scans',
    color: '#a78bfa',
    title: 'Stack Scanner',
    desc: 'Detect 40+ tools on any site, save as a CRM lead, generate a Fiverr gig from the gaps.',
  },
]

export default function HomePage() {
  return (
    <main className="relative bg-[#0d1117] text-[#c9d1d9] font-sans antialiased min-h-screen">
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
              'Universal AI orchestration. 2,000+ capabilities across 150+ services.',
            url: 'https://0ncore.com',
            author: { '@type': 'Organization', name: 'RocketOpp LLC', url: 'https://rocketopp.com' },
          }),
        }}
      />

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Ambient backgrounds — kept per Mike's note */}
        <ConicMeshBg />
        <AuroraBg />
        <ParticleField count={24} color="#7ed957" />

        <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8 lg:pt-36 lg:pb-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
            {/* ── Left column: copy + CTAs + stats ── */}
            <div className="text-center lg:text-left">
              {/* Live status pill */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/[0.08] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ed957] opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7ed957]" />
                </span>
                Live · 2,000+ capabilities · 150+ services · 5 patents
              </div>

              {/* Headline — 3-stop gradient like /marketplace */}
              <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  One orchestrator.
                </span>
                <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  Every service you run.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl lg:mx-0">
                0nCore is the universal AI orchestration layer. Connect your CRM to
                150+ services, describe outcomes in plain English, let
                time-delayed flows do the work.{' '}
                <strong className="text-white">No API keys. No code. No glue work.</strong>
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link
                  href="/request"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
                >
                  Get your invite
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/platform"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
                >
                  See the platform
                </Link>
              </div>

              {/* Stats strip */}
              <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 lg:mx-0">
                {STATS.map((s) => (
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

            {/* ── Right column: clean autoplay/looped/chrome-stripped video ── */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <div className="relative pt-[56.25%]">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/D91C8EPRixM?autoplay=1&mute=1&loop=1&playlist=D91C8EPRixM&controls=0&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&cc_load_policy=0"
                    className="absolute inset-0 h-full w-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen={false}
                    title="0nCore demo"
                  />
                </div>
              </div>
              {/* Soft accent glow under the video */}
              <div className="pointer-events-none absolute -inset-x-4 -bottom-6 -z-10 h-12 rounded-full bg-[#7ed957]/15 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES — 3-col, marketplace card style ════════════════ */}
      <section className="relative overflow-hidden border-y border-white/5 bg-white/[0.015]">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/65">
              Three primitives
            </div>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Built for the work.
              </span>
              <br />
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Not the wiring.
              </span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur transition-all hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.04]"
                  style={{ boxShadow: `0 0 0 0 ${f.color}00` }}
                >
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0d1117] backdrop-blur transition-shadow group-hover:shadow-lg"
                    style={{
                      borderColor: `${f.color}40`,
                      boxShadow: `0 0 28px ${f.color}25`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: f.color }} />
                  </div>
                  <div className="mt-5 text-xl font-bold text-white">{f.title}</div>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ TRUSTED-BY ═════════════════════════════════════════════ */}
      <section className="border-b border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white/40">
            Wired to the infrastructure you already use
          </div>
          <div className="mt-10 grid grid-cols-4 items-center gap-x-8 gap-y-6 lg:grid-cols-8">
            {TRUSTED_LOGOS.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center justify-center opacity-50 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0"
              >
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={88}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DEEP-LINK CARDS ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-white/5 bg-white/[0.015]">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/65">
              Built on 0nCore
            </div>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                What can you ship today?
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70">
              Three surfaces, one orchestrator. Open one, and the next is minutes away.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
            {DEEP_LINKS.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur transition-all hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0d1117] backdrop-blur"
                      style={{
                        borderColor: `${card.color}40`,
                        boxShadow: `0 0 28px ${card.color}25`,
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: card.color }} />
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-white/40 transition-all duration-150 group-hover:translate-x-1"
                      style={{ color: 'currentColor' }}
                    />
                  </div>
                  <div className="mt-5 text-xl font-bold text-white">{card.title}</div>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    {card.desc}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="relative overflow-hidden rounded-2xl border border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.06] via-[#00d4ff]/[0.03] to-[#a78bfa]/[0.06] backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/15 blur-[120px]"
          />
          <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Ship the work.
              </span>
              <br />
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Skip the wiring.
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/75">
              Free to install · MIT-licensed core · Hardware-bound vault. Pay only when you scale.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/request"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
              >
                Get your invite
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://github.com/0nork"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
            </div>
            <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-widest text-white/30">
              5 patents pending · MIT-licensed core · 0nork / RocketOpp LLC
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
