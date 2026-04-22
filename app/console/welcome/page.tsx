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
      layer: 'K1',
      content: {
        business_name: businessName.trim(),
        what_we_do: whatWeDo.trim(),
        brand_tone: brandTone,
      },
      status: 'active',
    }, { onConflict: 'user_id,layer' })

    // 3. Upsert K1 registry
    await supabase.from('user_kb_registry').upsert({
      user_id: user.id,
      layer: 'K1',
      status: 'ready',
    }, { onConflict: 'user_id,layer' })

    router.push('/console')
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[420px] bg-[#161b22] rounded-xl px-8 py-10 border border-[#30363d]"
      >
        <h1 className="text-2xl font-bold text-[#f0f4f8] mb-1 text-center">
          Welcome to 0nCore
        </h1>
        <p className="text-sm text-[#9ca3af] mb-8 text-center">
          Tell us about your business so your AI knows who you are.
        </p>

        {/* Business Name */}
        <label className="block mb-4">
          <span className="text-[13px] font-semibold text-[#f0f4f8] block mb-1.5">
            Business Name
          </span>
          <input
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Acme Corp"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-[#30363d] bg-[#0d1117] text-sm text-[#f0f4f8] placeholder:text-[#6b7280] outline-none focus:border-[#6EE05A]/50 transition-colors box-border"
          />
        </label>

        {/* What We Do */}
        <label className="block mb-4">
          <span className="text-[13px] font-semibold text-[#f0f4f8] block mb-1.5">
            What do you do?
          </span>
          <input
            type="text"
            value={whatWeDo}
            onChange={e => setWhatWeDo(e.target.value)}
            placeholder="We help small businesses automate their marketing"
            className="w-full px-3 py-2.5 rounded-lg border border-[#30363d] bg-[#0d1117] text-sm text-[#f0f4f8] placeholder:text-[#6b7280] outline-none focus:border-[#6EE05A]/50 transition-colors box-border"
          />
        </label>

        {/* Brand Tone */}
        <div className="mb-7">
          <span className="text-[13px] font-semibold text-[#f0f4f8] block mb-2">
            Brand Tone
          </span>
          <div className="flex flex-wrap gap-2">
            {TONES.map(tone => (
              <button
                key={tone}
                type="button"
                onClick={() => setBrandTone(tone)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] cursor-pointer capitalize transition-colors border ${
                  brandTone === tone
                    ? 'border-[#6EE05A] bg-[#6EE05A]/10 text-[#6EE05A] font-semibold'
                    : 'border-[#30363d] bg-transparent text-[#9ca3af] font-normal hover:border-[#6EE05A]/40 hover:text-[#f0f4f8]'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !businessName.trim()}
          className={`w-full py-3 rounded-lg text-[15px] font-semibold border-none transition-colors ${
            loading || !businessName.trim()
              ? 'bg-[#30363d] text-[#6b7280] cursor-not-allowed'
              : 'bg-[#6EE05A] text-[#0d1117] cursor-pointer hover:bg-[#6EE05A]/90'
          }`}
        >
          {loading ? 'Setting up...' : 'Get Started'}
        </button>
      </form>
    </div>
  )
}
