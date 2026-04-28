import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ShowcaseGrid, Ticker } from './client'

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
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-white/[0.08] px-12 py-5">
        <div className="text-lg font-bold tracking-tight">
          0n<span className="text-emerald-500">MCP</span>
        </div>
        <a
          href="https://0nmcp.com/signup"
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-85"
        >
          Start free →
        </a>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Built with 0nMCP
        </div>
        <h1 className="mb-5 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          The GTM stack that <span className="text-emerald-500">actually ships</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-zinc-400">
          Founders, agencies, and creators running their entire growth motion through a single AI-native command
          center.
        </p>
        <a
          href="https://0nmcp.com/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-black transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-emerald-500/30"
        >
          Try 0nMCP free — 14 days
        </a>
        <p className="mt-4 text-xs text-zinc-500">No credit card required. Connect your first tool in 60 seconds.</p>
      </section>

      {/* Stats */}
      <div className="flex flex-wrap justify-center gap-x-16 gap-y-8 border-y border-white/[0.08] px-6 py-12 text-center">
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
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-500">Who&rsquo;s using it</div>
        <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-4xl">Real people. Real workflows.</h2>
        <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
          <ShowcaseGrid />
        </Suspense>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-b from-transparent via-emerald-500/[0.04] to-transparent px-6 py-24 text-center">
        <h2 className="mb-4 text-3xl font-extrabold tracking-tight md:text-5xl">Your turn.</h2>
        <p className="mb-10 text-base text-zinc-400">One command. 96 services connected. Stop switching tabs.</p>
        <a
          href="https://0nmcp.com/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-9 py-4 text-base font-bold text-black transition-opacity hover:opacity-90"
        >
          Get started free →
        </a>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] px-12 py-8 text-sm text-zinc-500">
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
      <div className="text-4xl font-extrabold tracking-tight">{num}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
    </div>
  )
}
