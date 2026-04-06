'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

    // Save to user metadata
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

    // Update CRM custom values via API
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
      subtitle: 'Let\'s set up your AI in under 2 minutes.',
      content: (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🚀</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 15, lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
            We're going to ask you a few questions about your business. Your AI will use this to personalize every interaction, automation, and recommendation.
          </p>
        </div>
      ),
      valid: true,
    },
    // Step 1: Business Name
    {
      title: 'What\'s your business called?',
      subtitle: 'This is how your AI will introduce itself.',
      content: (
        <div>
          <input
            autoFocus
            value={data.businessName}
            onChange={e => update('businessName', e.target.value)}
            placeholder="e.g. Acme Marketing Agency"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
            onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {INDUSTRIES.map(ind => (
            <button
              key={ind}
              onClick={() => update('industry', ind)}
              style={{
                padding: '12px 16px',
                background: data.industry === ind ? 'rgba(45,212,191,0.12)' : 'var(--bg-card, #1f2937)',
                border: `1px solid ${data.industry === ind ? 'var(--color-cyan, #14b8a6)' : 'var(--border, #30363d)'}`,
                borderRadius: 10,
                color: data.industry === ind ? 'var(--color-cyan, #14b8a6)' : 'var(--text-secondary, #9ca3af)',
                fontSize: 13,
                fontWeight: data.industry === ind ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >{ind}</button>
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
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
            onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 8 }}>Separate with commas</p>
        </div>
      ),
      valid: data.services.length > 2,
    },
    // Step 4: Contact Info
    {
      title: 'How can clients reach you?',
      subtitle: 'Your AI will share this when asked.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              value={data.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="(555) 123-4567"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
              onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input
              value={data.website}
              onChange={e => update('website', e.target.value)}
              placeholder="https://yourbusiness.com"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
              onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Booking Link (optional)</label>
            <input
              value={data.bookingUrl}
              onChange={e => update('bookingUrl', e.target.value)}
              placeholder="https://calendly.com/you or your booking page"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
              onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
            />
          </div>
        </div>
      ),
      valid: true, // phone/website optional
    },
    // Step 5: AI Name
    {
      title: 'Name your AI assistant',
      subtitle: 'This is what your clients will call it. Leave blank for "0nAI".',
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(139,92,246,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>🤖</div>
          <input
            value={data.aiName}
            onChange={e => update('aiName', e.target.value)}
            placeholder="0nAI"
            style={{ ...inputStyle, textAlign: 'center', fontSize: 20, fontWeight: 700 }}
            onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
            onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 12 }}>
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
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: 100, height: 100, borderRadius: 24, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #2dd4bf, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 44, boxShadow: '0 8px 32px rgba(45,212,191,0.3)',
          }}>✓</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
            <p><strong style={{ color: 'var(--text-primary, #f0f4f8)' }}>{data.businessName}</strong> · {data.industry}</p>
            <p style={{ marginTop: 8 }}>{data.services}</p>
            {data.phone && <p style={{ marginTop: 8 }}>{data.phone}</p>}
            <p style={{ marginTop: 12, color: 'var(--color-cyan, #14b8a6)', fontWeight: 600 }}>
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
  const progress = ((step) / (steps.length - 1)) * 100

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #0d1117)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Progress bar */}
        <div style={{
          height: 3, background: 'var(--border, #30363d)', borderRadius: 2,
          marginBottom: 40, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, #2dd4bf, #8b5cf6)',
            borderRadius: 2, transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Step content */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>
            {current.title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted, #6b7280)' }}>{current.subtitle}</p>
        </div>

        <div style={{ marginBottom: 32 }}>
          {current.content}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={{
              padding: '10px 20px', background: 'none',
              border: '1px solid #1c2b42', borderRadius: 10,
              color: 'var(--text-secondary, #9ca3af)', fontSize: 14, cursor: 'pointer',
            }}>Back</button>
          ) : <div />}

          {isLast ? (
            <button onClick={handleComplete} disabled={saving} style={{
              padding: '12px 32px',
              background: saving ? 'var(--border, #30363d)' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
              color: saving ? 'var(--text-muted, #6b7280)' : '#0c1220',
              fontWeight: 700, fontSize: 15, borderRadius: 10,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Setting up...' : 'Launch Dashboard →'}
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!current.valid}
              style={{
                padding: '12px 28px',
                background: current.valid ? 'linear-gradient(135deg, #2dd4bf, #14b8a6)' : 'var(--border, #30363d)',
                color: current.valid ? '#0c1220' : 'var(--text-muted, #6b7280)',
                fontWeight: 700, fontSize: 14, borderRadius: 10,
                border: 'none', cursor: current.valid ? 'pointer' : 'not-allowed',
              }}
            >Continue</button>
          )}
        </div>

        {/* Step indicator */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6, marginTop: 32,
        }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8,
              borderRadius: 4,
              background: i <= step ? 'var(--color-cyan, #14b8a6)' : 'var(--border, #30363d)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  background: 'var(--bg-card, #1f2937)',
  border: '1px solid #1c2b42',
  borderRadius: 10,
  color: 'var(--text-primary, #f0f4f8)',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: '-apple-system, sans-serif',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-muted, #6b7280)',
  marginBottom: 6,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}
