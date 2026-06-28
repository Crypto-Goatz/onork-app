import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Database,
  Mail,
  Calendar,
  Megaphone,
  GraduationCap,
  Phone,
  UserPlus,
  BarChart3,
  Brain,
  Workflow,
  CreditCard,
  ShieldCheck,
  Search,
  Globe,
  CheckSquare,
} from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'
import TriggerBurst from '@/components/home/TriggerBurst'
import AnimatedGrid from '@/components/animated-grid'
import AnimatedConnectors from '@/components/animated-connectors'

export const metadata: Metadata = {
  title: '0nCore Platform — One Place. Everywhere.',
  description:
    'Add it one place. Have it everywhere. 0nCore syncs your tasks, contacts, emails, calendar, and AI across every tool you use — in real time.',
}

const SYNC_POINTS = [
  'Your CRM',
  'Slack',
  'Google Calendar',
  'Gmail',
  'Your Phone',
  'Any Task App',
  'Your Website',
  'Social Media',
  'Voice AI',
  'Spreadsheets',
]

const CAPABILITIES = [
  {
    icon: CheckSquare,
    title: 'Create a task',
    desc: 'From a chat message, a voice command, an email, or a thought. It appears everywhere instantly.',
  },
  {
    icon: Mail,
    title: 'Send an email',
    desc: 'AI writes it in your voice. Pulls the contact from your CRM. Schedules it for the optimal time. Logs it automatically.',
  },
  {
    icon: Calendar,
    title: 'Book a meeting',
    desc: "Checks your calendar, your contact's timezone, finds the gap, sends the invite, adds the agenda — one sentence.",
  },
  {
    icon: Megaphone,
    title: 'Publish to social',
    desc: 'AI generates platform-optimized content. Posts to Facebook, Instagram, LinkedIn, X, TikTok, Google Business — simultaneously.',
  },
  {
    icon: GraduationCap,
    title: 'Build a course',
    desc: 'Describe the topic. AI generates the curriculum, lessons, quizzes, and certificates. Imports directly into your portal.',
  },
  {
    icon: Phone,
    title: 'Answer your phone',
    desc: "AI picks up when you can't. Knows your business, your products, your calendar. Books appointments. Takes messages. Sounds human.",
  },
  {
    icon: UserPlus,
    title: 'Follow up with a lead',
    desc: 'Knows when they last visited your site. What they looked at. What they asked. Drafts the perfect follow-up.',
  },
  {
    icon: BarChart3,
    title: 'Generate a report',
    desc: 'Pulls analytics from every connected service. Scores your performance. Recommends what to fix. Delivers it as a PDF.',
  },
  {
    icon: Brain,
    title: 'Train your AI',
    desc: 'Upload your documents, paste your website, describe your business. The AI learns everything and represents you accurately.',
  },
  {
    icon: Database,
    title: 'Manage your pipeline',
    desc: 'Drag deals between stages. AI alerts you to stale opportunities. Auto-assigns follow-up tasks based on stage.',
  },
  {
    icon: CreditCard,
    title: 'Process a payment',
    desc: 'Send an invoice. Accept a payment. Set up a subscription. Issue a refund. All from the same dashboard.',
  },
  {
    icon: Globe,
    title: 'Audit a website',
    desc: 'Enter any URL. Get a technical health score across performance, security, SEO, accessibility, and stack quality in 30 seconds.',
  },
  {
    icon: Workflow,
    title: 'Build a workflow',
    desc: 'Describe what should happen. The AI builds the automation — triggers, conditions, actions — across any connected service.',
  },
  {
    icon: Search,
    title: 'Search everything',
    desc: 'One search bar. Finds contacts, tasks, emails, documents, calendar events, transactions — across every connected platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Protect your credentials',
    desc: 'AES-256 encrypted vault. Hardware-bound. Your API keys, passwords, and secrets never leave your machine.',
  },
]

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-white/5">
        <AnimatedGrid />
        <div aria-hidden className="pointer-events-none absolute -top-32 left-[8%] h-[560px] w-[560px] rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
        <div aria-hidden className="pointer-events-none absolute top-[10%] right-[6%] h-[420px] w-[420px] rounded-full bg-[#00d4ff]/[0.05] blur-[130px]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
            <div className="max-w-2xl space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ed957] opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7ed957]" />
                </span>
                The AI Business Operating System
              </div>
              <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="block text-white">Add it one place.</span>
                <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  Have it everywhere.
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-white/75">
                Create a task in 0nCore. It appears in Slack, your calendar, your CRM, and your
                phone — instantly. Update it anywhere. Every connected tool stays in sync, in
                real time, <strong className="text-white">with zero glue code.</strong>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
                >
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/install"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
                >
                  Browse integrations
                </Link>
              </div>
            </div>
            {/* Trigger-burst render — one press, every system fires */}
            <div className="relative hidden lg:block">
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 mx-auto h-[420px] w-[420px] translate-y-6 rounded-full bg-[#7ed957]/[0.08] blur-[120px]" />
              <TriggerBurst />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SYNC POINTS ══════════════════════════════════════════════ */}
      <section className="border-b border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-14">
          <div className="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white/40">
            Syncs with everything you already use
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SYNC_POINTS.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <AnimatedConnectors intensity={0.2} />
        <div className="relative mx-auto max-w-7xl space-y-12 px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <span className="inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">
              What it does
            </span>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                Pick the outcome. It routes the rest.
              </span>
            </h2>
            <p className="text-sm text-white/55">
              One sentence in. The platform fans it out across every connected service.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c, i) => {
              const accents = ['#7ed957', '#00d4ff', '#a78bfa']
              const color = accents[i % accents.length]
              return (
                <div
                  key={c.title}
                  className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur transition-colors hover:border-white/[0.18]"
                >
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0d1117]"
                    style={{ borderColor: `${color}40`, boxShadow: `0 0 24px ${color}22` }}
                  >
                    <c.icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div className="text-lg font-black tracking-tight text-white">{c.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{c.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ ECOSYSTEM PROMISE ════════════════════════════════════════ */}
      <section className="border-y border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.05] p-10 text-center backdrop-blur md:p-14">
            <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#7ed957]/10 blur-[120px]" />
            <div className="relative space-y-6">
              <h2 className="text-balance text-3xl font-black tracking-tight sm:text-4xl">
                <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  Keep your tools. Add the brain.
                </span>
              </h2>
              <p className="leading-relaxed text-white/70">
                Keep using Slack. Keep using Google Calendar. Keep using your CRM. 0nCore
                connects to all of them and adds the AI layer none of them have on their own.
              </p>
              <p className="text-base font-semibold text-white">
                Add it one place. Have it everywhere.
                <br />
                <span className="text-[#7ed957]">That is the promise. That is the product.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.08] blur-[130px]" />
        <div className="relative mx-auto max-w-7xl space-y-6 px-6 py-24 text-center">
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Ready?
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-white/65">
            Live now. Free tier, no credit card. Connect your tools and watch everything sync.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
