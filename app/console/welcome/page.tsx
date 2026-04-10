'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TONES = ['professional', 'friendly', 'bold', 'casual', 'luxurious', 'technical']

export default function WelcomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [businessName, setBusinessName] = useState('')
  const [whatWeDo, setWhatWeDo] = useState('')
  const [brandTone, setBrandTone] = useState('professional')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessName.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // 1. Update profile
    await supabase.from('profiles').update({
      business_name: businessName.trim(),
      business_type: whatWeDo.trim(),
      brand_tone: brandTone,
      onboarding_complete: true,
    }).eq('id', user.id)

    // 2. Upsert K1 content
    await supabase.from('kb_content_queue').upsert({
      user_id: user.id,
      k_layer: 'K1',
      content_type: 'brand_voice',
      content: {
        business_name: businessName.trim(),
        what_we_do: whatWeDo.trim(),
        brand_tone: brandTone,
      },
      status: 'active',
    }, { onConflict: 'user_id,k_layer' })

    // 3. Upsert K1 registry
    await supabase.from('user_kb_registry').upsert({
      user_id: user.id,
      k_layer: 'K1',
      status: 'ready',
    }, { onConflict: 'user_id,k_layer' })

    router.push('/console')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: '420px',
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '40px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
        border: '1px solid #E5E7EB',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '4px',
          textAlign: 'center',
        }}>
          Welcome to 0nCore
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          Tell us about your business so your AI knows who you are.
        </p>

        {/* Business Name */}
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            Business Name
          </span>
          <input
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Acme Corp"
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              color: '#111827',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>

        {/* What We Do */}
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
            What do you do?
          </span>
          <input
            type="text"
            value={whatWeDo}
            onChange={e => setWhatWeDo(e.target.value)}
            placeholder="We help small businesses automate their marketing"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              color: '#111827',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>

        {/* Brand Tone */}
        <div style={{ marginBottom: '28px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>
            Brand Tone
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TONES.map(tone => (
              <button
                key={tone}
                type="button"
                onClick={() => setBrandTone(tone)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: brandTone === tone ? '2px solid #6EE05A' : '1px solid #D1D5DB',
                  background: brandTone === tone ? '#F0FDF4' : '#FFFFFF',
                  color: brandTone === tone ? '#166534' : '#6B7280',
                  fontSize: '13px',
                  fontWeight: brandTone === tone ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !businessName.trim()}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            background: loading ? '#9CA3AF' : '#6EE05A',
            color: '#080B0F',
            border: 'none',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Setting up...' : 'Get Started'}
        </button>
      </form>
    </div>
  )
}
