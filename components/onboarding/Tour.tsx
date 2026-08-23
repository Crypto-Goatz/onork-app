'use client'

/**
 * Spotlight product tour — ported from the 0nTask original, with two additions
 * that the original does not have:
 *
 *   1. An ARROW that points at the highlighted element, so the tooltip is
 *      visibly attached to the thing it is describing rather than floating
 *      near it.
 *
 *   2. A SKIP INTERCEPT. In the original, Skip silently closes. Here, skipping
 *      a step marked `critical` raises one honest interstitial instead: the
 *      Groq key is not mandatory, but a user who skips it silently runs on our
 *      key and eventually hits a wall they will not understand. Telling them
 *      once, clearly, at the moment they opt out, is the whole point.
 *
 * Targets elements by `data-tour="key"`, same convention as 0nTask, so the
 * markup contract is identical and steps port between the two apps.
 */

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Check, ExternalLink, KeyRound, X, Zap } from 'lucide-react'

export interface TourStep {
  /** CSS selector for the element to spotlight. Omit for a centered modal. */
  target?: string
  title: string
  body: string
  /**
   * Marks a step whose skip carries a real consequence. Skipping it raises the
   * interstitial rather than closing the tour.
   */
  critical?: boolean
  /** Optional call-to-action rendered as a full-width button inside the step. */
  cta?: { label: string; href: string }
}

const PAD = 8
const TIP_W = 340

export default function Tour({
  steps,
  onDone,
}: {
  steps: TourStep[]
  onDone: (outcome: 'completed' | 'skipped') => void
}) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [intercept, setIntercept] = useState(false)
  const step = steps[i]

  useLayoutEffect(() => {
    if (!step || intercept) return
    const el = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null
    if (!el) {
      setRect(null)
      return
    }
    const update = () => setRect(el.getBoundingClientRect())
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const t = setTimeout(update, 220)
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [i, step, intercept])

  // The tour has an opinion about being dismissed, so Escape routes through the
  // same skip logic rather than bypassing the interstitial.
  const requestSkip = useCallback(() => {
    const remainingCritical = steps.slice(i).some((s) => s.critical)
    if (remainingCritical) setIntercept(true)
    else onDone('skipped')
  }, [i, steps, onDone])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestSkip])

  if (!step) return null

  if (intercept) return <SkipIntercept onBack={() => setIntercept(false)} onDismiss={() => onDone('skipped')} />

  const last = i === steps.length - 1
  const next = () => (last ? onDone('completed') : setI(i + 1))
  const prev = () => setI(Math.max(0, i - 1))

  const box = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 }
    : null

  // Tooltip below the target when there's room, else above; centered with no target.
  let tip: CSSProperties
  let arrow: 'up' | 'down' | null = null
  if (box) {
    const belowRoom = window.innerHeight - (box.top + box.h)
    const below = belowRoom > 230
    const top = below ? box.top + box.h + 14 : Math.max(12, box.top - 14 - 210)
    let left = box.left + box.w / 2 - TIP_W / 2
    left = Math.min(Math.max(12, left), window.innerWidth - TIP_W - 12)
    tip = { position: 'fixed', top, left, width: TIP_W }
    arrow = below ? 'up' : 'down'
  } else {
    tip = { position: 'fixed', top: '50%', left: '50%', width: TIP_W + 20, transform: 'translate(-50%,-50%)' }
  }

  // Arrow sits on the tooltip edge, horizontally aligned to the target's centre
  // even when the tooltip was clamped to the viewport.
  const arrowLeft = box ? Math.min(Math.max(16, box.left + box.w / 2 - (tip.left as number) - 7), TIP_W - 30) : 0

  return (
    <div className="fixed inset-0 z-[9998]">
      {box ? (
        <div
          className="pointer-events-none fixed rounded-xl transition-all duration-200"
          style={{
            top: box.top,
            left: box.left,
            width: box.w,
            height: box.h,
            boxShadow: '0 0 0 9999px rgba(2,8,16,0.72)',
            outline: '2px solid #7ed957',
            outlineOffset: 2,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#020810]/72 backdrop-blur-[2px]" />
      )}

      <div
        style={tip}
        className="rounded-2xl border border-white/12 bg-[#0d1117] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
      >
        {arrow && (
          <span
            aria-hidden
            className="absolute h-3.5 w-3.5 rotate-45 border border-white/12 bg-[#0d1117]"
            style={
              arrow === 'up'
                ? { top: -8, left: arrowLeft, borderRight: 'none', borderBottom: 'none' }
                : { bottom: -8, left: arrowLeft, borderLeft: 'none', borderTop: 'none' }
            }
          />
        )}

        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
            Step {i + 1} of {steps.length}
          </span>
          <button onClick={requestSkip} aria-label="Close tour" className="text-white/40 hover:text-rose-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-[16px] font-black tracking-tight text-white">{step.title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">{step.body}</p>

        {step.cta && (
          <a
            href={step.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-4 py-2.5 text-[13px] font-bold text-[#020810] transition-transform hover:scale-[1.01]"
          >
            {step.cta.label}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        <div className="mt-3 flex items-center gap-2">
          {i > 0 && (
            <button
              onClick={prev}
              className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/65 hover:bg-white/5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          <button onClick={requestSkip} className="text-xs font-semibold text-white/40 hover:text-white/70">
            Skip
          </button>
          <button
            onClick={next}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#7ed957] px-4 py-1.5 text-xs font-bold text-[#020810] hover:brightness-110"
          >
            {last ? (
              <>
                Done <Check className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Next step <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The skip interstitial.
 *
 * Deliberately does NOT block: the key is genuinely optional, and a modal that
 * cannot be dismissed reads as a paywall. It states the actual consequence
 * once, offers the one-click path, and lets them leave.
 */
function SkipIntercept({ onBack, onDismiss }: { onBack: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020810]/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-amber-400/25 bg-[#0d1117] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
          <Zap className="h-3 w-3" />
          Important — not required, but do it now
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white">
          Without your own key, your AI runs on a shared meter.
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-white/70">
          A Groq account is <span className="font-semibold text-white">free</span>, takes about 60 seconds, and needs no
          credit card. Connect one and the AI across your whole dashboard runs on your own account — you stop sharing a
          monthly allowance with everyone else, and nobody here can see your key.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Skip it and everything still works, right up until the shared allowance runs out mid-task.
        </p>

        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#7ed957] px-6 py-4 text-base font-black text-[#020810] shadow-[0_0_34px_rgba(126,217,87,0.32)] transition-transform hover:scale-[1.01]"
        >
          <KeyRound className="h-5 w-5" />
          Create your Groq account &amp; get your API key
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="mt-2 text-center text-[11px] text-white/40">
          Opens the API-keys page directly — signing up lands you right back on it, key in hand.
        </p>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={onBack} className="text-xs font-semibold text-white/55 hover:text-white">
            ← Back to the tour
          </button>
          <button onClick={onDismiss} className="text-xs font-semibold text-white/35 hover:text-white/60">
            I&apos;ll do it later
          </button>
        </div>
      </div>
    </div>
  )
}
