'use client'

import { useEffect, useState } from 'react'
import { X, Rocket, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const LAUNCH_DATE = new Date('2026-05-01T00:00:00Z')
const STORAGE_KEY = '0n_launch_banner_dismissed_v4_10_0'

function timeLeft(): { days: number; hours: number; minutes: number } {
  const now = Date.now()
  const diff = LAUNCH_DATE.getTime() - now
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 }
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return { days, hours, minutes }
}

export function LaunchBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null)
  const [t, setT] = useState(timeLeft())

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    setDismissed(stored === '1')
  }, [])

  useEffect(() => {
    const id = setInterval(() => setT(timeLeft()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (dismissed === null || dismissed) return null

  const launched = t.days <= 0 && t.hours <= 0 && t.minutes <= 0

  return (
    <div className="relative z-40 border-b border-white/[0.08] bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-emerald-950/40">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2.5 text-sm">
        <Rocket className="h-4 w-4 shrink-0 text-emerald-400" />
        <div className="flex-1 truncate">
          {launched ? (
            <span className="font-semibold">
              0nCore is live. <span className="text-emerald-400">Start free →</span>
            </span>
          ) : (
            <span className="text-zinc-300">
              <span className="font-semibold text-white">0nCore public launch:</span>{' '}
              <span className="font-mono text-emerald-400">May 1, 2026</span>
              <span className="hidden text-zinc-500 sm:inline">
                {' '}
                · {t.days}d {t.hours}h {t.minutes}m
              </span>{' '}
              <span className="text-zinc-400">— v4.10.0 ships UCP, Marketplace, Course Builder, Lead Magnet Loop, App Builder, Website Builder, SaaS Factory & the Agentic Automation Generator.</span>
            </span>
          )}
        </div>
        <Link
          href="/early-access"
          className="hidden items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20 sm:inline-flex"
        >
          Register for early access <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1')
            setDismissed(true)
          }}
          className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
