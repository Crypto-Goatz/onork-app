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
const title = '0nCore — Your Company Brand, Free and In One Place'
const description =
  'A free, organised home for your logo, colours, fonts and company details. Then every 0n app you open is already set up to look like you.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: SITE },
  openGraph: { title, description, url: SITE, type: 'website' },
  keywords: [
    'brand asset management',
    'free brand kit storage',
    'company brand assets',
    'brand guidelines storage',
    'logo storage',
    '0nCore',
  ],
  other: {
    // Living DOM marker — tells the CRO9 mutation engine this page is
    // variant-eligible. Required on every family page.
    'cro9:living': '1',
  },
}

const FAQS = [
  { q: 'What is 0nCore?', a: '0nCore is a free place to store your company brand — logo, colours, fonts and the details that go on everything — in one organised location, so everyone and everything uses the same version.' },
  { q: 'Is it really free?', a: 'Yes. Storing your brand and using it across 0n apps is free. There is nothing to pay for the core of it.' },
  { q: 'What can I store?', a: 'Logos in every variant you need, colour palettes with the actual values, fonts, and your company details — name, address, phone, social links, the boilerplate you retype constantly.' },
  { q: 'What does "already configured" mean?', a: 'When you open another 0n app it reads your brand from your 0nCore profile, so it already has your logo, your colours and your details. You do not upload anything or pick colours again.' },
  { q: 'Who can see my brand assets?', a: 'You do. Assets are private by default, and you can share a link with a designer, printer or agency without giving them an account.' },
  { q: 'Where are my connected apps stored?', a: 'In the 0nVault, encrypted at rest under your account. Connect a service once and every 0n app can use it — and revoking it once revokes it everywhere.' },
  { q: 'Do I need to be technical?', a: 'No. If you can upload a logo and pick a colour, you can use all of it.' },
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
      name: 'How to set up your company brand in 0nCore',
      description: 'Store your brand once, then every 0n app opens already configured to it.',
      totalTime: 'PT3M',
      estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Store it', text: 'Upload your logo variants, colour values, fonts and company details.' },
        { '@type': 'HowToStep', position: 2, name: 'Share it', text: 'Send a designer, printer or new hire a link to the right files — no account needed.' },
        { '@type': 'HowToStep', position: 3, name: 'Connect it', text: 'Connect the apps you use. They are encrypted in your 0nVault.' },
        { '@type': 'HowToStep', position: 4, name: 'Open any 0n app', text: 'It reads your brand from your profile and is already set up.' },
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
        {/* ─────────────── Hero ─────────────── */}
        <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-[#6EE05A]/30 bg-[#6EE05A]/10 px-3 py-1 text-xs font-medium text-[#6EE05A]">
              <Check className="h-3.5 w-3.5" /> Free — no card
            </span>

            <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-[#e6edf3] md:text-4xl">
              Your company brand. One place. Free.
            </h1>

            {/* BLUF — the sentence an AI answer can lift whole. */}
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#c9d1d9]">
              0nCore is a free, organised home for your logo, colours, fonts and company details —
              so everyone and everything uses the same version. No more hunting for the right file,
              and no more sending someone the old logo.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6EE05A] px-6 py-3 text-sm font-medium text-[#0d1117] transition-colors hover:bg-[#5bc74a]"
              >
                Set up my brand — free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#30363d] px-6 py-3 text-sm font-medium text-[#c9d1d9] transition-colors hover:border-[#484f58]"
              >
                See how it works
              </Link>
            </div>

            <p className="mt-4 text-xs text-[#8b949e]">
              About three minutes. You can add the rest later.
            </p>
          </div>

          {/* The demo IS a brand kit — the page shows one rather than describing it. */}
          <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
            <p className="text-xs text-[#8b949e]">Your brand kit</p>

            <div className="mt-4 flex items-center gap-4 rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#6EE05A] text-base font-semibold text-[#0d1117]">
                0n
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-[#e6edf3]">Your Company</p>
                <p className="truncate text-xs text-[#8b949e]">yourcompany.com</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {SWATCHES.map((s) => (
                <div key={s.name} className="rounded-lg border border-[#30363d] p-2">
                  <div className={`h-12 w-full rounded ${s.cls}`} />
                  <p className="mt-2 truncate text-xs text-[#c9d1d9]">{s.name}</p>
                  <p className="truncate font-mono text-xs text-[#8b949e]">{s.hex}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#30363d] p-4">
                <FileType2 className="h-4 w-4 text-[#8b949e]" />
                <p className="mt-2 text-2xl font-semibold leading-none text-[#e6edf3]">Aa</p>
                <p className="mt-1 text-xs text-[#8b949e]">Headings</p>
              </div>
              <div className="rounded-lg border border-[#30363d] p-4">
                <Palette className="h-4 w-4 text-[#8b949e]" />
                <p className="mt-2 text-sm text-[#c9d1d9]">Logo · 6 variants</p>
                <p className="mt-1 text-xs text-[#8b949e]">SVG, PNG, mono</p>
              </div>
            </div>
          </div>
        </section>

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
            Open a brand-new app and it is already yours.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#c9d1d9]">
            Not a theme you pick afterwards. Not a logo you upload again. You open it and your
            colours are already there, your logo is already in the corner, and your company details
            are already filled in — because it read them from your 0nCore profile before the page
            rendered.
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

      <SiteFooter />
    </main>
  )
}
