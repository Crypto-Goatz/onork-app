import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AnimatedGrid from '@/components/animated-grid'
import AnimatedConnectors from '@/components/animated-connectors'

export const metadata: Metadata = {
  title: '0nCore — AI That Runs Your Business | 335 Tools, 96 Services',
  description: '0nCore is an AI-powered business automation platform. 335 tools across 96 services. Course builder, Voice AI, Social Planner, Agent Studio, and 27 more add-ons. Starts at $9/mo.',
}

const INTEGRATIONS = ['Stripe', 'Slack', 'GitHub', 'Supabase', 'SendGrid', 'Twilio', 'Shopify', 'HubSpot', 'Notion', 'Airtable', 'Discord', 'Calendly', 'Zoom', 'Gmail', 'Google Sheets', 'Linear', 'Jira', 'Zapier']

const FEATURES = [
  { title: 'AI Course Builder', desc: 'Generate full courses and import into your CRM.', price: '$49/mo', color: '#7ed957' },
  { title: 'Voice AI Agent', desc: 'Deploy phone agents with knowledge bases.', price: '$99/mo', color: '#00d4ff' },
  { title: 'Agent Studio Pro', desc: 'Build AI agents with 335+ MCP tool access.', price: '$99/mo', color: '#a78bfa' },
  { title: 'Social Planner', desc: 'Connect accounts and publish AI content.', price: '$29/mo', color: '#f97316' },
  { title: 'Email Builder', desc: 'AI email campaigns with IP warm-up.', price: '$19/mo', color: '#ec4899' },
  { title: 'Snapshot Manager', desc: 'Clone and deploy CRM configurations.', price: '$99/mo', color: '#14b8a6' },
]

const STEPS = [
  { n: '01', t: 'Connect', d: 'Install the marketplace app on your CRM. OAuth handles auth.' },
  { n: '02', t: 'Choose', d: 'Pick the add-ons you need. Pay only for what you use.' },
  { n: '03', t: 'Automate', d: 'Build switches, run AI workflows, and scale.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-[#020810]/80 px-8 py-3.5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <img src="/brand/0ncore-icon.png" alt="0nCore" className="h-[26px]" />
          <span className="text-[15px] font-bold text-white"><span className="text-[#7ed957]">0n</span>Core</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/pricing" className="text-[13px] text-white/50 no-underline transition-colors hover:text-white">Pricing</Link>
          <Link href="/integrations" className="text-[13px] text-white/50 no-underline transition-colors hover:text-white">Integrations</Link>
          <a href="https://0nmcp.com/docs" className="text-[13px] text-white/50 no-underline transition-colors hover:text-white">Docs</a>
          <Link href="/login" className="text-[13px] text-white/50 no-underline transition-colors hover:text-white">Sign In</Link>
          <Link href="/signup" className="rounded-lg bg-[#7ed957] px-4 py-1.5 text-[13px] font-semibold text-[#020810] no-underline shadow-[0_0_24px_rgba(126,217,87,0.35)] transition-transform hover:scale-[1.02]">Get Started Free</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden border-b border-white/5 px-6 pb-20 pt-24 text-center sm:pt-28">
        <AnimatedGrid />
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
            335 Tools · 96 Services · 5 Patents Pending
          </div>
          <h1 className="mb-5 text-balance text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl">
            AI that{' '}
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">runs</span>{' '}
            your business.
          </h1>
          <p className="mx-auto mb-9 max-w-xl text-lg leading-relaxed text-white/75">
            Connect your CRM. Install add-ons. Build AI workflows that execute across every channel — dashboard, Slack, API, voice, and MCP.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] no-underline shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]">
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white no-underline backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ INTEGRATIONS ═══ */}
      <section className="border-b border-white/5 bg-white/[0.015] px-6 py-14">
        <p className="mb-5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white/40">Connected to 96+ services</p>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
          {INTEGRATIONS.map(n => (
            <span key={n} className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">{n}</span>
          ))}
        </div>
      </section>

      {/* ═══ STEPS ═══ */}
      <section className="relative overflow-hidden px-6 py-20 lg:py-28">
        <AnimatedConnectors intensity={0.2} />
        <div className="relative mx-auto max-w-4xl">
          <h2 className="mb-12 text-balance text-center text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">Three steps to automation</span>
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map(s => (
              <div key={s.n} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 text-center backdrop-blur transition-colors hover:border-white/[0.18]">
                <div className="mb-3 font-mono text-3xl font-black text-[#7ed957]/40">{s.n}</div>
                <h3 className="mb-2 text-lg font-black tracking-tight text-white">{s.t}</h3>
                <p className="text-sm leading-relaxed text-white/60">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ADD-ONS ═══ */}
      <section className="border-y border-white/5 bg-white/[0.015] px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-3 text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">Add-ons that do the work</span>
            </h2>
            <p className="text-sm text-white/55">31 modules. Install what you need. <Link href="/pricing" className="font-semibold text-[#7ed957] no-underline hover:underline">See all →</Link></p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div key={f.title} className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur transition-colors hover:border-white/[0.18]">
                <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: f.color }}>{f.price}</div>
                <h3 className="mb-1.5 text-base font-black tracking-tight text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white no-underline backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">View all 31 add-ons →</Link>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="px-6 py-24 lg:py-28">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.05] p-10 text-center backdrop-blur md:p-14">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#7ed957]/10 blur-[120px]" />
          <div className="relative">
            <h2 className="mb-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">Ready to automate?</span>
            </h2>
            <p className="mb-7 text-white/70">Free account. No credit card. Start in 30 seconds.</p>
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] no-underline shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]">
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 px-8 py-6">
        <span className="text-[11px] text-white/30">© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
        <div className="flex gap-5">
          <Link href="/pricing" className="text-[11px] text-white/45 no-underline transition-colors hover:text-white">Pricing</Link>
          <a href="https://0nmcp.com/docs" className="text-[11px] text-white/45 no-underline transition-colors hover:text-white">Docs</a>
          <a href="https://0nmcp.com" className="text-[11px] text-white/45 no-underline transition-colors hover:text-white">0nMCP</a>
          <a href="mailto:mike@rocketopp.com" className="text-[11px] text-white/45 no-underline transition-colors hover:text-white">Contact</a>
        </div>
      </footer>
    </main>
  )
}
