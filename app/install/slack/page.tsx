'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, ArrowRight, Loader2, MessageSquare, Zap, BarChart3, Users, Shield, Terminal } from 'lucide-react'

const FEATURES = [
  { icon: MessageSquare, title: 'Chat with 0nAI', desc: 'Talk to your AI assistant directly in Slack. Ask questions, run commands, get insights.' },
  { icon: Terminal, title: '/0n slash command', desc: 'Run any of 1,554 tools right from Slack. /0n create contact, /0n check stripe balance, /0n score lead.' },
  { icon: BarChart3, title: 'Live analytics alerts', desc: 'Hot visitor on your pricing page? Deal moved? Revenue update? Get notified instantly.' },
  { icon: Users, title: 'CRM in Slack', desc: 'Look up contacts, score leads, send emails, book appointments — without leaving Slack.' },
  { icon: Zap, title: 'Automated workflows', desc: 'Trigger 0nMCP automation switches from Slack. Run multi-step workflows with one command.' },
  { icon: Shield, title: 'Your data, your workspace', desc: 'Everything runs on your own 0nCore account. Scoped to your CRM, your analytics, your tools.' },
]

type Step = 'landing' | 'auth' | 'connect' | 'done'

export default function SlackInstallPage() {
  const [step, setStep] = useState<Step>('landing')
  const [user, setUser] = useState<{ email: string; id: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ email: u.email || '', id: u.id })
        // Check if already has Slack connection
        fetch('/api/auth/connections').then(r => r.json()).then(data => {
          const slack = data.connections?.find((c: { provider: string }) => c.provider === 'slack')
          if (slack) {
            setConnected(true)
            setStep('done')
          } else {
            setStep('connect')
          }
        }).catch(() => setStep('connect'))
      }
    })

    // Handle OAuth callback params
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'slack') {
      setConnected(true)
      setStep('done')
      window.history.replaceState({}, '', '/install/slack')
    }
  }, [supabase])

  async function handleGoogleAuth() {
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/install/slack`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          scope: 'openid email profile',
        },
      },
    })
    if (e) setError(e.message)
  }

  async function handleSlackConnect() {
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/auth/connect/slack')
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to start Slack connection')
        setConnecting(false)
      }
    } catch {
      setError('Failed to connect Slack')
      setConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020810] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand/0ncore-logo.png" alt="0nCore" className="h-7 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </Link>
          <div className="flex items-center gap-1 text-[11px] text-white/30">
            <span className={step === 'landing' ? 'text-[#7ed957]' : ''}>Install</span>
            <ArrowRight className="h-3 w-3" />
            <span className={step === 'auth' ? 'text-[#7ed957]' : ''}>Sign In</span>
            <ArrowRight className="h-3 w-3" />
            <span className={step === 'connect' ? 'text-[#7ed957]' : ''}>Connect</span>
            <ArrowRight className="h-3 w-3" />
            <span className={step === 'done' ? 'text-[#7ed957]' : ''}>Ready</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Step 1: Landing */}
        {step === 'landing' && (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 mb-6">
                <svg width="48" height="48" viewBox="0 0 24 24">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                  <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                  <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                  <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
                </svg>
                <span className="text-white/20 text-3xl font-thin">+</span>
                <img src="/brand/0n-icon-white.svg" alt="0n" className="h-12 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <h1 className="text-3xl font-bold">0nCore for Slack</h1>
              <p className="text-white/50 text-lg max-w-xl mx-auto">
                1,554 AI tools in your Slack workspace. Chat with 0nAI, run commands, get real-time alerts — all without leaving Slack.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                  <f.icon className="h-5 w-5 text-[#7ed957]" />
                  <h3 className="font-semibold text-white text-[14px]">{f.title}</h3>
                  <p className="text-[12px] text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center space-y-4">
              <button
                onClick={() => user ? setStep('connect') : setStep('auth')}
                className="rounded-xl bg-[#7ed957] px-8 py-3 text-[15px] font-bold text-[#020810] hover:bg-[#7ed957]/90 transition-colors"
              >
                Get Started
              </button>
              <p className="text-[11px] text-white/25">Free with your 0nCore account</p>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-8 text-[12px] text-white/30 pt-4 border-t border-white/[0.04]">
              <span>1,554 tools</span>
              <span>96 services</span>
              <span>5 patents pending</span>
            </div>
          </div>
        )}

        {/* Step 2: Auth */}
        {step === 'auth' && (
          <div className="mx-auto max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Sign in to 0nCore</h2>
              <p className="text-[13px] text-white/40">Sign in or create your account to connect Slack.</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button onClick={handleGoogleAuth} className="w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] font-medium text-white/80 hover:bg-white/[0.06] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <Link href="/login?next=/install/slack" className="w-full flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] font-medium text-white/80 hover:bg-white/[0.06] transition-colors">
                Sign in with email
              </Link>

              <Link href="/signup?next=/install/slack" className="block text-center text-[12px] text-white/30 hover:text-white/50 transition-colors">
                Don't have an account? Create one
              </Link>
            </div>
          </div>
        )}

        {/* Step 3: Connect Slack */}
        {step === 'connect' && (
          <div className="mx-auto max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <Check className="mx-auto h-8 w-8 text-[#7ed957]" />
              <h2 className="text-xl font-bold">Signed in as {user?.email}</h2>
              <p className="text-[13px] text-white/40">Now connect your Slack workspace to activate 0nCore.</p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleSlackConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#4A154B] px-6 py-3.5 text-[15px] font-bold text-white hover:bg-[#611F69] transition-colors disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                  <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                  <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                  <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
                </svg>
              )}
              Add to Slack
            </button>

            <p className="text-center text-[11px] text-white/25">
              This will add the 0nCore bot to your workspace with channel read, messaging, and identity access.
            </p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="mx-auto max-w-lg space-y-8">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7ed957]/10">
                <Check className="h-8 w-8 text-[#7ed957]" />
              </div>
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-[14px] text-white/50">
                0nCore is now live in your Slack workspace. Here's how to get started:
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="font-semibold text-[14px] text-white mb-2">Chat with 0nAI</h3>
                <p className="text-[12px] text-white/40 mb-3">DM the bot or @mention it in any channel:</p>
                <div className="rounded-lg bg-black/30 border border-white/[0.06] px-4 py-2.5 font-mono text-[13px] text-[#7ed957]">
                  @0ncore what are my top leads this week?
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="font-semibold text-[14px] text-white mb-2">Use the /0n command</h3>
                <p className="text-[12px] text-white/40 mb-3">Run any tool directly:</p>
                <div className="space-y-1.5">
                  <div className="rounded-lg bg-black/30 border border-white/[0.06] px-4 py-2 font-mono text-[12px] text-white/60">
                    /0n find contact Sarah Chen
                  </div>
                  <div className="rounded-lg bg-black/30 border border-white/[0.06] px-4 py-2 font-mono text-[12px] text-white/60">
                    /0n check stripe balance
                  </div>
                  <div className="rounded-lg bg-black/30 border border-white/[0.06] px-4 py-2 font-mono text-[12px] text-white/60">
                    /0n send sms to John: meeting at 3pm
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-xl bg-[#7ed957] px-6 py-2.5 text-[13px] font-bold text-[#020810] hover:bg-[#7ed957]/90 transition-colors"
              >
                Go to Dashboard
              </button>
              <a
                href="https://slack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-2.5 text-[13px] font-medium text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                Open Slack
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
