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
    <main className="bg-black text-zinc-300 antialiased min-h-screen overflow-x-hidden">
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
    <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-24 overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1400px] h-[700px] rounded-full bg-[#6EE05A]/8 blur-[140px]" />
        <div className="absolute top-[10%] right-[-15%] w-[700px] h-[700px] rounded-full bg-[#00d4ff]/5 blur-[140px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        {/* Announcement */}
        <Link
          href="#pillars"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs text-zinc-300 hover:border-[#6EE05A]/40 hover:bg-[#6EE05A]/5 transition-all mb-10"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6EE05A] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6EE05A]" />
          </span>
          0nCore v4.10 is live — 9 new capability families
          <ArrowRight className="w-3 h-3 opacity-60" />
        </Link>

        <h1 className="text-5xl sm:text-6xl lg:text-[88px] font-bold tracking-[-0.03em] text-white leading-[0.95] mb-7">
          <CroSlot
            slot="hero_headline"
            as="span"
            fallback="The AI CRM that runs your business."
            className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent"
          />
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-9">
          <CroSlot
            slot="hero_subhead"
            as="span"
            fallback="Contacts, pipelines, email, SMS, booking, payments, and funnels — orchestrated by AI across 1,640+ tools and 109 services. Describe what you want; 0nCore makes it happen."
          />
        </p>

        <div className="flex flex-col items-center gap-3.5 mb-12">
          <SignupForm ctaSlot="hero_cta" ctaFallback="Get your workspace" />
          <p className="text-xs text-white/45">
            Free · No credit card · Live in 30 seconds
            <span className="mx-2 text-white/15">·</span>
            <Link
              href="https://github.com/0nork"
              target="_blank"
              rel="noreferrer"
              className="text-white/55 hover:text-white underline-offset-4 hover:underline"
            >
              view on GitHub
            </Link>
          </p>
        </div>

        {/* Trust stats */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {STATS.map((s) => (
            <div key={s.l} className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white tabular-nums">{s.v}</span>
              <span className="text-[11px] uppercase tracking-widest text-zinc-500">{s.l}</span>
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
    <section className="relative py-20 sm:py-28 border-t border-white/5 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-[#6EE05A]/[0.07] blur-[150px]" />
      </div>
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — the dashboard */}
          <div className="relative">
            <div className="absolute -inset-6 bg-[#6EE05A]/10 blur-3xl rounded-full pointer-events-none" />
            <DashboardPreview />
          </div>

          {/* Right — description */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#6EE05A] font-bold mb-4">
              One screen. Your whole business.
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-[-0.02em] leading-[1.05] mb-5">
              Every customer, conversation, and dollar — in one live workspace.
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-7">
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
                <li key={item} className="flex items-start gap-3 text-zinc-300">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6EE05A]/15">
                    <Check className="h-3 w-3 text-[#6EE05A]" />
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
            className="group inline-flex items-center justify-center gap-2 bg-[#6EE05A] text-black font-semibold rounded-lg px-8 py-4 text-lg hover:brightness-110 transition-all duration-150 shadow-[0_0_60px_-12px_rgba(110,224,90,0.6)]"
          >
            Sign up free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
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
          <span className="w-1 h-1 rounded-full bg-[#6EE05A]" />
          app.0ncore.com
        </div>
      </div>

      {/* Branded header */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#6EE05A] flex items-center justify-center text-black text-[11px] font-bold">0n</div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#6EE05A] font-bold leading-none">0nCore CRM</p>
            <p className="text-xs font-bold text-white leading-tight">Acme Co · Workspace</p>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 hidden sm:block">Live · synced</div>
      </div>

      {/* Active automation banner */}
      <div className="m-4 rounded-lg p-4 bg-gradient-to-br from-[#0f1f17] to-[#1c3a29] relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#6EE05A]/30 blur-2xl" />
        <div className="relative grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-widest text-[#6EE05A] font-bold">AI automation · running now</p>
            <p className="text-sm font-bold text-white mt-1">New lead → qualify → book</p>
            <p className="text-[10px] text-zinc-300/80 mt-1">lead-captured → ai-qualified → 24h-followup → booked</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { l: 'Leads',  v: 318, c: '#6EE05A' },
              { l: 'Qual.',  v: 124, c: '#6EE05A' },
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
              <div className="w-5 h-5 rounded bg-[#6EE05A]/15 flex items-center justify-center">
                <k.Icon className="w-2.5 h-2.5 text-[#6EE05A]" />
              </div>
              <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold truncate">{k.l}</p>
            </div>
            <p className="text-base font-bold text-white tabular-nums">{k.v}</p>
            <p className={'text-[9px] mt-0.5 ' + (k.positive ? 'text-[#6EE05A]' : 'text-zinc-500')}>{k.s}</p>
          </div>
        ))}
      </div>

      {/* D&R quality */}
      <div className="mx-4 mb-4 rounded-lg border border-white/10 bg-zinc-950 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] uppercase tracking-widest text-[#6EE05A] font-bold">Detect &amp; Refine — live</p>
          <p className="text-2xl font-bold text-[#6EE05A] leading-none">78</p>
        </div>
        <div className="space-y-1">
          {[
            { g: 'A+', pct: 28, c: '#6EE05A' },
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
    <section className="border-y border-white/5 py-12 bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-[11px] uppercase tracking-[0.25em] text-zinc-600 mb-7">
          Wired into the platforms you already use
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-5 max-w-4xl mx-auto">
          {STACK_LOGOS.map((logo) => (
            <div
              key={logo}
              className="text-center text-zinc-500 hover:text-zinc-200 transition-colors text-[15px] font-semibold tracking-tight"
            >
              {logo}
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-zinc-700 mt-7">
          + 97 more services across 22 categories
        </p>
      </div>
    </section>
  )
}

// ── Pillars ────────────────────────────────────────────────────

function Pillars() {
  return (
    <section id="pillars" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHead
          eyebrow="What you get"
          title="Three doors. One platform."
          subtitle="Everything in 0nCore lives behind these three. Pick the door, the rest follows."
        />
        <div className="grid lg:grid-cols-3 gap-4 mt-14">
          {PILLARS.map((p) => {
            const Icon = p.icon
            return (
              <Link
                key={p.title}
                href={p.href}
                className="group relative rounded-2xl border border-white/10 bg-zinc-950/60 p-7 hover:border-[#6EE05A]/30 hover:bg-zinc-950 transition-all overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-[#6EE05A]/0 group-hover:bg-[#6EE05A]/8 blur-3xl transition-all" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-[#6EE05A]/10 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-[#6EE05A]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-5">{p.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6EE05A] group-hover:gap-2.5 transition-all">
                    Open <ArrowRight className="w-3.5 h-3.5" />
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
    <section className="py-28 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHead
          eyebrow="Built different"
          title="Everything you need. Nothing you don't."
          subtitle="Every primitive 0nCore ships with is something we'd pick if we were starting over."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px mt-14 bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-black p-7 hover:bg-zinc-950 transition-colors">
                <Icon className="w-5 h-5 text-[#6EE05A] mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
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
    <section className="relative py-32 overflow-hidden">
      <div className="max-w-3xl mx-auto px-6 text-center relative">
        <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-600 font-bold mb-3">
          Quality you can trust
        </p>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-[-0.02em] leading-[1.05] mb-5">
          And build on.
        </h2>
        <p className="text-base text-zinc-500 leading-relaxed max-w-xl mx-auto mb-16">
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
    <section id="how" className="py-28 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHead eyebrow="How it works" title="Outcome to running automation, in three steps." />
        <div className="grid md:grid-cols-3 gap-4 mt-14">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative rounded-xl border border-white/10 bg-zinc-950/60 p-7">
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 z-10 bg-black rounded-full" />
              )}
              <div className="font-mono text-xs text-[#6EE05A] tracking-widest mb-3">{step.n}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
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
    <section className="py-28 border-t border-white/5 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#6EE05A]/4 blur-[120px]" />
      <div className="relative max-w-5xl mx-auto px-6">
        <SectionHead
          eyebrow="What people say"
          title="Loved by operators across the planet."
        />
        <div className="grid md:grid-cols-2 gap-4 mt-14">
          {TESTIMONIALS.map((t) => (
            <figure key={t.handle} className="rounded-xl border border-white/10 bg-zinc-950/60 p-7 backdrop-blur-sm">
              <blockquote className="text-[15px] text-zinc-200 leading-relaxed mb-5">{t.quote}</blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6EE05A]/30 to-[#00d4ff]/20 flex items-center justify-center text-white text-sm font-semibold border border-white/10">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-zinc-500">{t.handle}</div>
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
    <section id="faq" className="py-28 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHead eyebrow="FAQ" title="Questions and answers." />
        <div className="space-y-2.5 mt-14">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-white/10 bg-zinc-950/60 open:border-white/20 transition-colors"
            >
              <summary className="flex items-center gap-3 p-5 cursor-pointer text-white font-semibold list-none">
                <HelpCircle className="w-4 h-4 text-[#6EE05A] shrink-0" />
                <span className="flex-1">{item.q}</span>
                <span className="text-zinc-500 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed">{item.a}</div>
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
    <section className="py-32 relative overflow-hidden border-t border-white/5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full bg-[#6EE05A]/8 blur-[120px]" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#6EE05A] font-bold mb-4">
          Start building
        </p>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-[-0.02em] mb-5">
          <CroSlot slot="final_cta" as="span" fallback="Free to start. Live to your CRM in 30 seconds." />
        </h2>
        <p className="text-lg text-zinc-400 leading-relaxed mb-9">
          Drop your email. We provision your CRM sub-location, mint your token,
          and open the canvas. Describe your first outcome. Toggle on.
        </p>
        <div className="flex justify-center">
          <SignupForm ctaSlot="hero_cta" ctaFallback="Get your workspace" />
        </div>
        <p className="text-xs text-white/45 mt-4">
          Free · No credit card · Live in 30 seconds
          <span className="mx-2 text-white/15">·</span>
          <Link
            href="https://github.com/0nork"
            target="_blank"
            rel="noreferrer"
            className="text-white/55 hover:text-white underline-offset-4 hover:underline"
          >
            view on GitHub
          </Link>
        </p>
      </div>
    </section>
  )
}

// ── Section header (shared) ────────────────────────────────────

function SectionHead({
  eyebrow, title, subtitle,
}: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-600 font-bold mb-3">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-[-0.02em]">{title}</h2>
      {subtitle && <p className="text-base text-zinc-500 leading-relaxed mt-4 max-w-xl mx-auto">{subtitle}</p>}
    </div>
  )
}
