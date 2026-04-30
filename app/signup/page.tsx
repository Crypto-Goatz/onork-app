'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { VideoBg } from '@/components/video-bg'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Supabase has mailer_autoconfirm enabled — successful signup returns
    // a session immediately, no email click required. Drop the user on
    // /canvas. Only show the "check your email" screen if for some reason
    // no session came back (autoconfirm later disabled).
    if (data.session) {
      window.location.href = '/canvas'
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-core-bg flex items-center justify-center px-4 relative overflow-hidden">
        <VideoBg opacity={0.1} />
        <div className="w-full max-w-sm text-center animate-fade-in relative z-10">
          <div className="bg-core-card border border-core-border rounded-xl p-8">
            <div className="w-16 h-16 bg-core-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-core-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-core-text mb-2">Check your email</h2>
            <p className="text-core-text-dim text-sm mb-6">
              We sent a confirmation link to <span className="text-core-text">{email}</span>. Click it to activate your account.
            </p>
            <Link href="/login" className="text-core-green text-sm hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-core-bg flex items-center justify-center px-4 relative overflow-hidden">
      <VideoBg opacity={0.1} />
      <div className="w-full max-w-sm animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/brand/0ncore-logo.png" alt="0nCore" className="h-9 mx-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </Link>
          <p className="text-core-text-muted text-sm mt-2">Create your account</p>
        </div>

        {/* Form */}
        <div className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-core-red">
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-1.5">
            <button onClick={() => handleOAuth('google')} className="signup-oauth-btn hover:border-[#4285f4] hover:bg-[rgba(66,133,244,0.06)]">
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-semibold text-[#e0e0e0]">Continue with Google</span>
                <span className="text-[10px] text-white/30 font-normal">Analytics, Gmail, Drive, Calendar</span>
              </div>
            </button>
            <button onClick={() => handleOAuth('linkedin_oidc')} className="signup-oauth-btn hover:border-[#0A66C2] hover:bg-[rgba(10,102,194,0.06)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2" className="shrink-0">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-semibold text-[#e0e0e0]">Continue with LinkedIn</span>
                <span className="text-[10px] text-white/30 font-normal">AI social posting, lead intelligence</span>
              </div>
            </button>
            <button onClick={handleSlackLogin} className="signup-oauth-btn hover:border-[#611f69] hover:bg-[rgba(97,31,105,0.06)]">
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-[13px] font-semibold text-[#e0e0e0]">Continue with Slack</span>
                <span className="text-[10px] text-white/30 font-normal">AI alerts and actions in your channels</span>
              </div>
            </button>
          </div>

          <style>{`
            .signup-oauth-btn {
              width: 100%; display: flex; align-items: center; gap: 12px;
              bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-left;
              transition: all 0.2s; cursor: pointer;
              background: #111; border: 1px solid #222; border-radius: 8px; padding: 10px 16px;
            }
          `}</style>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <span className="text-xs text-[#444] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm text-core-text-dim mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm text-core-text-dim mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-core-text-dim mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-core-green text-core-bg font-semibold py-2.5 rounded-lg hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          </form>
        </div>

        <p className="text-center text-sm text-core-text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-core-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
