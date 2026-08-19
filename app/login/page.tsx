'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock } from 'lucide-react'
import {
  AuthShell,
  AuthInput,
  AuthButton,
  AuthError,
  AuthDivider,
  OAuthButton,
} from '@/components/auth/AuthShell'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  /**
   * Show what sent you here.
   *
   * Two other routes still bounce failures to `/login?error=...`
   * (api/auth/callback and api/auth/connect/[provider]/callback). This page
   * read none of them, so a failed sign-in rendered as a pristine login form —
   * the user pressed the same button again and looped, invisibly. /auth/callback
   * now goes to /auth/error instead; this is the net under everything else, so
   * no future bounce-to-login can hide the same way.
   *
   * Deliberately `window.location.search` and not `useSearchParams`: that hook
   * opts the tree into a client bailout, and a bailout in a page that wraps
   * content ships an empty body to crawlers. The handlers below already read
   * the query string this way — same idiom, no new failure mode.
   */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const code = p.get('error')
    if (!code) return
    const KNOWN: Record<string, string> = {
      auth_failed: 'Sign-in failed before a session could be created. Please try again.',
      auth_callback_failed: 'The sign-in callback could not complete. Please try again.',
      no_code: 'The sign-in provider returned no authorization code.',
      no_session_user: 'Sign-in returned no account. Please try again.',
    }
    setError(
      KNOWN[code] ||
        p.get('error_description') ||
        `Sign-in failed (${code}). Please try again.`,
    )
  }, [])

  async function handleSlackLogin() {
    try {
      const res = await fetch('/api/auth/connect/slack')
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        setError('Slack login not configured')
      }
    } catch {
      setError('Failed to start Slack login')
    }
  }

  async function handleOAuth(provider: 'google' | 'linkedin_oidc') {
    // Forward ?next so social sign-in returns to the same place email login does
    // (e.g. /login?next=/crm → back to /crm). /auth/callback reads this param.
    const next = new URLSearchParams(window.location.search).get('next')
    const cb = next && next.startsWith('/') && !next.startsWith('//')
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`
    const options: Record<string, unknown> = {
      redirectTo: cb,
    }
    if (provider === 'google') {
      // IDENTITY ONLY at the front door. Sign-in needs to know who you are and
      // nothing else. Analytics / Search Console / Gmail / Drive / Sheets /
      // Calendar are requested at CONNECT time, per service, by
      // /api/auth/connect/google — where the user has already asked for the
      // feature that needs them and the consent screen reads as an answer to a
      // question they asked.
      //
      // Asking for all seven here made a cold customer's very first impression
      // a Google screen wanting to read their Gmail and their Drive. It also
      // fed the account's grant history, which is the same pit that produced
      // `Error 400: invalid_request` on connect (see lib/oauth-providers.ts).
      //
      // No access_type/prompt either: an identity grant needs no refresh token,
      // and forcing prompt=consent re-showed the wall to returning users.
      // /hub, /install/slack and LockGate already sign in this way — the login
      // page was the odd one out.
      options.queryParams = {
        scope: 'openid email profile',
      }
    }
    if (provider === 'linkedin_oidc') {
      options.scopes = 'openid profile email w_member_social'
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options })
    if (oauthError) setError(oauthError.message)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      // Honour ?next= so /login?next=/crm lands the agency straight in the
      // command centre. Same-origin paths only — never an open redirect.
      // 0ncore.com is a CRM. /crm is the working surface, so that is where a
      // sign-in lands — not /dashboard, which is the legacy sprawl.
      const next = new URLSearchParams(window.location.search).get('next')
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/crm'
      window.location.href = dest
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your 0nCore account"
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="text-[#7ed957] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <AuthError message={error} />

      <div className="space-y-2">
        <OAuthButton provider="google" onClick={() => handleOAuth('google')} />
        <OAuthButton provider="linkedin" onClick={() => handleOAuth('linkedin_oidc')} />
        <OAuthButton provider="slack" onClick={handleSlackLogin} />
      </div>

      <AuthDivider />

      <form onSubmit={handleLogin} className="space-y-4">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthInput
          id="password"
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-white/45 hover:text-white transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <AuthButton type="submit" loading={loading}>
          Sign in
        </AuthButton>
      </form>
    </AuthShell>
  )
}
