'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  CheckCircle,
  Globe,
  Building2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Target,
  Rocket,
  Shield,
  Search,
  ChevronRight,
} from 'lucide-react'

type Stage = 'provisioning' | 'oauth_pending' | 'ready'

interface IntelMatch {
  title: string
  description: string
  score: number
  type: 'opportunity' | 'trending' | 'build_suggestion'
}

const INDUSTRIES = [
  'Agency / Marketing',
  'SaaS / Software',
  'E-Commerce / Retail',
  'Healthcare / Medical',
  'Real Estate',
  'Legal / Law Firm',
  'Finance / Accounting',
  'Education / Training',
  'Construction / Trades',
  'Restaurant / Hospitality',
  'Fitness / Wellness',
  'Consulting',
  'Non-Profit',
  'Other',
]

const INDUSTRY_MATCHES: Record<string, IntelMatch[]> = {
  'Agency / Marketing': [
    { title: 'AI Content Pipeline', description: 'Auto-generate blog posts, social media content, and email campaigns for all your clients from one dashboard.', score: 94, type: 'opportunity' },
    { title: 'Client Reporting Automation', description: 'Pull analytics from Google, Meta, and LinkedIn into branded PDF reports delivered weekly.', score: 89, type: 'trending' },
    { title: 'White-Label AI Chat', description: 'Deploy branded AI chatbots on client websites with your agency branding and domain.', score: 86, type: 'build_suggestion' },
  ],
  'SaaS / Software': [
    { title: 'Churn Prediction Engine', description: 'Monitor user engagement signals and trigger automated retention workflows before cancellation.', score: 92, type: 'opportunity' },
    { title: 'AI-Powered Onboarding', description: 'Personalize user onboarding sequences based on signup data and behavior patterns.', score: 88, type: 'trending' },
    { title: 'Usage-Based Upsell Flows', description: 'Detect power users approaching limits and serve upgrade prompts at the right moment.', score: 85, type: 'build_suggestion' },
  ],
  'E-Commerce / Retail': [
    { title: 'Abandoned Cart Recovery', description: 'Multi-channel recovery sequences via email, SMS, and retargeting with AI-optimized timing.', score: 96, type: 'opportunity' },
    { title: 'Product Review Automation', description: 'Automatically request, collect, and showcase reviews with AI-generated response drafts.', score: 87, type: 'trending' },
    { title: 'Dynamic Pricing Engine', description: 'Monitor competitor prices and adjust your catalog in real-time based on market conditions.', score: 83, type: 'build_suggestion' },
  ],
  'Healthcare / Medical': [
    { title: 'Patient Follow-Up System', description: 'HIPAA-compliant automated appointment reminders, post-visit surveys, and care plan delivery.', score: 93, type: 'opportunity' },
    { title: 'Intake Form Digitizer', description: 'Convert paper forms to digital, auto-populate patient records, and reduce front-desk workload.', score: 88, type: 'trending' },
    { title: 'Referral Network Builder', description: 'Track and nurture physician referral relationships with automated touch-points.', score: 84, type: 'build_suggestion' },
  ],
  default: [
    { title: 'Lead Capture Automation', description: 'Convert website visitors to contacts with AI chat, forms, and multi-step nurture sequences.', score: 91, type: 'opportunity' },
    { title: 'Reputation Management', description: 'Monitor, request, and respond to online reviews across Google, Yelp, and Facebook automatically.', score: 87, type: 'trending' },
    { title: 'Client Communication Hub', description: 'Unified inbox for email, SMS, chat, and social DMs with AI-suggested responses.', score: 84, type: 'build_suggestion' },
  ],
}

function getMatchesForIndustry(industry: string): IntelMatch[] {
  return INDUSTRY_MATCHES[industry] || INDUSTRY_MATCHES['default']
}

const typeIcons: Record<string, typeof Target> = {
  opportunity: Target,
  trending: TrendingUp,
  build_suggestion: Sparkles,
}

const typeLabels: Record<string, string> = {
  opportunity: 'Direct Opportunity',
  trending: 'Trending',
  build_suggestion: 'Build Suggestion',
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [provisionStage, setProvisionStage] = useState<Stage>('provisioning')
  const [provisionReady, setProvisionReady] = useState(false)
  const [pollCount, setPollCount] = useState(0)

  // Step 2 fields
  const [website, setWebsite] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)

  // Step 3
  const [matches, setMatches] = useState<IntelMatch[]>([])

  // Load user on mount
  useEffect(() => {
    async function loadUser() {
      const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step, business_name, website, company')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }
      if (profile?.business_name) setCompanyName(profile.business_name)
      if (profile?.website) setWebsite(profile.website)
      if (profile?.onboarding_step && profile.onboarding_step > 1) {
        setStep(profile.onboarding_step)
      }
    }
    loadUser()
  }, [supabase, router])

  // Poll provisioning status
  useEffect(() => {
    if (!userId || provisionReady) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/check-provision?userId=${userId}`)
        const data = await res.json()
        setProvisionStage(data.stage)
        setPollCount((c) => c + 1)

        if (data.ready || data.stage === 'ready') {
          setProvisionReady(true)
          clearInterval(interval)
        }
      } catch {
        // silent retry
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [userId, provisionReady])

  const handleScanWebsite = useCallback(async () => {
    if (!website || !userId) return
    setScanning(true)
    try {
      await fetch('/api/brand/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, website }),
      })
      setScanComplete(true)
    } catch {
      // continue even if scan fails
      setScanComplete(true)
    } finally {
      setScanning(false)
    }
  }, [website, userId])

  const saveStep2 = useCallback(async () => {
    if (!userId) return
    await supabase.from('profiles').update({
      business_name: companyName || null,
      website: website || null,
      industry: industry || null,
      onboarding_step: 3,
    }).eq('id', userId)

    setMatches(getMatchesForIndustry(industry))
    setStep(3)
  }, [userId, companyName, website, industry, supabase])

  const completeOnboarding = useCallback(async () => {
    if (!userId) return
    await supabase.from('profiles').update({
      onboarding_completed: true,
      onboarding_step: 4,
    }).eq('id', userId)

    await supabase.from('onboarding_events').insert({
      user_id: userId,
      step: 'onboarding_complete',
      metadata: { industry, website, companyName },
    })

    router.push('/dashboard')
  }, [userId, supabase, router, industry, website, companyName])

  const progressPercent = provisionReady
    ? 100
    : Math.min(90, 15 + pollCount * 8)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020810] flex items-center justify-center p-4">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
      <div className="relative w-full max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s < step
                    ? 'bg-[#7ed957] text-[#020810]'
                    : s === step
                      ? 'bg-[#7ed957]/20 text-[#7ed957] border border-[#7ed957]'
                      : 'bg-white/[0.04] text-white/45 border border-white/10'
                }`}
              >
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-12 h-px ${
                    s < step ? 'bg-[#7ed957]' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Provisioning */}
        {step === 1 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#7ed957]/10 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-[#7ed957]" />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  Welcome to 0nCore
                </span>
              </h1>
              <p className="text-white/75">
                Setting up your AI command center. This takes 30-90 seconds.
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/[0.04] rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="h-full bg-[#7ed957] rounded-full transition-all duration-1000 ease-out"
                /* percentage width via Tailwind arbitrary */
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              {!provisionReady ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#7ed957] animate-spin" />
                  <span className="text-white/75 text-sm">
                    {provisionStage === 'oauth_pending'
                      ? 'Connecting marketplace apps...'
                      : 'Provisioning your CRM workspace...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-[#7ed957]" />
                  <span className="text-[#7ed957] text-sm font-medium">
                    Your workspace is ready
                  </span>
                </>
              )}
            </div>

            {/* Provision status items */}
            <div className="space-y-3 text-left max-w-sm mx-auto mb-6">
              <ProvisionItem
                label="Account created"
                done={true}
              />
              <ProvisionItem
                label="CRM location provisioned"
                done={provisionStage === 'ready' || provisionStage === 'oauth_pending'}
              />
              <ProvisionItem
                label="Marketplace app installed"
                done={provisionStage === 'ready'}
              />
              <ProvisionItem
                label="Pipeline & workflows deployed"
                done={provisionReady}
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!provisionReady}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                provisionReady
                  ? 'bg-[#7ed957] text-[#020810] hover:brightness-110 cursor-pointer'
                  : 'bg-white/[0.04] text-white/45 cursor-not-allowed'
              }`}
            >
              {provisionReady ? (
                <span className="flex items-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </span>
              ) : (
                'Setting up...'
              )}
            </button>
          </div>
        )}

        {/* Step 2 — Business info */}
        {step === 2 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#7ed957]/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-[#7ed957]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Tell us about your business
              </h1>
              <p className="text-white/75">
                We will customize your AI and automations to fit your industry.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/75 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-white/45 focus:outline-none focus:border-[#7ed957]/50 focus:ring-1 focus:ring-[#7ed957]/30 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/75 mb-1.5">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#7ed957]/50 focus:ring-1 focus:ring-[#7ed957]/30 transition-colors appearance-none"
                >
                  <option value="" className="bg-[#0d1117]">Select your industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind} className="bg-[#0d1117]">
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/75 mb-1.5">
                  Website URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder:text-white/45 focus:outline-none focus:border-[#7ed957]/50 focus:ring-1 focus:ring-[#7ed957]/30 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleScanWebsite}
                    disabled={!website || scanning || scanComplete}
                    className={`px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                      scanComplete
                        ? 'bg-[#7ed957]/10 text-[#7ed957] border border-[#7ed957]/20'
                        : !website || scanning
                          ? 'bg-white/[0.04] text-white/45 cursor-not-allowed'
                          : 'bg-[#7ed957]/10 text-[#7ed957] hover:bg-[#7ed957]/20 border border-[#7ed957]/20 cursor-pointer'
                    }`}
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scanning
                      </>
                    ) : scanComplete ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Scanned
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Scan My Website
                      </>
                    )}
                  </button>
                </div>
                {scanComplete && (
                  <p className="text-xs text-[#7ed957] mt-1.5">
                    Brand data extracted. Your AI will match your voice and style.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-white/75 hover:text-white transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={saveStep2}
                disabled={!industry}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  industry
                    ? 'bg-[#7ed957] text-[#020810] hover:brightness-110 cursor-pointer'
                    : 'bg-white/[0.04] text-white/45 cursor-not-allowed'
                }`}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Market Intel */}
        {step === 3 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#7ed957]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#7ed957]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Your Opportunities
              </h1>
              <p className="text-white/75">
                Based on your industry, here is what 0nCore can automate for you right away.
              </p>
            </div>

            <div className="space-y-4">
              {matches.map((match, i) => {
                const Icon = typeIcons[match.type] || Target
                return (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 hover:border-[#7ed957]/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#7ed957]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-5 h-5 text-[#7ed957]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold">
                            {match.title}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#7ed957]/10 text-[#7ed957] font-medium">
                            {match.score}% match
                          </span>
                        </div>
                        <p className="text-sm text-white/75 leading-relaxed">
                          {match.description}
                        </p>
                        <span className="inline-block mt-2 text-xs text-white/45">
                          {typeLabels[match.type]}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-white/75 hover:text-white transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (userId) {
                    supabase.from('profiles').update({ onboarding_step: 4 }).eq('id', userId)
                  }
                  setStep(4)
                }}
                className="px-6 py-2.5 rounded-lg font-medium bg-[#7ed957] text-[#020810] hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Ready */}
        {step === 4 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
            <div className="mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#7ed957]/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#7ed957]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                You are ready
              </h1>
              <p className="text-white/75">
                Your AI command center is live. Here is what is set up:
              </p>
            </div>

            <div className="space-y-3 text-left max-w-sm mx-auto mb-8">
              <ReadyItem label="Account created" done />
              <ReadyItem label="CRM workspace provisioned" done />
              <ReadyItem label="Pipeline & workflows deployed" done />
              <ReadyItem label={`Industry set: ${industry || 'General'}`} done />
              <ReadyItem label="Website imported" done={scanComplete} />
              <ReadyItem label="First automation" done={false} link="/dashboard/automations" />
              <ReadyItem label="Chrome extension" done={false} link="/dashboard/integrations" />
              <ReadyItem label="LinkedIn connected" done={false} link="/dashboard/social0n" />
            </div>

            <button
              onClick={completeOnboarding}
              className="px-8 py-3 rounded-lg font-semibold bg-[#7ed957] text-[#020810] hover:brightness-110 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              Go to Dashboard <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProvisionItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <CheckCircle className="w-4 h-4 text-[#7ed957] shrink-0" />
      ) : (
        <Loader2 className="w-4 h-4 text-white/45 animate-spin shrink-0" />
      )}
      <span className={`text-sm ${done ? 'text-white' : 'text-white/45'}`}>
        {label}
      </span>
    </div>
  )
}

function ReadyItem({ label, done, link }: { label: string; done: boolean; link?: string }) {
  const content = (
    <div className="flex items-center gap-3">
      <CheckCircle
        className={`w-4 h-4 shrink-0 ${done ? 'text-[#7ed957]' : 'text-white/[0.15]'}`}
      />
      <span className={`text-sm ${done ? 'text-white' : 'text-white/45'}`}>
        {label}
      </span>
      {link && !done && (
        <ArrowRight className="w-3 h-3 text-white/45 ml-auto" />
      )}
    </div>
  )

  if (link && !done) {
    return (
      <a href={link} className="block hover:bg-white/[0.02] rounded-md px-2 py-1 -mx-2 transition-colors">
        {content}
      </a>
    )
  }

  return <div className="px-2 py-1 -mx-2">{content}</div>
}
