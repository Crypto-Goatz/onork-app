import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Plug,
  Database,
  Cloud,
  Code2,
  Eye,
  Wand2,
  Layers,
  Workflow,
  Globe,
  Check,
  Quote,
  HelpCircle,
} from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: '0nCore — Universal AI Orchestration',
  description:
    "Stop building workflows. Start describing outcomes. 1,640+ tools, 109 services, wired into your CRM out of the box. Free tier. Live now.",
}

// ── Data ───────────────────────────────────────────────────────

const STATS = [
  { v: '1,640+', l: 'Tools' },
  { v: '109', l: 'Services' },
  { v: '22', l: 'Categories' },
  { v: '5', l: 'Patents pending' },
]

const STACK_LOGOS = [
  { name: 'CRM',         label: 'GoHighLevel-class CRM' },
  { name: 'Stripe',      label: 'Payments + subscriptions' },
  { name: 'Supabase',    label: 'Postgres + auth' },
  { name: 'Vercel',      label: 'Hosting + edge' },
  { name: 'Google',      label: 'Workspace + Ads + GA4' },
  { name: 'Slack',       label: 'Notifications + slash' },
  { name: 'Meta',        label: 'FB + IG + Conversions' },
  { name: 'OpenAI',      label: 'GPT models' },
  { name: 'Anthropic',   label: 'Claude models' },
  { name: 'Groq',        label: 'Llama 3.3 + 4 inference' },
  { name: 'LinkedIn',    label: 'AI social + leads' },
  { name: 'Shopify',     label: 'Commerce' },
]

const PILLARS = [
  {
    icon: Workflow,
    href: '/dashboard/automations',
    title: 'Automations',
    desc:
      'Drag a trigger, drop steps, ship. Time-delayed flows that survive across days, weeks, months. Visual canvas, .0n SWITCH file underneath.',
    accent: 'from-[#6EE05A] to-[#5bc74a]',
  },
  {
    icon: Cloud,
    href: '/marketplace',
    title: 'Marketplace',
    desc:
      'Every MCP server and UCP product in one searchable surface. One-click install. Pay only for the capabilities you turn on.',
    accent: 'from-[#00d4ff] to-[#0ea5e9]',
  },
  {
    icon: Eye,
    href: '/dashboard/enrich',
    title: 'List enrichment',
    desc:
      'Detect 40+ tools on any site. Surface platform, CRM, analytics, gaps. Export CSV. Built-in to every contact in the CRM.',
    accent: 'from-[#a78bfa] to-[#8b5cf6]',
  },
]

const FEATURES = [
  {
    icon: Shield,
    title: 'Encrypted credential vault',
    desc: 'AES-256 storage with hardware fingerprint binding. API keys never leave the vault, even from inside the platform.',
  },
  {
    icon: Zap,
    title: 'Time-delayed flows',
    desc: 'Describe outcomes in plain English. 0nCore routes across 109 services with native scheduling and retries.',
  },
  {
    icon: Plug,
    title: 'Codeless integrations',
    desc: 'Drag, connect, deploy. 1,640+ capabilities — CRM, email, social, payments, analytics — wired in minutes.',
  },
  {
    icon: Wand2,
    title: 'Agentic generator',
    desc: "Tell it the outcome. The agent decomposes the work, picks the tools, configures the inputs, runs the plan.",
  },
  {
    icon: Code2,
    title: '.0n SWITCH files',
    desc: 'Workflows live in a portable, signed file format. Versioned, diffable, shareable across machines.',
  },
  {
    icon: Layers,
    title: 'K-layer architecture',
    desc: 'Brand, terminology, business structure, identity, knowledge, credentials, ops — seven knowledge layers, separate from prompts.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Describe the outcome',
    desc: 'Type or talk. "When a lead is qualified, kick off welcome → 24h follow-up → if no reply, route to sales." Plain English, no flowchart required.',
  },
  {
    n: '02',
    title: 'Watch it resolve',
    desc: "0nCore checks what's connected, swaps unsupported integrations for native equivalents, finds-or-creates the tags and fields it needs, and shows you the resolved plan to approve.",
  },
  {
    n: '03',
    title: 'Toggle on',
    desc: 'Save paused. Toggle active when you trust it. Trigger sources are pluggable peers — CRM webhook, Supabase change, cron, MCP tool call, raw HTTP.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Mike Mento',
    handle: '@cryptogoatz',
    quote: '"This is the AI orchestration layer I\'ve been trying to build for 5 years. Existing tools call themselves orchestrators — 0nCore actually is one."',
  },
  {
    name: 'Rachel Knapic',
    handle: 'The Spa In Ligonier',
    quote: '"I gave it the Mother\'s Day campaign in plain English and it built the workflow, the tags, the segment, and the social schedule. I clicked toggle. It just ran."',
  },
  {
    name: 'Designer @ agency',
    handle: '@studio',
    quote: '"OnPress turned a Figma file into a complete WP theme + plugin in 60 seconds. The block patterns from my Figma component sets actually preserved variants. I sold it twice in week one."',
  },
  {
    name: 'CRO consultant',
    handle: '@conversion',
    quote: '"D&R is the killer move. Click fraud detection is one feature; the negative-value F/X grading sent back to Smart Bidding is the conversion-rate compounder I didn\'t know was possible."',
  },
]

const FAQ = [
  {
    q: 'How is 0nCore different from Zapier or Make?',
    a: "Zapier and Make are visual workflow builders. 0nCore is an orchestrator — you describe outcomes, it picks the tools, resolves the configuration, and runs the plan. The .0n SWITCH file format is portable across machines. The agentic generator authors workflows; the runtime executes them.",
  },
  {
    q: "What's actually free?",
    a: "The core platform — sign up, connect your CRM, run unlimited workflows on the free tier. Capabilities you turn on (Detect & Refine, OnPress, etc) are individually priced. No credit card to start.",
  },
  {
    q: 'Where does my data live?',
    a: "On 0nCore — Supabase Postgres, hosted on Vercel. Your credentials live in an AES-256-GCM vault with hardware fingerprint binding. We don't read your data; we route between your services.",
  },
  {
    q: 'Do I need a technical co-founder to use this?',
    a: "No. Most of the platform is conversational — describe the outcome, approve the plan, toggle on. Power users get the canvas, the .0n file editor, and the full MCP tool surface. You can use as little or as much as you want.",
  },
  {
    q: 'Can I bring my own AI keys?',
    a: 'Yes. Connect your own Anthropic / OpenAI / Groq keys via the credential vault and your AI calls run through your account, your spend, your rate limits. Otherwise the platform pool serves you on the standard tier.',
  },
  {
    q: 'What about the patents?',
    a: 'Five provisional patents filed: Vault Container System (#63/990,046), Seal of Truth (#63/968,814), 0nPlex multi-persona orchestration (#64/006,268), 0nCore behavioral intelligence (#64/006,282), Knowledge Layers K1–K7 (#64/024,736). All marked "Patent Pending" — never claimed as granted.',
  },
]

// ── Page ───────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-[#0d1117] text-[#c9d1d9] antialiased min-h-screen overflow-x-hidden">
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
              'Stop building workflows. Start describing outcomes. 1,640+ tools, 109 services, wired into your CRM.',
            url: 'https://www.0ncore.com',
            author: {
              '@type': 'Organization',
              name: 'RocketOpp LLC',
              url: 'https://rocketopp.com',
            },
          }),
        }}
      />

      <Nav />

      <Hero />
      <StackStrip />
      <Pillars />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <Faq />
      <CallToAction />

      <SiteFooter />
    </main>
  )
}

// ── Nav ────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0d1117]/75 border-b border-[#30363d]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6EE05A] to-[#00d4ff] flex items-center justify-center shadow-lg shadow-[#6EE05A]/15">
            <Sparkles className="w-4 h-4 text-[#0d1117]" />
          </span>
          <span className="font-semibold text-[#e6edf3] tracking-tight">0nCore</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-[#8b949e]">
          <Link href="#pillars" className="hover:text-[#e6edf3] transition-colors">Platform</Link>
          <Link href="#how" className="hover:text-[#e6edf3] transition-colors">How it works</Link>
          <Link href="#pricing" className="hover:text-[#e6edf3] transition-colors">Pricing</Link>
          <Link href="#faq" className="hover:text-[#e6edf3] transition-colors">FAQ</Link>
          <Link href="https://github.com/0nork" target="_blank" rel="noreferrer" className="hover:text-[#e6edf3] transition-colors">GitHub</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm text-[#c9d1d9] hover:text-[#e6edf3] px-3 py-1.5 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#6EE05A] text-[#0d1117] px-3.5 py-1.5 rounded-lg hover:brightness-110 transition-all"
          >
            Start free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}

// ── Hero ───────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-24 pb-28 sm:pt-32 sm:pb-36 overflow-hidden">
      {/* Glow backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full bg-[#6EE05A]/10 blur-[120px]" />
        <div className="absolute top-1/3 right-[-10%] w-[600px] h-[600px] rounded-full bg-[#00d4ff]/8 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(110,224,90,0.08) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        {/* Announcement pill */}
        <Link
          href="/changelog"
          className="inline-flex items-center gap-2 rounded-full border border-[#30363d] bg-[#161b22]/80 px-3.5 py-1.5 text-xs text-[#c9d1d9] hover:border-[#6EE05A]/40 hover:text-[#e6edf3] transition-all mb-8"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6EE05A] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6EE05A]" />
          </span>
          0nCore v4.10 is live — 9 new capability families
          <ArrowRight className="w-3 h-3 opacity-60" />
        </Link>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#e6edf3] leading-[1.05] mb-6">
          Stop building workflows.
          <br />
          <span className="bg-gradient-to-br from-[#6EE05A] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
            Start describing outcomes.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-[#8b949e] leading-relaxed max-w-2xl mx-auto mb-10">
          0nCore is the universal AI orchestrator for your business. One brain, every
          service, zero glue code. {STATS[0].v} tools across {STATS[1].v} services —
          wired into your CRM out of the box.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-semibold rounded-lg px-6 py-3 hover:brightness-110 transition-all duration-150 shadow-[0_0_40px_-10px_rgba(110,224,90,0.5)]"
          >
            Start free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="https://github.com/0nork"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#161b22] text-[#c9d1d9] border border-[#30363d] rounded-lg px-6 py-3 hover:border-[#484f58] hover:bg-[#21262d] transition-all duration-150"
          >
            <Globe className="w-4 h-4" />
            GitHub
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-3xl mx-auto">
          {STATS.map((s) => (
            <div
              key={s.l}
              className="rounded-lg border border-[#30363d] bg-[#161b22]/40 backdrop-blur-sm py-4 px-3"
            >
              <div className="text-2xl sm:text-3xl font-bold text-[#e6edf3] tabular-nums">
                {s.v}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-[#8b949e] mt-1">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Stack strip ────────────────────────────────────────────────

function StackStrip() {
  return (
    <section className="border-y border-[#30363d] bg-[#0a0c10] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-[#8b949e] mb-6">
          Wired into the platforms you already use
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-4">
          {STACK_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="flex flex-col items-center justify-center text-center group"
            >
              <div className="text-[15px] font-semibold text-[#c9d1d9] group-hover:text-[#e6edf3] transition-colors">
                {logo.name}
              </div>
              <div className="text-[10px] text-[#556880] mt-0.5 leading-tight max-w-[140px]">
                {logo.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-[#556880] mt-8">
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
      <div className="max-w-7xl mx-auto px-6">
        <SectionHead
          eyebrow="What you get"
          title="Three doors. One platform."
          subtitle="Everything in 0nCore lives behind these three. Pick the door, the rest follows."
        />

        <div className="grid lg:grid-cols-3 gap-5 mt-14">
          {PILLARS.map((p) => {
            const Icon = p.icon
            return (
              <Link
                key={p.title}
                href={p.href}
                className="group relative rounded-2xl border border-[#30363d] bg-[#161b22] p-7 hover:border-[#484f58] transition-all overflow-hidden"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-[#6EE05A]/0 to-[#6EE05A]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center mb-5 shadow-lg shadow-black/20`}
                  >
                    <Icon className="w-5 h-5 text-[#0d1117]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#e6edf3] mb-2">
                    {p.title}
                  </h3>
                  <p className="text-sm text-[#8b949e] leading-relaxed mb-5">
                    {p.desc}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6EE05A] group-hover:gap-2.5 transition-all">
                    Open
                    <ArrowRight className="w-3.5 h-3.5" />
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
    <section className="py-28 border-t border-[#30363d] bg-[#0a0c10]">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHead
          eyebrow="Built different"
          title="Everything you need. Nothing you don't."
          subtitle="Every primitive 0nCore ships with is something we'd pick if we were starting over."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 hover:border-[#484f58] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#6EE05A]/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#6EE05A]" />
                </div>
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-1.5">
                  {f.title}
                </h3>
                <p className="text-sm text-[#8b949e] leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── How it works ───────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how" className="py-28">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHead
          eyebrow="How it works"
          title="From outcome to running automation in three steps."
        />

        <div className="grid md:grid-cols-3 gap-5 mt-14">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className="relative rounded-xl border border-[#30363d] bg-[#161b22] p-7"
            >
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#30363d]" />
              )}
              <div className="font-mono text-xs text-[#6EE05A] tracking-widest mb-3">
                {step.n}
              </div>
              <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[#8b949e] leading-relaxed">{step.desc}</p>
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
    <section className="py-28 border-t border-[#30363d] bg-[#0a0c10]">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHead
          eyebrow="What people say"
          title="Quiet operators ship faster."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-5 mt-14 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.handle}
              className="rounded-xl border border-[#30363d] bg-[#161b22] p-7"
            >
              <Quote className="w-5 h-5 text-[#6EE05A] mb-3 opacity-50" />
              <blockquote className="text-[15px] text-[#c9d1d9] leading-relaxed mb-5">
                {t.quote}
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6EE05A]/30 to-[#00d4ff]/30 flex items-center justify-center text-[#e6edf3] text-sm font-semibold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#e6edf3]">{t.name}</div>
                  <div className="text-xs text-[#8b949e]">{t.handle}</div>
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

function Pricing() {
  return (
    <section id="pricing" className="py-28">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHead
          eyebrow="Pricing"
          title="Free for the core. Pay for the capabilities you turn on."
          subtitle="No credit card to start. Cancel anytime. Owner-class accounts get the full surface."
        />

        <div className="grid md:grid-cols-3 gap-5 mt-14 max-w-5xl mx-auto">
          <PricingCard
            tier="Free"
            price="$0"
            sub="Forever"
            features={[
              'Unlimited workflows',
              'CRM sub-location auto-provisioned',
              'All 1,640+ tools accessible (rate-limited)',
              'Community support',
              'Free forever for the core',
            ]}
            cta="Start free"
            ctaHref="/signup"
          />
          <PricingCard
            tier="Pro"
            price="$49"
            sub="per month"
            highlight
            features={[
              'Everything in Free',
              'Higher rate limits + priority queue',
              'Bring your own AI keys',
              'Detect & Refine ad-quality scoring',
              'Email + chat support',
              'Cancel anytime',
            ]}
            cta="Get Pro"
            ctaHref="/signup?plan=pro"
          />
          <PricingCard
            tier="Team"
            price="$299"
            sub="per month"
            features={[
              'Everything in Pro',
              'Up to 25 team members',
              'White-label client dashboards',
              '/vip/[client] branded portals',
              'Dedicated onboarding session',
              'Direct Slack with the team',
            ]}
            cta="Talk to us"
            ctaHref="mailto:mike@rocketopp.com?subject=0nCore%20Team"
          />
        </div>
      </div>
    </section>
  )
}

function PricingCard({
  tier,
  price,
  sub,
  features,
  cta,
  ctaHref,
  highlight,
}: {
  tier: string
  price: string
  sub: string
  features: string[]
  cta: string
  ctaHref: string
  highlight?: boolean
}) {
  return (
    <div
      className={
        'relative rounded-2xl p-7 ' +
        (highlight
          ? 'bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#6EE05A]/40 shadow-[0_0_60px_-20px_rgba(110,224,90,0.4)]'
          : 'bg-[#161b22] border border-[#30363d]')
      }
    >
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#6EE05A] text-[#0d1117] text-[10px] font-bold uppercase tracking-widest">
          Most popular
        </span>
      )}
      <div className="text-sm font-semibold uppercase tracking-widest text-[#6EE05A] mb-2">
        {tier}
      </div>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-bold text-[#e6edf3]">{price}</span>
        <span className="text-sm text-[#8b949e]">/ {sub}</span>
      </div>
      <ul className="space-y-2.5 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#c9d1d9]">
            <Check className="w-4 h-4 text-[#6EE05A] shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={
          'inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ' +
          (highlight
            ? 'bg-[#6EE05A] text-[#0d1117] hover:brightness-110'
            : 'bg-[#21262d] text-[#c9d1d9] border border-[#30363d] hover:bg-[#30363d] hover:text-[#e6edf3]')
        }
      >
        {cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

// ── FAQ ────────────────────────────────────────────────────────

function Faq() {
  return (
    <section id="faq" className="py-28 border-t border-[#30363d] bg-[#0a0c10]">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHead
          eyebrow="FAQ"
          title="Questions and answers."
        />

        <div className="space-y-3 mt-14">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-[#30363d] bg-[#161b22] open:border-[#484f58] transition-colors"
            >
              <summary className="flex items-center gap-3 p-5 cursor-pointer text-[#e6edf3] font-semibold list-none">
                <HelpCircle className="w-4 h-4 text-[#6EE05A] shrink-0" />
                <span className="flex-1">{item.q}</span>
                <span className="text-[#8b949e] text-xl leading-none group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-[#c9d1d9] leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────────

function CallToAction() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#6EE05A]/8 blur-[120px]" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#6EE05A] font-bold mb-4">
          Build your dream automation, today
        </p>
        <h2 className="text-4xl sm:text-5xl font-bold text-[#e6edf3] tracking-tight mb-5">
          Free to start. Live to your CRM in 30 seconds.
        </h2>
        <p className="text-lg text-[#8b949e] leading-relaxed mb-9">
          Sign up. Connect Google or LinkedIn. Watch the platform provision your
          CRM sub-location in real time. Describe your first outcome. Toggle on.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-semibold rounded-lg px-6 py-3 hover:brightness-110 transition-all duration-150 shadow-[0_0_40px_-10px_rgba(110,224,90,0.5)]"
          >
            Start free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center gap-2 bg-[#161b22] text-[#c9d1d9] border border-[#30363d] rounded-lg px-6 py-3 hover:border-[#484f58] hover:bg-[#21262d] transition-all duration-150"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Section header (shared) ────────────────────────────────────

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#6EE05A] font-bold mb-3">
        {eyebrow}
      </p>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#e6edf3] tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base text-[#8b949e] leading-relaxed mt-4">{subtitle}</p>
      )}
    </div>
  )
}
