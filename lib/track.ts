'use client'

/**
 * The 0nCore event map.
 *
 * The CRO9 collector already loads sitewide from layout.tsx and handles
 * sessions, clicks and engagement on its own. This is the layer above it: the
 * named business events the site plan calls for, so "how many agencies clicked
 * Install versus Start free" is a question with an answer.
 *
 * WHY A CLOSED UNION. An analytics call is fire-and-forget — a typo'd event
 * name fails silently and is only discovered weeks later when the funnel has a
 * hole in it. Naming the events in the type system means a mistake is a build
 * error instead of a missing row.
 *
 * NEVER THROWS. Analytics must not be able to break a page. Every path is
 * wrapped, and a failed send is dropped rather than retried — a lost event is
 * worth far less than a working CTA.
 */

export type TrackEvent =
  | 'cta_install_crm'      // → the marketplace listing
  | 'cta_signup_direct'    // → Door B signup
  | 'pricing_view'
  | 'capability_expand'
  | 'doc_read'
  | 'section_depth'        // scroll milestones
  | 'video_play'

type Props = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    cro9?: { track?: (name: string, props?: Props) => void }
    dataLayer?: unknown[]
  }
}

export function track(event: TrackEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return

  const payload = {
    event,
    ...props,
    path: window.location.pathname,
    ts: Date.now(),
  }

  // 1. CRO9, if the collector has finished loading. It is loaded async, so it
  //    may not be there yet on a fast click — that is fine, the beacon below
  //    is the durable path.
  try {
    window.cro9?.track?.(event, payload)
  } catch {
    /* collector problems are never the page's problem */
  }

  // 2. Our own sink. sendBeacon survives the page unloading, which matters
  //    precisely for the events worth measuring — the ones where the click
  //    navigates away.
  try {
    const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT
    if (!endpoint) return
    const body = JSON.stringify({
      site: process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID || '0ncore',
      ...payload,
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
    } else {
      void fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
    }
  } catch {
    /* dropped on purpose — see the header */
  }
}

/**
 * Scroll depth, reported once per milestone.
 *
 * Returns a cleanup function. Deliberately coarse (25/50/75/100) — finer
 * buckets produce more rows and no more insight, and on a long marketing page
 * the useful question is only "did they reach the pricing band".
 */
export function trackScrollDepth(): () => void {
  if (typeof window === 'undefined') return () => {}
  const hit = new Set<number>()

  const onScroll = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    if (max <= 0) return
    const pct = Math.round((window.scrollY / max) * 100)
    for (const mark of [25, 50, 75, 100]) {
      if (pct >= mark && !hit.has(mark)) {
        hit.add(mark)
        track('section_depth', { depth: mark })
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  return () => window.removeEventListener('scroll', onScroll)
}
