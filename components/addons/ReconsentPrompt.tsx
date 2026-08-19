'use client'

/**
 * The re-consent prompt — what a customer sees when the app opens against a
 * dead or dying CRM install.
 *
 * TWO SHAPES, AND THE SHAPE IS THE MESSAGE.
 *   blocking — the add-on cannot work. It replaces the frame, because a Run
 *              button that 401s teaches people the product is broken rather
 *              than that a token expired.
 *   banner   — the add-on still works. It sits ABOVE the working frame and
 *              takes nothing away. It is dismissible, per location and per app,
 *              because a warning you cannot silence is a warning people learn
 *              to look past — and this one has to still land on the day it
 *              matters. Dismissal is local to the browser and deliberately
 *              short-lived; it is a snooze, not a decision.
 *
 * IT NEVER SAYS "SOMETHING WENT WRONG". Every sentence here names what happened
 * and what the one click does. This ecosystem has already paid for a status
 * code standing in for four different causes, and re-consent is the case where
 * a vague message costs the account: the customer's read of "your connection
 * expired, we can't fix it" is "this product is unreliable" unless you also say
 * that nothing was lost and the fix is one screen.
 *
 * THE ACTION IS A REAL LINK, not a fetch. It starts an OAuth redirect to the
 * CRM's consent screen; an XHR cannot navigate there, and a button that appears
 * to do nothing for 400ms is how people click it four times.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Clock, PlugZap, ShieldAlert } from 'lucide-react'

export interface ReconsentPromptData {
  severity: 'dying' | 'dead' | 'absent'
  blocking: boolean
  headline: string
  detail: string
  actionLabel: string
  actionHref: string
  locationId: string
  daysLeft: number | null
}

/** Snooze, not consent. Long enough to finish a task, short enough to return. */
const SNOOZE_MS = 12 * 60 * 60 * 1000

function snoozeKey(d: ReconsentPromptData): string {
  return `0n.reconsent.snooze.${d.locationId || 'none'}.${d.severity}`
}

export default function ReconsentPrompt({
  data,
  appName,
}: {
  data: ReconsentPromptData
  appName?: string
}) {
  /**
   * STARTS VISIBLE, and the effect is what HIDES it.
   *
   * The other way round reads as the tidier choice — start hidden, reveal only
   * if not snoozed, no flash. It was also wrong, and a real render proved it:
   * the banner was absent from the server HTML entirely and appeared only after
   * hydration, so anyone on a slow connection got the frame, the settings form
   * and the Run button with no warning attached to them. A snooze is a local
   * preference; the warning is the product's obligation. The obligation ships
   * in the HTML and the preference removes it a moment later.
   *
   * A blocking prompt is never hidden — there is nothing behind it to see.
   */
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (data.blocking) return
    try {
      const until = Number(window.localStorage.getItem(snoozeKey(data)) || 0)
      if (until && until > Date.now()) setShow(false)
    } catch {
      // No storage (private mode, blocked) means no snooze. Leaving the warning
      // up is the safe direction to fail in.
    }
  }, [data])

  const dismiss = () => {
    try {
      window.localStorage.setItem(snoozeKey(data), String(Date.now() + SNOOZE_MS))
    } catch { /* a snooze that cannot persist still hides it for this view */ }
    setShow(false)
  }

  if (!show) return null

  const Icon =
    data.severity === 'dead' ? ShieldAlert : data.severity === 'absent' ? PlugZap : Clock

  const accent =
    data.severity === 'dead'
      ? { border: 'border-[#f87171]/35', bg: 'bg-[#f87171]/[0.07]', fg: 'text-[#f87171]' }
      : data.severity === 'absent'
        ? { border: 'border-[#6EE05A]/30', bg: 'bg-[#6EE05A]/[0.06]', fg: 'text-[#6EE05A]' }
        : { border: 'border-[#f59e0b]/30', bg: 'bg-[#f59e0b]/[0.06]', fg: 'text-[#f59e0b]' }

  const action = (
    <a
      href={data.actionHref}
      className="inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90"
    >
      {data.actionLabel} <ArrowRight className="h-4 w-4" />
    </a>
  )

  // ── The banner: above a frame that still works. ──────────────────────────
  if (!data.blocking) {
    return (
      <section className={`rounded-xl border ${accent.border} ${accent.bg} p-4`}>
        <div className="flex flex-wrap items-start gap-3">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${accent.fg}`} />
          <div className="min-w-[240px] flex-1">
            <p className="text-sm font-medium text-white/90">{data.headline}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/60">{data.detail}</p>
          </div>
          <div className="flex items-center gap-3">
            {action}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/55 transition hover:border-white/35 hover:text-white"
            >
              Later
            </button>
          </div>
        </div>
      </section>
    )
  }

  // ── The blocking prompt: this IS the screen. ─────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <main className="mx-auto flex max-w-[720px] flex-col justify-center px-6 py-20 md:px-10">
        <div className={`rounded-2xl border ${accent.border} ${accent.bg} p-8`}>
          <Icon className={`h-6 w-6 ${accent.fg}`} />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{data.headline}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">{data.detail}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {action}
            <a
              href="/hub"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/35 hover:text-white"
            >
              Back to the Hub
            </a>
          </div>
        </div>

        {/* What happens next, before they click. An OAuth redirect that arrives
            unannounced reads as a phishing screen — naming it first is the
            difference between an approval and an abandoned flow. */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
            <AlertTriangle className="h-3.5 w-3.5" /> What happens when you click
          </p>
          <ol className="mt-3 space-y-2 text-sm text-white/55">
            <li>1. Your CRM shows you its own approval screen, listing what {appName ? appName : 'the app'} can access.</li>
            <li>2. You choose the location and approve.</li>
            <li>3. You land back here, on this page, with everything as you left it.</li>
          </ol>
          {data.locationId && (
            <p className="mt-4 font-mono text-xs text-white/25">Location {data.locationId}</p>
          )}
        </div>
      </main>
    </div>
  )
}
