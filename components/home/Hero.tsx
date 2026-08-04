import Link from 'next/link'
import { ArrowRight, Check, Zap, ShieldCheck, Infinity as InfinityIcon } from 'lucide-react'

/**
 * The homepage hero — light, in web0n's design language.
 *
 * SAME LOOK AS web0n ON PURPOSE. The family should feel like one company:
 * white grid field with a green bloom, layered cascade shadows, pill buttons on
 * the brand gradient, neutral-200 hairlines. Those utilities now live in
 * globals.css, ported from web0n rather than re-invented, so the two sites
 * cannot drift.
 *
 * A note on the greens, because it matters on white: #6ee05a is a NEON. It
 * glows beautifully and it fails contrast as text on a light background. So the
 * neon is used for glow, bloom and gradient only, and anything a person has to
 * READ uses --brand (#22c55e) or deeper. That single rule is the difference
 * between a light theme that looks premium and one that looks unfinished.
 *
 * IT SHOWS THE PRODUCT RATHER THAN DESCRIBING IT. The right panel is a real
 * instruction naming four different clients, fanning out into one step each.
 * That answers "what does it do" faster than any paragraph, and it is the one
 * thing no competitor screenshot can show — because no competitor can act
 * across accounts at all.
 *
 * Server component, pure CSS, zero JavaScript. This is the LCP element and the
 * first thing an AI crawler reads.
 */

const LEGS = [
  { client: 'Northside Dental', action: 'Email the 42 new leads the September offer', tone: 'bg-[#22c55e]' },
  { client: 'Lux Med Spa', action: 'Build the microneedling landing page', tone: 'bg-[#0ea5e9]' },
  { client: 'Apex Roofing', action: 'Move 9 stalled deals to follow-up', tone: 'bg-[#22c55e]' },
  { client: 'Harbor Dental', action: 'Schedule the week of social', tone: 'bg-[#8b5cf6]' },
]

export default function Hero() {
  return (
    <section className="relative grid items-center gap-12 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
      <span aria-hidden="true" className="orb orb-1" />
      <span aria-hidden="true" className="orb orb-2" />

      {/* ── Left: the claim ── */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-cascade-sm">
          <Zap className="h-3.5 w-3.5 text-[color:var(--brand)]" aria-hidden="true" /> AI agency CRM
        </span>

        <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.06] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl">
          Thirty client logins.
          <br />
          <span className="text-gradient">Or one sentence.</span>
        </h1>

        {/* BLUF — the two sentences an AI answer can lift whole. */}
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
          0nCore is an AI command centre for agencies. Say what you want done across every client
          you manage and it plans the work, prices it, and runs it once you approve —{' '}
          <span className="font-medium text-neutral-900">
            without you opening a single sub-account.
          </span>
        </p>

        <ul className="mt-7 space-y-2.5">
          {[
            'One login for every client account and every 0n product',
            'Nothing runs until you see the plan and the price',
            'Every action leaves a receipt against the right client',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-[15px] text-neutral-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand)]" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/agencies"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-neutral-950 shadow-glow-sm transition hover:opacity-90"
          >
            See what it runs <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/0nagent"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-7 py-3.5 text-sm font-semibold text-neutral-800 shadow-cascade-sm transition hover:border-[color:var(--brand)]"
          >
            Watch it work — 4 min
          </Link>
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs text-neutral-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--brand)]" aria-hidden="true" />
          Free to install. You pay only for what actually runs.
        </p>
      </div>

      {/* ── Right: the product, not a picture of it ── */}
      <div className="relative z-10">
        <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-cascade">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/60 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--brand)]" />
            <span className="ml-2 text-[11px] font-semibold text-neutral-500">Agency Command</span>
          </div>

          {/* the command */}
          <div className="border-b border-neutral-100 px-5 py-5">
            <div className="flex gap-2.5">
              <span className="shrink-0 font-mono text-sm font-bold text-[color:var(--brand)]">EQ&gt;</span>
              <p className="text-[15px] leading-relaxed text-neutral-800">
                Email Northside&apos;s new leads the September offer, build Lux a page for
                microneedling, move Apex&apos;s stalled deals to follow-up, and schedule
                Harbor&apos;s week of social.
              </p>
            </div>
          </div>

          {/* the fan-out — one leg per client */}
          <div className="space-y-2 px-5 py-4">
            <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              <span>4 clients · 4 steps · running together</span>
              <span className="text-[color:var(--brand-deep)]">$10.00</span>
            </div>

            {LEGS.map((l, i) => (
              <div
                key={l.client}
                className="flex items-center gap-3 rounded-xl border border-neutral-200/70 bg-white px-3.5 py-3 shadow-cascade-sm"
                style={{ marginLeft: i % 2 === 0 ? 0 : 10 }}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${l.tone}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-neutral-900">{l.client}</div>
                  <div className="truncate text-[12px] text-neutral-500">{l.action}</div>
                </div>
                <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--brand)]" aria-hidden="true" />
              </div>
            ))}
          </div>

          {/* the promise the whole product rests on */}
          <div className="flex items-start gap-2 border-t border-neutral-100 bg-neutral-50/60 px-5 py-3.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--brand)]" aria-hidden="true" />
            <p className="text-[11.5px] leading-relaxed text-neutral-500">
              A plan, not an action. Nothing touches a client account until you approve it — and a
              step that fails is never billed.
            </p>
          </div>
        </div>

        {/* one login, every product — the ecosystem claim, stated once */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 shadow-cascade-sm">
          <InfinityIcon className="h-4 w-4 shrink-0 text-[color:var(--brand)]" aria-hidden="true" />
          <p className="text-[12.5px] leading-relaxed text-neutral-600">
            <span className="font-semibold text-neutral-900">One account, the whole stack.</span>{' '}
            The same login carries you into 0nTask, web0n, social0n and CRO9 — sign in once, and
            every tool already knows who you are.
          </p>
        </div>
      </div>
    </section>
  )
}
