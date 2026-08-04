import Link from 'next/link'
import { ArrowRight, Check, Zap, ShieldCheck, Infinity as InfinityIcon } from 'lucide-react'

/**
 * The homepage hero.
 *
 * IT WAS SELLING A BRAND-ASSET LOCKER. "Your company brand. One place. Free."
 * — a logo-and-colours store, which is a footnote of what this became. 0nCore
 * is now an AI agency CRM: one chat that commands every client account.
 *
 * THE ONE DESIGN DECISION. A hero for a command-line product should show the
 * command, not describe it. So the right-hand panel IS the product: a real
 * instruction naming four different clients, fanning out into one step per
 * client. That single image answers "what does it do" faster than any
 * paragraph, and it is the thing no competitor's screenshot can show, because
 * no competitor can act across accounts at all.
 *
 * Built entirely in CSS and static markup — a server component, no JavaScript,
 * no animation library. The hero is the LCP element and the thing every AI
 * crawler reads first; a demo that costs a second of load, or that renders as
 * nothing without JS, is a demo that hurts the page it is selling.
 *
 * Numbers here are structural facts (four clients in the example, one login),
 * never invented metrics. Nothing claims hours saved or customers served.
 */

const LEGS = [
  { client: 'Northside Dental', action: 'Email the 42 new leads the September offer', tone: 'ok' },
  { client: 'Lux Med Spa', action: 'Build the microneedling landing page', tone: 'build' },
  { client: 'Apex Roofing', action: 'Move 9 stalled deals to follow-up', tone: 'ok' },
  { client: 'Harbor Dental', action: 'Schedule the week of social', tone: 'social' },
] as const

const TONE: Record<string, string> = {
  ok: 'bg-[#6EE05A]',
  build: 'bg-[#58a6ff]',
  social: 'bg-[#bc8cff]',
}

export default function Hero() {
  return (
    <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
      {/* ── Left: the claim ── */}
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/30 bg-[#6EE05A]/10 px-3.5 py-1.5 text-xs font-semibold text-[#6EE05A]">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" /> AI agency CRM
        </span>

        <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.06] tracking-tight text-[#e6edf3] md:text-5xl lg:text-6xl">
          Thirty client logins.
          <br />
          <span className="bg-gradient-to-r from-[#6EE05A] via-[#3fb950] to-[#58a6ff] bg-clip-text text-transparent">
            Or one sentence.
          </span>
        </h1>

        {/* BLUF — the two sentences an AI answer can lift whole. */}
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#8b949e]">
          0nCore is an AI command centre for agencies. Say what you want done across every client
          you manage and it plans the work, prices it, and runs it once you approve —{' '}
          <span className="text-[#e6edf3]">
            without you opening a single sub-account.
          </span>
        </p>

        <ul className="mt-7 space-y-2.5">
          {[
            'One login for every client account and every 0n product',
            'Nothing runs until you see the plan and the price',
            'Every action leaves a receipt against the right client',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-[15px] text-[#c9d1d9]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE05A]" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/agencies"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6EE05A] px-6 py-3.5 text-sm font-bold text-[#0d1117] transition-opacity hover:opacity-90"
          >
            See what it runs <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/0nagent"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#30363d] px-6 py-3.5 text-sm font-semibold text-[#e6edf3] transition-colors hover:border-[#6EE05A]/40"
          >
            Watch it work — 4 min
          </Link>
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs text-[#6e7681]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#6EE05A]" aria-hidden="true" />
          Free to install. You pay only for what actually runs.
        </p>
      </div>

      {/* ── Right: the product, not a picture of it ── */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[#6EE05A]/15 via-[#58a6ff]/10 to-transparent blur-2xl"
        />
        <div className="relative overflow-hidden rounded-2xl border border-[#30363d] bg-[#161b22] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-[#30363d] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f85149]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d29922]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#6EE05A]/70" />
            <span className="ml-2 text-[11px] font-medium text-[#6e7681]">Agency Command</span>
          </div>

          {/* the command */}
          <div className="border-b border-[#30363d] px-5 py-5">
            <div className="flex gap-2.5">
              <span className="shrink-0 font-mono text-sm font-bold text-[#6EE05A]">EQ&gt;</span>
              <p className="text-[15px] leading-relaxed text-[#e6edf3]">
                Email Northside&apos;s new leads the September offer, build Lux a page for
                microneedling, move Apex&apos;s stalled deals to follow-up, and schedule
                Harbor&apos;s week of social.
              </p>
            </div>
          </div>

          {/* the fan-out — one leg per client */}
          <div className="space-y-2 px-5 py-4">
            <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e7681]">
              <span>4 clients · 4 steps · running together</span>
              <span className="text-[#6EE05A]">$10.00</span>
            </div>

            {LEGS.map((l, i) => (
              <div
                key={l.client}
                className="flex items-center gap-3 rounded-xl border border-[#30363d] bg-[#0d1117] px-3.5 py-3"
                style={{ marginLeft: `${i % 2 === 0 ? 0 : 10}px` }}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[l.tone]}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#e6edf3]">{l.client}</div>
                  <div className="truncate text-[12px] text-[#8b949e]">{l.action}</div>
                </div>
                <Check className="h-3.5 w-3.5 shrink-0 text-[#6EE05A]" aria-hidden="true" />
              </div>
            ))}
          </div>

          {/* the honest footer — the promise the whole product rests on */}
          <div className="flex items-start gap-2 border-t border-[#30363d] bg-[#0d1117] px-5 py-3.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6EE05A]" aria-hidden="true" />
            <p className="text-[11.5px] leading-relaxed text-[#6e7681]">
              A plan, not an action. Nothing touches a client account until you approve it — and a
              step that fails is never billed.
            </p>
          </div>
        </div>

        {/* one login, every product — the ecosystem claim, stated once */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-3">
          <InfinityIcon className="h-4 w-4 shrink-0 text-[#6EE05A]" aria-hidden="true" />
          <p className="text-[12.5px] leading-relaxed text-[#8b949e]">
            <span className="font-semibold text-[#e6edf3]">One account, the whole stack.</span>{' '}
            The same login carries you into 0nTask, web0n, social0n and CRO9 — sign in once, and
            every tool already knows who you are.
          </p>
        </div>
      </div>
    </section>
  )
}
