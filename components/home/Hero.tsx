import Link from 'next/link'
import { ArrowRight, Check, Zap, ShieldCheck, Infinity as InfinityIcon } from 'lucide-react'
import HeroMotion from './HeroMotion'

/**
 * The homepage hero — "the astonishing pass" (sxo-s3-hero-spec, Sprint 3).
 *
 * WHAT CHANGED AND WHAT DID NOT. The copy did not. "Thirty client logins. / Or
 * one sentence." is the best line on any 0n property and it is still the single
 * server-rendered H1. The Agency Command panel did not lose a word either — it
 * stopped being a static card and became a DOCKING MODULE, which is the film's
 * grammar applied to the product's own demo content. What changed is the world
 * around them: light → #0d1117, with the light body arriving as beat 3 rather
 * than as the whole page.
 *
 * THE ORDER OF OPERATIONS IS THE POINT. Server-rendered, fully styled, complete
 * at first paint with zero JavaScript: H1, subline, CTAs, trust lines, panel,
 * every docked module, the ring already closed. The motion layer is
 * enhancement-only — it retracts what it is about to replay and hands it back.
 * Nothing on this page is a property of a script having run. See the hero block
 * in globals.css for why that inversion is the safe one.
 *
 * LCP = the H1 text block (guardrail 1). next/font is already in place, so
 * there is no font-flash to wait on and no image in front of the text.
 *
 * CRO9 (guardrail 8): both CTAs carry data-cro9-label, which the embed's
 * delegated click handler reads verbatim. The beat markers are fired once each
 * by HeroMotion through window.cro9(). C1 — the install — is already done: the
 * script tag is in app/layout.tsx.
 */

/** The four legs of the demo instruction. Each one docks in beat 1. */
const LEGS = [
  { client: 'Northside Dental', action: 'Email the 42 new leads the September offer', tone: 'bg-[#6ee05a]' },
  { client: 'Lux Med Spa', action: 'Build the microneedling landing page', tone: 'bg-[#22c55e]' },
  { client: 'Apex Roofing', action: 'Move 9 stalled deals to follow-up', tone: 'bg-[#4ade80]' },
  { client: 'Harbor Dental', action: 'Schedule the week of social', tone: 'bg-[#16a34a]' },
]

/**
 * Beat 2 — the "One account, the whole stack" chip explodes into four labelled
 * modules that ride in and dock onto the same ring.
 */
const STACK = [
  { name: '0nTask', href: 'https://www.0ntask.com', what: 'the work' },
  { name: 'web0n', href: 'https://web0n.com', what: 'the sites' },
  { name: 'social0n', href: 'https://www.0nmcp.com', what: 'the posting' },
  { name: 'CRO9', href: 'https://www.cro9.com', what: 'the scoreboard' },
]

/**
 * The ring. Eight segments: four ignite as the client legs dock (beat 1), four
 * as the stack modules dock (beat 2), and the ring is closed. Rendered as SVG
 * so it scales with the stage and costs no image request.
 *
 * The empty sockets are drawn UNDERNEATH at low opacity and are never animated,
 * so the ring is a complete shape at first paint even before a single segment
 * is lit — that is the "faint incomplete ring outline" of state 0.
 */
function Ring() {
  const R = 46
  const C = 2 * Math.PI * R
  const seg = C / 8
  // One arc of 92% of a segment, then a gap of everything else — so eight
  // circles drawn at eight offsets read as eight arcs, not as one ring.
  const arc = (i: number) => ({
    strokeDasharray: `${seg * 0.92} ${C - seg * 0.92}`,
    strokeDashoffset: -seg * i,
  })
  return (
    <svg className="hero-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {/* The empty sockets. Never animated — this is the "faint incomplete ring
          outline" of state 0, and it is why the ring is a whole shape before a
          single segment has lit. */}
      {Array.from({ length: 8 }).map((_, i) => (
        <circle key={`empty-${i}`} className="ring-seg ring-seg--empty" cx="50" cy="50" r={R} style={arc(i)} />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <circle
          key={`lit-${i}`}
          className={`ring-seg ${i < 4 ? 'ring-seg--leg' : 'ring-seg--stack'}`}
          cx="50"
          cy="50"
          r={R}
          style={{
            ...arc(i),
            // Segment i ignites as module i docks — the same delay the module
            // itself carries, so the socket lights on the snap and not near it.
            ['--dock-delay' as string]: `${(i < 4 ? 0.55 : 0.35) + (i % 4) * 0.2}s`,
          }}
        />
      ))}
    </svg>
  )
}

export default function Hero() {
  return (
    <>
      <section id="hero" className="hero-dark relative overflow-hidden">
        {/*
          Arms the motion layer BEFORE first paint, not after hydration.
          An effect runs after the browser has painted, so arming there would
          show the finished hero and then yank it back — a flash, on the LCP
          element, which is worse than having no animation at all. This is two
          media-query reads and a className write: no request, and it blocks
          nothing but its own parse.

          The class goes on <html>, not on this section. React owns the
          className of everything it rendered, so a class written onto this
          <section> by a script is a hydration mismatch React may quietly undo.

          It fails closed. If matchMedia is missing, if the user asked for
          reduced motion, if the page was restored mid-scroll, or if anything
          throws at all, the class is never added and the hero stays finished.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=window.matchMedia;if(m&&m('(prefers-reduced-motion: no-preference)').matches&&!m('(prefers-reduced-motion: reduce)').matches&&window.scrollY<40){document.documentElement.classList.add('hero-armed')}}catch(e){}",
          }}
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
          {/*
            ── Left: the claim. This is the LCP and it is pure text. ──

            min-w-0 on BOTH columns, and it is not cosmetic. A grid item's
            automatic minimum size is its min-content width, so a single item
            that cannot shrink sets the track for the whole grid. On mobile this
            collapses to one column, the panel on the right refused to go below
            ~384px, and the track went with it — 384px of content inside a 345px
            box, clipped by the section's overflow-hidden. The H1 survived; the
            subline and all three trust lines were cut off mid-word on every
            phone narrower than 432px. min-w-0 lets the track shrink to the
            container and the panel's own truncate rules take it from there.
          */}
          <div className="relative z-10 min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-[#c9d1d9]">
              <Zap className="h-3.5 w-3.5 text-[#6ee05a]" aria-hidden="true" /> AI agency CRM
            </span>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.06] tracking-tight text-white md:text-5xl lg:text-6xl">
              Thirty client logins.
              <br />
              {/*
                The neon reads as a headline accent on #0d1117 and passes AA at
                this size (guardrail 6: large text only — never body copy).
              */}
              <span className="text-[#6ee05a]">Or one sentence.</span>
            </h1>

            {/* BLUF — the two sentences an AI answer can lift whole. */}
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#c9d1d9]">
              0nCore is an AI command centre for agencies. Say what you want done across every client
              you manage and it plans the work, prices it, and runs it once you approve —{' '}
              <span className="font-medium text-white">without you opening a single sub-account.</span>
            </p>

            <ul className="mt-7 space-y-2.5">
              {[
                'One login for every client account and every 0n product',
                'Nothing runs until you see the plan and the price',
                'Every action leaves a receipt against the right client',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[15px] text-[#c9d1d9]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6ee05a]" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>

            {/*
              CTA doctrine (G-COLD): every scroll path ends at ONE primary. The
              secondary scrolls to the walkthrough that is already on this page
              rather than leaving for another route to say the same thing.
            */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/agencies"
                data-cro9-label="hero_cta_primary"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-neutral-950 shadow-glow-sm transition hover:opacity-90"
              >
                See what it runs <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#walkthrough"
                data-cro9-label="hero_cta_video"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-[#e6edf3] transition hover:border-[#6ee05a]/60"
              >
                Watch it work — 4 min
              </Link>
            </div>

            <p className="mt-5 flex items-center gap-2 text-xs text-[#8b949e]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#6ee05a]" aria-hidden="true" />
              Free to install. You pay only for what actually runs.
            </p>
          </div>

          {/* ── Right: the product docking onto the ring, not a picture of it ── */}
          <div className="hero-stage relative z-10 min-w-0">
            {/*
              The ring lives behind the panel and is decorative only — and
              "behind" has to be said in z, not just in source order. An
              absolutely positioned element paints above in-flow siblings that
              are not themselves positioned, so the ring was drawn straight
              across the "One account, the whole stack" card below the panel,
              with a 6px green arc through the middle of the sentence. -z-10
              puts it under both cards. It stays inside the stage's stacking
              context (the stage is relative z-10), so it does not fall behind
              the section itself and disappear.
            */}
            <div className="pointer-events-none absolute inset-0 -z-10 hidden items-center justify-center lg:flex">
              <div className="relative aspect-square w-[125%] max-w-none">
                <Ring />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[#30363d] bg-[#161b22] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]">
              {/* window chrome */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#6ee05a]" />
                <span className="ml-2 text-[11px] font-semibold text-[#8b949e]">Agency Command</span>
              </div>

              {/* the command — beat 1 opens by typing this line */}
              <div className="border-b border-white/[0.06] px-5 py-5">
                <div className="flex gap-2.5">
                  <span className="shrink-0 font-mono text-sm font-bold text-[#6ee05a]">EQ&gt;</span>
                  <p className="type-line text-[15px] leading-relaxed text-[#e6edf3]">
                    Email Northside&apos;s new leads the September offer, build Lux a page for
                    microneedling, move Apex&apos;s stalled deals to follow-up, and schedule
                    Harbor&apos;s week of social.
                  </p>
                </div>
              </div>

              {/* the fan-out — one leg per client, each docking along a rail */}
              <div className="space-y-2 px-5 py-4">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b949e]">
                  <span>4 clients · 4 steps · running together</span>
                  <span className="text-[#6ee05a]">$10.00</span>
                </div>

                {LEGS.map((l, i) => (
                  <div key={l.client} className="relative flex items-center gap-2">
                    {/*
                      The light-rail. It is inside the row's own reserved box
                      and only ever changes opacity, so it cannot move the row
                      it points at.
                    */}
                    <span
                      aria-hidden="true"
                      className="dock-rail dock-rail--leg h-px w-3 shrink-0 bg-gradient-to-r from-transparent to-[#6ee05a]"
                      style={{ ['--dock-delay' as string]: `${0.5 + i * 0.2}s` }}
                    />
                    <div
                      className="dock dock--leg relative min-w-0 flex-1 rounded-xl border border-[#30363d] bg-[#0d1117] px-3.5 py-3"
                      style={{
                        ['--dock-x' as string]: '14px',
                        ['--dock-y' as string]: '0px',
                        ['--dock-delay' as string]: `${0.55 + i * 0.2}s`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${l.tone}`} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-[#e6edf3]">{l.client}</div>
                          <div className="truncate text-[12px] text-[#8b949e]">{l.action}</div>
                        </div>
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#6ee05a]" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* the promise the whole product rests on */}
              <div className="flex items-start gap-2 border-t border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6ee05a]" aria-hidden="true" />
                <p className="text-[11.5px] leading-relaxed text-[#8b949e]">
                  A plan, not an action. Nothing touches a client account until you approve it — and a
                  step that fails is never billed.
                </p>
              </div>
            </div>

            {/* ── Beat 2: the stack accretes onto the same ring ── */}
            <div className="mt-4 rounded-2xl border border-[#30363d] bg-[#161b22] px-4 py-3.5">
              <p className="flex items-center gap-2.5 text-[12.5px] leading-relaxed text-[#8b949e]">
                <InfinityIcon className="h-4 w-4 shrink-0 text-[#6ee05a]" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-[#e6edf3]">One account, the whole stack.</span>{' '}
                  Sign in once. Every tool already knows you.
                </span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STACK.map((s, i) => (
                  <Link
                    key={s.name}
                    href={s.href}
                    data-cro9-label={`hero_stack_${s.name.toLowerCase()}`}
                    className="dock dock--stack relative rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 transition-colors hover:border-[#6ee05a]/50"
                    style={{
                      // Modules ride in from alternating sides — the film's
                      // rails, and on mobile this is the 9:16 vertical spine
                      // reading top-down (guardrail 5).
                      ['--dock-x' as string]: i % 2 === 0 ? '-12px' : '12px',
                      ['--dock-y' as string]: '6px',
                      ['--dock-delay' as string]: `${0.35 + i * 0.2}s`,
                    }}
                  >
                    <span className="block text-[12.5px] font-semibold text-[#e6edf3]">{s.name}</span>
                    <span className="block text-[11px] text-[#8b949e]">{s.what}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <HeroMotion />
      </section>

      {/* Beat 3 — hand-off to light. From here down the page is what it is. */}
      <div className="hero-handoff" aria-hidden="true" />
    </>
  )
}
