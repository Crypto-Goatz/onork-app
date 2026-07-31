'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Loader2,
  Send,
  Sparkles,
  RefreshCw,
  ListChecks,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface Lesson {
  index: number
  title: string
  summary: string
  estimatedWords: number
  keyTopics: string[]
  quizTopics: string[]
}

interface Outline {
  title: string
  description: string
  lessons: Lesson[]
  certificateEnabled: boolean
}

const STEPS = [
  {
    field: 'topic',
    prompt: "Let's build your course. What do you want to teach?",
    placeholder: 'e.g. How to write cold emails that convert',
    sample: 'How to write cold emails that get replies',
  },
  {
    field: 'audience',
    prompt:
      'Who is this course for? (beginners, intermediate, advanced — and any specifics about who they are)',
    placeholder: 'e.g. SaaS founders doing their own outbound',
    sample: 'B2B SaaS founders doing their own outbound, no sales team yet',
  },
  {
    field: 'lessonCount',
    prompt:
      'How many lessons should it have? I usually recommend 5-8 for a first course. Pick a number.',
    placeholder: '5',
    sample: '6',
  },
  {
    field: 'includeQuizzes',
    prompt: 'Should each lesson end with a quiz? (yes / no)',
    placeholder: 'yes',
    sample: 'yes',
  },
  {
    field: 'learningOutcome',
    prompt:
      'Last one — what should the student be able to DO after they finish? (the concrete outcome)',
    placeholder: 'e.g. Send 50 cold emails per week with a 15%+ reply rate',
    sample: 'Send 50 cold emails per week with a measurable 15%+ reply rate',
  },
] as const

interface Message {
  who: 'agent' | 'user'
  body: string
}

const TONES = ['professional', 'casual', 'technical', 'motivational']

interface ConfigDraft {
  topic?: string
  audience?: string
  lessonCount?: number
  includeQuizzes?: boolean
  learningOutcome?: string
  tone: string
}

function parseLessonCount(s: string): number | null {
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10)
  if (Number.isFinite(n) && n >= 3 && n <= 10) return n
  return null
}

function parseYesNo(s: string): boolean | null {
  const v = s.toLowerCase().trim()
  if (/^(y|yes|yep|sure|please|true|1)/.test(v)) return true
  if (/^(n|no|nope|skip|false|0)/.test(v)) return false
  return null
}

export default function CourseBuilderDemo() {
  const [step, setStep] = useState<number>(0)
  const [draft, setDraft] = useState<ConfigDraft>({ tone: 'professional' })
  const [messages, setMessages] = useState<Message[]>([
    { who: 'agent', body: STEPS[0].prompt },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [outline, setOutline] = useState<Outline | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  function reset() {
    setStep(0)
    setDraft({ tone: 'professional' })
    setMessages([{ who: 'agent', body: STEPS[0].prompt }])
    setInput('')
    setOutline(null)
    setError(null)
  }

  async function submit(text: string) {
    if (!text.trim() || loading || outline) return
    setError(null)

    const stepDef = STEPS[step]
    const userMsg: Message = { who: 'user', body: text }
    setMessages((m) => [...m, userMsg])
    setInput('')

    // Validate + write to draft
    const newDraft = { ...draft }
    if (stepDef.field === 'lessonCount') {
      const n = parseLessonCount(text)
      if (n == null) {
        setMessages((m) => [
          ...m,
          {
            who: 'agent',
            body: 'Pick a number between 3 and 10. (5–8 is the sweet spot for most courses.)',
          },
        ])
        return
      }
      newDraft.lessonCount = n
    } else if (stepDef.field === 'includeQuizzes') {
      const v = parseYesNo(text)
      if (v == null) {
        setMessages((m) => [
          ...m,
          { who: 'agent', body: 'Just yes or no for quizzes.' },
        ])
        return
      }
      newDraft.includeQuizzes = v
    } else if (stepDef.field === 'topic') {
      newDraft.topic = text.trim()
    } else if (stepDef.field === 'audience') {
      newDraft.audience = text.trim()
    } else if (stepDef.field === 'learningOutcome') {
      newDraft.learningOutcome = text.trim()
    }
    setDraft(newDraft)

    // Advance — or generate
    if (step < STEPS.length - 1) {
      const next = step + 1
      setStep(next)
      setMessages((m) => [...m, { who: 'agent', body: STEPS[next].prompt }])
      return
    }

    // Final step — call the demo outline endpoint
    setLoading(true)
    setMessages((m) => [
      ...m,
      {
        who: 'agent',
        body:
          'Got it — running this through the architect now. About 10 seconds for the outline.',
      },
    ])

    try {
      const res = await fetch('/api/course-builder/demo-outline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(newDraft),
      })
      const data = await res.json()
      if (!data.ok) {
        const msg =
          data?.error?.message ||
          (data?.error?.code === 'rate_limited'
            ? 'Demo limit reached for this hour — install the marketplace app for unlimited courses.'
            : 'Outline generation failed. Try again in a moment.')
        setError(msg)
        setMessages((m) => [...m, { who: 'agent', body: msg }])
      } else {
        setOutline(data.outline as Outline)
        setMessages((m) => [
          ...m,
          {
            who: 'agent',
            body: `Outline ready: "${data.outline.title}". In the live app, lessons + quizzes + resources + sales page generate next — all in parallel.`,
          },
        ])
      }
    } catch (e) {
      setError((e as Error).message)
      setMessages((m) => [...m, { who: 'agent', body: 'Network error — please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function fillSample() {
    const sample = STEPS[step].sample
    setInput(sample)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,1.2fr)]">
      {/* Chat panel */}
      <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl overflow-hidden flex flex-col h-[560px]">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/60">
                Conversation AI
              </span>
            </span>
            <Sparkles className="w-4 h-4 text-[#7ed957]" />
            0n Course Builder
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-white/45 hover:text-white inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.who === 'agent'
                  ? 'bg-white/[0.02] backdrop-blur border border-white/10 rounded-lg px-3 py-2 max-w-[85%] text-sm text-white/75'
                  : 'bg-[#7ed957]/10 border border-[#7ed957]/30 rounded-lg px-3 py-2 max-w-[85%] text-sm text-white ml-auto'
              }
            >
              {m.body}
            </div>
          ))}
          {loading && (
            <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-lg px-3 py-2 max-w-[85%] text-sm text-white/45 inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating outline…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
          className="border-t border-white/10 px-3 py-3 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={outline ? 'Course generated.' : STEPS[step].placeholder}
              disabled={loading || !!outline}
              className="bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 w-full text-sm text-white placeholder:text-white/30 focus:border-[#7ed957] focus:ring-1 focus:ring-[#7ed957]/20 focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !!outline}
              aria-label="Send"
              className="bg-[#7ed957] text-[#020810] font-bold rounded-lg px-3 py-2 shadow-[0_0_24px_rgba(126,217,87,0.35)] hover:scale-[1.03] transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {!outline && !loading && (
            <button
              type="button"
              onClick={fillSample}
              className="self-start text-xs font-medium text-[#58a6ff] hover:underline"
            >
              Use a sample answer
            </button>
          )}
        </form>
      </div>

      {/* Output panel */}
      <div className="bg-white/[0.02] backdrop-blur border border-white/10 rounded-xl overflow-hidden flex flex-col h-[560px]">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <ListChecks className="w-4 h-4 text-[#7ed957]" />
            <span className="inline-block rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/60">
              Outline preview
            </span>
          </div>
          {outline && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#7ed957]">
              <CheckCircle2 className="w-3 h-3" />
              Ready
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!outline && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/45 space-y-3">
              <ListChecks className="w-8 h-8 text-white/10" />
              <div className="text-sm max-w-xs leading-relaxed">
                Answer the five questions in the chat. The outline previews here.
              </div>
              <div className="text-xs text-[#484f58]">
                In the live app this is where you approve before lesson generation kicks off.
              </div>
            </div>
          )}

          {loading && !outline && (
            <div className="space-y-3">
              <div className="h-5 w-2/3 bg-[#0d1117] rounded animate-pulse" />
              <div className="h-3 w-full bg-[#0d1117] rounded animate-pulse" />
              <div className="h-3 w-11/12 bg-[#0d1117] rounded animate-pulse" />
              <div className="h-24 w-full bg-[#0d1117] rounded-xl animate-pulse mt-6" />
              <div className="h-24 w-full bg-[#0d1117] rounded-xl animate-pulse" />
              <div className="h-24 w-full bg-[#0d1117] rounded-xl animate-pulse" />
            </div>
          )}

          {error && !outline && (
            <div className="bg-[#f87171]/10 border border-[#f87171]/20 rounded-lg p-4 flex items-start gap-2 text-sm text-[#f87171]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {outline && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                  Course title
                </div>
                <div className="mt-1 text-xl font-black tracking-tight bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">{outline.title}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                  Description
                </div>
                <p className="mt-1 text-sm text-white/75 leading-relaxed whitespace-pre-line">
                  {outline.description}
                </p>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                  Lessons
                </div>
                {outline.lessons.map((l) => (
                  <div
                    key={l.index}
                    className="bg-white/[0.02] backdrop-blur border border-white/[0.08] rounded-lg p-4 transition-colors hover:border-white/[0.18]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-medium text-white">
                        <span className="font-mono text-[#7ed957] mr-2">
                          {String(l.index).padStart(2, '0')}
                        </span>
                        {l.title}
                      </div>
                      <span className="text-xs text-white/45 font-mono whitespace-nowrap">
                        ~{l.estimatedWords} words
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/75 leading-relaxed">{l.summary}</p>
                    {l.keyTopics?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {l.keyTopics.slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-medium text-[#7ed957] bg-[#7ed957]/10 border border-[#7ed957]/20 rounded-full px-2 py-0.5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-white/45 pt-3 border-t border-white/10">
                In the live app, every lesson&apos;s full content, quiz (if enabled), and
                resources generate from here in parallel — usually under 90 seconds total.
                The course then publishes to your CRM Courses module via the
                <code className="font-mono text-xs bg-[#0d1117] px-1.5 py-0.5 rounded text-white mx-1">
                  courses.write
                </code>
                scope.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
