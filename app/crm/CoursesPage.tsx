'use client'

/**
 * Content › Courses — the AI course builder.
 *
 * THREE STEPS, DELIBERATELY. Outline is fast and cheap; writing a whole course
 * is neither. Approving the shape first means a wrong topic costs seconds
 * rather than minutes, and nobody waits through a full generation to discover
 * lesson 3 was never what they wanted.
 *
 * THE KEY REQUIREMENT IS STATED BEFORE GENERATING, not after. Publishing needs
 * the target client's key; finding that out at the end — having already paid
 * for the writing — is the worst possible moment.
 *
 * FAILED LESSONS ARE SHOWN. The generator retries once and then reports what
 * still failed. A course quietly missing lesson 4 is worse than one that says
 * lesson 4 needs another go.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Check, Loader2, Sparkles, Upload } from 'lucide-react'
import AppSidebar from './AppSidebar'

interface Lesson { index: number; title: string; summary?: string; wordCount?: number; quiz?: unknown[]; resources?: unknown[] }
interface Outline { title: string; description: string; lessons: { index: number; title: string; summary?: string }[] }
interface Course { outline: Outline; lessons: Lesson[]; totalWordCount?: number; estimatedDuration?: string }
interface Client { locationId: string; name: string; connected: boolean }

type Phase = 'idle' | 'outlining' | 'outlined' | 'generating' | 'ready' | 'publishing' | 'published'

export default function CoursesPage() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [lessonCount, setLessonCount] = useState('5')
  const [outcome, setOutcome] = useState('')
  const [tone, setTone] = useState('professional')
  const [quizzes, setQuizzes] = useState(true)

  const [phase, setPhase] = useState<Phase>('idle')
  const [outline, setOutline] = useState<Outline | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [failures, setFailures] = useState<{ lessonIndex: number }[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [published, setPublished] = useState<{ method: string; lessons: number } | null>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [target, setTarget] = useState('')

  useEffect(() => {
    fetch('/api/connect/accounts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const on = (j.accounts ?? []).filter((a: Client) => a.connected)
        setClients(on)
        if (on.length === 1) setTarget(on[0].locationId)
      })
      .catch(() => {})
  }, [])

  const targetName = useMemo(
    () => clients.find((c) => c.locationId === target)?.name ?? null,
    [clients, target],
  )

  const post = useCallback(async (step: string, body: unknown) => {
    const res = await fetch(`/api/crm/courses?step=${step}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const j = await res.json()
    if (!res.ok) throw new Error(j.error || `Failed (${res.status})`)
    return j
  }, [])

  const config = {
    topic, audience, lessonCount: Number(lessonCount) || 5,
    includeQuizzes: quizzes, learningOutcome: outcome, tone,
  }

  async function doOutline() {
    setErr(null); setCourse(null); setPublished(null); setPhase('outlining')
    try { setOutline((await post('outline', { config })).outline); setPhase('outlined') }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not outline.'); setPhase('idle') }
  }
  async function doGenerate() {
    setErr(null); setPhase('generating')
    try {
      const j = await post('generate', { config, outline })
      setCourse(j.course); setFailures(j.failures ?? []); setPhase('ready')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not generate.'); setPhase('outlined') }
  }
  async function doPublish() {
    setErr(null); setPhase('publishing')
    try {
      const j = await post('publish', { course, locationId: target, priceCents: 0 })
      setPublished({ method: j.method, lessons: j.lessons }); setPhase('published')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not publish.'); setPhase('ready') }
  }

  const busy = phase === 'outlining' || phase === 'generating' || phase === 'publishing'

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="content" activeCount={0} totalCount={0} usageLabel="$0" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-10 py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">Courses</h1>
          <p className="mt-1 text-[13.5px] text-[color:var(--oc-muted)]">
            Describe it, review the shape, then publish it into a client&apos;s CRM.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* ── the brief ── */}
            <div className="space-y-4 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
              <Field label="Topic">
                <input value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="Teeth whitening aftercare" className={INPUT} />
              </Field>
              <Field label="Who it is for">
                <input value={audience} onChange={(e) => setAudience(e.target.value)}
                  placeholder="Patients who just had a whitening treatment" className={INPUT} />
              </Field>
              <Field label="What they should be able to do after">
                <input value={outcome} onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Keep the result for 12 months" className={INPUT} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lessons">
                  <input type="number" min={1} max={20} value={lessonCount}
                    onChange={(e) => setLessonCount(e.target.value)} className={INPUT} />
                </Field>
                <Field label="Tone">
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className={INPUT}>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="technical">Technical</option>
                    <option value="motivational">Motivational</option>
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2.5 text-[13px] text-[color:var(--oc-text)]">
                <input type="checkbox" checked={quizzes} onChange={(e) => setQuizzes(e.target.checked)}
                  className="h-4 w-4 accent-[color:var(--oc-green-d)]" />
                Include a quiz per lesson
              </label>

              {/* Said BEFORE the work, not after. */}
              <p className="flex items-start gap-2 rounded-xl bg-[color:var(--oc-amber)]/10 px-3 py-2.5 text-[12px] leading-relaxed text-[color:var(--oc-amber)]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {clients.length === 0
                  ? 'No connected clients yet. You can generate a course, but publishing needs a client with its key added.'
                  : 'Publishing writes into the client’s CRM using their key.'}
              </p>

              <button onClick={doOutline} disabled={busy || !topic.trim() || !audience.trim()}
                className={PRIMARY}>
                {phase === 'outlining' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {outline ? 'Re-outline' : 'Outline the course'}
              </button>
              {err && <p className="text-[12.5px] text-[color:var(--oc-red)]">{err}</p>}
            </div>

            {/* ── the course ── */}
            <div>
              {!outline && (
                <div className="grid h-full min-h-[280px] place-items-center rounded-2xl border border-dashed border-[color:var(--oc-border)] p-10 text-center">
                  <div>
                    <BookOpen className="mx-auto h-8 w-8 text-[color:var(--oc-muted)]" strokeWidth={1.5} />
                    <p className="mt-3 text-[13.5px] text-[color:var(--oc-muted)]">
                      Describe the course and outline it first.<br />That takes seconds — writing it takes longer.
                    </p>
                  </div>
                </div>
              )}

              {outline && (
                <div className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-6">
                  <h2 className="text-[18px] font-semibold text-[color:var(--oc-ink)]">{outline.title}</h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--oc-muted)]">{outline.description}</p>

                  {course && (
                    <p className="mt-3 text-[12px] text-[color:var(--oc-muted)]">
                      {course.lessons.length} lessons · {course.totalWordCount?.toLocaleString() ?? '—'} words
                      {course.estimatedDuration ? ` · ~${course.estimatedDuration}` : ''}
                    </p>
                  )}

                  <ol className="mt-4 space-y-2">
                    {(course?.lessons ?? outline.lessons).map((l) => {
                      const failed = failures.some((f) => f.lessonIndex === l.index)
                      const written = 'wordCount' in l && (l as Lesson).wordCount
                      return (
                        <li key={l.index}
                          className={`flex items-start gap-3 rounded-xl border p-3 ${
                            failed ? 'border-[color:var(--oc-red)]/40 bg-[color:var(--oc-red)]/[0.05]'
                                   : 'border-[color:var(--oc-border)]'
                          }`}>
                          <span className="mt-0.5 font-mono text-[12px] text-[color:var(--oc-muted)]">
                            {String(l.index).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium text-[color:var(--oc-ink)]">{l.title}</span>
                            {l.summary && <span className="mt-0.5 block text-[12px] text-[color:var(--oc-muted)]">{l.summary}</span>}
                          </span>
                          {failed
                            ? <span className="shrink-0 text-[11px] font-medium text-[color:var(--oc-red)]">needs another go</span>
                            : written
                              ? <span className="shrink-0 font-mono text-[11px] text-[color:var(--oc-muted)]">{written}w</span>
                              : null}
                        </li>
                      )
                    })}
                  </ol>

                  {phase === 'outlined' && (
                    <button onClick={doGenerate} disabled={busy} className={`${PRIMARY} mt-5`}>
                      <Sparkles className="h-4 w-4" /> Write all {outline.lessons.length} lessons
                    </button>
                  )}
                  {phase === 'generating' && (
                    <p className="mt-5 flex items-center gap-2 text-[13px] text-[color:var(--oc-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Writing {outline.lessons.length} lessons in parallel — this takes a minute.
                    </p>
                  )}

                  {course && phase !== 'published' && (
                    <div className="mt-6 border-t border-[color:var(--oc-border)] pt-5">
                      <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">
                        Publish to
                      </label>
                      <select value={target} onChange={(e) => setTarget(e.target.value)} className={INPUT}>
                        <option value="">Choose a client…</option>
                        {clients.map((c) => <option key={c.locationId} value={c.locationId}>{c.name}</option>)}
                      </select>
                      {/* The button NAMES the client it will write to. */}
                      <button onClick={doPublish} disabled={busy || !target} className={`${PRIMARY} mt-3`}>
                        {phase === 'publishing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {targetName ? `Publish to ${targetName}` : 'Publish'}
                      </button>
                    </div>
                  )}

                  {published && (
                    <p className="mt-5 flex items-start gap-2 rounded-xl bg-[color:var(--oc-green-d)]/10 px-3.5 py-3 text-[13px] text-[color:var(--oc-green-d)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      Published {published.lessons} lessons to {targetName} via {published.method.replace(/_/g, ' ')}.
                      It is live in their CRM now.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const INPUT =
  'w-full rounded-xl border border-[#2a2a2a] bg-[color:var(--oc-input)] px-3.5 py-2.5 text-[13.5px] text-[#f5f5f5] outline-none transition placeholder:text-[#8a8a8a] focus:border-[color:var(--oc-green-d)]'
const PRIMARY =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--oc-ink)] px-5 py-3 text-[13.5px] font-semibold text-white shadow-glow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">{label}</label>
      {children}
    </div>
  )
}
