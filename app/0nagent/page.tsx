import type { Metadata } from 'next'
import {
  Terminal, Users, Workflow, ListChecks, TrendingUp, Gauge,
  ShieldCheck, Zap, ArrowRight,
} from 'lucide-react'
import AgentVideo from './AgentVideo'
import RequestAccessButton from '@/components/RequestAccessButton'

/**
 * /0nagent — the Agency Command Center walkthrough.
 *
 * A single page whose job is to get the video watched. Everything under it
 * answers the question the video creates ("what is this, and what does it cost
 * me"), and nothing on the page asks for a form before it has earned one.
 *
 * BLUF first, per the SXO standard: the bottom line is in the first two
 * sentences, above the fold, before any feature list.
 */

export const metadata: Metadata = {
  title: '0nAgent — the agency command center, inside your CRM',
  description:
    'Run your whole agency from one command bar inside the CRM you already use. Provision clients, launch onboarding, build sites and post social — free to install, pay only for what you run.',
  openGraph: {
    title: '0nAgent — the agency command center, inside your CRM',
    description:
      'One command bar. New clients provisioned, onboarding launched, sites built. Free to install, pay per use.',
    url: 'https://www.0ncore.com/0nagent',
    images: ['/video/agency-command-center-poster.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '0nAgent — the agency command center, inside your CRM',
    description: 'One command bar for the whole agency. Free to install, pay per use.',
    images: ['/video/agency-command-center-poster.jpg'],
  },
  alternates: { canonical: 'https://www.0ncore.com/0nagent' },
}

const TILES = [
  {
    icon: Terminal,
    name: 'Command Chat',
    what: 'Say what you want in a sentence. It plans the work, shows you the plan, and runs it once you approve.',
  },
  {
    icon: Users,
    name: 'New Clients',
    what: 'Describe the client in a paragraph. The sub-account, snapshot, team and first email are assembled for you.',
  },
  {
    icon: Workflow,
    name: 'Onboarding Flows',
    what: 'A flowchart you edit in place. Welcome email, wait, activation, setup call — click any step to change it.',
  },
  {
    icon: ListChecks,
    name: 'Tasks',
    what: 'One list for people, automations and AI agents. Assign work to whichever makes sense.',
  },
  {
    icon: TrendingUp,
    name: 'Grow',
    what: 'Upsell and cross-sell plays per client, launched straight from the command bar.',
  },
  {
    icon: Gauge,
    name: 'Plan & Usage',
    what: 'Every client you have switched on, what you have run this month, and exactly what it cost.',
  },
]

const FAQ = [
  {
    q: 'What does it cost?',
    a: 'Installing is free. You pay only when something runs — a site built, a client provisioned, a post scheduled. Every plan shows its cost before you approve it, and nothing bills if it fails.',
  },
  {
    q: 'Do I have to leave my CRM?',
    a: 'No. 0nAgent opens inside it as a page. It knows who you are the moment it loads, so there is no second login and no second tab.',
  },
  {
    q: 'Can I resell this to my clients?',
    a: 'Yes. Set your own markup on the usage prices and bill your clients through the platform you already use. Your margin, your invoice.',
  },
  {
    q: 'Does it match my branding?',
    a: 'If you white-label your platform, 0nAgent picks up your logo automatically. Your brand on the surface, our engine underneath.',
  },
  {
    q: 'What happens if I uninstall?',
    a: 'Access ends and billing stops the same day. Your CRM data is yours and stays where it is — 0nAgent never held it hostage.',
  },
]

export default function AgentPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/25 bg-[#6EE05A]/10 px-3.5 py-1.5">
          <Zap className="h-3.5 w-3.5 text-[#6EE05A]" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wide text-[#6EE05A]">
            Agency Command Center
          </span>
        </div>

        <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
          Run the whole agency from one line of text.
        </h1>

        {/* BLUF — the answer before the pitch. */}
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#8b949e] sm:text-xl">
          0nAgent installs into the CRM you already use and gives you a single command bar.
          Type what you want — a client provisioned, onboarding launched, a site built — and it
          plans the work, prices it, and runs it once you say go.{' '}
          <span className="text-[#e6edf3]">
            Free to install. You pay only for what actually runs.
          </span>
        </p>

        <div className="mt-9">
          <AgentVideo />
        </div>
      </section>

      {/* What is inside */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Six tiles. No page you have to go find.</h2>
        <p className="mt-3 max-w-2xl text-[#8b949e]">
          Everything happens where you are standing — tiles open into modals, and you finish the
          job without navigating away.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => {
            const Icon = t.icon
            return (
              <div
                key={t.name}
                className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6 transition-colors hover:border-[#6EE05A]/40"
              >
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#6EE05A]/20 bg-[#6EE05A]/10">
                  <Icon className="h-5 w-5 text-[#6EE05A]" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8b949e]">{t.what}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pricing shape — stated plainly rather than as a table of tiers nobody reads */}
      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-7 sm:p-10">
          <div className="flex items-start gap-4">
            <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#6EE05A]/20 bg-[#6EE05A]/10">
              <ShieldCheck className="h-5 w-5 text-[#6EE05A]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Free to install. Priced per thing done.</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-[#8b949e]">
                There is no seat fee and no monthly minimum. A plan shows you what it will cost
                before you approve it, a failed step never bills, and you can see every charge
                against the client it belongs to. If you want to resell, set your markup and the
                platform bills your client for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — real questions, answered in plain language. Also the FAQPage schema below. */}
      <section className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Questions worth asking</h2>
        <dl className="mt-8 divide-y divide-[#30363d]">
          {FAQ.map((f) => (
            <div key={f.q} className="py-6">
              <dt className="text-lg font-semibold">{f.q}</dt>
              <dd className="mt-2 leading-relaxed text-[#8b949e]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Close */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div className="rounded-2xl border border-[#6EE05A]/25 bg-gradient-to-br from-[#6EE05A]/10 to-transparent p-8 sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Want it on your agency first?</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[#8b949e]">
            0nAgent is in private release while we run it on our own agency every day. Tell us
            about yours and we will get you in the next group.
          </p>
          <div className="mt-7">
            <RequestAccessButton source="0nagent" />
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'VideoObject',
                name: 'Agency Command Center — 0nAgent walkthrough',
                description:
                  'A walkthrough of 0nAgent: one command bar inside your CRM that provisions clients, launches onboarding, builds sites and posts social.',
                thumbnailUrl: 'https://www.0ncore.com/video/agency-command-center-poster.jpg',
                contentUrl: 'https://www.0ncore.com/video/agency-command-center.mp4',
                uploadDate: '2026-08-03',
                duration: 'PT4M',
              },
              {
                '@type': 'FAQPage',
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
    </main>
  )
}
