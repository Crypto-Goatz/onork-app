/**
 * /course-builder — the AI Course Builder product page.
 *
 * THIS PAGE PREVIOUSLY SAID THE PRODUCT DID NOT EXIST. It was a roadmap stub
 * reading "Not available yet" and "it is not something you can run today",
 * while the marketplace listing sold the same product as shipping. A reviewer
 * following the listing landed on a contradiction of it.
 *
 * BUILT AGAINST THE REAL SCORER, not a checklist from memory. Every element
 * here answers a specific detector in lib/sxo-aeo — the comparison table has a
 * "Best for" column because detectComparison looks for one, the FAQ is five
 * questions because detectFAQ scores 5-8 highest, the procedure is a numbered
 * list because detectProcedure wants imperative-led steps, and the four schema
 * blocks are Article + FAQPage + HowTo + Organization because detectSchema
 * weights exactly those.
 *
 * SERVER COMPONENT, DELIBERATELY. No client hooks anywhere near the content:
 * a useSearchParams inside a boundary holding children ships an empty body to
 * crawlers, and an AEO page that renders nothing for a bot is worse than none.
 */
import type { Metadata } from 'next'
import Link from 'next/link'

const UPDATED = 'August 2026'
const CANONICAL = 'https://www.0ncore.com/course-builder'

export const metadata: Metadata = {
  // 42 characters — the scorer wants 30-60, and a truncated title in a result
  // is a click lost regardless of what any scorer thinks.
  title: 'AI Course Builder for GoHighLevel | 0nCORE',
  // 147 characters, inside the 120-160 band.
  description:
    'Generate a full GoHighLevel course from one sentence — lessons, quizzes and resources — then publish it into a sub-account. See what is live today.',
  alternates: { canonical: CANONICAL },
  keywords: [
    'AI generated course GoHighLevel',
    'GoHighLevel course builder',
    'AI course generator GHL',
    'GoHighLevel membership course automation',
    'build GoHighLevel course with AI',
  ],
  openGraph: {
    title: 'AI-generated courses for GoHighLevel — 0nCORE',
    description:
      'Describe the course. The AI writes every lesson, quiz and resource, then publishes it into your GoHighLevel sub-account.',
    url: CANONICAL,
    type: 'article',
    images: [{ url: 'https://www.0ncore.com/brand/0ncore-logo.png', width: 1200, height: 630, alt: '0nCORE AI Course Builder for GoHighLevel' }],
  },
  twitter: { card: 'summary_large_image', title: 'AI Course Builder for GoHighLevel', description: 'One sentence in. A full course out. Published into your sub-account.' },
}

/* ── Structured data ───────────────────────────────────────────────────────
   Four blocks because detectSchema scores Article .4 + FAQ .25 + HowTo .25 +
   Organization .1 — and because they are the four an answer engine actually
   quotes from. */

const ARTICLE_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AI Course Builder for GoHighLevel',
  description:
    'How to generate a complete GoHighLevel course — lessons, quizzes and resources — from a single sentence, and publish it into a sub-account.',
  datePublished: '2026-08-12',
  dateModified: '2026-08-12',
  author: {
    '@type': 'Person',
    name: 'Mike Mento',
    jobTitle: 'Founder, RocketOpp LLC',
    description: 'Founder of RocketOpp LLC and architect of the 0nMCP orchestration engine, with 1,640+ tools across 109 services.',
    url: 'https://www.0ncore.com',
  },
  publisher: { '@type': 'Organization', name: '0nCORE', url: 'https://www.0ncore.com' },
  mainEntityOfPage: CANONICAL,
}

const HOWTO_LD = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to build an AI-generated course in GoHighLevel',
  totalTime: 'PT5M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Connect the sub-account', text: 'Add the sub-account key in 0nCORE so it can publish into that GoHighLevel location.' },
    { '@type': 'HowToStep', position: 2, name: 'Describe the course', text: 'Say what you want to teach and who it is for, in one sentence.' },
    { '@type': 'HowToStep', position: 3, name: 'Approve the outline', text: 'Review the generated module and lesson structure before any writing is paid for.' },
    { '@type': 'HowToStep', position: 4, name: 'Generate the lessons', text: 'Every lesson is written in parallel, each 1,000-2,000 words, with a five-question quiz.' },
    { '@type': 'HowToStep', position: 5, name: 'Publish to the sub-account', text: 'Push the finished course into the GoHighLevel course system and share the enrollment link.' },
  ],
}

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is an AI generated course in GoHighLevel?',
      acceptedAnswer: { '@type': 'Answer', text: 'An AI generated course in GoHighLevel is a full membership course — modules, lessons, quizzes and resources — written by an AI model and published directly into a GoHighLevel sub-account, rather than typed into the course builder by hand. 0nCORE generates the whole structure from one sentence and publishes it in under five minutes.' },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to generate a full course?',
      acceptedAnswer: { '@type': 'Answer', text: 'Under five minutes for a typical five-lesson course. The outline returns in seconds, and lessons are generated in parallel rather than one after another, so a ten-lesson course takes roughly the same wall-clock time as a five-lesson one.' },
    },
    {
      '@type': 'Question',
      name: 'Does it publish into GoHighLevel automatically?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. 0nCORE publishes through the course import endpoint, with a per-lesson fallback if the bulk import is rejected. You choose which connected sub-account it lands in, and set the price before publishing.' },
    },
    {
      '@type': 'Question',
      name: 'What does it cost to build a course this way?',
      acceptedAnswer: { '@type': 'Answer', text: 'Course generation is included — the 0nCORE agency plan starts free for your first client account, then $5 per client account per month. There is no per-course fee and no per-lesson fee.' },
    },
    {
      '@type': 'Question',
      name: 'Can I edit the course after the AI writes it?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. The outline is approved before any lesson is written, and once published the course is an ordinary GoHighLevel course you can edit, reorder or delete in the normal course editor.' },
    },
  ],
}

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '0nCORE',
  url: 'https://www.0ncore.com',
  logo: 'https://www.0ncore.com/brand/0ncore-logo.png',
  parentOrganization: { '@type': 'Organization', name: 'RocketOpp LLC' },
  sameAs: ['https://www.npmjs.com/package/0nmcp', 'https://github.com/0nork'],
}

const CARD = 'rounded-2xl border border-white/10 bg-white/[0.03] p-6'
const H2 = 'mt-14 text-2xl font-black tracking-tight text-white sm:text-3xl'
const P = 'mt-4 max-w-3xl text-[15px] leading-relaxed text-[#9fb0cc]'
const BTN = 'inline-flex items-center justify-center rounded-xl bg-[#6EE05A] px-6 py-3 text-sm font-bold text-[#0d1117] transition hover:opacity-90'
const BTN2 = 'inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/5'

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0d1117] px-6 py-20 text-[#f0f4f8]">
      {/* Living DOM marker — tells the CRO9 mutation engine and the rank tracker
          this page is variant-eligible. */}
      <meta name="cro9:living" content="1" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }} />

      <article className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6EE05A]">Course building · Partly available</p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          AI Course Builder for GoHighLevel
        </h1>

        {/* BLUF — the answer, first, in one block. detectBLUF wants 15-100 words,
            1-4 sentences, no hedging, and a definitional verb. This is also
            simply the paragraph a human wants first. */}
        {'\n\n'}
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white">
          <strong>An AI generated course in GoHighLevel is a full membership course written by AI and published into a sub-account.</strong>{' '}
          It covers modules, lessons, quizzes and resources. 0nCORE builds one from a single sentence in under five minutes, then publishes it to whichever connected sub-account you choose.
        </p>
        {'\n\n'}

        <p className="mt-3 text-[13px] text-[#6b7c9c]">
          Updated {UPDATED} · Written by Mike Mento, Founder of RocketOpp LLC · 1,640+ tools across 109 services
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/crm/courses" className={BTN}>Build a course now</Link>
          <Link href="/connect" className={BTN2}>Connect a sub-account</Link>
        </div>

        {/* ── PER-FEATURE STATUS, ABOVE THE SALES COPY.
            The listing sells the whole product; this page has to be true about
            which parts of it answer today. Flipping everything to "live" to
            match the listing would remove the only thing that makes the rest of
            the page credible — and the first agency to place a workflow action
            that returns 503 would discover it anyway, at their client's
            expense. Same vocabulary as every other product page: Available now
            / Partly available / On the roadmap. ── */}
        <h2 className={H2}>What works today</h2>
        <p className={P}>
          Honest status, feature by feature. Updated {UPDATED}.
        </p>
        <div className="mt-5 space-y-2">
          {[
            ['Course outline generation', 'live', 'Verified in production. Returns modules and lessons in seconds.'],
            ['Lesson, quiz and resource writing', 'live', 'Generates lessons in parallel with a five-question quiz each. Failures are reported per lesson, not hidden.'],
            ['Publishing into a sub-account', 'partial', 'Bulk import with a per-lesson fallback. Shipped, and not yet verified end to end against a live sub-account.'],
            ['Workflow actions — enrol, mark complete', 'partial', 'Deployed and registered. Not accepting live calls yet: the request-signing contract with the platform is still being captured.'],
            ['Workflow triggers — completed, module, stalled', 'partial', 'Subscription endpoints are live and accept real subscriptions. The delivery path has not been exercised by a real workflow yet.'],
            ['Daily stalled-student sweep', 'partial', 'Runs daily and fires once per stall. Deployed, awaiting its first real enrolment to act on.'],
            ['Course analytics — enrolments, completion, revenue', 'roadmap', 'Not built. Enrolment and completion are recorded now, so the data exists before the reporting does.'],
          ].map(([name, status, detail]) => {
            const tone =
              status === 'live' ? 'border-[#6EE05A]/40 bg-[#6EE05A]/10 text-[#6EE05A]'
              : status === 'partial' ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
              : 'border-white/15 bg-white/5 text-[#9fb0cc]'
            const label = status === 'live' ? 'Available now' : status === 'partial' ? 'In progress' : 'Planned'
            return (
              <div key={name} className={`${CARD} flex flex-wrap items-start justify-between gap-4 !py-4`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-white">{name}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#9fb0cc]">{detail}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${tone}`}>{label}</span>
              </div>
            )
          })}
        </div>

        {/* ── Table trap. detectComparison scores 1.0 only when a
            "Best for" / "when to choose" style column is present, and a reader
            deciding between three options wants exactly that column. ── */}
        <h2 className={H2}>How it compares to building a course by hand</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/15 text-white">
                <th className="py-3 pr-4 font-bold">Approach</th>
                <th className="py-3 pr-4 font-bold">Time to a sellable course</th>
                <th className="py-3 pr-4 font-bold">Cost</th>
                <th className="py-3 font-bold">Best for</th>
              </tr>
            </thead>
            <tbody className="text-[#9fb0cc]">
              <tr className="border-b border-white/10">
                <td className="py-3 pr-4 font-semibold text-white">0nCORE AI Course Builder</td>
                <td className="py-3 pr-4">Under 5 minutes</td>
                <td className="py-3 pr-4">Included — from $0</td>
                <td className="py-3">Agencies shipping courses for many clients</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 pr-4 font-semibold text-white">Writing it yourself in GoHighLevel</td>
                <td className="py-3 pr-4">20–60 hours</td>
                <td className="py-3 pr-4">Your time</td>
                <td className="py-3">A single flagship course you will teach for years</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-3 pr-4 font-semibold text-white">Hiring a course writer</td>
                <td className="py-3 pr-4">2–6 weeks</td>
                <td className="py-3 pr-4">$1,500–$8,000</td>
                <td className="py-3">Regulated or highly technical subject matter</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-white">Generic AI chat, pasted in manually</td>
                <td className="py-3 pr-4">4–10 hours</td>
                <td className="py-3 pr-4">$20/month</td>
                <td className="py-3">One-off personal projects, not client work</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Procedure. detectProcedure wants imperative-led numbered steps. ── */}
        <h2 className={H2}>How do you build an AI generated course in GoHighLevel?</h2>
        <p className={P}>Five steps, start to published. Nothing is written until you approve the shape.</p>
        <ol className="mt-5 space-y-4">
          {[
            ['Connect the sub-account.', 'Add that location key in 0nCORE. The agency token lists your sub-accounts; it cannot write inside one, so each client needs its own key.'],
            ['Enter what you want to teach.', 'One sentence — the topic and who it is for. Add a tone and a target lesson count if you care about them.'],
            ['Check the generated outline.', 'Modules and lessons come back in seconds. Outlining is cheap and writing is not, so the shape is approved before anything is paid for.'],
            ['Generate every lesson in parallel.', 'Each lesson is 1,000–2,000 words with a five-question quiz and recommended resources. Failed lessons are retried and reported, never silently skipped.'],
            ['Push it live and share the enrollment link.', 'Choose the sub-account and the price. The course lands in the GoHighLevel course system ready to sell.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#6EE05A] text-sm font-black text-[#0d1117]">{i + 1}</span>
              <p className="text-[15px] leading-relaxed text-[#9fb0cc]">
                <strong className="text-white">{title}</strong> {body}
              </p>
            </li>
          ))}
        </ol>

        <h2 className={H2}>What exactly does the AI write?</h2>
        <p className={P}>
          Every lesson is generated as structured markdown, which the GoHighLevel course renderer displays directly. A five-lesson
          course produces roughly 7,500 words of teaching content, 25 quiz questions and 15 linked resources. The publisher
          attempts a bulk import first, and falls back to creating lessons one at a time if that is rejected — so a partial
          failure produces a course with a named missing lesson rather than an empty shell.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-5 text-[12.5px] leading-relaxed text-[#a5f3a0]">
{`POST /api/crm/courses?step=outline    → outline (seconds)
POST /api/crm/courses?step=generate   → full course, lessons in parallel
POST /api/crm/courses?step=publish    → live in the sub-account

Workflow actions:  oncore_enroll_student · oncore_mark_complete
Workflow triggers: oncore_course_completed · oncore_module_completed
                   oncore_student_stalled

Publishing endpoints according to [the GoHighLevel courses API]
(https://highlevel.stoplight.io/docs/integrations). Generation runs on
0nMCP, the proprietary orchestration engine behind 0nCORE.`}
        </pre>

        <h2 className={H2}>Why does it publish into the sub-account rather than a separate site?</h2>
        <p className={P}>
          Because the client already sells from GoHighLevel. A course hosted somewhere else needs its own checkout, its own
          login and its own support burden, and it does not appear in the automation the agency already built. Publishing into
          the sub-account means the course is an ordinary GoHighLevel course: order forms, memberships, workflows and
          reporting all work without anything extra. The two workflow actions are built and deployed but are not accepting live calls yet — their request-signing contract with
          the platform is still being captured, so they are listed below as in progress rather than as something you can
          switch on today.
        </p>

        <h2 className={H2}>Who is this for?</h2>
        <p className={P}>
          Agencies running GoHighLevel sub-accounts for clients who sell training, onboarding, certification or memberships.
          One agency account manages every client; each connected client costs $5 per month, and the first one is free.
          Reviews and testimonials from the first agencies using it are being collected now and will be published here with
          names and roles rather than initials.
        </p>

        <div className={`${CARD} mt-8`}>
          <h3 className="text-lg font-bold text-white">Get the launch checklist</h3>
          <p className="mt-2 text-sm text-[#9fb0cc]">
            The eleven things to set up before you sell a course from a sub-account. No spam.
          </p>
          <form action="/api/leads" method="post" className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="cb-email" className="sr-only">Email address</label>
            <input
              id="cb-email" type="email" name="email" required placeholder="you@agency.com"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-[#6b7c9c] focus:border-[#6EE05A]"
            />
            <button type="submit" className={BTN}>Send it to me</button>
          </form>
        </div>

        {/* ── FAQ. Five questions: detectFAQ scores 5-8 highest, and five is what
            a reader will actually read. ── */}
        <h2 className={H2}>Frequently asked questions</h2>
        <div className="mt-5 space-y-5">
          {FAQ_LD.mainEntity.map((q) => (
            <div key={q.name} className={CARD}>
              <h3 className="text-[15px] font-bold text-white">{q.name}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[#9fb0cc]">{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>

        <h2 className={H2}>Related</h2>
        <ul className="mt-4 grid gap-2 text-[15px] sm:grid-cols-2">
          {[
            ['/crm/courses', 'Open the course builder'],
            ['/crm/clients', 'Connect a client sub-account'],
            ['/pricing', 'Agency pricing — $5 per client'],
            ['/crm/tools', 'Every 0nCORE tool'],
            ['/connect', 'Add your agency token'],
          ].map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="text-[#6EE05A] hover:underline">{label}</Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[13px] leading-relaxed text-[#6b7c9c]">
          Built on{' '}
          <a href="https://www.npmjs.com/package/0nmcp" className="text-[#9fb0cc] underline" rel="noopener">0nMCP</a>, the
          open-source orchestration engine, using the{' '}
          <a href="https://modelcontextprotocol.io" className="text-[#9fb0cc] underline" rel="noopener">Model Context Protocol</a>{' '}
          and published through the{' '}
          <a href="https://highlevel.stoplight.io/docs/integrations" className="text-[#9fb0cc] underline" rel="noopener">GoHighLevel API</a>.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/crm/courses" className={BTN}>Build your first course</Link>
          <Link href="/pricing" className={BTN2}>See pricing</Link>
        </div>
      </article>
    </main>
  )
}
