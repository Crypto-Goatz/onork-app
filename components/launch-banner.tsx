'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Rocket, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const EXCLUDED_PREFIXES = ['/dashboard', '/console', '/crm', '/canvas', '/welcome', '/tools', '/auth', '/admin', '/embed', '/vip']
const STORAGE_KEY = '0n_launched_banner_dismissed_v1'
/** Same fact as STORAGE_KEY, in the one store the server can also read. */
export const LAUNCH_BANNER_COOKIE = '0n_launch_banner_dismissed'

/**
 * THIS BANNER WAS THE ENTIRE LAYOUT SHIFT ON THE MARKETING SITE.
 *
 * It kept its dismissal in localStorage, which a server cannot read, so it had
 * to render `null` during SSR and then appear once an effect had looked. A strip
 * of content inserted at the top of the document AFTER hydration pushes every
 * pixel below it down — measured on www.0ncore.com/ as a single 0.0672 shift at
 * 3.7s, sourced to `SECTION.hero-dark` because the hero is simply what happened
 * to be under it. Suppress the strip and the page's CLS is 0.0000 exactly.
 *
 * It was invisible until now for an unhappy reason: the 2.8s splash screen was
 * painted over the top of it, so the shift happened behind a curtain and no
 * measurement ever caught it. Taking the curtain down (see loading-screen.tsx)
 * exposed a defect that had been there all along.
 *
 * SO THE DISMISSAL MOVES TO A COOKIE, which the root layout reads server-side
 * and passes in. The first render is then already correct and nothing moves.
 * localStorage is still read once, on mount, to carry over anyone who dismissed
 * this before the change — they get the cookie written and never see it again.
 */

function writeCookie() {
  // A year, site-wide, SameSite=Lax: it is a UI preference, not a credential.
  document.cookie = `${LAUNCH_BANNER_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
}

export function LaunchBanner({ initiallyDismissed = false }: { initiallyDismissed?: boolean }) {
  // ALL hooks must run on every render — never gate them behind a path
  // check or React throws "Rendered fewer hooks than expected" when the
  // route changes between an excluded and non-excluded prefix.
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(initiallyDismissed)

  useEffect(() => {
    // One-time migration for dismissals made before the cookie existed. No
    // cookie yet + a localStorage flag means "they already said no".
    if (initiallyDismissed) return
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      writeCookie()
      setDismissed(true)
    }
  }, [initiallyDismissed])

  // Path gate AFTER all hooks
  if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return null
  if (dismissed) return null

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
            writeCookie()
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
