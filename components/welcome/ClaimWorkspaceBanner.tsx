'use client'

/**
 * Claim-your-workspace card. Renders at the TOP of /welcome when the
 * user has no crm_location_id and isn't family-matched. One click →
 * POST /api/workspace/claim → animated provisioning beat → reload.
 *
 * Dismissable for the session (sessionStorage), so users who explicitly
 * skip it aren't nagged on every visit.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ArrowRight, Loader2, Check } from 'lucide-react'

const STORAGE_KEY = '0n_skip_workspace_claim'

const STEPS = [
  { label: 'Sub-location created',  delay: 800 },
  { label: 'Default pipeline added', delay: 1700 },
  { label: 'Welcome workflow enrolled', delay: 2600 },
  { label: 'Webhook secret minted', delay: 3500 },
] as const

export default function ClaimWorkspaceBanner({ userName }: { userName: string | null }) {
  const [dismissed, setDismissed] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1') {
      setDismissed(true)
    }
  }, [])

  useEffect(() => {
    if (!claiming) return
    const start = performance.now()
    const id = window.setInterval(() => {
      setElapsed(performance.now() - start)
    }, 100)
    return () => window.clearInterval(id)
  }, [claiming])

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  async function claim() {
    setClaiming(true)
    setError(null)
    try {
      const r = await fetch('/api/workspace/claim', { method: 'POST' })
      const body = await r.json().catch(() => ({}))
      if (!r.ok || !body?.ok) {
        setError(body?.error || `Failed (HTTP ${r.status})`)
        setClaiming(false)
        return
      }
      // Mark done; wait for min-hold then reload
      setDone(true)
      const MIN_HOLD = 4200
      const wait = Math.max(0, MIN_HOLD - elapsed)
      setTimeout(() => {
        window.location.reload()
      }, wait)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setClaiming(false)
    }
  }

  if (dismissed && !claiming) return null

  const firstName = userName?.trim().split(/\s+/)[0] ?? null

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="claim-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-[#6EE05A]/30 bg-gradient-to-br from-[#161b22] via-[#0d1117] to-[#161b22] p-6 sm:p-8 mb-8"
        >
          {/* Subtle ambient orb */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#6EE05A] to-[#00B4FF] blur-3xl"
          />

          {!claiming && (
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-4 right-4 text-[#6b7681] hover:text-white transition p-1.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#6EE05A] mb-3">
              <Sparkles className="w-3 h-3" />
              One step left
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
              {firstName ? `${firstName}, claim your workspace.` : 'Claim your workspace.'}
            </h2>
            <p className="text-sm text-[#8b949e] max-w-xl leading-relaxed">
              We&apos;ve held a CRM workspace for you — private, scoped to you,
              ready to go. One click spins it up: contacts, pipelines, automations,
              your own webhook secret.
            </p>

            {/* Steps appear during/after claim */}
            <AnimatePresence>
              {claiming && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 space-y-2"
                >
                  {STEPS.map((s) => {
                    const isDone = elapsed >= s.delay
                    return (
                      <div
                        key={s.label}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        {isDone ? (
                          <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.25, ease: 'backOut' }}
                            className="w-4 h-4 rounded-full bg-[#6EE05A]/15 flex items-center justify-center shrink-0"
                          >
                            <Check className="w-2.5 h-2.5 text-[#6EE05A]" strokeWidth={3.5} />
                          </motion.div>
                        ) : (
                          <Loader2 className="w-4 h-4 text-[#6b7681] animate-spin shrink-0" />
                        )}
                        <span
                          className={`transition-colors ${isDone ? 'text-white' : 'text-[#6b7681]'}`}
                        >
                          {s.label}
                        </span>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-4 text-xs text-[#f87171]">
                {error} —{' '}
                <button
                  onClick={() => {
                    setError(null)
                    setClaiming(false)
                  }}
                  className="underline hover:text-white"
                >
                  Try again
                </button>
              </div>
            )}

            {!claiming && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={claim}
                  className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#7dec6e] transition"
                >
                  Set up my workspace
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={dismiss}
                  className="text-xs text-[#8b949e] hover:text-white transition"
                >
                  Not yet
                </button>
              </div>
            )}

            {done && (
              <div className="mt-5 text-xs text-[#6EE05A]">
                Workspace ready · Reloading…
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
