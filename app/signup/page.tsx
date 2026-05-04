'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User } from 'lucide-react'
import {
  AuthShell,
  AuthInput,
  AuthButton,
  AuthError,
  AuthDivider,
  OAuthButton,
} from '@/components/auth/AuthShell'

export default function SignupPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <SignupPage />
    </Suspense>
  )
}

function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ref = searchParams.get('ref')
    if (ref) {
      try {
        document.cookie = `0n_ref=${encodeURIComponent(ref)}; path=/; max-age=2592000; SameSite=Lax`
      } catch {
        /* ignore */
      }
    }
  }, [searchParams])

  async function handleSlackLogin() {
    try {
      const res = await fetch('/api/auth/connect/slack')
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        setError('Slack signup is currently unavailable. Try Google or email.')
      }
    } catch {
      setError('Failed to start Slack signup. Try Google or email.')
    }
  }

  async function handleOAuth(provider: 'google' | 'linkedin_oidc') {
    setError('')
    const options: Record<string, unknown> = {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
    if (provider === 'google') {
      options.queryParams = {
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar',
        ].join(' '),
      }
    }
    if (provider === 'linkedin_oidc') {
      options.scopes = 'openid profile email w_member_social'
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options })
    if (oauthError) setError(oauthError.message)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || `Signup failed (${res.status})`)
        setLoading(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('Account created, but sign-in failed. Please try signing in.')
        setLoading(false)
        return
      }

      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever — no credit card required"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
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

      <form onSubmit={handleSignup} className="space-y-4">
        <AuthInput
          id="full_name"
          label="Full name"
          type="text"
          required
          autoComplete="name"
          placeholder="Jane Doe"
          icon={<User className="h-4 w-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          autoComplete="new-password"
          minLength={8}
          placeholder="At least 8 characters"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthButton type="submit" loading={loading}>
          Create account
        </AuthButton>

        <p className="text-center text-xs text-text-muted">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>{' '}
          &{' '}
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  )
}
