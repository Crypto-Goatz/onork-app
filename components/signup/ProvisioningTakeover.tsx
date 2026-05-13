'use client'

/**
 * Full-screen takeover during signup provisioning.
 *
 * Fades in 4-5 staged ticks while the backend actually does the work.
 * Pacing is controlled here — not by backend response time. We poll for
 * the final "ready" signal and then move on. If the backend takes longer
 * than ~6s, the ticks still finish on their own schedule and the redirect
 * happens once the API returns. If it returns faster, we still hold a
 * minimum 3.5s so the moment doesn't feel cheap.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

interface Step {
  id: string
  label: string
  detail: string
  /** ms after mount when this step's TICK appears (the loader appears immediately) */
  doneAt: number
}

const STEPS: Step[] = [
  { id: 'account',  label: 'Account created',         detail: 'Profile + access token issued',                doneAt: 800 },
  { id: 'email',    label: 'Welcome email sent',      detail: 'Check your inbox for next steps',              doneAt: 1700 },
  { id: 'crm',      label: 'Connected to RocketOpp CRM', detail: 'Tagged for onboarding workflow',           doneAt: 2700 },
  { id: 'token',    label: 'API token issued',        detail: '1,640+ MCP tools now available',               doneAt: 3500 },
]

const MIN_HOLD_MS = 3700

export default function ProvisioningTakeover({
  name,
  email,
  onDone,
  apiReady,
}: {
  name: string
  email: string
  /** Called when min-hold elapsed AND apiReady is true */
  onDone: () => void
  /** True once the backend signup response has resolved */
  apiReady: boolean
}) {
  const [elapsed, setElapsed] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const start = performance.now()
    const id = window.setInterval(() => {
      setElapsed(performance.now() - start)
    }, 100)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (mounted && elapsed >= MIN_HOLD_MS && apiReady) {
      onDone()
    }
  }, [mounted, elapsed, apiReady, onDone])

  const firstName = name.trim().split(/\s+/)[0] || 'there'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-[#0d1117] flex items-center justify-center px-6"
    >
      {/* Background ambient orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.18, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl bg-gradient-to-br from-[#6EE05A] to-[#00B4FF]"
      />

      <div className="relative max-w-xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-mono text-xs uppercase tracking-[0.25em] text-[#6EE05A] mb-4"
        >
          Provisioning your command center
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-2"
        >
          Hold tight, {firstName}.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-[#8b949e] text-sm mb-12"
        >
          Setting up everything you need.
        </motion.p>

        {/* Steps */}
        <div className="space-y-3 text-left">
          {STEPS.map((step, idx) => {
            const isDone = elapsed >= step.doneAt
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + idx * 0.15 }}
                className="flex items-start gap-3 bg-[#161b22]/60 border border-[#30363d] rounded-lg px-4 py-3"
              >
                <div className="mt-0.5">
                  <AnimatePresence mode="wait" initial={false}>
                    {isDone ? (
                      <motion.div
                        key="done"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: 'backOut' }}
                        className="w-5 h-5 rounded-full bg-[#6EE05A]/15 flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-[#6EE05A]" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Loader2 className="w-5 h-5 text-[#8b949e] animate-spin" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium transition-colors ${isDone ? 'text-white' : 'text-[#8b949e]'}`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-[#6b7681] mt-0.5">{step.detail}</div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: apiReady && elapsed >= MIN_HOLD_MS ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="mt-10 text-xs text-[#6b7681]"
        >
          Welcome to <span className="text-[#6EE05A]">0nCore</span> · Redirecting in a moment
        </motion.div>
      </div>
    </motion.div>
  )
}
