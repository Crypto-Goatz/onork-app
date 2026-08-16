'use client'

/**
 * The install actually said something. This is where it gets shown.
 *
 * THE FAILURE THIS EXISTS FOR. /api/oauth/callback already redirects to
 * /crm?error=… with a precise reason attached — `no_code`, `oauth_failed`, or
 * `token_failed&why=course-builder(401): {"error_description":"Authorization
 * code not found"}`. Nothing in the product read that parameter. So a failed
 * install landed on a normal-looking dashboard, the person assumed it worked,
 * and the only trace was a query string nobody looked at.
 *
 * That is the shape of the 42 orphaned installs: accounts holding the app with
 * no token, because a failure looked exactly like a success.
 *
 * IT SHOWS THE PLATFORM'S OWN WORDS. `why` carries the upstream body verbatim.
 * "Authorization code not found" and "invalid client" need completely different
 * fixes — one is a reused or expired code, the other is wrong credentials — and
 * collapsing both into "install failed" throws away the only sentence that
 * tells them apart.
 *
 * SUCCESS IS CONFIRMED TOO, not just failure. `?connected=true` gets a line
 * saying so. An install that says nothing at all is the ambiguity we are here
 * to remove, in both directions.
 *
 * The URL is cleaned after reading, so a refresh does not re-announce a stale
 * result and a shared link does not carry someone else's error.
 */
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, TriangleAlert, X } from 'lucide-react'

/** Plain-English for the codes the callback emits. */
const REASONS: Record<string, string> = {
  no_code: 'The install came back without an authorisation code, so there was nothing to exchange. Start the install again from the app listing.',
  oauth_failed: 'The install could not be completed. The detail below is what the platform reported.',
  token_failed: 'The authorisation code could not be exchanged for a token, so this account is NOT connected.',
}

export default function InstallResult() {
  const params = useSearchParams()
  const router = useRouter()
  const [shown, setShown] = useState<{ kind: 'ok' | 'bad'; title: string; detail?: string } | null>(null)

  useEffect(() => {
    const error = params.get('error')
    const why = params.get('why')
    const connected = params.get('connected')
    const locationId = params.get('locationId')
    if (!error && !connected) return

    setShown(
      error
        ? {
            kind: 'bad',
            title: REASONS[error] ?? 'The install did not complete.',
            // Verbatim. A paraphrase of an upstream error is a second thing to
            // debug.
            detail: why || undefined,
          }
        : {
            kind: 'ok',
            title: locationId
              ? `Connected. This account is ${locationId}.`
              : 'Connected.',
          },
    )

    // Strip the params so a refresh does not replay the result.
    const url = new URL(window.location.href)
    for (const k of ['error', 'why', 'connected', 'locationId']) url.searchParams.delete(k)
    router.replace(url.pathname + (url.search || ''), { scroll: false })
  }, [params, router])

  if (!shown) return null

  const bad = shown.kind === 'bad'
  return (
    <div
      role={bad ? 'alert' : 'status'}
      className={`flex items-start gap-3 border-b px-4 py-3 sm:px-6 ${
        bad
          ? 'border-[color:var(--oc-red)]/30 bg-[color:var(--oc-red)]/[0.07]'
          : 'border-[color:var(--oc-green-d)]/25 bg-[color:var(--oc-green)]/[0.08]'
      }`}
    >
      {bad
        ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-red)]" />
        : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />}
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-semibold ${bad ? 'text-[color:var(--oc-red)]' : 'text-[color:var(--oc-green-d)]'}`}>
          {shown.title}
        </p>
        {shown.detail && (
          // One line per app tried. The callback joins them with " · " because
          // a single run can reject for several different reasons and reading
          // them as one paragraph is how the one that matters gets skimmed past.
          <ul className="mt-1.5 space-y-0.5">
            {shown.detail.split(' · ').map((line, i) => (
              <li key={i} className="oc-mono break-words text-[11.5px] leading-relaxed text-[color:var(--oc-text)]/70">
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={() => setShown(null)}
        aria-label="Dismiss"
        className="shrink-0 text-[color:var(--oc-text)]/40 transition-colors hover:text-[color:var(--oc-text)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
