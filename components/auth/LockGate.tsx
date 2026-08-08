'use client'

/**
 * The one login gate for every 0nCORE surface, matching /hub.
 *
 * Any page that needs a signed-in 0n account renders this when logged out —
 * a full-screen branded lock, "Continue with Google", and an email fallback,
 * all carrying ?next= so the user lands back where they started. One look,
 * everywhere, so signing in never feels like a different product.
 */
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SHELL =
  'fixed inset-0 z-[100] overflow-y-auto bg-[#080b10] ' +
  'bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(110,224,90,0.10),transparent_55%)] text-[#f0f4f8]'

export function LockGate({
  next = '/',
  title = 'Access restricted',
  subtitle = 'Sign in to your 0n account to unlock this.',
}: {
  next?: string
  title?: string
  subtitle?: string
}) {
  // Same-origin only — never let ?next become an open redirect.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const enc = encodeURIComponent(safeNext)

  const signInWithGoogle = async () => {
    try {
      await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${enc}` },
      })
    } catch {
      window.location.href = `/login?next=${enc}`
    }
  }

  return (
    <div className={`${SHELL} grid place-items-center px-6`}>
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/0ncore-logo.svg" alt="0nCORE" width={180} height={44} className="mx-auto h-11 w-auto object-contain opacity-90" />
        <div className="mx-auto mt-10 grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
          <Lock className="h-8 w-8 text-[#6b7c9c]" />
        </div>
        <h1 className="mt-6 text-2xl font-black">{title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-[#9fb0cc]">{subtitle}</p>
        <button
          onClick={signInWithGoogle}
          className="mx-auto mt-7 flex items-center gap-2.5 rounded-xl bg-white px-7 py-3 text-sm font-bold text-[#0d1117] shadow-sm transition-transform hover:scale-[1.02]"
        >
          <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>
        <a href={`/login?next=${enc}`} className="mt-3 inline-block text-xs font-semibold text-[#9fb0cc] hover:text-[#6EE05A]">
          or sign in with email
        </a>
        <p className="mt-3 text-xs text-[#6b7c9c]">
          No account? <a href={`/signup?next=${enc}`} className="font-semibold text-[#6EE05A] hover:underline">Create one free</a>
        </p>
      </div>
    </div>
  )
}
