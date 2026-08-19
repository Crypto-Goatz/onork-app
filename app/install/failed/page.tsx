/**
 * /install/failed — where a broken install lands, and the reason it exists.
 *
 * A marketplace reviewer installed this app, the token exchange failed, and the
 * callback sent them to /crm with the reason in the query string. /crm cannot
 * render without a session — so they got a stuck "initializing" shell and wrote
 * back: "After installing the APP it is taking me to your platform and giving
 * an unauthorized error." That single sentence is why the listing has sat
 * disapproved since May.
 *
 * The diagnostics were never the problem. The callback already reports every
 * exchange it tried, named, with the platform's own message. It reported them
 * to a page incapable of displaying anything.
 *
 * So this page has exactly one requirement, and everything else follows from
 * it: IT MUST RENDER WITH NO SESSION, NO SSO, NO INSTALL. A server component
 * with no data fetching and no auth — because the entire audience for this page
 * is people whose auth just failed. Anything that could fail here would fail
 * for precisely the reader it was written for.
 *
 * Two audiences, one page. The person reads a sentence telling them what to do.
 * We read the `why` string, which names each app tried and what the platform
 * said — a secret, a redirect_uri and a spent code are three different fixes
 * and must not look alike.
 */
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Install did not finish — 0n', robots: { index: false } }

/** Plain language first. The technical string is for us, underneath. */
function humanise(error: string, why: string): { headline: string; detail: string; retry: boolean } {
  if (error === 'no_code') {
    return {
      headline: 'The install was cancelled before it finished.',
      detail: 'The approval step did not send us back an authorization code, which usually means the window was closed or the request was declined.',
      retry: true,
    }
  }
  if (/authorization code not found|invalid_grant|expired/i.test(why)) {
    return {
      headline: 'That install link had already been used.',
      detail: 'Authorization codes work exactly once and expire quickly. Starting the install again issues a fresh one.',
      retry: true,
    }
  }
  if (/invalid client credentials|unauthorized/i.test(why)) {
    return {
      headline: 'We could not complete the connection to your account.',
      detail: 'Your approval went through, but the exchange for an access token was rejected. This is on our side, not yours — nothing was charged and nothing was changed in your account.',
      retry: true,
    }
  }
  if (/no secret in env|no apps had credentials/i.test(why)) {
    return {
      headline: 'This app is not fully configured yet.',
      detail: 'The install reached us but the app is missing a credential on our side. Retrying will not help until we fix it.',
      retry: false,
    }
  }
  return {
    headline: 'The install did not finish.',
    detail: 'Your approval was received but we could not complete the connection. Nothing was changed in your account.',
    retry: true,
  }
}

export default async function InstallFailedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const error = one(sp.error) || 'token_failed'
  const why = one(sp.why)
  const { headline, detail, retry } = humanise(error, why)

  return (
    <div className="grid min-h-screen place-items-center bg-[#0d1117] px-6 py-16 text-white">
      <div className="w-full max-w-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-[#f59e0b]" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{headline}</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{detail}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {retry && (
            <Link
              href="/api/oauth/install/course"
              className="inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-5 py-3 text-sm font-semibold text-[#062312] transition hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" /> Try the install again
            </Link>
          )}
          <a
            href="mailto:hello@0ncore.com?subject=Install%20did%20not%20finish"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm text-white/75 transition hover:border-white/35 hover:text-white"
          >
            Tell us what happened <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Ours, not theirs. Shown rather than hidden: a reviewer or a customer
            quoting this line back is worth more than a screenshot, and it is
            already in the URL they can see. */}
        {why && (
          <details className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <summary className="cursor-pointer text-xs uppercase tracking-widest text-white/40">
              Technical detail
            </summary>
            <p className="mt-3 break-words font-mono text-xs leading-relaxed text-white/55">{why}</p>
            <p className="mt-3 text-xs text-white/35">
              Each entry names the app we tried and what the platform answered. Quoting this
              line to us identifies the cause immediately.
            </p>
          </details>
        )}
      </div>
    </div>
  )
}
