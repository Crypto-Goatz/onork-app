import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Shield,
  Zap,
  Plug,
  Cloud,
  Code2,
  Eye,
  Wand2,
  Layers,
  Workflow,
  Check,
  HelpCircle,
  Activity,
  Users,
  Calendar,
  TrendingUp,
  Sparkles,
  Rocket,
  Crown,
} from 'lucide-react'
import { TIERS, type Tier } from '@/lib/pricing'
import SiteFooter from '@/components/SiteFooter'
import { CroSlot } from '@/components/cro9/CroSlot'
import { SignupForm } from '@/components/cro9/SignupForm'
import TriggerBurst from '@/components/home/TriggerBurst'
import AnimatedGrid from '@/components/animated-grid'
import AnimatedConnectors from '@/components/animated-connectors'

export const metadata: Metadata = {
  title: '0nCore — The AI CRM That Runs Your Business | 1,640+ Tools, 109 Services',
  description:
    'The AI-powered CRM that actually does the work: contacts, pipelines, email, SMS, booking, payments, and funnels — orchestrated by AI across 1,640+ tools and 109 services. Free to start. Live in 30 seconds.',
  keywords: [
    'AI CRM', 'AI-powered CRM', 'CRM automation', 'AI sales automation', 'best AI CRM',
    'CRM with AI agents', 'sales pipeline software', 'email and SMS marketing CRM',
    'booking and payments CRM', 'GoHighLevel alternative', 'all-in-one CRM', '0nCore',
  ],
  alternates: { canonical: 'https://www.0ncore.com' },
  openGraph: {
    title: '0nCore — The AI CRM That Runs Your Business',
    description:
      'Contacts, pipelines, email, SMS, booking, payments, funnels — orchestrated by AI across 1,640+ tools and 109 services. Describe what you want; 0nCore makes it happen.',
    url: 'https://www.0ncore.com',
    siteName: '0nCore',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '0nCore — The AI CRM That Runs Your Business',
    description: 'The AI CRM that actually does the work. 1,640+ tools, 109 services. Free to start.',
  },
}

// ─── Data ───────────────────────────────────────────────────────

const STATS = [
  { v: '1,640+', l: 'Tools' },
  { v: '109',    l: 'Services' },
  { v: '22',     l: 'Categories' },
  { v: '5',      l: 'Patents pending' },
]

const STACK_LOGOS = [
  'CRM',  'Stripe', 'Supabase', 'Vercel',
  'Google', 'Slack', 'Meta',     'OpenAI',
  'Anthropic', 'Groq', 'LinkedIn', 'Shopify',
]

const PILLARS = [
  {
    icon: Workflow,
    href: '/dashboard/automations',
    title: 'Automations',
    desc:
      'Drag a trigger, drop steps, ship. Time-delayed flows that survive across days, weeks, months. Visual canvas, .0n SWITCH file underneath.',
  },
  {
    icon: Cloud,
    href: '/marketplace',
    title: 'Marketplace',
    desc:
      'Every MCP server and UCP product in one searchable surface. One-click install. Pay only for the capabilities you turn on.',
  },
  {
    icon: Eye,
    href: '/dashboard/enrich',
    title: 'List enrichment',
    desc:
      'Detect 40+ tools on any site. Surface platform, CRM, analytics, gaps. Export CSV. Built-in to every contact in the CRM.',
  },
]

const FEATURES = [
  { icon: Shield, title: 'Encrypted credential vault',  desc: 'AES-256 with hardware fingerprint binding. API keys never leave the vault.' },
  { icon: Zap,    title: 'Time-delayed flows',          desc: 'Describe outcomes in plain English. Native scheduling, retries, exit conditions.' },
  { icon: Plug,   title: 'Codeless integrations',       desc: 'Drag, connect, deploy. 1,640+ capabilities across 109 services.' },
  { icon: Wand2,  title: 'Agentic generator',           desc: 'Tell it the outcome. The agent picks tools, configures inputs, runs the plan.' },
  { icon: Code2,  title: '.0n SWITCH files',            desc: 'Workflows in a portable, signed file format. Versioned, diffable, shareable.' },
  { icon: Layers, title: 'K-layer architecture',        desc: 'Brand, terminology, structure, identity, knowledge, credentials, ops — separate from prompts.' },
]

const STEPS = [
  {
    n: '01',
    title: 'Describe the outcome',
    desc: '"When a lead is qualified, kick off welcome → 24h follow-up → if no reply, route to sales." Plain English, no flowchart required.',
  },
  {
    n: '02',
    title: 'Watch it resolve',
    desc: "0nCore checks what's connected, swaps unsupported integrations for native equivalents, finds-or-creates the tags and fields it needs.",
  },
  {
    n: '03',
    title: 'Toggle on',
    desc: 'Save paused. Toggle active when you trust it. Trigger sources are pluggable — CRM webhook, cron, raw HTTP, MCP tool call.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Mike Mento',
    handle: 'RocketOpp',
    quote: '"This is the AI orchestration layer I\'ve been trying to build for 5 years. Existing tools call themselves orchestrators — 0nCore actually is one."',
  },
  {
    name: 'Agency owner',
    handle: 'scaling operator',
    quote: '"We replaced our CRM, our email tool, our booking app, and three Zaps with 0nCore. Contacts, pipeline, payments, and the follow-up automations all live in one place now — and the AI actually runs them."',
  },
  {
    name: 'Designer @ studio',
    handle: 'agency',
    quote: '"OnPress turned a Figma file into a complete WP theme + plugin in 60 seconds. The block patterns from my component sets actually preserved variants. I sold it twice in week one."',
  },
  {
    name: 'CRO consultant',
    handle: 'conversion lead',
    quote: '"D&R is the killer move. Click fraud detection is one feature; the negative-value F/X grading sent back to Smart Bidding is the conversion-rate compounder I didn\'t know was possible."',
  },
]

const FAQ = [
  { q: 'How is 0nCore different from Zapier or Make?', a: "Zapier and Make are visual workflow builders. 0nCore is an orchestrator — you describe outcomes, it picks the tools, resolves the configuration, and runs the plan. The .0n SWITCH file format is portable across machines. The agentic generator authors workflows; the runtime executes them." },
  { q: "What's actually free?", a: "The core platform — sign up, connect your CRM, run unlimited workflows on the free tier. Capabilities you turn on (Detect & Refine, OnPress, etc) are individually priced. No credit card to start." },
  { q: 'Where does my data live?', a: "On 0nCore — Supabase Postgres, hosted on Vercel. Your credentials live in an AES-256-GCM vault with hardware fingerprint binding. We don't read your data; we route between your services." },
  { q: 'Do I need a technical co-founder?', a: "No. Most of the platform is conversational — describe the outcome, approve the plan, toggle on. Power users get the canvas, the .0n file editor, and the full MCP tool surface." },
  { q: 'Can I bring my own AI keys?', a: 'Yes. Connect your own Anthropic / OpenAI / Groq keys via the credential vault and your AI calls run through your account, your spend, your rate limits.' },
  { q: 'What about the patents?', a: 'Five provisional patents filed. All marked "Patent Pending" — never claimed as granted.' },
]

// ── Page ───────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020810] font-sans text-white antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'SoftwareApplication',
                '@id': 'https://www.0ncore.com/#software',
                name: '0nCore',
                applicationCategory: 'BusinessApplication',
                applicationSubCategory: 'CRM',
                operatingSystem: 'Web',
                description:
                  'The AI-powered CRM that runs your business: contacts, pipelines, email, SMS, booking, payments, and funnels orchestrated by AI across 1,640+ tools and 109 services.',
                url: 'https://www.0ncore.com',
                featureList: [
                  'Contact management', 'Sales pipeline', 'Email marketing', 'SMS & phone',
                  'Booking & calendar', 'Invoicing & payments', 'Websites & funnels',
                  'AI agent automations', 'Unified inbox', 'Reputation management',
                ],
                offers: [
                  { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
                  { '@type': 'Offer', name: 'Pro', price: '49', priceCurrency: 'USD' },
                  { '@type': 'Offer', name: 'Team', price: '299', priceCurrency: 'USD' },
                ],
                author: { '@type': 'Organization', name: 'RocketOpp LLC', url: 'https://rocketopp.com' },
              },
              {
                '@type': 'Organization',
                '@id': 'https://www.0ncore.com/#org',
                name: '0nCore',
                url: 'https://www.0ncore.com',
                parentOrganization: { '@type': 'Organization', name: 'RocketOpp LLC', url: 'https://rocketopp.com' },
              },
              {
                '@type': 'FAQPage',
                '@id': 'https://www.0ncore.com/#faq',
                mainEntity: FAQ.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              },
            ],
          }),
        }}
      />

      <Hero />
      <ProductShowcase />
      <StackStrip />
      <Pillars />
      <Features />
      <Centerpiece />
      <Steps />
      <Testimonials />
      <Pricing />
      <Faq />
      <FinalCta />

      <SiteFooter />
    </main>
  )
}

// ── Hero ───────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5 pt-24 pb-20 sm:pt-32 sm:pb-24">
      <AnimatedGrid />
      {/* Glow */}
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[700px] w-[1400px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
      <div aria-hidden className="pointer-events-none absolute top-[10%] right-[-15%] h-[700px] w-[700px] rounded-full bg-[#00d4ff]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* Announcement */}
        <Link
          href="#pillars"
          className="mb-10 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957] transition-colors hover:border-[#7ed957]/50"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ed957] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7ed957]" />
          </span>
          0nCore v4.10 is live — 9 new capability families
          <ArrowRight className="h-3 w-3 opacity-60" />
        </Link>

        <h1 className="mb-7 text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-[88px]">
          <CroSlot
            slot="hero_headline"
            as="span"
            fallback="The AI CRM that runs your business."
            className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent"
          />
        </h1>

        <p className="mx-auto mb-9 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
          <CroSlot
            slot="hero_subhead"
            as="span"
            fallback="Contacts, pipelines, email, SMS, booking, payments, and funnels — orchestrated by AI across 1,640+ tools and 109 services. Describe what you want; 0nCore makes it happen."
          />
        </p>

        <div className="mb-12 flex flex-col items-center gap-3.5">
          <SignupForm ctaSlot="hero_cta" ctaFallback="Get your workspace" />
          <p className="text-xs text-white/45">
            Free · No credit card · Live in 30 seconds
            <span className="mx-2 text-white/15">·</span>
            <Link
              href="https://github.com/0nork"
              target="_blank"
              rel="noreferrer"
              className="text-white/55 underline-offset-4 hover:text-white hover:underline"
            >
              view on GitHub
            </Link>
          </p>
        </div>

        {/* Trust stats */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {STATS.map((s) => (
            <div key={s.l} className="flex items-baseline gap-1.5">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-2xl font-black tabular-nums text-transparent">{s.v}</span>
              <span className="text-[11px] uppercase tracking-widest text-white/45">{s.l}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

// ── Product showcase — dashboard visual + description + free CTA ───

function ProductShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-white/[0.015] py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/4 h-[600px] w-[600px] rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left — the dashboard */}
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute -inset-6 rounded-full bg-[#7ed957]/10 blur-3xl" />
            <DashboardPreview />
          </div>

          {/* Right — description */}
          <div>
            <span className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">
              One screen. Your whole business.
            </span>
            <h2 className="mb-5 text-balance text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Every customer, conversation, and dollar — in one live workspace.
              </span>
            </h2>
            <p className="mb-7 text-lg leading-relaxed text-white/75">
              Pipeline, revenue, bookings, and automations update in real time. Your AI
              works the leads, sends the follow-ups, and books the calls while you watch
              the numbers move — no tabs, no glue code, no agency markup.
            </p>
            <ul className="space-y-3">
              {[
                'Contacts, pipeline, and revenue at a glance',
                'AI automations running 24/7 in the background',
                'Email, SMS, calls & bookings from one inbox',
                'Live conversion tracking on every campaign',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/75">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7ed957]/15">
                    <Check className="h-3 w-3 text-[#7ed957]" />
                  </span>
                  <span className="text-[15px]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sign up free CTA */}
        <div className="mt-14 flex flex-col items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
          >
            Sign up free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-white/45">No credit card · Live to your CRM in 30 seconds</p>
        </div>
      </div>
    </section>
  )
}

// ── Dashboard preview (CSS-only mockup) ────────────

function DashboardPreview() {
  return (
    <div className="relative rounded-xl border border-white/10 bg-zinc-950/90 backdrop-blur shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden text-left">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/40">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>
        <div className="ml-3 px-3 py-1 rounded-md bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[#7ed957]" />
          app.0ncore.com
        </div>
      </div>

      {/* Branded header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#7ed957] flex items-center justify-center text-black text-[11px] font-bold">0n</div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#7ed957] font-bold leading-none">0nCore CRM</p>
            <p className="text-xs font-bold text-white leading-tight">Acme Co · Workspace</p>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 hidden sm:block">Live · synced</div>
      </div>

      {/* Active automation banner */}
      <div className="m-4 rounded-lg p-4 bg-gradient-to-br from-[#0f1f17] to-[#1c3a29] relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#7ed957]/30 blur-2xl" />
        <div className="relative grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-widest text-[#7ed957] font-bold">AI automation · running now</p>
            <p className="text-sm font-bold text-white mt-1">New lead → qualify → book</p>
            <p className="text-[10px] text-zinc-300/80 mt-1">lead-captured → ai-qualified → 24h-followup → booked</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { l: 'Leads',  v: 318, c: '#7ed957' },
              { l: 'Qual.',  v: 124, c: '#7ed957' },
              { l: 'Booked', v: 41,  c: '#fff'    },
            ].map((s) => (
              <div key={s.l} className="bg-white/5 rounded p-2 text-center border border-white/10">
                <p className="text-[7px] uppercase tracking-widest text-white/50">{s.l}</p>
                <p className="text-base font-bold tabular-nums" style={{ color: s.c }}>{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2 mx-4 mb-4">
        {[
          { Icon: Users,      l: 'Contacts',  v: '5,076',  s: '20 tags · 20 workflows' },
          { Icon: Calendar,   l: 'Bookings',  v: '28',     s: '+47% vs last week', positive: true },
          { Icon: TrendingUp, l: 'Revenue',   v: '$1,247', s: 'today' },
          { Icon: Activity,   l: 'ROAS',      v: '3.35×',  s: '$412 spend' },
        ].map((k) => (
          <div key={k.l} className="rounded-lg border border-white/10 bg-zinc-950 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded bg-[#7ed957]/15 flex items-center justify-center">
                <k.Icon className="w-2.5 h-2.5 text-[#7ed957]" />
              </div>
              <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold truncate">{k.l}</p>
            </div>
            <p className="text-base font-bold text-white tabular-nums">{k.v}</p>
            <p className={'text-[9px] mt-0.5 ' + (k.positive ? 'text-[#7ed957]' : 'text-zinc-500')}>{k.s}</p>
          </div>
        ))}
      </div>

      {/* D&R quality */}
      <div className="mx-4 mb-4 rounded-lg border border-white/10 bg-zinc-950 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] uppercase tracking-widest text-[#7ed957] font-bold">Detect &amp; Refine — live</p>
          <p className="text-2xl font-bold text-[#7ed957] leading-none">78</p>
        </div>
        <div className="space-y-1">
          {[
            { g: 'A+', pct: 28, c: '#7ed957' },
            { g: 'A',  pct: 22, c: '#5cb83a' },
            { g: 'B',  pct: 18, c: '#4a9430' },
            { g: 'C',  pct: 14, c: '#3a7026' },
            { g: 'D',  pct: 8,  c: '#2f5a1f' },
            { g: 'F',  pct: 6,  c: '#264a19' },
            { g: 'X',  pct: 4,  c: '#1a3311' },
          ].map((r) => (
            <div key={r.g} className="flex items-center gap-2">
              <span className="w-5 text-[9px] font-bold text-zinc-300 tabular-nums">{r.g}</span>
              <div className="flex-1 h-3 rounded bg-zinc-900 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${r.pct}%`, background: r.c }} />
              </div>
              <span className="w-10 text-[9px] text-zinc-500 tabular-nums text-right">{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Stack strip ────────────────────────────────────────────────

function StackStrip() {
  return (
    <section className="border-b border-white/5 bg-white/[0.015] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-7 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white/40">
          Wired into the platforms you already use
        </p>
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {STACK_LOGOS.map((logo) => (
            <div
              key={logo}
              className="text-center text-[15px] font-semibold tracking-tight text-white/45 transition-colors hover:text-[#7ed957]"
            >
              {logo}
            </div>
          ))}
        </div>
        <p className="mt-7 text-center text-[11px] text-white/30">
          + 97 more services across 22 categories
        </p>
      </div>
    </section>
  )
}

// ── Pillars ────────────────────────────────────────────────────

function Pillars() {
  return (
    <section id="pillars" className="relative overflow-hidden py-20 lg:py-28">
      <AnimatedConnectors intensity={0.2} />
      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHead
          eyebrow="What you get"
          title="Three doors. One platform."
          subtitle="Everything in 0nCore lives behind these three. Pick the door, the rest follows."
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            const accents = ['#7ed957', '#00d4ff', '#a78bfa']
            const color = accents[i % accents.length]
            return (
              <Link
                key={p.title}
                href={p.href}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 backdrop-blur transition-colors hover:border-white/[0.18]"
              >
                <div className="relative">
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0d1117]"
                    style={{ borderColor: `${color}40`, boxShadow: `0 0 24px ${color}22` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <h3 className="mb-2 text-xl font-black tracking-tight text-white">{p.title}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-white/60">{p.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5" style={{ color }}>
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Features ───────────────────────────────────────────────────

function Features() {
  return (
    <section className="border-y border-white/5 bg-white/[0.015] py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead
          eyebrow="Built different"
          title="Everything you need. Nothing you don't."
          subtitle="Every primitive 0nCore ships with is something we'd pick if we were starting over."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            const accents = ['#7ed957', '#00d4ff', '#a78bfa']
            const color = accents[i % accents.length]
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur transition-colors hover:border-white/[0.18]"
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0d1117]"
                  style={{ borderColor: `${color}40`, boxShadow: `0 0 24px ${color}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="mb-1.5 text-lg font-black tracking-tight text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Centerpiece (the "globe" moment) ────────────────────────────

function Centerpiece() {
  return (
    <section className="relative overflow-hidden py-32">
      <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[140px]" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <span className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">
          Quality you can trust
        </span>
        <h2 className="mb-5 text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
            And build on.
          </span>
        </h2>
        <p className="mx-auto mb-16 max-w-xl text-base leading-relaxed text-white/55">
          Every primitive is production-grade. Every workflow is reproducible.
          Every credential is encrypted. Every patent is filed.
        </p>
      </div>

      {/* The trigger burst — power button fires every service at once */}
      <TriggerBurst />
    </section>
  )
}

// ── Steps ──────────────────────────────────────────────────────

function Steps() {
  return (
    <section id="how" className="border-t border-white/5 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHead eyebrow="How it works" title="Outcome to running automation, in three steps." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.n} className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 backdrop-blur transition-colors hover:border-white/[0.18]">
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-[#020810] text-white/30 md:block" />
              )}
              <div className="mb-3 font-mono text-xs tracking-widest text-[#7ed957]">{step.n}</div>
              <h3 className="mb-2 text-lg font-black tracking-tight text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-white/60">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ───────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-white/[0.015] py-20 lg:py-28">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7ed957]/[0.05] blur-[120px]" />
      <div className="relative mx-auto max-w-5xl px-6">
        <SectionHead
          eyebrow="What people say"
          title="Loved by operators across the planet."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.handle} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 backdrop-blur transition-colors hover:border-white/[0.18]">
              <blockquote className="mb-5 text-[15px] leading-relaxed text-white/80">{t.quote}</blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#7ed957]/30 to-[#00d4ff]/20 text-sm font-semibold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-white/45">{t.handle}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ────────────────────────────────────────────────────

const HOME_TIER_ACCENT: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  free: { icon: Sparkles, color: '#94a3b8' },
  starter: { icon: Zap, color: '#7ed957' },
  pro: { icon: Rocket, color: '#00d4ff' },
  agency: { icon: Users, color: '#a78bfa' },
  enterprise: { icon: Crown, color: '#f59e0b' },
}

function Pricing() {
  const top = TIERS.filter((t) => ['free', 'starter', 'pro'].includes(t.slug))
  const bottom = TIERS.filter((t) => ['agency', 'enterprise'].includes(t.slug))
  return (
    <section id="pricing" className="relative overflow-hidden border-t border-white/5 py-28">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.06] blur-[140px]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">
            Pricing
          </span>
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Free to start. Everything at $497.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/55">No credit card to start. Cancel anytime.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">{top.map((t) => <PricingCard key={t.slug} tier={t} />)}</div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">{bottom.map((t) => <PricingCard key={t.slug} tier={t} />)}</div>
        <div className="mt-10 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 transition-colors hover:text-[#7ed957]">
            See the full feature comparison <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function PricingCard({ tier }: { tier: Tier }) {
  const accent = HOME_TIER_ACCENT[tier.slug] ?? HOME_TIER_ACCENT.starter
  const Icon = accent.icon
  return (
    <div
      className={
        'relative flex flex-col overflow-hidden rounded-2xl border p-6 backdrop-blur transition-colors ' +
        (tier.highlight
          ? 'border-[#7ed957]/50 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.04] ring-1 ring-[#7ed957]/30'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]')
      }
    >
      {tier.highlight && (
        <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-[200px] w-[200px] -translate-x-1/2 rounded-full bg-[#7ed957]/15 blur-[80px]" />
      )}
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-[#0d1117]"
            style={{ borderColor: `${accent.color}40`, boxShadow: `0 0 20px ${accent.color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: accent.color }} />
          </div>
          {tier.highlight && (
            <span className="inline-flex items-center rounded-full bg-[#7ed957]/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7ed957]">
              Most popular
            </span>
          )}
        </div>
        <h3 className="text-2xl font-black tracking-tight text-white">{tier.name}</h3>
        <p className="mt-1 text-sm text-white/55">{tier.tagline}</p>
        <div className="mb-5 mt-5 flex items-baseline gap-1">
          <span
            className={
              'text-4xl font-black ' +
              (tier.highlight
                ? 'bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent'
                : 'text-white')
            }
          >
            {tier.price}
          </span>
          {tier.cadence && <span className="text-sm text-white/55">{tier.cadence}</span>}
        </div>
        <Link
          href={tier.ctaHref}
          className={
            'mb-5 inline-flex w-full items-center justify-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ' +
            (tier.highlight
              ? 'bg-[#7ed957] text-black shadow-[0_0_24px_rgba(126,217,87,0.35)] hover:bg-[#7ed957]/90'
              : 'border border-white/15 text-white hover:border-white/40')
          }
        >
          {tier.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <ul className="space-y-2 text-sm">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent.color }} />
              <span className={f.startsWith('Everything in') ? 'font-semibold text-white/85' : 'text-white/70'}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── FAQ ────────────────────────────────────────────────────────

function Faq() {
  return (
    <section id="faq" className="border-t border-white/5 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHead eyebrow="FAQ" title="Questions and answers." />
        <div className="mt-14 space-y-2.5">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur transition-colors open:border-white/[0.18]"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-5 font-semibold text-white">
                <HelpCircle className="h-4 w-4 shrink-0 text-[#7ed957]" />
                <span className="flex-1">{item.q}</span>
                <span className="text-xl leading-none text-white/45 transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm leading-relaxed text-white/65">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Final CTA ──────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 py-24 lg:py-32">
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.05] p-10 text-center backdrop-blur md:p-14">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/10 blur-[120px]" />
          <div className="relative">
            <span className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">
              Start building
            </span>
            <h2 className="mb-5 text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              <CroSlot
                slot="final_cta"
                as="span"
                fallback="Free to start. Live to your CRM in 30 seconds."
                className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent"
              />
            </h2>
            <p className="mb-9 text-lg leading-relaxed text-white/70">
              Drop your email. We provision your CRM sub-location, mint your token,
              and open the canvas. Describe your first outcome. Toggle on.
            </p>
            <div className="flex justify-center">
              <SignupForm ctaSlot="hero_cta" ctaFallback="Get your workspace" />
            </div>
            <p className="mt-4 text-xs text-white/45">
              Free · No credit card · Live in 30 seconds
              <span className="mx-2 text-white/15">·</span>
              <Link
                href="https://github.com/0nork"
                target="_blank"
                rel="noreferrer"
                className="text-white/55 underline-offset-4 hover:text-white hover:underline"
              >
                view on GitHub
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section header (shared) ────────────────────────────────────

function SectionHead({
  eyebrow, title, subtitle,
}: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">{eyebrow}</span>
      <h2 className="text-balance text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
        <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">{title}</span>
      </h2>
      {subtitle && <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/55">{subtitle}</p>}
    </div>
  )
}
