'use client'

/**
 * The decisions form.
 *
 * OPENS WITH WHAT WAS DONE. Each round reports on the previous one before it
 * asks for anything — a form that only ever asks is a form people stop opening.
 *
 * Every choice carries a RECOMMENDED marker so agreeing with all of them is one
 * click. The point is to get a decision, not to make someone do homework.
 */
import { useMemo, useState } from 'react'
import { Check, CircleCheck, Loader2, Send, TriangleAlert } from 'lucide-react'

export interface Question {
  id: string
  tag?: string
  q: string
  why?: string
  warn?: string
  free?: boolean
  ph?: string
  opts?: [value: string, title: string, desc?: string, recommended?: boolean][]
}
export interface Round {
  id: string
  round: number
  title: string
  intro?: string | null
  completed: string[]
  questions: Question[]
  status: string
  answered_at: string | null
}

type Answer = { choice: string | null; note: string | null } | string

export default function DecisionsForm({ round, token }: { round: Round; token: string }) {
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [free, setFree] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(
    round.answered_at ? 'done' : 'idle',
  )
  const [err, setErr] = useState<string | null>(null)

  const qs = round.questions ?? []
  const answered = useMemo(
    () => qs.filter((q) => (q.free ? (free[q.id] ?? '').trim() : picked[q.id])).length,
    [qs, picked, free],
  )

  async function submit() {
    setState('sending'); setErr(null)
    const answers: Record<string, Answer> = {}
    for (const q of qs) {
      if (q.free) { const v = (free[q.id] ?? '').trim(); if (v) answers[q.id] = v }
      else {
        const c = picked[q.id] ?? null
        const n = (notes[q.id] ?? '').trim() || null
        if (c || n) answers[q.id] = { choice: c, note: n }
      }
    }
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      setState('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <main className="min-h-screen bg-[#fafafa] px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <CircleCheck className="mx-auto h-12 w-12 text-[#16a34a]" strokeWidth={2} />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#171717]">Sent</h1>
          <p className="mt-2 text-[15px] text-[#737373]">
            Your answers are through. I&apos;ll start on them and report back in the next round.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fafafa] px-6 pb-40 pt-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#737373]">
          Round {round.round}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717]">{round.title}</h1>
        {round.intro && <p className="mt-2 text-[15px] leading-relaxed text-[#737373]">{round.intro}</p>}

        {/* What was done since last time — before anything is asked. */}
        {round.completed?.length > 0 && (
          <section className="mt-8 rounded-2xl border border-[#e5e5e5] bg-white p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#16a34a]">
              Done since the last round
            </div>
            <ul className="mt-3 space-y-2">
              {round.completed.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[#404040]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={2.5} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 space-y-3.5">
          {qs.map((q, i) => (
            <section key={q.id} className="rounded-2xl border border-[#e5e5e5] bg-white p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#737373]">
                {q.tag ?? 'Question'} · {i + 1} of {qs.length}
              </div>
              <h2 className="mt-2 text-[17px] font-semibold leading-snug text-[#171717]">{q.q}</h2>
              {q.why && (
                <p
                  className="mt-2 text-[13.5px] leading-relaxed text-[#737373]"
                  dangerouslySetInnerHTML={{ __html: q.why }}
                />
              )}
              {q.warn && (
                <p className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-relaxed text-[#d97706]">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {q.warn}
                </p>
              )}

              {q.free ? (
                <textarea
                  rows={3}
                  value={free[q.id] ?? ''}
                  onChange={(e) => setFree({ ...free, [q.id]: e.target.value })}
                  placeholder={q.ph ?? ''}
                  className="mt-3.5 w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3.5 py-3 text-[13.5px] text-[#f5f5f5] outline-none transition placeholder:text-[#8a8a8a] focus:border-[#16a34a] focus:ring-[3px] focus:ring-[#6EE05A]/20"
                />
              ) : (
                <>
                  <div className="mt-3.5 grid gap-2">
                    {(q.opts ?? []).map(([v, t, d, rec]) => {
                      const on = picked[q.id] === v
                      return (
                        <label
                          key={v}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-150 ${
                            on ? 'border-[#16a34a] bg-[#6EE05A]/[0.07]' : 'border-[#e5e5e5] bg-white hover:border-[#b3b3b3]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={on}
                            onChange={() => setPicked({ ...picked, [q.id]: v })}
                            className="mt-1 h-4 w-4 shrink-0 accent-[#16a34a]"
                          />
                          <span className="min-w-0">
                            <span className="block text-[14px] font-medium text-[#171717]">
                              {t}
                              {rec && (
                                <span className="ml-2 rounded-full bg-[#6EE05A]/20 px-2 py-0.5 align-[1px] text-[10.5px] font-bold tracking-wide text-[#16a34a]">
                                  RECOMMENDED
                                </span>
                              )}
                            </span>
                            {d && <span className="mt-0.5 block text-[12.5px] text-[#737373]">{d}</span>}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  <input
                    type="text"
                    value={notes[q.id] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                    placeholder="Optional note…"
                    className="mt-2.5 w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3.5 py-2.5 text-[13px] text-[#f5f5f5] outline-none transition placeholder:text-[#8a8a8a] focus:border-[#16a34a]"
                  />
                </>
              )}
            </section>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[#e5e5e5] bg-[#fafafa]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-[13px] text-[#737373]">
            {err ? <span className="text-[#dc2626]">{err}</span>
                 : `${answered} of ${qs.length} answered — blanks mean “your call”.`}
          </span>
          <button
            onClick={submit}
            disabled={state === 'sending'}
            className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-7 py-3 text-[14px] font-semibold text-white shadow-[0_10px_26px_rgba(110,224,90,.34)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send answers
          </button>
        </div>
      </div>
    </main>
  )
}
