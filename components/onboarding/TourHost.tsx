'use client'

/**
 * Decides whether the welcome tour runs, and remembers the answer.
 *
 * Deliberately client-only and dependency-free: the tour is onboarding polish,
 * and it must never be able to break the dashboard it decorates. If anything
 * here throws, the dashboard renders exactly as it would have.
 *
 * The outcome is recorded server-side as well as locally, because "did this
 * user ever see the AI-key step" is a question worth being able to answer for
 * a real person later, and localStorage cannot answer it from another device.
 */

import { useEffect, useState } from 'react'

import Tour from '@/components/onboarding/Tour'
import { WELCOME_TOUR } from '@/lib/onboarding/tours'

const SEEN_KEY = '0ncore.tour.welcome.v1'

export default function TourHost() {
  const [run, setRun] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return
      // Let the dashboard paint and its nav mount before measuring targets.
      const t = setTimeout(() => setRun(true), 700)
      return () => clearTimeout(t)
    } catch {
      // Private mode / storage disabled — skip silently rather than loop the
      // tour on every navigation.
    }
  }, [])

  if (!run) return null

  const finish = (outcome: 'completed' | 'skipped') => {
    setRun(false)
    try {
      window.localStorage.setItem(SEEN_KEY, outcome)
    } catch {
      /* storage unavailable; the server record below still stands */
    }
    // Fire-and-forget: onboarding state is not worth failing a render over,
    // but the failure is still logged rather than swallowed.
    fetch('/api/onboarding/tour', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tour: 'welcome.v1', outcome }),
      keepalive: true,
    }).catch((e) => console.error('[tour] could not record outcome:', e))
  }

  return <Tour steps={WELCOME_TOUR} onDone={finish} />
}
