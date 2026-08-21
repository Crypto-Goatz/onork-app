'use client'

/**
 * 0n Course Builder — the marketplace Custom Page.
 *
 * WHO IS LOOKING AT THIS. Someone who installed the app from the marketplace and
 * opened it inside their CRM. They have no account with us. Their identity
 * arrives through the SSO handshake, which yields a short-lived app JWT — that
 * token is the only auth on every call below.
 *
 * THREE STEPS, NOT ONE BUTTON. Outlining is fast and nearly free; writing a
 * whole course is neither. Splitting them means the shape is approved before the
 * writing is paid for, and a bad topic costs seconds instead of minutes.
 *
 * IT NEVER RENDERS AN OAUTH BUTTON. This runs framed, and OAuth is refused
 * inside an iframe. If SSO fails the page says so plainly instead of offering a
 * sign-in that cannot work.
 */
import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, Loader2, Sparkles, TriangleAlert } from 'lucide-react'
import { useSso, authHeaders } from '@/app/crm/useSso'
import { WorkspacePicker } from '@/components/workspaces/WorkspacePicker'

interface Lesson { title: string; summary?: string }
interface Outline { title: string; description: string; lessons: Lesson[] }
type Phase = 'describe' | 'outline' | 'generating' | 'ready' | 'published'
/** One row from /api/hub/workspaces — a workspace this contact may publish into. */
type Ws = {
  locationId: string
  name: string | null
  canPublish: boolean
  reason: string | null
  /** Second line for the picker — address or install date. */
  hint: string | null
  /** Another workspace shares this display name; show the id to tell them apart. */
  ambiguous: boolean
}

export default function CourseApp() {
  const sso = useSso()
  const [phase, setPhase] = useState<Phase>('describe')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [lessonCount, setLessonCount] = useState(5)
  const [outline, setOutline] = useState<Outline | null>(null)
  const [course, setCourse] = useState<unknown>(null)
  const [failures, setFailures] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ lessons: number; method: string; pending: boolean; enrollmentUrl: string | null } | null>(null)

  /**
   * WHERE THIS COURSE GOES — chosen, never assumed.
   *
   * This was `sso.activeLocationId` — whatever workspace the iframe happened to
   * hand us. That is fine when a person has exactly one, and silently wrong the
   * moment they have two: a course written for client A published into client
   * B, with no undo. The resolver returns only workspaces where this contact
   * has access, holds the add-on, AND the connection is live.
   */
  const [spaces, setSpaces] = useState<Ws[] | null>(null)
  const [spaceNote, setSpaceNote] = useState<string | null>(null)
  /**
   * The resolver's own notes, shown rather than swallowed.
   *
   * The list is a subset of the agency by design — 47 of 102 sub-accounts have
   * the add-on — and a count that can be small for two different reasons
   * (subset vs truncation) has to say which. Keeping this in the JSON only
   * explains it to whoever curls the endpoint, not to the person publishing.
   */
  const [spaceNotes, setSpaceNotes] = useState<string[]>([])
  const [chosen, setChosen] = useState<string>('')

  /**
   * THIS FETCH HAD NO AUTH, and it is the only one in this file that didn't.
   *
   * Every other call goes through `call()`, which spreads `authHeaders(sso.token)`.
   * This one sent a bare cookie request — and inside the CRM iframe there is
   * usually no cookie, because `useSso` keeps the session as a JWT in
   * sessionStorage for exactly that reason. So the workspaces list 401'd for a
   * real embedded install and succeeded only when a stale 0nCore cookie
   * happened to be lying around in the same browser. "Could not load your
   * workspaces", intermittently, for no reason a user could see.
   *
   * AND IT RAN TOO EARLY. The dependency list was `[]`, so it fired on the
   * first render — before the SSO handshake settles — meaning even with the
   * header attached there would be no token to send. It now waits for the
   * handshake and re-runs when the token arrives.
   */
  useEffect(() => {
    if (sso.state === 'pending') return
    let cancelled = false
    fetch('/api/hub/workspaces?addon=ai-course-builder', {
      credentials: 'same-origin',
      headers: { ...authHeaders(sso.token) },
    })
      .then(async (r) => (r.ok ? r.json() : { __failed: r.status, ...(await r.json().catch(() => ({}))) }))
      .then((d) => {
        if (cancelled) return
        if (!d || d.__failed) {
          setSpaces([])
          // The server's own words, not a generic line. A 401 here and a 500
          // here need different actions from whoever is reading it.
          setSpaceNote(d?.error || `Could not load your workspaces (${d?.__failed ?? 'no response'}).`)
          return
        }
        const list: Ws[] = d.publishable ?? []
        setSpaces(list)
        setSpaceNotes(Array.isArray(d.notes) ? d.notes : [])
        // One workspace is not a choice — preselect it and say which it is.
        if (list.length === 1) setChosen(list[0].locationId)
        if (!list.length) {
          const blocked = (d.workspaces ?? []).find((w: Ws) => w.reason)
          setSpaceNote(d.emptyReason || blocked?.reason || 'No workspace can publish this yet.')
        }
      })
      .catch(() => {
        if (cancelled) return
        setSpaces([]); setSpaceNote('Could not reach the workspace service.')
      })
    return () => { cancelled = true }
  }, [sso.state, sso.token])

  /**
   * Fall back to the SSO location only when the resolver found nothing at all,
   * so an in-CRM single-tenant install keeps working exactly as before.
   *
   * This read `(sso as { activeLocationId?: string }).activeLocationId` — a cast
   * to a field the Sso interface did not have, so it was ALWAYS undefined and
   * this fallback always produced ''. The recovery path for a failed workspace
   * fetch could never recover. `useSso` now decodes the claim that was in the
   * token all along, so the cast is gone and the value is real.
   */
  const locationId = chosen || (spaces && spaces.length === 0 ? (sso.activeLocationId ?? '') : '')

  useEffect(() => { document.title = '0n Course Builder' }, [])

  async function call(step: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/crm/courses?step=${step}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token) },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `That step failed (${res.status}).`)
    return json
  }

  const config = { topic, audience, lessonCount, includeQuizzes: true, tone: 'professional', learningOutcome: '' }

  async function doOutline() {
    if (!topic.trim() || !audience.trim()) { setError('Tell it what to teach and who it is for.'); return }
    setBusy(true); setError(null)
    try {
      const j = await call('outline', { config })
      setOutline(j.outline); setPhase('outline')
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') }
    finally { setBusy(false) }
  }

  async function doGenerate() {
    setBusy(true); setError(null); setPhase('generating')
    try {
      const j = await call('generate', { config, outline })
      setCourse(j.course)
      // Failures are shown, never hidden — a course quietly missing lesson 4 is
      // worse than one that says lesson 4 needs another go.
      setFailures(Array.isArray(j.failures) ? j.failures : [])
      setPhase('ready')
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed.'); setPhase('outline') }
    finally { setBusy(false) }
  }

  async function doPublish() {
    setBusy(true); setError(null)
    try {
      const j = await call('publish', { course, locationId, priceCents: 0 })
      setResult({
        lessons: j.lessons ?? 0,
        method: j.method ?? 'import',
        pending: Boolean(j.pending),
        enrollmentUrl: j.enrollmentUrl ?? null,
      })
      setPhase('published')
    } catch (e) { setError(e instanceof Error ? e.message : 'Publishing failed.') }
    finally { setBusy(false) }
  }

  if (sso.state === 'pending') {
    return <Shell><p className="text-[#9fb0cc]">Connecting…</p></Shell>
  }
  if (sso.state !== 'authed') {
    return (
      <Shell>
        <TriangleAlert className="mb-3 h-6 w-6 text-[#d97706]" />
        <h1 className="text-lg font-bold">Open this from inside your CRM</h1>
        <p className="mt-2 max-w-sm text-[14px] text-[#9fb0cc]">
          This page signs you in automatically when it is opened from the app menu in your
          account. Opened directly in a browser tab there is nothing to sign in with.
        </p>
      </Shell>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d1117] px-5 py-8 text-[#f0f4f8]">
      <div className="mx-auto max-w-[680px]">
        <header className="mb-6 flex items-center gap-2.5">
          <BookOpen className="h-6 w-6 text-[#7ED957]" strokeWidth={2} />
          <h1 className="text-xl font-black">0n Course Builder</h1>
        </header>

        <Steps phase={phase} />

        {error && (
          <div className="mb-4 rounded-xl border border-[#d97706]/40 bg-[#d97706]/10 px-4 py-3 text-[13.5px] text-[#fbbf24]">
            {error}
          </div>
        )}

        {phase === 'describe' && (
          <Card>
            <Field label="What should this course teach?">
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className={INPUT}
                placeholder="How to prepare for your first dental implant" />
            </Field>
            <Field label="Who is it for?">
              <input value={audience} onChange={(e) => setAudience(e.target.value)} className={INPUT}
                placeholder="Nervous first-time patients" />
            </Field>
            <Field label="How many lessons?">
              <input type="number" min={1} max={20} value={lessonCount}
                onChange={(e) => setLessonCount(Number(e.target.value) || 5)} className={`${INPUT} w-28`} />
            </Field>
            <button onClick={doOutline} disabled={busy} className={BTN}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Outline the course
            </button>
          </Card>
        )}

        {phase === 'outline' && outline && (
          <Card>
            <h2 className="text-[17px] font-bold">{outline.title}</h2>
            <p className="mt-1 text-[13.5px] text-[#9fb0cc]">{outline.description}</p>
            <ol className="mt-4 space-y-1.5">
              {outline.lessons.map((l, i) => (
                <li key={i} className="flex gap-2.5 text-[14px]">
                  <span className="font-mono text-[#7ED957]">{i + 1}.</span>
                  <span>{l.title}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[12.5px] text-[#6b7c9c]">
              Nothing has been written yet. Approve the shape and the lessons get written.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={doGenerate} disabled={busy} className={BTN}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Write the lessons
              </button>
              <button onClick={() => setPhase('describe')} className={BTN_GHOST}>Start over</button>
            </div>
          </Card>
        )}

        {phase === 'generating' && (
          <Card>
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-[#7ED957]" />
            <p className="text-[14px]">Writing {lessonCount} lessons in parallel. This takes a minute or two.</p>
          </Card>
        )}

        {phase === 'ready' && (
          <Card>
            <CheckCircle2 className="mb-3 h-6 w-6 text-[#7ED957]" />
            <h2 className="text-[17px] font-bold">Course written</h2>
            {failures.length > 0 && (
              <p className="mt-2 text-[13.5px] text-[#fbbf24]">
                {failures.length} lesson{failures.length === 1 ? '' : 's'} needs another go — publishing anyway keeps the rest.
              </p>
            )}
            <p className="mt-2 text-[13.5px] text-[#9fb0cc]">
              Publishing puts it into that account&apos;s course area, ready to price and sell.
            </p>

            {/* More than one workspace is a real choice, so it is presented as
                one. Publishing into the wrong company cannot be undone — and at
                47 rows with six duplicated names, a bare dropdown is how that
                happens. See components/workspaces/WorkspacePicker.tsx. */}
            {spaces && spaces.length > 1 && (
              <>
                <WorkspacePicker spaces={spaces} chosen={chosen} onChoose={setChosen} />
                {spaceNotes.map((n) => (
                  <p key={n} className="mt-2 text-[12px] leading-relaxed text-[#6b7d99]">
                    {n}
                  </p>
                ))}
              </>
            )}

            {/* One workspace: say WHICH, rather than "this account". */}
            {spaces && spaces.length === 1 && (
              <p className="mt-3 text-[13px] text-[#9fb0cc]">
                Publishing to <span className="text-white">{spaces[0].name || spaces[0].locationId}</span>
              </p>
            )}

            {/* Zero: explain, never an empty dropdown. */}
            {spaces && spaces.length === 0 && spaceNote && (
              <p className="mt-3 rounded-lg border border-[#fbbf24]/30 bg-[#fbbf24]/[0.07] p-3 text-[13px] text-[#fbbf24]">
                {spaceNote}
              </p>
            )}

            <button
              onClick={doPublish}
              disabled={busy || (spaces !== null && spaces.length > 1 && !chosen)}
              className={`${BTN} mt-4`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              {spaces && spaces.length > 1 ? 'Publish to selected client' : 'Publish'}
            </button>
          </Card>
        )}

        {phase === 'published' && (
          <Card>
            <CheckCircle2 className="mb-3 h-7 w-7 text-[#7ED957]" />
            <h2 className="text-[18px] font-black">Published</h2>
            <p className="mt-2 text-[14px] text-[#9fb0cc]">
              {result?.lessons ?? 0} {result?.lessons === 1 ? 'lesson is' : 'lessons are'}{' '}
              {result?.pending
                ? 'on their way in — your CRM imports course content in the background, so give it a minute before they all show up.'
                : 'now in your course area.'}{' '}
              Open Memberships → Courses to price it.
            </p>
            {result?.enrollmentUrl && (
              <a href={result.enrollmentUrl} target="_blank" rel="noreferrer"
                className="mt-3 inline-block text-[13.5px] text-[#7ED957] underline">
                Open the course in your account
              </a>
            )}
            <button onClick={() => { setPhase('describe'); setOutline(null); setCourse(null); setResult(null) }}
              className={`${BTN_GHOST} mt-4`}>
              Build another
            </button>
          </Card>
        )}
      </div>
    </main>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0d1117] px-6 text-center text-[#f0f4f8]">
      <div className="flex flex-col items-center">{children}</div>
    </main>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">{children}</section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-[#9fb0cc]">{label}</span>
      {children}
    </label>
  )
}

function Steps({ phase }: { phase: Phase }) {
  const at = phase === 'describe' ? 0 : phase === 'outline' ? 1 : phase === 'published' ? 3 : 2
  return (
    <div className="mb-5 flex items-center gap-2 text-[11.5px]">
      {['Describe', 'Approve outline', 'Write', 'Publish'].map((s, i) => (
        <span key={s} className={`rounded-full px-2.5 py-1 font-semibold ${
          i <= at ? 'bg-[#7ED957]/15 text-[#7ED957]' : 'bg-white/5 text-white/35'}`}>{s}</span>
      ))}
    </div>
  )
}

const INPUT = 'w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-[#7ED957]'
const BTN = 'inline-flex items-center gap-2 rounded-xl bg-[#7ED957] px-5 py-2.5 text-[13.5px] font-bold text-[#0d1117] transition hover:opacity-90 disabled:opacity-40'
const BTN_GHOST = 'inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-white/5'
