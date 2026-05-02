'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Rocket, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const EXCLUDED_PREFIXES = ['/dashboard', '/console', '/crm', '/canvas', '/welcome', '/tools', '/auth']
const STORAGE_KEY = '0n_launched_banner_dismissed_v1'

export function LaunchBanner() {
  // ALL hooks must run on every render — never gate them behind a path
  // check or React throws "Rendered fewer hooks than expected" when the
  // route changes between an excluded and non-excluded prefix.
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    setDismissed(stored === '1')
  }, [])

  // Path gate AFTER all hooks
  if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return null
  if (dismissed === null || dismissed) return null

  return (
    <div className="relative z-40 border-b border-white/[0.08] bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-emerald-950/40">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2.5 text-sm">
        <Rocket className="h-4 w-4 shrink-0 text-emerald-400" />
        <div className="flex-1 truncate">
          <span className="text-zinc-300">
            <span className="font-semibold text-white">0nCore is live.</span>{' '}
            <span className="text-zinc-400">
              v4.10 ships UCP, Marketplace, Course Builder, Lead Magnet Loop, App Builder, Website Builder, SaaS Factory & the Agentic Automation Generator.
            </span>
          </span>
        </div>
        <Link
          href="/signup"
          className="hidden items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20 sm:inline-flex"
        >
          Start free <ArrowRight className="h-3 w-3" />
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
