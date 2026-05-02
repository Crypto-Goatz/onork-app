import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Wand2,
  MessageCircle,
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
    'Why the 0n Course Builder requests courses.readonly, courses.write, and the conversation-ai scope family — and exactly what each one does. Marketplace review reference.',
  alternates: { canonical: 'https://www.0ncore.com/demos/course-builder-scopes' },
  openGraph: {
    title: 'Scopes — 0n Course Builder',
    description:
      'Per-scope justification, data-handling, and storage detail for the 0n Course Builder marketplace app.',
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
  {
    icon: MessageCircle,
    scope: 'conversation-ai (configure)',
    feature: 'Install + configure the Conversation AI agent that runs the five-question intake',
    why:
      'The 0n Course Builder is delivered as a Conversation AI agent — that is the user interface. To install the app, the user grants permission for it to register a new agent under their location, set its system prompt, attach the webhook endpoint, and configure intent triggers. The app does NOT request scopes that would let it read end-user conversation history or send messages on the user\'s behalf outside of the agent it just installed.',
    apis: [
      'POST /conversation-ai/agents (create the agent)',
      'PATCH /conversation-ai/agents/:id (update prompt, webhook, intents)',
    ],
    reads: ['Only the agents the app itself created (own scope), to support upgrades and uninstalls'],
    writes: [
      'A single agent named "0n Course Builder" with our system prompt + webhook URL',
      'Intent definitions used to trigger the agent ("build a course", "create a course", etc)',
    ],
    retention:
      'Agent config lives inside the CRM. The app stores only a foreign-key reference (agent_id + location_id) so we can update or remove the agent on uninstall.',
  },
]

const NOT_REQUESTED = [
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
    <main className="bg-[#0d1117] text-[#c9d1d9] font-sans antialiased min-h-screen">
      {/* HERO */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-16 sm:py-20">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6EE05A]/30 bg-[#6EE05A]/10 px-3 py-1 text-xs font-medium text-[#6EE05A]">
              <ShieldCheck className="w-3 h-3" />
              Marketplace scope justification
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#e6edf3] leading-[1.1]">
              Three scopes. Each one ships
              <br />
              <span className="text-[#6EE05A]">a specific user-facing feature.</span>
            </h1>
            <p className="text-lg text-[#c9d1d9] leading-relaxed">
              The 0n Course Builder is a single-purpose app: convert a five-question chat into a
              published, sellable course. Every scope below maps to one piece of that pipeline.
              Anything beyond that — contacts, conversations, workflows, payments — we explicitly
              did <strong className="text-[#e6edf3]">not</strong> request.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/demos/course-builder"
                className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
              >
                See the live demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:hello@0ncore.com"
                className="inline-flex items-center gap-2 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-5 py-2.5 hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150"
              >
                <Mail className="w-4 h-4" />
                hello@0ncore.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PER-SCOPE BLOCKS */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-6">
          {SCOPES.map((s) => (
            <div
              key={s.scope}
              className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                  <s.icon className="w-6 h-6 text-[#6EE05A]" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <code className="font-mono text-sm bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-[#6EE05A]">
                    {s.scope}
                  </code>
                  <h2 className="text-xl font-semibold tracking-tight text-[#e6edf3]">
                    {s.feature}
                  </h2>
                </div>
              </div>

              <p className="text-sm text-[#c9d1d9] leading-relaxed">{s.why}</p>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5">
                    <Server className="w-3 h-3" />
                    API calls
                  </div>
                  {s.apis.length === 0 ? (
                    <div className="text-xs text-[#8b949e]">None — read-only context use only.</div>
                  ) : (
                    <ul className="space-y-1 text-xs font-mono text-[#c9d1d9]">
                      {s.apis.map((a) => (
                        <li key={a} className="break-all">
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    Reads
                  </div>
                  {s.reads.length === 0 ? (
                    <div className="text-xs text-[#8b949e]">No data read.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-[#c9d1d9] leading-relaxed list-disc list-outside pl-4">
                      {s.reads.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 space-y-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5">
                    <Wand2 className="w-3 h-3" />
                    Writes
                  </div>
                  {s.writes.length === 0 ? (
                    <div className="text-xs text-[#8b949e]">No data written.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-[#c9d1d9] leading-relaxed list-disc list-outside pl-4">
                      {s.writes.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                <div className="text-[10px] font-medium uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5 mb-2">
                  <Database className="w-3 h-3" />
                  Storage + retention
                </div>
                <p className="text-sm text-[#c9d1d9] leading-relaxed">{s.retention}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NOT REQUESTED */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3] flex items-center gap-3">
              <XCircle className="w-7 h-7 text-[#8b949e]" />
              What the app does <em className="not-italic text-[#f87171]">not</em> request
            </h2>
            <p className="text-[#8b949e]">
              Single-purpose principle. If it&apos;s not on the list above, we did not ask for it.
            </p>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {NOT_REQUESTED.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-2 text-[#c9d1d9] font-mono text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* DATA HANDLING */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-8">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
              Data handling
            </h2>
            <p className="text-[#8b949e]">
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
                  'All generation runs against Groq (llama-3.3-70b-versatile). Course inputs travel to Groq for outline + lesson + sales-page generation. Groq does not retain prompts for training (per their API ToS). No CRM PII is sent to Groq — only the five intake fields.',
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
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-5"
              >
                <c.icon className="w-6 h-6 text-[#6EE05A]" />
                <div className="mt-4 text-base font-medium text-[#e6edf3]">{c.title}</div>
                <p className="mt-2 text-sm text-[#c9d1d9] leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWER REFERENCE */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 md:p-10 space-y-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#6EE05A] mt-1" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-[#e6edf3]">
                  Marketplace reviewer reference
                </h3>
                <p className="text-sm text-[#c9d1d9]">
                  This page is intended specifically for the marketplace review team. Anything
                  unclear, please reach
                  <a
                    href="mailto:hello@0ncore.com"
                    className="text-[#58a6ff] hover:underline mx-1"
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
                  className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4"
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#8b949e]">
                    {row.label}
                  </div>
                  <div className="mt-1 text-sm font-mono text-[#e6edf3] break-all">{row.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            Ready to see it run?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demos/course-builder"
              className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
            >
              Live demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:hello@0ncore.com?subject=0n%20Course%20Builder%20review"
              className="inline-flex items-center gap-2 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-5 py-2.5 hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150"
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
