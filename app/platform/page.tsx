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
    <main className="bg-[#0d1117] text-[#c9d1d9] font-sans antialiased min-h-screen">
      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
            <div className="max-w-2xl space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/30 bg-[#6EE05A]/10 px-3 py-1 text-xs font-medium text-[#6EE05A]">
                The AI Business Operating System
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#e6edf3] leading-[1.1]">
                Add it one place.
                <br />
                <span className="text-[#6EE05A]">Have it everywhere.</span>
              </h1>
              <p className="text-lg text-[#c9d1d9] leading-relaxed max-w-2xl">
                Create a task in 0nCore. It appears in Slack, your calendar, your CRM, and your
                phone — instantly. Update it anywhere. Every connected tool stays in sync, in
                real time, with zero glue code.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
                >
                  Start free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/install"
                  className="inline-flex items-center gap-2 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-5 py-2.5 hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
                >
                  Browse integrations
                </Link>
              </div>
            </div>
            {/* Trigger-burst render — one press, every system fires */}
            <div className="relative hidden lg:block">
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 mx-auto h-[420px] w-[420px] translate-y-6 rounded-full bg-[#6EE05A]/[0.07] blur-[120px]" />
              <TriggerBurst />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SYNC POINTS ══════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
          <div className="text-center text-xs font-medium text-[#8b949e] uppercase tracking-wider">
            Syncs with everything you already use
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SYNC_POINTS.map((s) => (
              <span
                key={s}
                className="inline-flex items-center bg-[#6EE05A]/10 text-[#6EE05A] text-xs font-medium px-3 py-1.5 rounded-full border border-[#6EE05A]/20"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
              What 0nCore does for you
            </h2>
            <p className="text-[#8b949e]">
              Pick the outcome. The platform routes it across every connected service.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#484f58] hover:bg-[#1c2128] hover:-translate-y-px hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
              >
                <c.icon className="w-6 h-6 text-[#6EE05A]" />
                <div className="mt-4 text-base font-medium text-[#e6edf3]">{c.title}</div>
                <p className="mt-2 text-sm text-[#c9d1d9] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ECOSYSTEM PROMISE ════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 md:p-14 max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
              Keep your tools. Add the brain.
            </h2>
            <p className="text-[#c9d1d9] leading-relaxed">
              Keep using Slack. Keep using Google Calendar. Keep using your CRM. 0nCore
              connects to all of them and adds the AI layer none of them have on their own.
            </p>
            <p className="text-base font-medium text-[#e6edf3]">
              Add it one place. Have it everywhere.
              <br />
              <span className="text-[#6EE05A]">That is the promise. That is the product.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CTA ══════════════════════════════════════════════════════ */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">Ready?</h2>
          <p className="text-[#c9d1d9] max-w-xl mx-auto">
            Live now. Free tier, no credit card. Connect your tools and watch everything
            sync.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
            >
              Start free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-5 py-2.5 hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
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
