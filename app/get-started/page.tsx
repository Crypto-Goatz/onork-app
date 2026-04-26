'use client'

import { useState } from 'react'
import {
  ArrowRight, Chrome, MessageSquare, Globe, Terminal,
  Check, Loader2, Sparkles, Zap, User, Mail, Building2, Globe2,
} from 'lucide-react'

type Step = 'signup' | 'verifying' | 'welcome' | 'path'

interface FormData {
  email: string
  password: string
  full_name: string
  company: string
  website: string
}

const PATHS = [
  { key: 'dashboard', icon: Zap, label: 'Go to Dashboard', description: 'Explore 0nCore command center', href: '/dashboard' },
  { key: 'chrome', icon: Chrome, label: 'Chrome Extension', description: 'Install the browser extension', href: '/downloads' },
  { key: 'slack', icon: MessageSquare, label: 'Slack App', description: 'Add 0n to your workspace', href: '/downloads' },
  { key: 'wordpress', icon: Globe, label: 'WordPress Plugin', description: 'Connect your WordPress site', href: '/downloads' },
  { key: 'cli', icon: Terminal, label: 'Claude Code / CLI', description: 'Set up MCP in your terminal', href: '/install' },
]

function trackEvent(step: string, metadata?: Record<string, unknown>) {
  fetch('/api/track/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, metadata }),
  }).catch(() => {})
}

export default function GetStartedPage() {
  const [step, setStep] = useState<Step>('signup')
  const [form, setForm] = useState<FormData>({ email: '', password: '', full_name: '', company: '', website: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password || form.password.length < 8) {
      setError('Email and password (8+ characters) required')
      return
    }
    setError('')
    setLoading(true)
    trackEvent('signup_submit', { email: form.email })

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          company: form.company,
          website: form.website,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Signup failed')
        setLoading(false)
        return
      }

      trackEvent('signup_success')

      // If email confirmation required, show verifying step
      if (data.needs_confirmation) {
        setStep('verifying')
      } else {
        // Auto-confirmed (e.g., admin override) — go to welcome
        setStep('welcome')
        // Fire CRM provisioning in background
        fetch('/api/provision/location', { method: 'POST' }).catch(() => {})
      }
    } catch {
      setError('Network error — try again')
    }
    setLoading(false)
  }

  function handlePathSelect(path: string, href: string) {
    trackEvent('path_selected', { path })
    window.location.href = href
  }

  return (
    <div className="min-h-screen bg-core-bg flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7ed957] to-[#00d4ff] flex items-center justify-center mx-auto mb-4">
            <span className="text-lg font-black text-[#020810]">0n</span>
          </div>
        </div>

        {/* ═══ STEP 1: SIGNUP ═══ */}
        {step === 'signup' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <h1 className="text-2xl font-bold text-white mb-1 text-center">Get Started with 0nCore</h1>
            <p className="text-sm text-white/40 mb-6 text-center">1,554 tools. 96 services. Free to start.</p>

            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                  <User className="w-3 h-3 inline mr-1" />Full Name
                </label>
                <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Mike Mento" required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#7ed957]/30" />
              </div>
              <div>
                <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                  <Mail className="w-3 h-3 inline mr-1" />Email
                </label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@company.com" required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#7ed957]/30" />
              </div>
              <div>
                <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="8+ characters" required minLength={8}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#7ed957]/30" />
              </div>
              <div>
                <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                  <Building2 className="w-3 h-3 inline mr-1" />Company (optional)
                </label>
                <input type="text" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  placeholder="Acme Inc"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#7ed957]/30" />
              </div>
              <div>
                <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                  <Globe2 className="w-3 h-3 inline mr-1" />Website URL (optional)
                </label>
                <input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://yoursite.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/15 outline-none focus:border-[#7ed957]/30" />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-400">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#7ed957] text-[#020810] text-sm font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Creating account...' : 'Create Free Account'}
              </button>
            </form>

            <p className="text-[11px] text-white/20 text-center mt-4">
              Already have an account? <a href="/login" className="text-[#7ed957] hover:underline">Sign in</a>
            </p>
          </div>
        )}

        {/* ═══ STEP 2: VERIFYING ═══ */}
        {step === 'verifying' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#7ed957]/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-[#7ed957]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-sm text-white/40 mb-4">
              We sent a verification link to <span className="text-white font-semibold">{form.email}</span>
            </p>
            <p className="text-xs text-white/25">
              Click the link in the email to activate your account. While you wait, we&apos;re setting up your CRM sub-location in the background.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Provisioning your workspace...
            </div>
          </div>
        )}

        {/* ═══ STEP 3: WELCOME ═══ */}
        {step === 'welcome' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#7ed957]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-[#7ed957]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Welcome{form.full_name ? `, ${form.full_name.split(' ')[0]}` : ''}!
            </h2>
            <p className="text-sm text-white/40 mb-2">Your 0nCore account is ready.</p>
            <div className="flex items-center justify-center gap-3 text-xs text-white/30 mb-6">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#7ed957]" /> Account created</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#7ed957]" /> CRM provisioned</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#7ed957]" /> Token generated</span>
            </div>
            <button onClick={() => setStep('path')}
              className="px-8 py-3 rounded-xl bg-[#7ed957] text-[#020810] text-sm font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors flex items-center gap-2 mx-auto">
              Choose Your Path <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══ STEP 4: PATH SELECT ═══ */}
        {step === 'path' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white text-center mb-4">Where do you want 0n?</h2>
            {PATHS.map(p => {
              const Icon = p.icon
              return (
                <button key={p.key} onClick={() => handlePathSelect(p.key, p.href)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-[#7ed957]/20 transition-all text-left cursor-pointer group flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#7ed957]/10 flex items-center justify-center shrink-0 group-hover:bg-[#7ed957]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#7ed957]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{p.label}</div>
                    <div className="text-xs text-white/40">{p.description}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#7ed957] group-hover:translate-x-0.5 transition-all" />
                </button>
              )
            })}
            <p className="text-[11px] text-white/15 text-center pt-2">
              You can always access all integrations from Settings later.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
