'use client'

/**
 * Site-wide banner: prompts authenticated users without their own Groq key
 * to connect one. Click → opens console.groq.com in a new tab AND navigates
 * the parent page to /dashboard/settings/groq so the user can paste & verify.
 *
 * Auto-hides when the user has connected a key. Auto-shows when the platform
 * quota is exhausted regardless of free/paid plan.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Sparkles, X, ArrowRight } from 'lucide-react'

interface Status {
  authenticated: boolean
  hasOwnKey: boolean
  source: 'user' | 'platform'
  exhausted: boolean
  ownKeyPreview?: string
  quota?: { limit: number; used: number; remaining: number; plan: string; month: string }
}

const DISMISS_KEY = '0n_groq_banner_dismissed_at'
const DISMISS_HOURS = 12

export function GroqBanner() {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Don't render on the connect page itself or on focused app surfaces
  const isConnectPage = pathname?.startsWith('/dashboard/settings/groq')
  const isExcluded = pathname?.startsWith('/admin') || pathname?.startsWith('/welcome')

  useEffect(() => {
    let cancelled = false

    // Check soft-dismiss window
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || '0')
      if (ts && Date.now() - ts < DISMISS_HOURS * 60 * 60 * 1000) {
        setDismissed(true)
      }
    } catch { /* */ }

    fetch('/api/connections/groq/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setStatus(d) })
      .catch(() => { /* silent */ })

    return () => { cancelled = true }
  }, [pathname])

  if (isConnectPage) return null
  if (isExcluded) return null
  if (!status?.authenticated) return null
  if (status.hasOwnKey) return null
  if (dismissed && !status.exhausted) return null

  const used = status.quota?.used ?? 0
  const limit = status.quota?.limit ?? 0
  const plan = status.quota?.plan || 'free'

  function handleConnect(e: React.MouseEvent) {
    e.preventDefault()
    // Open Groq signup in a new tab so the user can grab the key…
    window.open('https://console.groq.com/keys', '_blank', 'noopener,noreferrer')
    // …and navigate the parent to the paste-and-verify page.
    router.push('/dashboard/settings/groq')
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* */ }
    setDismissed(true)
  }

  return (
    <div
      role="region"
      aria-label="Connect your free Groq API key"
      className={`relative overflow-hidden border-b ${
        status.exhausted
          ? 'border-rose-500/30 bg-gradient-to-r from-rose-500/[0.08] via-amber-500/[0.04] to-rose-500/[0.08]'
          : 'border-[#7ed957]/25 bg-gradient-to-r from-[#7ed957]/[0.08] via-[#00d4ff]/[0.04] to-[#a78bfa]/[0.08]'
      } backdrop-blur-md`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className={`h-4 w-4 shrink-0 ${status.exhausted ? 'text-rose-300' : 'text-[#7ed957]'}`} />
          <div className="min-w-0 text-sm">
            {status.exhausted ? (
              <span className="text-white">
                <span className="font-bold text-rose-200">Monthly Groq quota reached</span>
                <span className="hidden text-white/65 sm:inline"> — connect your own free key for unlimited use.</span>
              </span>
            ) : (
              <span className="text-white">
                <span className="font-bold text-[#7ed957]">Free Groq key, free unlimited AI.</span>
                <span className="hidden text-white/65 sm:inline">
                  {' '}You&apos;ve used {used.toLocaleString()}/{limit.toLocaleString()} tasks this month on the {plan} plan.
                  Bring your own key for unlimited.
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/settings/groq"
            onClick={handleConnect}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              status.exhausted
                ? 'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.35)] hover:bg-rose-400'
                : 'bg-[#7ed957] text-[#020810] shadow-[0_0_18px_rgba(126,217,87,0.35)] hover:bg-[#7ed957]/90'
            }`}
          >
            Connect Groq
            <ArrowRight className="h-3 w-3" />
          </Link>
          {!status.exhausted && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss for 12 hours"
              className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
