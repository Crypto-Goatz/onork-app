'use client'

import { useState } from 'react'
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
      window.location.href = '/dashboard'
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
          <Link href="/signup" className="text-accent hover:underline">
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
            className="text-xs text-text-muted hover:text-white transition-colors"
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
