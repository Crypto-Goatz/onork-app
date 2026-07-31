import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ShowcaseGrid, Ticker } from './client'
import AnimatedGrid from '@/components/animated-grid'

export const metadata: Metadata = {
  title: 'Built With 0nMCP — The AI-Native GTM Stack',
  description: 'See who\'s running their GTM motion on 0nMCP. Join 1,000+ founders automating growth.',
  openGraph: {
    title: 'Built With 0nMCP',
    description: 'See who\'s building on 0nMCP — and start your own.',
    url: 'https://builtwith.0nmcp.com',
  },
}

export const revalidate = 600

export default function BuiltWithPage() {
  return (
    <div className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-white/5 px-12 py-5">
        <div className="text-lg font-bold tracking-tight">
          0n<span className="text-[#7ed957]">MCP</span>
        </div>
        <a
          href="https://0nmcp.com/signup"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-5 py-2.5 text-sm font-bold text-[#020810] shadow-[0_0_24px_rgba(126,217,87,0.35)] transition-transform hover:scale-[1.02]"
        >
          Start free →
        </a>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <AnimatedGrid />
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
        <div aria-hidden className="pointer-events-none absolute top-[10%] right-[6%] h-[420px] w-[420px] rounded-full bg-[#00d4ff]/[0.05] blur-[130px]" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ed957] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7ed957]" />
            </span>
            Built with 0nMCP
          </div>
          <h1 className="mb-5 text-balance text-4xl font-black leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            The GTM stack that{' '}
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              actually ships
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/75">
            Founders, agencies, and creators running their entire growth motion through a single AI-native command
            center.
          </p>
          <a
            href="https://0nmcp.com/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-8 py-4 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
          >
            Try 0nMCP free — 14 days
          </a>
          <p className="mt-4 text-xs text-white/45">No credit card required. Connect your first tool in 60 seconds.</p>
        </div>
      </section>

      {/* Stats */}
      <div className="flex flex-wrap justify-center gap-x-16 gap-y-8 border-y border-white/5 bg-white/[0.015] px-6 py-12 text-center">
        <Stat num="1,000+" label="Active users" />
        <Stat num="96" label="Connected services" />
        <Stat num="1,558" label="Available tools" />
        <Stat num="∞" label="Workflows automated" />
      </div>

      {/* Ticker */}
      <Suspense fallback={null}>
        <Ticker />
      </Suspense>

      {/* Showcase */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <span className="mb-3 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">Who&rsquo;s using it</span>
        <h2 className="mb-12 text-3xl font-black tracking-tight md:text-4xl">
          <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
            Real people. Real workflows.
          </span>
        </h2>
        <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
          <ShowcaseGrid />
        </Suspense>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden px-6 py-24">
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.08] blur-[130px]" />
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.05] p-10 text-center backdrop-blur md:p-14">
          <h2 className="mb-4 text-3xl font-black tracking-tight md:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Your turn.
            </span>
          </h2>
          <p className="mb-10 text-base text-white/70">One command. 96 services connected. Stop switching tabs.</p>
          <a
            href="https://0nmcp.com/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-9 py-4 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
          >
            Get started free →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 px-12 py-8 text-sm text-white/45">
        <p>© 2026 RocketOpp LLC · 0nmcp.com</p>
        <div className="flex gap-6">
          <a href="https://0nmcp.com/privacy" className="hover:text-white">
            Privacy
          </a>
          <a href="https://0nmcp.com/terms" className="hover:text-white">
            Terms
          </a>
          <a href="mailto:mike@rocketopp.com" className="hover:text-white">
            Contact
          </a>
        </div>
      </footer>
    </div>
  )
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-4xl font-black tracking-tight text-transparent">{num}</div>
      <div className="mt-1 text-sm text-white/45">{label}</div>
    </div>
  )
}
