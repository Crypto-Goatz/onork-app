'use client'

import { useEffect } from 'react'

/**
 * The hero's motion driver — beats and CRO9 markers. Enhancement only.
 *
 * WHAT IT IS NOT. It is not what makes the hero visible; the hero is complete
 * in the HTML payload and this file can fail to load, fail to parse, or never
 * run at all without costing a single word or a pixel of layout. All it does is
 * hand back what the pre-paint script in Hero.tsx retracted, in order, and tell
 * CRO9 which beats a real visitor actually reached.
 *
 * NO SCROLL LISTENER (guardrail 3). IntersectionObserver only — it is the
 * fallback the spec names, and it is the whole implementation here on purpose:
 * `animation-timeline: view()` would drive the same two classes, but it cannot
 * fire the CRO9 markers, so a scroll-timeline build would still need this
 * observer alongside it. One mechanism that does both beats the two that
 * disagree the first time someone edits one of them.
 *
 * FIRE-ONCE IS ENFORCED HERE, not by CRO9. The collect endpoint takes whatever
 * it is sent; a beat marker that fires on every scroll direction change would
 * make "did the astonishing pass convert better" unanswerable by inflating the
 * denominator. Each beat unobserves itself the moment it lands.
 */

/** Beat 1 fires when the hero itself is meaningfully on screen. */
const BEAT_1_TARGET = '#hero'
/** Beat 2 fires when the stack modules are on screen. */
const BEAT_2_TARGET = '.dock--stack'
/** Beat 3 is the hand-off to light — the first light section clearing the fold. */
const BEAT_3_TARGET = '#walkthrough'

function track(event: string) {
  try {
    const cro9 = (window as unknown as { cro9?: (e: string, d?: unknown) => void }).cro9
    if (typeof cro9 === 'function') cro9(event, { surface: 'home_hero' })
  } catch {
    // The scoreboard is not allowed to break the page it is scoring.
  }
}

export default function HeroMotion() {
  useEffect(() => {
    const root = document.documentElement

    // Not armed means: reduced motion, or the visitor arrived part-way down the
    // page, or the inline script never ran. In every one of those cases the
    // hero is already in its final composition and there is nothing to release
    // — but the CRO9 markers still matter, so they are NOT gated on arming.
    const armed = root.classList.contains('hero-armed')

    const observers: IntersectionObserver[] = []

    const beat = (
      selector: string,
      cls: string | null,
      event: string,
      init: IntersectionObserverInit,
    ) => {
      const el = document.querySelector(selector)
      if (!el) return
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (armed && cls) root.classList.add(cls)
          track(event)
          io.disconnect()
          break
        }
      }, init)
      io.observe(el)
      observers.push(io)
    }

    // Beat 1 opens on arrival — the hero is the first thing on the page, so
    // "when it is on screen" is immediately, and that is correct: the sentence
    // becoming the plan is what the visitor is there to watch.
    beat(BEAT_1_TARGET, 'beat-1', 'hero_scroll_beat_1', { threshold: 0.15 })

    // Beat 2 must actually cost a scroll, or both beats play at once on a tall
    // desktop viewport and the accretion reads as one blur. The bottom-20%
    // margin holds it until the stack has been scrolled properly into view.
    beat(BEAT_2_TARGET, 'beat-2', 'hero_scroll_beat_2', {
      threshold: 0.6,
      rootMargin: '0px 0px -20% 0px',
    })

    // Beat 3 is the hand-off to light. Nothing to release — the gradient band
    // is correct at first paint — so this marker is measurement only.
    beat(BEAT_3_TARGET, null, 'hero_scroll_beat_3', { threshold: 0.25 })

    return () => {
      for (const io of observers) io.disconnect()
      // Leave beat-1/beat-2 on <html>: they are "this has already played".
      // Removing them on unmount would re-hide a hero that is still on screen
      // during a client-side route transition.
      root.classList.remove('hero-armed')
    }
  }, [])

  return null
}
