import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  MessageCircle,
  Sparkles,
  ListChecks,
  Wand2,
  Zap,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Library,
  Trophy,
  ShieldCheck,
  Globe,
  Webhook,
  CheckCircle2,
  Clock,
  Users,
  Target,
  PlayCircle,
  Mail,
} from 'lucide-react'
import CourseBuilderDemo from './CourseBuilderDemo'

export const metadata: Metadata = {
  title: '0n Course Builder — AI-Generated Courses From a Chat',
  description:
    'Describe a course in plain language. The 0n Course Builder uses CRM Conversation AI + Groq to generate the outline, write every lesson, build quizzes, source resources, and publish a sellable course back into your CRM — in minutes.',
  alternates: { canonical: 'https://www.0ncore.com/demos/course-builder' },
  openGraph: {
    title: '0n Course Builder — AI-Generated Courses From a Chat',
    description:
      'Chat → outline → lessons + quizzes + resources → published course in your CRM. Built on CRM Conversation AI.',
    url: 'https://www.0ncore.com/demos/course-builder',
    type: 'website',
  },
}

const HOW_STEPS = [
  {
    icon: MessageCircle,
    title: '1 — Tell Conversation AI what to teach',
    body:
      'Open the Conversation AI agent inside your CRM and answer five short questions: topic, audience, lesson count, quizzes (yes/no), and the concrete outcome the student should walk away with. The agent collects them in plain conversation — no forms, no admin screens.',
  },
  {
    icon: ListChecks,
    title: '2 — Outline preview',
    body:
      'A Groq-powered architect (openai/gpt-oss-120b) returns a structured outline: course title, 2–3 paragraph description, every lesson title with a summary, key topics, quiz topics, and an estimated word count. Approve it in chat, or ask for changes in plain language.',
  },
  {
    icon: Zap,
    title: '3 — Radial Burst generation',
    body:
      'Every lesson generates in parallel. Each one comes back with full markdown content, an optional 3–5-question multiple-choice quiz (with explanations), and 3–5 hand-curated external resources. A 5-lesson course finishes in under two minutes.',
  },
  {
    icon: ClipboardCheck,
    title: '4 — Review and publish',
    body:
      'See lessons, quizzes, resources, total word count, and estimated study duration. One tap publishes the full course back to the CRM Courses module via the `courses.write` scope — title, description, lessons, quizzes, and a generated sales page included.',
  },
]

const FEATURES = [
  {
    icon: Wand2,
    title: 'AI architect',
    body: 'A dedicated outliner sequences lessons foundational → advanced, sized to your audience and outcome.',
  },
  {
    icon: BookOpen,
    title: 'Full lesson content',
    body: 'Every lesson is written end-to-end in your chosen tone. Markdown out of the box, ready to paste anywhere.',
  },
  {
    icon: GraduationCap,
    title: 'Auto-built quizzes',
    body: 'Each lesson can ship with a multiple-choice quiz. Each question carries an answer + an explanation paragraph.',
  },
  {
    icon: Library,
    title: 'Curated resources',
    body: 'The model attaches 3–5 outside resources per lesson — articles, videos, tools, books, docs.',
  },
  {
    icon: Trophy,
    title: 'Sales page included',
    body: 'After generation, a full sales-page draft is produced from the course context. No copywriter needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Built on Conversation AI',
    body: 'Runs as a CRM-native Conversation AI agent — no extra UI to learn, no separate dashboard.',
  },
]

const SPECS = [
  { label: 'AI engine', value: 'Groq · openai/gpt-oss-120b' },
  { label: 'Architecture', value: 'Radial Burst (parallel lesson generation)' },
  { label: 'Inputs', value: '5 fields collected via Conversation AI' },
  { label: 'Outputs', value: 'Outline + lessons + quizzes + resources + sales page' },
  { label: 'Publish target', value: 'CRM Courses module (`courses.write`)' },
  { label: 'Read scope', value: '`courses.readonly` (preview before publish)' },
  { label: 'Configure scope', value: '`conversation-ai` (agent setup)' },
  { label: 'Webhook', value: 'POST https://0ncore.com/api/course-builder/chat' },
]

const FAQS = [
  {
    q: 'How long does generation take?',
    a: 'Outline returns in seconds. A 5-lesson course with quizzes typically finishes inside 90 seconds because every lesson runs in parallel.',
  },
  {
    q: 'Can I edit before publishing?',
    a: 'Yes. The agent shows the outline first and waits for approval. Lessons render in a review screen where every block is editable. Nothing reaches your CRM until you say so.',
  },
  {
    q: 'What scopes does the app request?',
    a: '`courses.readonly`, `courses.write`, and the `conversation-ai` family — for reading the course list, publishing the generated course, and configuring the AI agent. See https://www.0ncore.com/demos/course-builder-scopes for the full justification.',
  },
  {
    q: 'Where does the content live?',
    a: 'All generated content is stored in `course_builder_sessions` on 0nCore Supabase (project pwujhhmlrtxjmjzyttwn) until you publish. After publish, the course lives in your CRM Courses module like any other course.',
  },
  {
    q: 'Does it work for any topic?',
    a: 'Anything the model can teach. We have shipped courses on offer creation, sales calls, technical onboarding, fitness programs, real-estate compliance, art classes — same five questions, same pipeline.',
  },
  {
    q: 'How is this different from "ChatGPT plus copy/paste"?',
    a: 'Three things: (1) the architecture is purpose-built for course outlines and lesson sequencing; (2) every lesson includes a quiz + curated resources, not just prose; (3) the result publishes directly into your CRM Courses module — no copying anything anywhere.',
  },
]

export default function CourseBuilderDemoPage() {
  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: '0n Course Builder',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'CRM marketplace app. Uses Conversation AI to generate complete courses — outline, lessons, quizzes, resources, sales page — and publishes them to the CRM Courses module.',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            url: 'https://www.0ncore.com/demos/course-builder',
            author: {
              '@type': 'Organization',
              name: 'RocketOpp LLC',
              url: 'https://rocketopp.com',
            },
          }),
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-[8%] h-[560px] w-[560px] rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
        <div aria-hidden className="pointer-events-none absolute top-[10%] right-[6%] h-[420px] w-[420px] rounded-full bg-[#00d4ff]/[0.05] blur-[130px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-24">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/10 px-3 py-1 text-xs font-medium text-[#7ed957]">
              <Sparkles className="w-3 h-3" />
              CRM Marketplace App · v1.0.0
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] text-balance">
              Generate a complete course
              <br />
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">from a five-question chat.</span>
            </h1>

            <p className="text-lg text-white/75 leading-relaxed max-w-3xl">
              The 0n Course Builder lives inside your CRM as a Conversation AI agent. Tell it
              what to teach, who it&apos;s for, how many lessons, and the outcome you want — it
              returns a fully written course with quizzes, resources, and a sales page,
              published straight into your CRM Courses module.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 bg-[#7ed957] text-[#020810] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
              >
                Try it now
                <PlayCircle className="w-4 h-4" />
              </a>
              <Link
                href="/demos/course-builder-scopes"
                className="inline-flex items-center gap-2 bg-white/[0.03] backdrop-blur text-white/75 border border-white/10 rounded-lg px-5 py-2.5 hover:border-[#7ed957]/40 hover:text-white transition-all duration-150 active:scale-[0.98]"
              >
                Scopes &amp; permissions
              </Link>
              <a
                href="mailto:hello@0ncore.com"
                className="inline-flex items-center gap-2 text-white/45 hover:text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150"
              >
                <Mail className="w-4 h-4" />
                hello@0ncore.com
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/10">
              {[
                { v: '< 90s', l: '5-lesson course' },
                { v: '5', l: 'Inputs collected' },
                { v: 'Per-lesson', l: 'Quizzes + resources' },
                { v: 'CRM-native', l: 'Publishes via courses.write' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-semibold text-white font-mono tabular-nums">
                    {s.v}
                  </div>
                  <div className="text-xs text-white/45 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              How it works
            </h2>
            <p className="text-white/45">
              Conversation AI handles the input. Groq writes the course. Your CRM publishes it.
              No new dashboards to learn.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {HOW_STEPS.map((s) => (
              <div
                key={s.title}
                className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-5 hover:border-white/[0.18] transition-colors duration-200"
              >
                <s.icon className="w-8 h-8 text-[#7ed957]" />
                <div className="mt-4 text-base font-medium text-white">{s.title}</div>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              What ships in every course
            </h2>
            <p className="text-white/45">
              Not just an outline. Not just lesson titles. The whole thing.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-5 hover:border-white/[0.18] transition-colors duration-200"
              >
                <f.icon className="w-6 h-6 text-[#7ed957]" />
                <div className="mt-4 text-base font-medium text-white">{f.title}</div>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section id="demo" className="border-b border-white/10 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Live demo
            </h2>
            <p className="text-white/45">
              Same exact webhook the CRM Conversation AI agent uses
              (<code className="font-mono text-xs bg-white/[0.02] backdrop-blur px-1.5 py-0.5 rounded text-white">/api/course-builder/chat</code>).
              Answer the five questions and watch the outline return.
            </p>
          </div>

          <CourseBuilderDemo />

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[
              { icon: Users, label: 'Audience', v: 'Anyone with a CRM' },
              { icon: Target, label: 'Outcome', v: 'A sellable course in minutes' },
              { icon: Clock, label: 'Time saved', v: '20+ hours per course' },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-5"
              >
                <c.icon className="w-5 h-5 text-[#7ed957]" />
                <div className="mt-3 text-xs font-medium uppercase tracking-wider text-white/45">
                  {c.label}
                </div>
                <div className="mt-1 text-base font-medium text-white">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPECS */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Technical specs
            </h2>
            <p className="text-white/45">
              Everything the marketplace reviewer needs in one block.
            </p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl divide-y divide-white/10">
            {SPECS.map((row) => (
              <div
                key={row.label}
                className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4"
              >
                <div className="text-xs font-medium uppercase tracking-wider text-white/45">
                  {row.label}
                </div>
                <div className="text-sm text-white font-mono break-all">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCOPES SUMMARY */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Scopes
            </h2>
            <p className="text-white/45">
              Three scopes. Each one powers a specific feature. No data leaves the CRM agent —
              the model never sees your contacts, conversations, or workflows.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: 'courses.readonly',
                body:
                  'Reads the location\'s course list so the agent can avoid duplicate titles and link the new course into existing collections.',
              },
              {
                icon: Wand2,
                title: 'courses.write',
                body:
                  'Publishes the generated course (title, description, lessons, quizzes, sales page) into the CRM Courses module. The end-to-end deliverable.',
              },
              {
                icon: MessageCircle,
                title: 'conversation-ai',
                body:
                  'Configures the Conversation AI agent that runs the five-question intake. No reading or writing of your end-user conversations.',
              },
            ].map((s) => (
              <div
                key={s.title}
                className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-5 hover:border-white/[0.18] transition-colors duration-200"
              >
                <s.icon className="w-6 h-6 text-[#7ed957]" />
                <div className="mt-4 text-base font-medium text-white">{s.title}</div>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <Link
            href="/demos/course-builder-scopes"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#00d4ff] hover:underline"
          >
            Full scope justification
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white">FAQ</h2>
            <p className="text-white/45">Everything reviewers and customers ask first.</p>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {FAQS.map((f) => (
              <div
                key={f.q}
                className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-5"
              >
                <div className="text-base font-medium text-white">{f.q}</div>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWER BLOCK */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-8 md:p-10 space-y-6">
            <div className="flex items-start gap-3">
              <Webhook className="w-6 h-6 text-[#7ed957] mt-1" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  Marketplace reviewer details
                </h3>
                <p className="text-sm text-white/75">
                  Test account: agency app installed on location
                  <code className="font-mono text-xs bg-[#0d1117] px-1.5 py-0.5 rounded text-white mx-1.5">
                    nphConTwfHcVE1oA0uep
                  </code>
                  (0nCore). Webhook endpoint:
                  <code className="font-mono text-xs bg-[#0d1117] px-1.5 py-0.5 rounded text-white mx-1.5">
                    https://0ncore.com/api/course-builder/chat
                  </code>
                  . Contact:
                  <a
                    href="mailto:hello@0ncore.com"
                    className="text-[#00d4ff] hover:underline mx-1"
                  >
                    hello@0ncore.com
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {[
                { icon: CheckCircle2, label: 'Demo URL', v: '/demos/course-builder' },
                { icon: ShieldCheck, label: 'Scope URL', v: '/demos/course-builder-scopes' },
                { icon: Globe, label: 'Privacy + ToS', v: '0ncore.com/legal' },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-[#0d1117] border border-white/10 rounded-lg p-4"
                >
                  <c.icon className="w-4 h-4 text-[#7ed957]" />
                  <div className="mt-2 text-xs font-medium uppercase tracking-wider text-white/45">
                    {c.label}
                  </div>
                  <div className="mt-1 text-sm font-mono text-white break-all">{c.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl p-10 md:p-14 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Stop writing courses. Start describing them.
            </h2>
            <p className="text-white/75 max-w-2xl mx-auto">
              Five questions. One Conversation AI agent. A finished, sellable course inside your
              CRM Courses module — outline, lessons, quizzes, resources, and a sales page included.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 bg-[#7ed957] text-[#020810] font-medium rounded-lg px-5 py-2.5 hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
              >
                Try the demo
                <PlayCircle className="w-4 h-4" />
              </a>
              <Link
                href="/demos/course-builder-scopes"
                className="inline-flex items-center gap-2 bg-white/[0.03] backdrop-blur text-white/75 border border-white/10 rounded-lg px-5 py-2.5 hover:border-[#7ed957]/40 hover:text-white transition-all duration-150 active:scale-[0.98]"
              >
                See scope details
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
