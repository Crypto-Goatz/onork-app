/**
 * /auth/error — the end of the login loop.
 *
 * Before this page existed, every failure inside /auth/callback answered with
 * `redirect('/login?error=...')`. The login page never read that param, so the
 * user saw an ordinary login form, pressed the same provider button, and came
 * straight back: a loop with no visible cause and no natural end. Supabase's
 * own logs showed it as an /authorize request refered from our callback.
 *
 * This page ends it by doing two things a login form cannot:
 *   1. It STATES the reason, in the platform's own words, on screen.
 *   2. It does not re-trigger anything. Retrying takes a deliberate click.
 *
 * Server component on purpose — no client hooks, so it cannot bail out of SSR
 * and cannot itself start an auth request.
 */
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

/** Stable slugs from app/auth/callback/route.ts → what a human should do. */
const EXPLANATIONS: Record<string, { title: string; what: string }> = {
  provider_rejected: {
    title: 'The sign-in provider refused',
    what:
      'Google, LinkedIn or Slack ended the sign-in before issuing a code. Usually consent was declined, or this app’s redirect URL is not registered with that provider.',
  },
  no_code: {
    title: 'No authorization code arrived',
    what:
      'The provider returned to us without a code to exchange. If you reached this page by reloading or by opening a stale link, start the sign-in again from the beginning.',
  },
  exchange_failed: {
    title: 'The session could not be established',
    what:
      'The code came back but could not be exchanged for a session. This is what a sign-in that silently looped was always doing — the detail below is the exact reason, reported by the auth server.',
  },
  no_session_user: {
    title: 'Signed in, but no account came back',
    what:
      'The exchange succeeded and returned no user. The session did not stick. Report this — it should not be reachable.',
  },
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; detail?: string }>
}) {
  const { reason = 'unknown', detail } = await searchParams
  const info = EXPLANATIONS[reason] ?? {
    title: 'Sign-in did not complete',
    what: 'The authentication step failed before a session could be created.',
  }

  return (
    <div className="min-h-screen bg-[#020810] text-white font-sans antialiased">
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-red-500/30 bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>

          <h1 className="mt-5 text-xl font-black">{info.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#9fb0cc]">{info.what}</p>

          {detail ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
                What the auth server said
              </p>
              <p className="mt-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs leading-relaxed text-red-300">
                {detail}
              </p>
            </div>
          ) : null}

          <p className="mt-5 text-xs text-white/40">
            Reference: <span className="font-mono">{reason}</span> — quote this if you
            report it.
          </p>

          <div className="mt-7 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full rounded-lg bg-[#7ed957] px-4 py-2.5 text-center text-sm font-bold text-[#020810] transition-all hover:brightness-110"
            >
              Try signing in again
            </Link>
            <a
              href="mailto:mike@rocketopp.com?subject=0nCORE%20sign-in%20failed"
              className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-[#9fb0cc] transition-colors hover:text-white"
            >
              Tell us it happened
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
