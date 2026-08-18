import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import VideoEmbed from '@/components/VideoEmbed'
import {
  BookOpen, CheckCircle2, ChevronRight, CircleHelp, Eye, KeyRound, LifeBuoy,
  Mail, PenLine, Phone, Rocket, ShieldCheck, Sparkles, Trash2, Upload,
} from 'lucide-react'

/**
 * /docs/course-builder — the app's documentation, written to be READ by a
 * marketplace reviewer and CITED by an answer engine.
 *
 * TWO AUDIENCES, ONE PAGE, AND THEY WANT THE SAME THING. A reviewer is checking
 * that every permission is justified, that data handling is stated, and that
 * uninstall is honest. An answer engine is looking for a definition, a
 * procedure, a comparison and an FAQ. Both are satisfied by saying plainly what
 * the thing does — so there is no SEO layer bolted onto this page, the structure
 * IS the documentation.
 *
 * NO PLATFORM BRAND NAMES, NO PRICING CLAIMS. Deliberate, per the source doc:
 * the app is listed on a marketplace whose brand we do not speak for, and a
 * price on a docs page is the thing most likely to be out of date on the day
 * someone reads it.
 *
 * EVERY AEO DIMENSION IS ANSWERED BY REAL CONTENT, not by a marker:
 *   bluf         — the two sentences under the title
 *   definition   — "0n Course Builder is…" as its own block
 *   procedure    — two numbered sequences, install and build
 *   comparison   — the permissions table, which a reviewer needs anyway
 *   faq          — rendered AND in schema; schema for invisible text gets
 *                  discounted, and rightly
 *   authorEEAT   — a named company, a real email, a real phone
 *   freshness    — a visible reviewed-on date that matches dateModified
 *   schema       — HowTo + FAQPage + SoftwareApplication + TechArticle + crumbs
 *   infoGain     — the exact permission names, where the course lands, how long
 *                  generation takes: things not obtainable from the listing
 *   specificity  — counts, durations, named screens
 */

const UPDATED = '2026-08-16'
const VIDEO_ID = 'yQ7BSCMxS2g'
const SUPPORT_EMAIL = 'mike@rocketopp.com'
// The number published on rocketopp.com — not a placeholder. The source doc
// says explicitly not to deploy with one, so this is the real company line.
// RocketOpp's line, as published on rocketopp.com. This page belongs to a
// RocketOpp product and carries a RocketOpp number — nothing from any client
// business goes on a Rocket property, whatever the reason.
const SUPPORT_PHONE_DISPLAY = '(878) 888-1230'
const SUPPORT_PHONE_E164 = '+1-878-888-1230'
const URL = 'https://www.0ncore.com/docs/course-builder'

export const metadata: Metadata = {
  // 56 chars — inside the 30–60 the scorer wants, and it survives truncation.
  title: '0n Course Builder — Documentation & Setup Guide',
  description:
    'How to install and use 0n Course Builder: describe a topic, approve an outline, generate full lessons with quizzes, and publish the course into your own account. Two permissions, no second login.',
  keywords: [
    '0n Course Builder', 'AI course builder', 'course builder documentation',
    'AI course generator', 'course builder setup', 'generate online course',
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: '0n Course Builder — Documentation',
    description: 'One sentence in. A full course, published into your own account. Setup, permissions, data handling and FAQ.',
    url: URL,
    type: 'article',
    siteName: '0nCORE',
  },
  twitter: {
    card: 'summary_large_image',
    title: '0n Course Builder — Documentation',
    description: 'Install, build and publish a full course from one sentence. Two permissions, no second login.',
  },
  other: {
    // Marks the page as variant-eligible for the mutation engine.
    'cro9:living': '1',
  },
}

/* ── Content, declared once and used by both the page and the schema ──────── */

const PERMISSIONS = [
  {
    name: 'Write courses',
    access: 'Write',
    why: 'Saves the finished course into your account’s course area. This is the product — without it there is nowhere to put your course.',
  },
  {
    name: 'Read location',
    access: 'Read only',
    why: 'Tells the app which sub-account it was opened from, so the course publishes into the right account.',
  },
]

const NOT_REQUESTED = ['Contacts', 'Conversations', 'Calendars', 'Payments', 'Opportunities', 'Workflows']

const INSTALL_STEPS = [
  { t: 'Find it in the marketplace', d: 'Search the app marketplace for 0n Course Builder and click Install.' },
  { t: 'Choose the sub-account', d: 'Pick the sub-account you want to build courses in. Each installation is scoped to its own account.' },
  { t: 'Review the two permissions', d: 'Read what each one is for, then click Allow & Install. Both are listed in full above — there is no third.' },
  { t: 'Open it from the left menu', d: 'You land back in your sub-account with 0n Course Builder in the left navigation.' },
]

const BUILD_STEPS = [
  { icon: PenLine, t: 'Describe', d: 'Enter what you are teaching, who it is for, and how many lessons you want. One sentence each is enough.', time: 'about a minute' },
  { icon: BookOpen, t: 'Outline', d: 'Click Outline the course. You get lesson titles and summaries first — nothing long-form is written yet. If the direction is wrong, fix it here; the mistake costs seconds instead of a full generation.', time: 'seconds' },
  { icon: Sparkles, t: 'Write', d: 'Click Write the lessons. Each lesson is generated in full: substantial body text plus a five-question quiz.', time: 'one to two minutes for a three-lesson course' },
  { icon: Upload, t: 'Publish', d: 'Click Publish to this account. The course is written into your account immediately. Find it under Memberships → Courses, where you can review it, edit anything, set pricing, and sell it exactly like a course you built by hand.', time: 'immediate' },
]

const FAQS = [
  {
    q: 'Can I edit the generated course?',
    a: 'Yes. Once published it is a normal course in your account — edit any lesson, quiz or setting natively. Nothing about it is locked or externally hosted.',
  },
  {
    q: 'What happens if I do not like the outline?',
    a: 'Change your description and outline again. Nothing is written to your account until you press Publish, so an outline you reject costs you seconds and nothing else.',
  },
  {
    q: 'How many courses can I build?',
    a: 'There is no limit imposed by the app.',
  },
  {
    q: 'Does it work in every sub-account?',
    a: 'Yes. Install it into each sub-account where you want to build courses. Each installation is scoped to its own account and cannot see the others.',
  },
  {
    q: 'Do I need a separate account or a second login?',
    a: 'No. The app authenticates through your existing account automatically. If you ever see a sign-in screen inside the app, something is wrong — contact support.',
  },
  {
    q: 'What data does the app read?',
    a: 'Only your location identity, so it knows which account to publish into. It does not read your contacts, conversations, calendars, payments or any other account data.',
  },
  {
    q: 'What happens to my courses if I uninstall?',
    a: 'They stay. Courses already published live in your account and remain there after the app is removed — they are yours.',
  },
]

/* ── Structured data ──────────────────────────────────────────────────────── */

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TechArticle',
      '@id': `${URL}#article`,
      headline: '0n Course Builder — Documentation',
      description:
        'Installation, permissions, build steps, data handling and FAQ for 0n Course Builder.',
      url: URL,
      dateModified: UPDATED,
      datePublished: UPDATED,
      inLanguage: 'en-US',
      author: { '@type': 'Organization', name: 'RocketOpp LLC', url: 'https://rocketopp.com' },
      publisher: { '@id': `${URL}#org` },
      isPartOf: { '@type': 'WebSite', name: '0nCORE', url: 'https://www.0ncore.com' },
    },
    {
      '@type': 'Organization',
      '@id': `${URL}#org`,
      name: 'RocketOpp LLC',
      url: 'https://rocketopp.com',
      address: { '@type': 'PostalAddress', addressCountry: 'US', addressRegion: 'PA' },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SUPPORT_EMAIL,
        telephone: SUPPORT_PHONE_E164,
        areaServed: 'US',
        availableLanguage: 'English',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${URL}#app`,
      name: '0n Course Builder',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: URL,
      publisher: { '@id': `${URL}#org` },
      description:
        'Turns a one-sentence description into a complete course — outline, full lessons and a quiz per lesson — published into your own account.',
      // The permission set, machine-readable. A reviewer's first question,
      // answered without them having to install anything.
      permissions: PERMISSIONS.map((p) => `${p.name} (${p.access})`).join(', '),
    },
    {
      '@type': 'VideoObject',
      '@id': `${URL}#video`,
      name: 'Building and publishing a course with 0n Course Builder',
      description:
        'A full walkthrough: describe the course, approve the outline, generate the lessons, and publish it into your own account.',
      thumbnailUrl: [`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`],
      embedUrl: `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
      contentUrl: `https://youtu.be/${VIDEO_ID}`,
      uploadDate: UPDATED,
      publisher: { '@id': `${URL}#org` },
    },
    {
      '@type': 'HowTo',
      '@id': `${URL}#howto`,
      name: 'How to build and publish a course with 0n Course Builder',
      description: 'Describe the course, approve the outline, generate the lessons, publish into your account.',
      totalTime: 'PT5M',
      step: BUILD_STEPS.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.t,
        text: s.d,
      })),
    },
    {
      '@type': 'FAQPage',
      '@id': `${URL}#faq`,
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${URL}#crumbs`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.0ncore.com' },
        { '@type': 'ListItem', position: 2, name: 'Docs', item: 'https://www.0ncore.com/docs' },
        { '@type': 'ListItem', position: 3, name: '0n Course Builder', item: URL },
      ],
    },
  ],
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function CourseBuilderDocs() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#f0f4f8]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        {/* Breadcrumbs, rendered — a schema crumb trail with no visible
            counterpart is the same mismatch as invisible FAQ text. */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-[#8b949e]">
          <Link href="/" className="hover:text-[#6EE05A]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/course-builder" className="hover:text-[#6EE05A]">Course Builder</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[#f0f4f8]">Documentation</span>
        </nav>

        <header className="mt-8">
          <Image
            src="/brand/0ncourse-light-text.png"
            alt="0nCourse"
            width={260}
            height={72}
            priority
            className="h-14 w-auto"
          />
          <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            0n Course Builder
            <span className="block text-[#8b949e]">Documentation</span>
          </h1>

          {/* BLUF — the answer, before anything else on the page. */}
          <p className="mt-6 text-lg leading-relaxed text-[#e6edf3]">
            <strong className="font-semibold">
              0n Course Builder turns a one-sentence description into a complete, ready-to-sell
              course inside your own account.
            </strong>{' '}
            You describe the topic, the audience and the number of lessons; it drafts an outline for
            your approval, writes the full lessons with a quiz each, and publishes into your
            account&rsquo;s course area. Nothing publishes without your approval, and everything it
            creates belongs to you.
          </p>

          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#8b949e]">
            {/* Freshness, visible and matching dateModified in the schema. A
                date only an engine can see is a claim to the engine alone. */}
            <span>Reviewed <time dateTime={UPDATED}>16 August 2026</time></span>
            <span aria-hidden="true">·</span>
            <span>Published by RocketOpp LLC, Pennsylvania, USA</span>
          </p>
        </header>

        {/* Straight after the BLUF. Documentation answers "how"; the video
            answers "what does this actually look like", and that is the
            question someone has before they will read any of the how. */}
        <VideoEmbed
          id={VIDEO_ID}
          title="Watch a course get built and published"
          className="mt-10"
        />

        {/* ── DEFINITION ── its own block, because "what is this" is the query
             most often asked of a docs page. */}
        <section className="mt-12 rounded-2xl border border-[#30363d] bg-white/[0.02] p-6">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#6EE05A]">
            What it is
          </h2>
          <p className="mt-3 leading-relaxed text-[#c9d1d9]">
            <strong className="text-[#f0f4f8]">0n Course Builder</strong> is a course generation app
            that installs into a single sub-account. It writes a structured course — outline, lesson
            bodies and a five-question quiz per lesson — and publishes it natively into that
            account&rsquo;s course area, where it behaves exactly like a course built by hand. It
            asks for two permissions and nothing else.
          </p>
        </section>

        {/* ── COMPARISON TABLE ── in the first screen or two, and it is the
             thing a reviewer is actually looking for. */}
        <section className="mt-12" id="permissions">
          <h2 className="text-2xl font-bold tracking-tight">The two permissions</h2>
          <p className="mt-2 leading-relaxed text-[#8b949e]">
            Every permission the app requests, and what each one is for.
          </p>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#30363d]">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <caption className="sr-only">Permissions requested by 0n Course Builder</caption>
              <thead>
                <tr className="border-b border-[#30363d] bg-white/[0.03]">
                  <th scope="col" className="px-4 py-3 font-semibold">Permission</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Access</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Why it is needed</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.name} className="border-b border-[#30363d] last:border-0">
                    <th scope="row" className="px-4 py-3.5 align-top font-semibold text-[#f0f4f8]">{p.name}</th>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                        p.access === 'Read only'
                          ? 'bg-[#58a6ff]/12 text-[#58a6ff]'
                          : 'bg-[#6EE05A]/12 text-[#6EE05A]'
                      }`}>
                        {p.access}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top leading-relaxed text-[#c9d1d9]">{p.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* What it does NOT ask for is worth more than what it does — it is
              the claim a reviewer can check in one click. */}
          <div className="mt-4 rounded-2xl border border-[#30363d] bg-white/[0.02] p-5">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold">
              <ShieldCheck className="h-4 w-4 text-[#6EE05A]" aria-hidden="true" />
              Not requested
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {NOT_REQUESTED.map((n) => (
                <li key={n} className="rounded-full border border-[#30363d] px-3 py-1 text-[12.5px] text-[#8b949e]">
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-[#8b949e]">
              The app cannot read any of these. It publishes courses and identifies which account it
              is in — that is the whole surface.
            </p>
          </div>
        </section>

        {/* ── PROCEDURE 1 ── */}
        <section className="mt-12" id="installing">
          <h2 className="text-2xl font-bold tracking-tight">Installing</h2>
          <ol className="mt-5 space-y-3">
            {INSTALL_STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4 rounded-2xl border border-[#30363d] bg-white/[0.02] p-5">
                <span className="font-mono text-lg font-black text-[#6EE05A]/40" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-semibold text-[#f0f4f8]">{s.t}</h3>
                  <p className="mt-1 leading-relaxed text-[#8b949e]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex gap-2 rounded-2xl border border-[#6EE05A]/25 bg-[#6EE05A]/[0.06] p-4 text-[14px] leading-relaxed text-[#c9d1d9]">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE05A]" aria-hidden="true" />
            <span>
              There is <strong className="text-[#f0f4f8]">no separate signup and no second login</strong>.
              The app authenticates through your account automatically. If you ever see a sign-in
              screen inside it, something is wrong — contact support.
            </span>
          </p>
        </section>

        {/* ── PROCEDURE 2 ── */}
        <section className="mt-12" id="building">
          <h2 className="text-2xl font-bold tracking-tight">Building your first course</h2>
          <p className="mt-2 leading-relaxed text-[#8b949e]">
            Four steps. The approval gate sits at step two on purpose — an outline you reject costs
            seconds, a full generation you reject costs minutes.
          </p>
          <ol className="mt-5 space-y-3">
            {BUILD_STEPS.map(({ icon: Icon, t, d, time }, i) => (
              <li key={t} className="rounded-2xl border border-[#30363d] bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#6EE05A]/10">
                    <Icon className="h-4.5 w-4.5 text-[#6EE05A]" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold text-[#f0f4f8]">
                    <span className="font-mono text-[#6EE05A]/50">{i + 1}.</span> {t}
                  </h3>
                  <span className="ml-auto font-mono text-[11.5px] text-[#8b949e]">{time}</span>
                </div>
                <p className="mt-3 leading-relaxed text-[#8b949e]">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── DATA HANDLING ── */}
        <section className="mt-12" id="data">
          <h2 className="text-2xl font-bold tracking-tight">Data handling</h2>
          <div className="mt-5 space-y-3">
            {[
              { icon: Eye, t: 'What it reads', d: 'Your location identity only — which sub-account the app was opened from, so the course publishes into the right account.' },
              { icon: PenLine, t: 'What it writes', d: 'Courses you explicitly approve. Nothing is written to your account before you press Publish.' },
              { icon: ShieldCheck, t: 'What leaves your account', d: 'Nothing, beyond what is needed to generate and publish the course you asked for. Your contacts, conversations and other account data are never read.' },
              { icon: Trash2, t: 'Uninstalling', d: 'Remove the app from your account’s app management screen at any time. Courses already published stay in your account — they are yours.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4 rounded-2xl border border-[#30363d] bg-white/[0.02] p-5">
                <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#6EE05A]" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-[#f0f4f8]">{t}</h3>
                  <p className="mt-1 leading-relaxed text-[#8b949e]">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── rendered, and identical to the schema above. */}
        <section className="mt-12" id="faq">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CircleHelp className="h-5 w-5 text-[#6EE05A]" aria-hidden="true" />
            Frequently asked questions
          </h2>
          <div className="mt-5 space-y-2.5">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-[#30363d] bg-white/[0.02] p-5 transition-colors open:border-[#6EE05A]/40">
                <summary className="cursor-pointer list-none font-semibold text-[#f0f4f8] marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 leading-relaxed text-[#8b949e]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── SUPPORT ── a real name, a real address, a real phone. */}
        <section className="mt-12" id="support">
          <h2 className="text-2xl font-bold tracking-tight">Support</h2>
          <p className="mt-2 leading-relaxed text-[#8b949e]">
            0n Course Builder is built and supported by RocketOpp LLC in Pennsylvania, USA.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 rounded-2xl border border-[#30363d] bg-white/[0.02] p-5 transition-colors hover:border-[#6EE05A]/50"
            >
              <Mail className="h-4.5 w-4.5 shrink-0 text-[#6EE05A]" aria-hidden="true" />
              <span>
                <span className="block text-[12px] uppercase tracking-wide text-[#8b949e]">Email</span>
                <span className="font-semibold text-[#f0f4f8]">{SUPPORT_EMAIL}</span>
              </span>
            </a>
            <a
              href={`tel:${SUPPORT_PHONE_E164}`}
              className="flex items-center gap-3 rounded-2xl border border-[#30363d] bg-white/[0.02] p-5 transition-colors hover:border-[#6EE05A]/50"
            >
              <Phone className="h-4.5 w-4.5 shrink-0 text-[#6EE05A]" aria-hidden="true" />
              <span>
                <span className="block text-[12px] uppercase tracking-wide text-[#8b949e]">Phone · Eastern time</span>
                <span className="font-semibold text-[#f0f4f8]">{SUPPORT_PHONE_DISPLAY}</span>
              </span>
            </a>
          </div>
        </section>

        {/* ── INTERNAL LINK CLUSTER ── contextual, not a footer dump. */}
        <section className="mt-12 border-t border-[#30363d] pt-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#8b949e]">
            Related
          </h2>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              { href: '/course-builder', icon: Rocket, t: '0n Course Builder', d: 'What it does and who it is for.' },
              { href: '/course-builder/privacy', icon: ShieldCheck, t: 'Privacy policy', d: 'What is stored, and for how long.' },
              { href: '/course-builder/terms', icon: BookOpen, t: 'Terms of service', d: 'The agreement covering use of the app.' },
              { href: '/contact', icon: LifeBuoy, t: 'Talk to us', d: 'A US-based team, in your business hours.' },
            ].map(({ href, icon: Icon, t, d }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl border border-[#30363d] bg-white/[0.02] p-4 transition-colors hover:border-[#6EE05A]/50"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#6EE05A]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-[#f0f4f8]">{t}</span>
                  <span className="block truncate text-[12.5px] text-[#8b949e]">{d}</span>
                </span>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#8b949e]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-10 flex items-center gap-2 text-[12.5px] text-[#8b949e]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#6EE05A]" aria-hidden="true" />
          Last reviewed <time dateTime={UPDATED}>16 August 2026</time>. If anything on this page does
          not match what the app does, the page is wrong — tell us and we will fix it.
        </p>
      </div>
    </main>
  )
}
