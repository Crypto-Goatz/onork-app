'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ArrowRight, Check } from 'lucide-react'

/**
 * /signup — public registration.
 *
 * Email/password path goes through POST /api/auth/signup which runs the
 * shared post-signup provisioning chain (profile + family match + CRM
 * contact + sub-location queue + audit). On success we sign the user in
 * via supabase.auth.signInWithPassword to establish the session, then
 * redirect to /onboarding.
 *
 * OAuth paths (Google / LinkedIn / Slack) hit /auth/callback after the
 * provider returns, which runs the SAME provisioning chain. So both flows
 * end identically provisioned regardless of which one the user picks.
 */
export default function SignupPage() {
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
        setError('Slack login is currently unavailable. Try Google or email.')
      }
    } catch {
      setError('Failed to start Slack login. Try Google or email.')
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

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    })
    if (oauthError) setError(oauthError.message)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Create + provision via the API route (does ALL the right stuff)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || `Signup failed (${res.status})`)
        setLoading(false)
        return
      }

      // 2. Establish a client session — sign in with the same credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(
          'Account created, but sign-in failed. Please try signing in.',
        )
        setLoading(false)
        return
      }

      // 3. Land on onboarding
      router.push('/onboarding')
    } catch (err) {
      console.error('[signup] threw:', err)
      setError(err instanceof Error ? err.message : 'Sign up failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f4f8] grid lg:grid-cols-2">
      {/* ── Left: pitch ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-[#161b22] border-r border-[#30363d]">
        <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#6EE05A]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#00d4ff]/8 blur-3xl" />

        <Link href="/" className="relative inline-flex items-center gap-2.5 z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6EE05A] to-[#00d4ff] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#0d1117]" />
          </div>
          <span className="font-bold text-lg tracking-tight">0nCore</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#6EE05A] font-bold mb-4">
            Stop building workflows.
          </p>
          <h2 className="text-4xl font-bold leading-[1.1] mb-5 text-white">
            Start describing{' '}
            <span className="bg-gradient-to-br from-[#6EE05A] to-[#00d4ff] bg-clip-text text-transparent">
              outcomes
            </span>
            .
          </h2>
          <p className="text-base text-[#8b9ab5] leading-relaxed mb-8">
            One account unlocks 1,640+ tools across 109 services — CRM,
            calendars, social, ads, AI, analytics. Connect what you already
            have, describe what you want to happen, watch it run.
          </p>

          <ul className="space-y-3">
            {[
              'CRM sub-location auto-provisioned with your business data',
              'Google Workspace, LinkedIn, Slack — connect on signup, work immediately',
              'Jaxx AI handles everything across the platform — one chat, no tab-jumping',
              'Free forever for the core. Pay only for what you actually use.',
            ].map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-[#c9d1d9] leading-relaxed"
              >
                <Check className="w-4 h-4 text-[#6EE05A] shrink-0 mt-1" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 max-w-md">
          {[
            { n: '1,640+', l: 'Tools' },
            { n: '109', l: 'Services' },
            { n: '22', l: 'Categories' },
          ].map((s, i) => (
            <div
              key={i}
              className="border border-[#30363d] rounded-lg p-3 bg-[#0d1117]/40"
            >
              <p className="text-xl font-bold text-white tabular-nums">{s.n}</p>
              <p className="text-[11px] uppercase tracking-widest text-[#8b9ab5]">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right: form ─────────────────────────────────────── */}
      <main className="flex flex-col justify-center px-5 sm:px-12 py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile-only logo */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6EE05A] to-[#00d4ff] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0d1117]" />
            </div>
            <span className="font-bold tracking-tight">0nCore</span>
          </Link>

          <div className="mb-7">
            <h1 className="text-3xl font-bold text-white mb-2">
              Create your account
            </h1>
            <p className="text-sm text-[#8b9ab5]">
              Free forever for the core. No credit card. 30 seconds.
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/8 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-2 mb-5">
            <OAuthButton
              onClick={() => handleOAuth('google')}
              brand="#4285f4"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              }
              label="Continue with Google"
              sub="Analytics · Gmail · Drive · Calendar"
            />
            <OAuthButton
              onClick={() => handleOAuth('linkedin_oidc')}
              brand="#0A66C2"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              }
              label="Continue with LinkedIn"
              sub="AI social posting · lead intelligence"
            />
            <OAuthButton
              onClick={handleSlackLogin}
              brand="#611f69"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
                  <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
                  <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
                  <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E" />
                </svg>
              }
              label="Continue with Slack"
              sub="AI alerts & actions in your channels"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#30363d]" />
            <span className="text-[11px] text-[#8b9ab5] uppercase tracking-widest">
              or sign up with email
            </span>
            <div className="flex-1 h-px bg-[#30363d]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSignup} className="space-y-3">
            <Field
              label="Full name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={setFullName}
              placeholder="Mike Mento"
              required
            />
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              required
            />
            <Field
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-3 rounded-lg bg-[#6EE05A] text-[#0d1117] font-semibold text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? 'Creating your account…' : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#8b9ab5] mt-7">
            Already have an account?{' '}
            <Link href="/login" className="text-[#6EE05A] hover:underline font-semibold">
              Sign in
            </Link>
          </p>

          <p className="text-center text-[11px] text-[#556880] mt-5 leading-relaxed">
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline hover:text-[#8b9ab5]">terms</Link> &{' '}
            <Link href="/privacy" className="underline hover:text-[#8b9ab5]">privacy</Link>.
            Free for the core. No credit card.
          </p>
        </div>
      </main>
    </div>
  )
}

// ── Subcomponents ────────────────────────────────────────────

function OAuthButton({
  onClick,
  brand,
  icon,
  label,
  sub,
}: {
  onClick: () => void
  brand: string
  icon: React.ReactNode
  label: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[var(--brand)] hover:bg-[var(--brand-glow)] transition-all text-left group"
      style={
        {
          '--brand': brand,
          '--brand-glow': `${brand}10`,
        } as React.CSSProperties
      }
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex flex-col items-start min-w-0">
        <span className="text-[13px] font-semibold text-[#f0f4f8] leading-tight">
          {label}
        </span>
        <span className="text-[10px] text-[#8b9ab5] leading-tight mt-0.5">
          {sub}
        </span>
      </div>
      <ArrowRight className="w-4 h-4 ml-auto text-[#8b9ab5] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all" />
    </button>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  label: string
  type: 'text' | 'email' | 'password'
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-[#8b9ab5] font-bold mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full px-3.5 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#f0f4f8] placeholder:text-[#556880] focus:outline-none focus:border-[#6EE05A] focus:ring-2 focus:ring-[#6EE05A]/20 transition-all text-sm"
      />
    </label>
  )
}
