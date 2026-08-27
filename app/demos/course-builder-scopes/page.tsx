import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Wand2,
  Webhook,
  Lock,
  Database,
  Eye,
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Scopes — 0n Course Builder',
  description:
    'The two scopes the 0n Course Builder consent screen requests, the three the app configuration additionally grants, and exactly what each one reaches. Marketplace review reference.',
  alternates: { canonical: 'https://www.0ncore.com/demos/course-builder-scopes' },
  openGraph: {
    title: 'Scopes — 0n Course Builder',
    description:
      'Per-scope justification, data-handling, and storage detail for the 0n Course Builder marketplace app — requested and granted, stated separately.',
    url: 'https://www.0ncore.com/demos/course-builder-scopes',
  },
  robots: { index: true, follow: false },
}

interface Scope {
  icon: typeof BookOpen
  scope: string
  feature: string
  why: string
  apis: string[]
  reads: string[]
  writes: string[]
  retention: string
}

const SCOPES: Scope[] = [
  {
    icon: BookOpen,
    scope: 'courses.readonly',
    feature: 'Avoid duplicate course titles + suggest collection placement',
    why:
      "Before publishing a generated course, the app reads the location's existing course list so the AI can suggest a unique title (no overwrites or collisions) and recommend an existing collection to nest under. Without this scope the publish step would either silently overwrite a same-titled course or land orphaned.",
    apis: ['GET /courses (list)', 'GET /courses/:id (detail, on collision check only)'],
    reads: [
      'Course title, description, slug, and collection id',
      'Course count and pagination metadata',
    ],
    writes: [],
    retention:
      'Fetched on-demand at publish time. Not stored. The app caches at most the response in memory for the duration of one request (under 5 seconds).',
  },
  {
    icon: Wand2,
    scope: 'courses.write',
    feature: 'Publish the AI-generated course into the CRM Courses module',
    why:
      'This is the deliverable. Once the user approves the outline and the lessons + quizzes + sales page have generated, the app creates a new course under their location with the title, description, all lesson content, all quiz questions/answers, and the sales-page copy. Without this scope the entire app produces no usable output.',
    apis: [
      'POST /courses (create)',
      'POST /courses/:id/sections (lesson grouping, optional)',
      'POST /courses/:id/lessons (each lesson)',
      'POST /courses/:id/quizzes (per-lesson, only when quizzes are enabled)',
      'PATCH /courses/:id (final price + sales page attach)',
    ],
    reads: [],
    writes: [
      'A single new course (title, description, price = 0 by default unless user sets one)',
      'One section per lesson plus per-lesson sub-records (lesson body, attached quiz, resource list)',
      'A sales-page draft attached to the course as additional content',
    ],
    retention:
      'The course lives in the CRM after publish like any other course — owned and editable by the user. The app does NOT keep its own canonical copy; the CRM is the system of record post-publish.',
  },
]

/**
 * SCOPES THE CONSENT SCREEN DOES NOT ASK FOR, BUT THE ISSUED TOKEN CARRIES.
 *
 * These are granted by the app's configuration in the developer portal, not by
 * our authorise URL — the install string is exactly `courses.readonly
 * courses.write` and has never been anything else. Documenting only what we
 * request would leave a reviewer who decodes the token holding three scopes we
 * never mentioned, which is the harder question to answer afterwards.
 *
 * Measured 2026-08-27 against the live install (app 69801f7a533633818a22921c,
 * company bknfhTkdDLapbwfZqQNi): the access token's `oauthMeta.scopes` reads
 * `locations.readonly, courses.write, courses.readonly, oauth.write,
 * oauth.readonly`. Each endpoint below was probed with that token on the same
 * day and answered 200.
 */
const ADDITIONALLY_GRANTED: Scope[] = [
  {
    icon: Users,
    scope: 'oauth.readonly',
    feature: 'The named publish picker — choose which client the course lands in',
    why:
      'The app is installed at the agency level across many sub-accounts, so "publish this course" is ambiguous until the operator picks one. This scope reaches the platform\'s own list of sub-accounts the app is installed in, with names and addresses, so the picker offers real workspaces rather than raw ids. Publishing a course into the wrong company cannot be undone, which is why the list is measured at request time and any workspace the platform does not confirm is excluded rather than shown optimistically.',
    apis: ['GET /oauth/installedLocations (name + address + isInstalled, paged)'],
    reads: [
      'Sub-account id, name, address, and whether this app is installed there',
      'Nothing inside any sub-account — no contacts, no conversations, no records',
    ],
    writes: [],
    retention:
      'Fetched at picker-render time and held in memory for that request. Not stored. Entries flagged not-installed are counted and discarded.',
  },
  {
    icon: Lock,
    scope: 'oauth.write',
    feature: 'Mint a location-scoped token for the sub-account the operator chose',
    why:
      'The install returns a company-scoped token. Writing a course into one sub-account with a company token is both wrong and wider than it needs to be, so the app exchanges it for a token scoped to the single location the operator selected, and publishes with that. This narrows the credential at the moment of use rather than widening it.',
    apis: ['POST /oauth/locationToken (exchange company token → one location token)'],
    reads: [],
    writes: [
      'No customer data. It issues a short-lived token for one location, already covered by the install.',
    ],
    retention:
      'The minted token is used for the publish and is not persisted as a new install row. It expires on the platform\'s own schedule.',
  },
  {
    icon: ShieldCheck,
    scope: 'locations.readonly',
    feature: 'Tell a live install apart from a dead one before it is offered as a target',
    why:
      'A revoked or expired install still has a row in our database and still looks connected. Before the app claims a workspace is publishable — and when a token refresh fails — it asks the platform whether the credential can still read the account at all. A token that cannot answer is marked degraded and the workspace is withheld from the picker, instead of failing halfway through a publish.',
    apis: ['GET /locations/:id (health probe)', 'GET /locations/search?limit=1 (company-level liveness probe)'],
    reads: ['The account record the credential already covers — used as a reachability signal, not for its content'],
    writes: [],
    retention: 'Only the outcome is stored: a health status, a latency, and a timestamp. No account data is retained.',
  },
]

const NOT_REQUESTED = [
  'conversation-ai (agent create / configure) — see the correction at the top',
  'contacts.readonly / contacts.write',
  'conversations.readonly / conversations.write',
  'conversations.message.write (cannot send messages on the user\'s behalf)',
  'workflows.readonly / workflows.write',
  'opportunities.readonly / opportunities.write',
  'campaigns.readonly / campaigns.write',
  'calendars / calendar-events',
  'forms / surveys',
  'payments / subscriptions',
  'social-planner / social-account scopes',
  'snapshots / snapshot-rights',
  'businesses / users / locations write',
]

export default function ScopesPage() {
  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-[8%] h-[560px] w-[560px] rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
        <div aria-hidden className="pointer-events-none absolute top-[10%] right-[6%] h-[420px] w-[420px] rounded-full bg-[#00d4ff]/[0.05] blur-[130px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-20">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/10 px-3 py-1 text-xs font-medium text-[#7ed957]">
              <ShieldCheck className="w-3 h-3" />
              Marketplace scope justification
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1] text-balance">
              Two scopes on the consent screen.
              <br />
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">Five on the issued token. Both are listed.</span>
            </h1>
            <p className="text-lg text-white/75 leading-relaxed">
              The 0n Course Builder is a single-purpose app: turn a short brief into a published,
              sellable course. The install asks for exactly{' '}
              <code className="font-mono text-sm text-[#7ed957]">courses.readonly courses.write</code>{' '}
              — you can read that off the consent screen before you click it. The app configuration
              additionally grants three more, and rather than leave you to decode a token to find
              them, they are documented here too. Anything beyond those five — contacts,
              conversations, workflows, payments — we explicitly did{' '}
              <strong className="text-white">not</strong> request.
            </p>
            <div className="rounded-lg border border-[#f87171]/25 bg-[#f87171]/[0.06] p-4 text-sm text-white/75 leading-relaxed">
              <strong className="text-white">Correction &mdash; stated rather than quietly edited.</strong>{' '}
              Until 2026-08-27 this page carried a{' '}
              <code className="font-mono text-xs">conversation-ai (configure)</code> block
              describing the app registering a Conversation AI agent in your location. It was
              written as intent when the page shipped and was never true: no build of this app has
              ever requested that scope or created an agent, and the consent screen has never
              offered it. It is removed. If you reviewed an earlier version of this page, that
              block is the thing that changed.
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/demos/course-builder"
                className="inline-flex items-center gap-2 bg-[#7ed957] text-[#020810] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
              >
                See the live demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:hello@0ncore.com"
                className="inline-flex items-center gap-2 bg-white/[0.03] backdrop-blur text-white/75 border border-white/10 rounded-lg px-5 py-2.5 hover:border-[#7ed957]/40 hover:text-white transition-all duration-150"
              >
                <Mail className="w-4 h-4" />
                hello@0ncore.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PER-SCOPE BLOCKS */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-6">
          {SCOPES.map((s) => (
            <div
              key={s.scope}
              className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-6 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3">
                  <s.icon className="w-6 h-6 text-[#7ed957]" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <code className="font-mono text-sm bg-[#0d1117] border border-white/10 px-2 py-0.5 rounded text-[#7ed957]">
                    {s.scope}
                  </code>
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    {s.feature}
                  </h2>
                </div>
              </div>

              <p className="text-sm text-white/75 leading-relaxed">{s.why}</p>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                    <Server className="w-3 h-3" />
                    API calls
                  </div>
                  {s.apis.length === 0 ? (
                    <div className="text-xs text-white/45">None — read-only context use only.</div>
                  ) : (
                    <ul className="space-y-1 text-xs font-mono text-white/75">
                      {s.apis.map((a) => (
                        <li key={a} className="break-all">
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    Reads
                  </div>
                  {s.reads.length === 0 ? (
                    <div className="text-xs text-white/45">No data read.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-white/75 leading-relaxed list-disc list-outside pl-4">
                      {s.reads.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                    <Wand2 className="w-3 h-3" />
                    Writes
                  </div>
                  {s.writes.length === 0 ? (
                    <div className="text-xs text-white/45">No data written.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-white/75 leading-relaxed list-disc list-outside pl-4">
                      {s.writes.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5 mb-2">
                  <Database className="w-3 h-3" />
                  Storage + retention
                </div>
                <p className="text-sm text-white/75 leading-relaxed">{s.retention}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ADDITIONALLY GRANTED */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-6">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-[#00d4ff]" />
              Additionally granted by the app configuration
            </h2>
            <p className="text-white/75 leading-relaxed">
              These three do not appear on the consent screen and are not in our authorise URL.
              They are attached to the app in the developer portal, so the platform includes them
              on the issued token regardless of what we ask for. We use all three, each for one
              thing, described below. If you decode the access token you will find exactly this
              set and nothing else:{' '}
              <code className="font-mono text-xs text-[#7ed957] break-all">
                locations.readonly · courses.write · courses.readonly · oauth.write · oauth.readonly
              </code>
            </p>
          </div>

          {ADDITIONALLY_GRANTED.map((s) => (
            <div
              key={s.scope}
              className="bg-white/[0.02] backdrop-blur border border-[#00d4ff]/20 rounded-xl p-6 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3">
                  <s.icon className="w-6 h-6 text-[#00d4ff]" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <code className="font-mono text-sm bg-[#0d1117] border border-white/10 px-2 py-0.5 rounded text-[#00d4ff]">
                    {s.scope}
                  </code>
                  <h3 className="text-xl font-semibold tracking-tight text-white">{s.feature}</h3>
                </div>
              </div>

              <p className="text-sm text-white/75 leading-relaxed">{s.why}</p>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                    <Server className="w-3 h-3" />
                    API calls
                  </div>
                  <ul className="space-y-1 text-xs font-mono text-white/75">
                    {s.apis.map((a) => (
                      <li key={a} className="break-all">{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    Reads
                  </div>
                  {s.reads.length === 0 ? (
                    <div className="text-xs text-white/45">No data read.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-white/75 leading-relaxed list-disc list-outside pl-4">
                      {s.reads.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                    <Wand2 className="w-3 h-3" />
                    Writes
                  </div>
                  {s.writes.length === 0 ? (
                    <div className="text-xs text-white/45">No data written.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-white/75 leading-relaxed list-disc list-outside pl-4">
                      {s.writes.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 flex items-center gap-1.5 mb-2">
                  <Database className="w-3 h-3" />
                  Storage + retention
                </div>
                <p className="text-sm text-white/75 leading-relaxed">{s.retention}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NOT REQUESTED */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <XCircle className="w-7 h-7 text-white/45" />
              What the app does <em className="not-italic text-[#f87171]">not</em> request
            </h2>
            <p className="text-white/45">
              Single-purpose principle. If it&apos;s not on the list above, we did not ask for it.
            </p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-5">
            <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {NOT_REQUESTED.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-2 text-white/75 font-mono text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 text-white/45 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* DATA HANDLING */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-8">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Data handling
            </h2>
            <p className="text-white/45">
              Where each piece of data lives, who sees it, and how long it stays.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {[
              {
                icon: Lock,
                title: 'Webhook authentication',
                body:
                  'Every inbound request to /api/course-builder/chat is HMAC-verified using the marketplace shared secret. Unsigned or invalid-signature requests are dropped with 200 OK (per CRM webhook conventions) and never enter the pipeline.',
              },
              {
                icon: Users,
                title: 'Identity isolation',
                body:
                  'Each session is keyed on (location_id, conversation_id). One CRM location cannot read another\'s in-progress course. Sessions belonging to a location that has not yet provisioned a 0nCore user are silently dropped — no orphan rows.',
              },
              {
                icon: Database,
                title: 'Where generated content lives',
                body:
                  'Pre-publish: course_builder_sessions row in 0nCore Supabase (project pwujhhmlrtxjmjzyttwn). Post-publish: the CRM Courses module is the source of truth — the session row is retained for retry/audit but is not the canonical course.',
              },
              {
                icon: Webhook,
                title: 'AI provider',
                body:
                  'All generation runs against Groq (openai/gpt-oss-120b). Course inputs travel to Groq for outline + lesson + sales-page generation. Groq does not retain prompts for training (per their API ToS). No CRM PII is sent to Groq — only the five intake fields.',
              },
              {
                icon: AlertTriangle,
                title: 'Rate limits',
                body:
                  'Per-conversation: 200 messages/day, 30/hour (defense-in-depth on top of the CRM\'s own rate limiting). Per-IP demo limit: 6 outline generations/hour on this preview page.',
              },
              {
                icon: ShieldCheck,
                title: 'Output scrubber',
                body:
                  'Every reply the agent sends is run through a disclosure scrubber that strips internal infrastructure references (table names, ids, internal URLs) before returning to the conversation.',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-5"
              >
                <c.icon className="w-6 h-6 text-[#7ed957]" />
                <div className="mt-4 text-base font-medium text-white">{c.title}</div>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWER REFERENCE */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-8 md:p-10 space-y-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#7ed957] mt-1" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  Marketplace reviewer reference
                </h3>
                <p className="text-sm text-white/75">
                  This page is intended specifically for the marketplace review team. Anything
                  unclear, please reach
                  <a
                    href="mailto:hello@0ncore.com"
                    className="text-[#00d4ff] hover:underline mx-1"
                  >
                    hello@0ncore.com
                  </a>
                  — same-day response.
                </p>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {[
                { label: 'App name', v: '0n Course Builder' },
                { label: 'Consent screen requests', v: 'courses.readonly courses.write' },
                { label: 'Issued token carries', v: 'the above + locations.readonly, oauth.readonly, oauth.write' },
                { label: 'Start an install', v: 'https://www.0ncore.com/api/oauth/install/course' },
                { label: 'Version under review', v: '1.0.0' },
                { label: 'Test location', v: 'nphConTwfHcVE1oA0uep (0nCore)' },
                { label: 'Webhook endpoint', v: 'https://0ncore.com/api/course-builder/chat' },
                { label: 'Demo URL', v: 'https://www.0ncore.com/demos/course-builder' },
                { label: 'Scope URL', v: 'https://www.0ncore.com/demos/course-builder-scopes' },
                { label: 'Privacy + ToS', v: 'https://www.0ncore.com/legal' },
                { label: 'Contact', v: 'hello@0ncore.com' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="bg-[#0d1117] border border-white/10 rounded-lg p-4"
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                    {row.label}
                  </div>
                  <div className="mt-1 text-sm font-mono text-white break-all">{row.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Ready to see it run?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demos/course-builder"
              className="inline-flex items-center gap-2 bg-[#7ed957] text-[#020810] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
            >
              Live demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:hello@0ncore.com?subject=0n%20Course%20Builder%20review"
              className="inline-flex items-center gap-2 bg-white/[0.03] backdrop-blur text-white/75 border border-white/10 rounded-lg px-5 py-2.5 hover:border-[#7ed957]/40 hover:text-white transition-all duration-150"
            >
              <Mail className="w-4 h-4" />
              Email the team
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
