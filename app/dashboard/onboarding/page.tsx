'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Globe, Linkedin, CheckCircle, ArrowRight, Loader2,
  Building2, Palette, Briefcase, Sparkles, Chrome,
  User, Phone, Mail
} from 'lucide-react'

interface BrandData {
  name: string | null
  tagline: string | null
  description: string | null
  phone: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  industry: string | null
  services: { name: string; description?: string }[]
}

type ScanPhase = 'idle' | 'scanning' | 'done' | 'error'

const SCAN_MESSAGES = [
  'Connecting to website...',
  'Analyzing brand identity...',
  'Extracting company info...',
  'Identifying services...',
  'Building your profile...',
]

export default function OnboardingPage() {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [scanMsg, setScanMsg] = useState('')
  const [brand, setBrand] = useState<BrandData | null>(null)
  const [scanError, setScanError] = useState('')

  // Editable fields (pre-filled from scan + OAuth)
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [services, setServices] = useState('')
  const [tagline, setTagline] = useState('')
  const [phoneNum, setPhoneNum] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')

  // OAuth states
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [linkedinName, setLinkedinName] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  const [checkingOAuth, setCheckingOAuth] = useState(true)

  // Provisioning
  const [provisioned, setProvisioned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0) // 0 = connect + scan, 1 = review + launch

  const router = useRouter()
  const supabase = createClient()

  // Check existing OAuth connections + user data on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Pre-fill from user metadata (LinkedIn OAuth populates these)
      const meta = user.user_metadata || {}
      if (meta.full_name) setLinkedinName(meta.full_name)
      if (meta.name) setLinkedinName(meta.name)

      // Check if came from LinkedIn OAuth
      const provider = user.app_metadata?.provider
      if (provider === 'linkedin_oidc') {
        setLinkedinConnected(true)
        setLinkedinName(meta.full_name || meta.name || '')
      }

      // Check Google connection
      const { data: profile } = await supabase
        .from('profiles')
        .select('google_tokens, business_name, crm_location_id, provisioned_at')
        .eq('id', user.id)
        .single()

      if (profile?.google_tokens?.access_token) {
        setGoogleConnected(true)
        setGoogleEmail(profile.google_tokens.email || '')
      }

      if (profile?.business_name) setBusinessName(profile.business_name)
      if (profile?.provisioned_at) setProvisioned(true)

      // Auto-provision if not done
      if (!profile?.crm_location_id) {
        fetch('/api/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email || '',
            name: meta.full_name || meta.name || '',
          }),
        }).then(() => setProvisioned(true)).catch(() => {})
      } else {
        setProvisioned(true)
      }

      setCheckingOAuth(false)
    }
    init()
  }, [supabase])

  // Website scan
  const handleScan = useCallback(async () => {
    if (!websiteUrl.trim()) return
    setScanPhase('scanning')
    setScanError('')

    // Cycle through scan messages
    let msgIdx = 0
    setScanMsg(SCAN_MESSAGES[0])
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, SCAN_MESSAGES.length - 1)
      setScanMsg(SCAN_MESSAGES[msgIdx])
    }, 2000)

    try {
      let url = websiteUrl.trim()
      if (!url.startsWith('http')) url = `https://${url}`

      const res = await fetch('/api/brand/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      clearInterval(interval)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Scan failed' }))
        setScanError(err.error || 'Could not analyze website')
        setScanPhase('error')
        return
      }

      const { brand: b } = await res.json()
      setBrand(b)

      // Pre-fill editable fields
      if (b.name) setBusinessName(b.name)
      if (b.industry) setIndustry(b.industry)
      if (b.tagline) setTagline(b.tagline)
      if (b.phone) setPhoneNum(b.phone)
      if (b.primary_color) setPrimaryColor(b.primary_color)
      if (b.services?.length) {
        setServices(b.services.map((s: { name: string }) => s.name).join(', '))
      }

      setScanPhase('done')

      // Auto-advance to review after brief pause
      setTimeout(() => setStep(1), 1200)
    } catch {
      clearInterval(interval)
      setScanError('Network error — check the URL and try again')
      setScanPhase('error')
    }
  }, [websiteUrl])

  // OAuth handlers
  function connectLinkedin() {
    supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/onboarding` },
    })
  }

  function connectGoogle() {
    const w = 500, h = 600
    const left = window.screenX + (window.innerWidth - w) / 2
    const top = window.screenY + (window.innerHeight - h) / 2
    const popup = window.open('/api/auth/google-connect', 'google-oauth', `width=${w},height=${h},left=${left},top=${top}`)
    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll)
        // Re-check Google status
        fetch('/api/auth/google-connect/status')
          .then(r => r.json())
          .then(d => {
            if (d.connected) {
              setGoogleConnected(true)
              setGoogleEmail(d.email || '')
            }
          })
          .catch(() => {})
      }
    }, 500)
  }

  // Complete onboarding
  async function handleLaunch() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Save to user metadata
    await supabase.auth.updateUser({
      data: {
        business_name: businessName,
        industry,
        services,
        website: websiteUrl,
        phone: phoneNum,
        onboarding_complete: true,
      }
    })

    // Save to profiles
    await supabase.from('profiles').update({
      business_name: businessName,
      onboarding_complete: true,
    }).eq('id', user.id)

    // Save brand data
    if (brand || businessName) {
      await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            ...brand,
            name: businessName,
            industry,
            services: services.split(',').map(s => ({ name: s.trim() })).filter(s => s.name),
            phone: phoneNum,
            tagline,
            primary_color: primaryColor,
          },
          business_name: businessName,
        }),
      }).catch(() => {})
    }

    // Seed K1 knowledge layer
    await supabase.from('kb_content_queue').upsert({
      user_id: user.id,
      layer: 'K1',
      content: {
        business_name: businessName,
        industry,
        services,
        phone: phoneNum,
        website: websiteUrl,
        tagline,
      },
      status: 'active',
    }, { onConflict: 'user_id,layer' })

    // Update CRM agent
    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName,
        industry,
        services,
        phone: phoneNum,
        website: websiteUrl,
      }),
    }).catch(() => {})

    router.push('/dashboard')
  }

  if (checkingOAuth) {
    return (
      <div className="min-h-screen bg-core-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-core-green animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-core-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">

        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-10">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${step >= 0 ? 'bg-core-green text-core-bg' : 'bg-core-border text-core-text-muted'}`}>1</div>
          <div className={`flex-1 h-0.5 rounded transition-colors ${step >= 1 ? 'bg-core-green' : 'bg-core-border'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${step >= 1 ? 'bg-core-green text-core-bg' : 'bg-core-border text-core-text-muted'}`}>2</div>
        </div>

        {step === 0 && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-core-text mb-2">Set up your account</h1>
              <p className="text-sm text-core-text-muted">Connect your accounts and we'll do the rest. Your AI will be ready in seconds.</p>
            </div>

            {/* Website URL input */}
            <div className="bg-core-card border border-core-border rounded-xl p-5 mb-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-core-text mb-3">
                <Globe className="w-4 h-4 text-core-cyan" />
                Your Website
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && scanPhase === 'idle' && handleScan()}
                  placeholder="yourcompany.com"
                  className="flex-1 bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-cyan transition-colors"
                />
                <button
                  onClick={handleScan}
                  disabled={!websiteUrl.trim() || scanPhase === 'scanning'}
                  className="flex items-center gap-2 px-4 py-2.5 bg-core-cyan text-core-bg font-semibold text-sm rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanPhase === 'scanning' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : scanPhase === 'done' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {scanPhase === 'scanning' ? 'Scanning' : scanPhase === 'done' ? 'Done' : 'Scan'}
                </button>
              </div>

              {/* Scan status */}
              {scanPhase === 'scanning' && (
                <div className="flex items-center gap-2 mt-3 text-xs text-core-cyan">
                  <div className="w-1.5 h-1.5 rounded-full bg-core-cyan animate-pulse" />
                  {scanMsg}
                </div>
              )}
              {scanPhase === 'done' && brand && (
                <div className="flex items-center gap-2 mt-3 text-xs text-core-green">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Found: {brand.name} — {brand.industry || 'Business'}
                  {brand.services?.length ? ` — ${brand.services.length} services detected` : ''}
                </div>
              )}
              {scanPhase === 'error' && (
                <p className="mt-3 text-xs text-core-red">{scanError}</p>
              )}
            </div>

            {/* OAuth connections */}
            <div className="bg-core-card border border-core-border rounded-xl p-5 mb-4 space-y-3">
              <p className="text-sm font-semibold text-core-text mb-1">Connect your accounts</p>
              <p className="text-xs text-core-text-muted mb-3">We'll use these to personalize your AI and automate your workflow.</p>

              {/* LinkedIn */}
              <button
                onClick={connectLinkedin}
                disabled={linkedinConnected}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  linkedinConnected
                    ? 'bg-core-green/5 border-core-green/30 text-core-green cursor-default'
                    : 'bg-[#0A66C2]/8 border-[#0A66C2]/20 text-[#e0e0e0] hover:border-[#0A66C2]/50 hover:bg-[#0A66C2]/12 cursor-pointer'
                }`}
              >
                {linkedinConnected ? (
                  <CheckCircle className="w-5 h-5 text-core-green" />
                ) : (
                  <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                )}
                <span className="flex-1 text-left">
                  {linkedinConnected ? `Connected — ${linkedinName}` : 'Connect LinkedIn'}
                </span>
                {linkedinConnected && <span className="text-xs text-core-green/60">Profile imported</span>}
              </button>

              {/* Google */}
              <button
                onClick={connectGoogle}
                disabled={googleConnected}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  googleConnected
                    ? 'bg-core-green/5 border-core-green/30 text-core-green cursor-default'
                    : 'bg-core-card border-core-border text-core-text-dim hover:border-core-border-hi cursor-pointer'
                }`}
              >
                {googleConnected ? (
                  <CheckCircle className="w-5 h-5 text-core-green" />
                ) : (
                  <Chrome className="w-5 h-5 text-core-text-muted" />
                )}
                <span className="flex-1 text-left">
                  {googleConnected ? `Connected — ${googleEmail}` : 'Connect Google'}
                </span>
                {googleConnected && <span className="text-xs text-core-green/60">Analytics + Calendar</span>}
              </button>
            </div>

            {/* Continue button */}
            <button
              onClick={() => {
                if (scanPhase === 'done') {
                  setStep(1)
                } else if (websiteUrl.trim() && scanPhase === 'idle') {
                  handleScan()
                } else {
                  setStep(1)
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all"
            >
              {scanPhase === 'done' || !websiteUrl.trim() ? 'Continue' : 'Scan & Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>

            {!websiteUrl.trim() && (
              <button
                onClick={() => setStep(1)}
                className="w-full mt-2 text-xs text-core-text-muted hover:text-core-text-dim transition-colors text-center py-2"
              >
                Skip for now — I'll add this later
              </button>
            )}

            {/* Provisioning status */}
            {provisioned && (
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-core-green/60">
                <CheckCircle className="w-3 h-3" />
                Account provisioned
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-core-text mb-2">Confirm your details</h1>
              <p className="text-sm text-core-text-muted">
                {brand ? 'We pulled this from your website. Adjust anything that needs it.' : 'Tell us about your business so your AI can get to work.'}
              </p>
            </div>

            {/* Brand color preview */}
            {primaryColor && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-core-card border border-core-border rounded-xl">
                <div className="w-8 h-8 rounded-lg border border-core-border" style={{ background: primaryColor }} />
                <div>
                  <p className="text-xs font-semibold text-core-text">Brand color detected</p>
                  <p className="text-xs text-core-text-muted font-mono">{primaryColor}</p>
                </div>
                <Palette className="w-4 h-4 text-core-text-muted ml-auto" />
              </div>
            )}

            {/* Editable fields */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-core-text-muted mb-1.5 uppercase tracking-wide">
                  <Building2 className="w-3 h-3" /> Business Name
                </label>
                <input
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Your Company"
                  className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-core-text-muted mb-1.5 uppercase tracking-wide">
                    <Briefcase className="w-3 h-3" /> Industry
                  </label>
                  <input
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. Marketing Agency"
                    className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-core-text-muted mb-1.5 uppercase tracking-wide">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    value={phoneNum}
                    onChange={e => setPhoneNum(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
                  />
                </div>
              </div>

              {tagline && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-core-text-muted mb-1.5 uppercase tracking-wide">
                    Tagline
                  </label>
                  <input
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-core-text-muted mb-1.5 uppercase tracking-wide">
                  Services
                </label>
                <textarea
                  value={services}
                  onChange={e => setServices(e.target.value)}
                  placeholder="SEO, Web Design, PPC, Social Media..."
                  rows={2}
                  className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors resize-none"
                />
              </div>
            </div>

            {/* Connection status summary */}
            <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-core-card border border-core-border rounded-xl text-xs">
              <div className="flex items-center gap-1.5">
                {linkedinConnected ? <CheckCircle className="w-3.5 h-3.5 text-core-green" /> : <Linkedin className="w-3.5 h-3.5 text-core-text-muted" />}
                <span className={linkedinConnected ? 'text-core-green' : 'text-core-text-muted'}>LinkedIn</span>
              </div>
              <div className="flex items-center gap-1.5">
                {googleConnected ? <CheckCircle className="w-3.5 h-3.5 text-core-green" /> : <Chrome className="w-3.5 h-3.5 text-core-text-muted" />}
                <span className={googleConnected ? 'text-core-green' : 'text-core-text-muted'}>Google</span>
              </div>
              <div className="flex items-center gap-1.5">
                {provisioned ? <CheckCircle className="w-3.5 h-3.5 text-core-green" /> : <Loader2 className="w-3.5 h-3.5 text-core-text-muted animate-spin" />}
                <span className={provisioned ? 'text-core-green' : 'text-core-text-muted'}>Account</span>
              </div>
              {brand && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-core-green" />
                  <span className="text-core-green">Brand</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-5 py-3 bg-transparent border border-core-border rounded-xl text-sm text-core-text-dim hover:border-core-border-hi transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleLaunch}
                disabled={saving || !businessName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Launch Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
