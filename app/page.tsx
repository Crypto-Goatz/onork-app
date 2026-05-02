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
    title: 'Security Vault',
    desc: 'AES-256 encrypted credential storage with hardware fingerprinting. Your API keys never leave the vault.',
  },
  {
    icon: Zap,
    title: 'Time-Delayed Flows',
    desc: 'Describe outcomes in plain English. 0nMCP routes across 150+ services with native scheduling and retries.',
  },
  {
    icon: Plug,
    title: 'Codeless Integrations',
    desc: 'Drag, connect, deploy. 2,000+ capabilities across CRM, email, social, payments, and analytics — wired in minutes.',
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
  { value: '2,000+', label: 'Capabilities', icon: Sparkles },
  { value: '150+', label: 'Services', icon: Server },
  { value: '5', label: 'Patents pending', icon: Shield },
]

export default function HomePage() {
  return (
    <main className="relative bg-[#0d1117] text-[#c9d1d9] font-sans antialiased min-h-screen">
      {/* JSON-LD */}
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

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex items-center min-h-[85vh] px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Ambient backgrounds — kept per Mike's note */}
        <ConicMeshBg />
        <AuroraBg />
        <ParticleField count={24} color="#6EE05A" />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Live status pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/25 bg-[#6EE05A]/10 px-3 py-1 text-xs font-medium text-[#6EE05A]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-[#6EE05A] opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6EE05A]" />
            </span>
            Live · 2,000+ capabilities · 150+ services
          </div>

          {/* Headline */}
          <h1 className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#e6edf3] leading-[1.05]">
            One orchestrator.
            <br className="hidden sm:block" />
            <span className="text-[#6EE05A]"> Every service you run.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#c9d1d9] leading-relaxed">
            0nCore is the universal AI orchestration layer. Connect your CRM to
            150+ services, describe outcomes in plain English, and let
            time-delayed flows do the work. Hardware-bound vault. No code.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/request"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-5 py-2.5 text-sm font-medium text-[#0d1117] hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
            >
              Get your invite
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/platform"
              className="inline-flex items-center gap-2 rounded-lg bg-[#21262d] px-5 py-2.5 text-sm font-medium text-[#c9d1d9] border border-[#30363d] hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
            >
              See the platform
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-14 grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
            {STATS.map((s) => {
              const I = s.icon
              return (
                <div
                  key={s.label}
                  className="rounded-xl border border-[#30363d] bg-[#161b22]/60 backdrop-blur-sm p-4 sm:p-5"
                >
                  <I className="h-4 w-4 text-[#6EE05A] mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#e6edf3]">
                    {s.value}
                  </div>
                  <div className="text-xs text-[#8b949e] mt-1">{s.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURES (3-column grid) ──────────────────────────────── */}
      <section className="border-t border-[#30363d] px-4 sm:px-6 lg:px-8 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
              Built for the work, not the wiring.
            </h2>
            <p className="mt-3 text-sm text-[#c9d1d9] leading-relaxed">
              Three primitives that compose into anything: a vault, a flow
              engine, and a connector mesh.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const I = f.icon
              return (
                <div
                  key={f.title}
                  className="bg-[#161b22] border border-[#30363d] rounded-xl p-5
                             hover:border-[#484f58] hover:bg-[#1c2128]
                             hover:-translate-y-px hover:shadow-lg hover:shadow-black/20
                             transition-all duration-200"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#6EE05A]/10 border border-[#6EE05A]/20">
                    <I className="h-5 w-5 text-[#6EE05A]" />
                  </div>
                  <div className="mt-4 text-base font-medium text-[#e6edf3]">
                    {f.title}
                  </div>
                  <p className="mt-2 text-sm text-[#c9d1d9] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── TRUSTED-BY STRIP ──────────────────────────────────────── */}
      <section className="border-t border-[#30363d] px-4 sm:px-6 lg:px-8 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-xs font-medium uppercase tracking-widest text-[#8b949e] text-center">
            Wired to the infrastructure you already use
          </div>
          <div className="mt-8 grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-x-8 gap-y-6 items-center">
            {TRUSTED_LOGOS.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center justify-center grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all duration-200"
              >
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={88}
                  height={28}
                  className="h-6 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DEEP-LINK CARDS ───────────────────────────────────────── */}
      <section className="border-t border-[#30363d] px-4 sm:px-6 lg:px-8 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            What can you build today?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[#c9d1d9] leading-relaxed">
            Three example surfaces shipped on the same orchestrator. Open one
            and ship the next in minutes.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Database,
                href: '/dashboard/automations',
                title: 'Automations',
                desc: 'Visual builder for time-delayed flows. Drag a trigger, drop steps, ship.',
              },
              {
                icon: Cloud,
                href: '/dashboard/registry',
                title: 'Registry',
                desc: 'Every MCP server and UCP product in one searchable surface. One-click install for free, no-API entries.',
              },
              {
                icon: Server,
                href: '/dashboard/scans',
                title: 'Stack Scanner',
                desc: 'Detect 40+ tools on any site, save as a CRM lead, generate a Fiverr gig from the gaps.',
              },
            ].map((card) => {
              const I = card.icon
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group bg-[#161b22] border border-[#30363d] rounded-xl p-5
                             hover:border-[#484f58] hover:bg-[#1c2128]
                             hover:-translate-y-px hover:shadow-lg hover:shadow-black/20
                             transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#21262d]">
                      <I className="h-5 w-5 text-[#58a6ff]" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#8b949e] group-hover:text-[#6EE05A] group-hover:translate-x-0.5 transition-all duration-150" />
                  </div>
                  <div className="mt-4 text-base font-medium text-[#e6edf3]">
                    {card.title}
                  </div>
                  <p className="mt-2 text-sm text-[#c9d1d9] leading-relaxed">
                    {card.desc}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="border-t border-[#30363d] px-4 sm:px-6 lg:px-8 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="h-6 w-6 text-[#6EE05A] mx-auto" />
          <h2 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight text-[#e6edf3]">
            Ship the work. Skip the wiring.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#c9d1d9] leading-relaxed">
            Free to install, MIT-licensed core, hardware-bound vault. Pay only
            when you scale.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/request"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-5 py-2.5 text-sm font-medium text-[#0d1117] hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
            >
              Get your invite
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/0nork"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#21262d] px-5 py-2.5 text-sm font-medium text-[#c9d1d9] border border-[#30363d] hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <SiteFooter />
    </main>
  )
}
