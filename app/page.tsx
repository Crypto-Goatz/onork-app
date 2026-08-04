import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  FileType2,
  Image as ImageIcon,
  Lock,
  Palette,
  Share2,
  Sparkles,
} from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'
import Hero from '@/components/home/Hero'
import CommandCenterVideo from '@/components/CommandCenterVideo'
import AgencyDashboardSection, { AGENCY_DASHBOARD_FAQ } from '@/components/home/AgencyDashboardSection'

/**
 * 0nCore homepage — repositioned to what this product actually is.
 *
 * IT WAS SELLING THE WRONG THING. The page led with "1,640+ tools, 109 services,
 * universal AI orchestration" — that is 0nMCP's pitch, not 0nCore's, and it is
 * abstract to anyone who is not already a developer. 0nCore's job is the profile:
 * one free, organised home for a company's brand.
 *
 * THE COPY IS A LADDER, deliberately, because the remarkable part is not
 * believable if you open with it:
 *   1. Store it    — obvious, immediately useful, free
 *   2. Share it    — solves a real daily annoyance
 *   3. Connect it  — the apps you use, encrypted, same place
 *   4. THE PAYOFF  — every new app is already yours before you touch it
 * Lead with 4 and it reads as marketing. Arrive at it after three things the
 * reader already agreed with, and it lands.
 *
 * DESIGN: built to docs/0n-design-system.md, which is authoritative. Notably it
 * BANS gradient text, glow halos, rounded-full cards and inline styles — an
 * earlier draft of this page used all four. Tokens only: page #0d1117, cards
 * #161b22, borders #30363d, primary #6EE05A, text #e6edf3 / #c9d1d9 / #8b949e.
 *
 * SXO checklist (docs/SXO-CRO9-Master-Playbook.md): BLUF, living-DOM marker,
 * comparison table in the first viewport, FAQPage + HowTo schema, internal link
 * cluster. CRO9 embed is already in app/layout.tsx.
 */

const SITE = 'https://www.0ncore.com'
const title = '0nCore — the AI agency CRM: run every client from one chat'
const description =
  'Run every client account from one chat. 0nCore plans the work, prices it, and runs it once you approve — free to install, pay only for what runs.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: SITE },
  openGraph: { title, description, url: SITE, type: 'website' },
  keywords: [
    'AI agency CRM',
    'agency command center',
    'manage all client accounts one dashboard',
    'AI CRM for agencies',
    'agency automation software',
    '0nCore',
    'GHL agency dashboard',
    'GoHighLevel agency dashboard',
    'manage all GHL sub-accounts',
    'GHL cross-account reporting',
    'GHL agency command center',
  ],
  other: {
    // Living DOM marker — tells the CRO9 mutation engine this page is
    // variant-eligible. Required on every family page.
    'cro9:living': '1',
  },
}

const FAQS = [
  { q: 'What is 0nCore?', a: '0nCore is an AI command centre for agencies. It installs into the CRM you already use and lets you run work across every client account from one chat — send the campaign, book the calls, move the stalled deals, build the landing page, provision the new client.' },
  { q: 'Do I have to leave my CRM?', a: 'No. 0nCore opens inside it as a page and knows who you are the moment it loads, so there is no second login and no second tab.' },
  { q: 'What does it cost?', a: 'Installing is free. You pay only when something runs — a site built, a client provisioned, a post scheduled. Every plan shows its cost before you approve it, and a step that fails is never billed.' },
  { q: 'Can I mark it up and resell it?', a: 'Yes. Set your own markup on the usage prices and bill your clients through the platform you already use. Your margin, your invoice.' },
  { q: 'Can it act on several clients at once?', a: 'That is the point of it. One instruction becomes one step per client, run together, with a receipt against each account. No native agency view can do this.' },
  { q: 'Does it act without asking?', a: 'Never. You see the plan and the price first, nothing sends to a whole list without you confirming, and uninstalling ends access and billing the same day.' },
  { q: 'What is the one login worth?', a: 'The same account carries you into 0nTask, web0n, social0n and CRO9 — sign in once and every tool already knows who you are, which brand is yours and which clients you manage.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE}/#organization`, name: '0nCore', legalName: 'RocketOpp LLC', url: SITE },
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: SITE, name: '0nCore', publisher: { '@id': `${SITE}/#organization` } },
    {
      '@type': 'SoftwareApplication',
      name: '0nCore',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE,
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free' },
    },
    {
      '@type': 'HowTo',
      name: 'How to run every client account from one chat with 0nCore',
      description: 'Install it into your CRM, switch on the clients you manage, then say what you want done.',
      totalTime: 'PT5M',
      estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Install it', text: 'Add 0nCore to your agency. Installing is free and it opens inside the CRM you already use.' },
        { '@type': 'HowToStep', position: 2, name: 'Switch on your clients', text: 'Choose which sub-accounts 0nCore may act on. Nothing touches an account you have not switched on.' },
        { '@type': 'HowToStep', position: 3, name: 'Say what you want', text: 'Name the clients and the outcome in one sentence. It splits the work per account and prices it.' },
        { '@type': 'HowToStep', position: 4, name: 'Approve it', text: 'Read the plan and the cost, then approve. Every step leaves a receipt against the right client.' },
      ],
    },
    { '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
}

const SWATCHES = [
  { name: 'Primary', hex: '#6EE05A', cls: 'bg-[#6EE05A]' },
  { name: 'Ink', hex: '#0d1117', cls: 'bg-[#0d1117]' },
  { name: 'Accent', hex: '#58a6ff', cls: 'bg-[#58a6ff]' },
  { name: 'Paper', hex: '#e6edf3', cls: 'bg-[#e6edf3]' },
]

const LADDER = [
  { step: '01', icon: ImageIcon, title: 'Store it', body: 'Every logo variant, your colour values, your fonts, your company details. One place, organised, free.' },
  { step: '02', icon: Share2, title: 'Share it', body: 'Send a designer, printer or new hire a link. They get the right files without an account and without you digging through email.' },
  { step: '03', icon: Lock, title: 'Connect it', body: 'Your apps live here too — CRM, Google, Slack, Stripe — encrypted in your vault. Connect once, revoke once.' },
  { step: '04', icon: Sparkles, title: 'Then it just shows up', body: 'Open any 0n app and it is already yours. Your logo, your colours, your details — set before you touch it.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <Hero />

        {/* The walkthrough. Poster-first so the hero paints before 20 MB does. */}
        <section className="py-8">
          <CommandCenterVideo caption="0nCORE running a real agency — the full walkthrough." />
        </section>

        {/* Primary SEO surface: the agency dashboard query cluster. */}
        <AgencyDashboardSection />


        {/* ─── Table trap: comparison inside the first viewport region ─── */}
        <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
          <h2 className="text-xl font-semibold text-[#e6edf3]">Opening a new tool, either way</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th scope="col" className="pb-3 pr-4 font-medium text-[#8b949e]">Step</th>
                  <th scope="col" className="pb-3 pr-4 font-medium text-[#8b949e]">Everywhere else</th>
                  <th scope="col" className="pb-3 font-medium text-[#6EE05A]">With 0nCore</th>
                </tr>
              </thead>
              <tbody className="text-[#c9d1d9]">
                {[
                  ['Your logo', 'Find it, then upload it again', 'Already there'],
                  ['Your colours', 'Hunt for the hex codes', 'Already set'],
                  ['Company details', 'Retype the address', 'Already filled in'],
                  ['Connected apps', 'Reconnect each one', 'Already connected'],
                  ['Time to useful', 'Half an hour, if you are lucky', 'Immediately'],
                ].map(([a, b, c]) => (
                  <tr key={a} className="border-b border-[#30363d] last:border-0">
                    <th scope="row" className="py-3 pr-4 font-medium text-[#e6edf3]">{a}</th>
                    <td className="py-3 pr-4 text-[#8b949e]">{b}</td>
                    <td className="py-3">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─────────────── The ladder ─────────────── */}
        <section id="how" className="space-y-6 py-6">
          <div>
            <h2 className="text-xl font-semibold text-[#e6edf3]">It starts boring. Stay with it.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#c9d1d9]">
              The first two are just useful. The fourth is the reason people move their whole
              business onto it.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {LADDER.map((s, i) => {
              const last = i === LADDER.length - 1
              return (
                <div
                  key={s.step}
                  className={`rounded-xl border bg-[#161b22] p-5 transition-colors ${
                    last ? 'border-[#6EE05A]/40' : 'border-[#30363d] hover:border-[#484f58]'
                  }`}
                >
                  <span className={`font-mono text-xs ${last ? 'text-[#6EE05A]' : 'text-[#8b949e]'}`}>
                    {s.step}
                  </span>
                  <s.icon className={`mt-3 h-5 w-5 ${last ? 'text-[#6EE05A]' : 'text-[#8b949e]'}`} />
                  <h3 className="mt-3 text-base font-medium text-[#e6edf3]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#c9d1d9]">{s.body}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─────────────── The payoff ─────────────── */}
        <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 md:p-8">
          <p className="text-xs text-[#6EE05A]">The part that sounds made up</p>
          <h2 className="mt-3 max-w-3xl text-xl font-semibold text-[#e6edf3]">
            One account. Every tool already knows you.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#c9d1d9]">
            Not a second signup. Not another password. You open any tool in the stack and it is
            already yours — your clients, your brand, your connected apps — because it read them
            from your 0nCore account before the page rendered. Build a site, schedule a month of
            social, hand a task to an agent: same login, same clients, no re-setup anywhere.
          </p>
          <p className="mt-4 text-sm text-[#8b949e]">
            Works across{' '}
            <Link href="https://www.0ntask.com" className="text-[#58a6ff] hover:underline">0nTask</Link>,{' '}
            <Link href="https://web0n.com" className="text-[#58a6ff] hover:underline">web0n</Link>,{' '}
            <Link href="https://www.cro9.com" className="text-[#58a6ff] hover:underline">CRO9</Link>,{' '}
            <Link href="https://www.0nmcp.com" className="text-[#58a6ff] hover:underline">0nMCP</Link>{' '}
            and everything that follows.
          </p>
        </section>

        {/* ─────────────── FAQ ─────────────── */}
        <section className="space-y-4 py-6">
          <h2 className="text-xl font-semibold text-[#e6edf3]">Questions</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-[#30363d] bg-[#161b22] p-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-medium text-[#e6edf3]">
                  {f.q}
                  <span className="shrink-0 text-[#6EE05A] group-open:hidden">+</span>
                  <span className="hidden shrink-0 text-[#6EE05A] group-open:block">&minus;</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#c9d1d9]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ─────────────── Close ─────────────── */}
        <section className="rounded-xl border border-[#6EE05A]/40 bg-[#161b22] p-8 text-center">
          <h2 className="text-xl font-semibold text-[#e6edf3]">Put your brand somewhere sensible.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#c9d1d9]">
            Free, about three minutes, and you will never send someone the wrong logo again.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-6 py-3 text-sm font-medium text-[#0d1117] transition-colors hover:bg-[#5bc74a]"
          >
            Set up my brand — free <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: AGENCY_DASHBOARD_FAQ.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      <SiteFooter />
    </main>
  )
}
