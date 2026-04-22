'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Rocket, Bot, CheckCircle, ArrowRight } from 'lucide-react'

interface OnboardingData {
  businessName: string
  industry: string
  services: string
  phone: string
  website: string
  bookingUrl: string
  aiName: string
}

const INDUSTRIES = [
  'Agency / Marketing',
  'Real Estate',
  'Health & Wellness',
  'Legal Services',
  'Financial Services',
  'Home Services',
  'Fitness / Gym',
  'Salon / Spa',
  'Restaurant / Food',
  'E-Commerce',
  'Coaching / Consulting',
  'Medical / Dental',
  'Automotive',
  'Education',
  'SaaS / Technology',
  'Other',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    businessName: '',
    industry: '',
    services: '',
    phone: '',
    website: '',
    bookingUrl: '',
    aiName: '',
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function update(field: keyof OnboardingData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  async function handleComplete() {
    setSaving(true)

    await supabase.auth.updateUser({
      data: {
        business_name: data.businessName,
        industry: data.industry,
        services: data.services,
        phone: data.phone,
        website: data.website,
        booking_url: data.bookingUrl,
        ai_name: data.aiName || '0nAI',
        onboarding_complete: true,
      }
    })

    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})

    router.push('/dashboard')
  }

  const steps = [
    // Step 0: Welcome
    {
      title: 'Welcome to 0nAI',
      subtitle: "Let's set up your AI in under 2 minutes.",
      content: (
        <div className="text-center py-5">
          <div className="flex items-center justify-center mb-5">
            <Rocket className="w-16 h-16 text-core-cyan" strokeWidth={1.5} />
          </div>
          <p className="text-core-text-dim text-[15px] leading-relaxed max-w-[400px] mx-auto">
            We're going to ask you a few questions about your business. Your AI will use this to personalize every interaction, automation, and recommendation.
          </p>
        </div>
      ),
      valid: true,
    },
    // Step 1: Business Name
    {
      title: "What's your business called?",
      subtitle: 'This is how your AI will introduce itself.',
      content: (
        <div>
          <input
            autoFocus
            value={data.businessName}
            onChange={e => update('businessName', e.target.value)}
            placeholder="e.g. Acme Marketing Agency"
            className="w-full px-4 py-3.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-[15px] outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted"
          />
        </div>
      ),
      valid: data.businessName.length > 1,
    },
    // Step 2: Industry
    {
      title: 'What industry are you in?',
      subtitle: 'Helps your AI understand your world.',
      content: (
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRIES.map(ind => (
            <button
              key={ind}
              onClick={() => update('industry', ind)}
              className={[
                'px-4 py-3 rounded-[10px] text-[13px] text-left transition-all duration-150 border cursor-pointer',
                data.industry === ind
                  ? 'bg-core-cyan/10 border-core-cyan text-core-cyan font-semibold'
                  : 'bg-core-card border-core-border text-core-text-dim font-normal hover:border-core-cyan/50',
              ].join(' ')}
            >
              {ind}
            </button>
          ))}
        </div>
      ),
      valid: data.industry.length > 0,
    },
    // Step 3: Services
    {
      title: 'What services do you offer?',
      subtitle: 'List your main services — your AI will learn these.',
      content: (
        <div>
          <textarea
            value={data.services}
            onChange={e => update('services', e.target.value)}
            placeholder="e.g. SEO, PPC, Social Media Management, Web Design, Email Marketing"
            rows={4}
            className="w-full px-4 py-3.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-[15px] outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted resize-none leading-relaxed"
          />
          <p className="text-[11px] text-core-text-muted mt-2">Separate with commas</p>
        </div>
      ),
      valid: data.services.length > 2,
    },
    // Step 4: Contact Info
    {
      title: 'How can clients reach you?',
      subtitle: 'Your AI will share this when asked.',
      content: (
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-[0.06em]">
              Phone
            </label>
            <input
              value={data.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-[15px] outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted"
            />
          </div>
          <div>
            <label className="block text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-[0.06em]">
              Website
            </label>
            <input
              value={data.website}
              onChange={e => update('website', e.target.value)}
              placeholder="https://yourbusiness.com"
              className="w-full px-4 py-3.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-[15px] outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted"
            />
          </div>
          <div>
            <label className="block text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-[0.06em]">
              Booking Link (optional)
            </label>
            <input
              value={data.bookingUrl}
              onChange={e => update('bookingUrl', e.target.value)}
              placeholder="https://calendly.com/you or your booking page"
              className="w-full px-4 py-3.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-[15px] outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted"
            />
          </div>
        </div>
      ),
      valid: true,
    },
    // Step 5: AI Name
    {
      title: 'Name your AI assistant',
      subtitle: 'This is what your clients will call it. Leave blank for "0nAI".',
      content: (
        <div className="text-center">
          <div className="w-20 h-20 rounded-[20px] mx-auto mb-5 bg-gradient-to-br from-core-cyan/15 to-core-purple/15 flex items-center justify-center">
            <Bot className="w-9 h-9 text-core-cyan" strokeWidth={1.5} />
          </div>
          <input
            value={data.aiName}
            onChange={e => update('aiName', e.target.value)}
            placeholder="0nAI"
            className="w-full px-4 py-3.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-xl font-bold text-center outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted"
          />
          <p className="text-[12px] text-core-text-muted mt-3">
            Your clients will see: "Hi, I'm {data.aiName || '0nAI'} from {data.businessName || 'your business'}."
          </p>
        </div>
      ),
      valid: true,
    },
    // Step 6: Done
    {
      title: 'Your AI is ready.',
      subtitle: `${data.aiName || '0nAI'} knows your business. Let's go.`,
      content: (
        <div className="text-center py-5">
          <div className="w-24 h-24 rounded-[24px] mx-auto mb-6 bg-gradient-to-br from-core-cyan to-core-purple flex items-center justify-center shadow-[0_8px_32px_rgba(45,212,191,0.3)]">
            <CheckCircle className="w-11 h-11 text-core-bg" strokeWidth={2} />
          </div>
          <div className="text-[14px] text-core-text-dim leading-relaxed max-w-[360px] mx-auto">
            <p>
              <strong className="text-core-text">{data.businessName}</strong>
              {data.industry ? ` · ${data.industry}` : ''}
            </p>
            {data.services && <p className="mt-2">{data.services}</p>}
            {data.phone && <p className="mt-2">{data.phone}</p>}
            <p className="mt-3 text-core-cyan font-semibold">
              {data.aiName || '0nAI'} is trained and ready to work.
            </p>
          </div>
        </div>
      ),
      valid: true,
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1
  const progress = (step / (steps.length - 1)) * 100

  return (
    <div className="min-h-screen bg-core-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[480px]">

        {/* Progress bar */}
        <div className="h-[3px] bg-core-border rounded-sm mb-10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-core-cyan to-core-purple rounded-sm transition-[width] duration-[400ms] ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-core-text mb-1.5">{current.title}</h1>
          <p className="text-[14px] text-core-text-muted">{current.subtitle}</p>
        </div>

        {/* Step content */}
        <div className="mb-8">{current.content}</div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 bg-transparent border border-core-border rounded-[10px] text-core-text-dim text-[14px] cursor-pointer hover:border-core-border/80 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              onClick={handleComplete}
              disabled={saving}
              className={[
                'px-8 py-3 rounded-[10px] font-bold text-[15px] border-none transition-all',
                saving
                  ? 'bg-core-border text-core-text-muted cursor-not-allowed'
                  : 'bg-gradient-to-r from-core-cyan to-core-cyan/80 text-core-bg cursor-pointer hover:opacity-90',
              ].join(' ')}
            >
              {saving ? 'Setting up...' : 'Launch Dashboard'}
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!current.valid}
              className={[
                'flex items-center gap-2 px-7 py-3 rounded-[10px] font-bold text-[14px] border-none transition-all',
                current.valid
                  ? 'bg-gradient-to-r from-core-cyan to-core-cyan/80 text-core-bg cursor-pointer hover:opacity-90'
                  : 'bg-core-border text-core-text-muted cursor-not-allowed',
              ].join(' ')}
            >
              Continue
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mt-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={[
                'h-2 rounded-full transition-all duration-300',
                i === step ? 'w-6' : 'w-2',
                i <= step ? 'bg-core-cyan' : 'bg-core-border',
              ].join(' ')}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
