'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Globe, Linkedin, CheckCircle, ArrowRight, Loader2,
  Building2, Palette, Briefcase, Sparkles,
  Phone, Rocket, SkipForward
} from 'lucide-react'

/* ─── Types ─── */
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

/* ─── Constants ─── */
const STEPS = [
  { label: 'Connect', desc: 'Link your accounts' },
  { label: 'Scan', desc: 'Analyze your brand' },
  { label: 'Review', desc: 'Confirm details' },
  { label: 'Launch', desc: 'You are ready' },
]

const SCAN_MESSAGES = [
  'Connecting to website...',
  'Reading page content...',
  'Analyzing brand identity...',
  'Extracting company info...',
  'Identifying services...',
  'Detecting brand colors...',
  'Building your profile...',
]

/* ─── Step transition wrapper ─── */
function StepPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setMounted(true)
      // Small delay for enter animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 400)
      return () => clearTimeout(t)
    }
  }, [active])

  if (!mounted) return null

  return (
    <div
      className={`transition-all duration-400 ease-out ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  )
}

/* ─── Main Component ─── */
export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [scanMsg, setScanMsg] = useState('')
  const [scanProgress, setScanProgress] = useState(0)
  const [brand, setBrand] = useState<BrandData | null>(null)
  const [scanError, setScanError] = useState('')

  // Editable fields
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [services, setServices] = useState('')
  const [tagline, setTagline] = useState('')
  const [phoneNum, setPhoneNum] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')

  // OAuth
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [linkedinName, setLinkedinName] = useState('')
  const [checkingOAuth, setCheckingOAuth] = useState(true)

  // State
  const [provisioned, setProvisioned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [launchReady, setLaunchReady] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Init — check existing state
  useEffect(() => {
    async function init() {
      const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
      if (!user) return

      const meta = user.user_metadata || {}
      const provider = user.app_metadata?.provider

      if (provider === 'linkedin_oidc') {
        setLinkedinConnected(true)
        setLinkedinName(meta.full_name || meta.name || '')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, crm_location_id, provisioned_at')
        .eq('id', user.id)
        .single()

      if (profile?.business_name) setBusinessName(profile.business_name)
      if (profile?.provisioned_at) setProvisioned(true)

      // Auto-provision
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
    setScanProgress(0)

    let msgIdx = 0
    setScanMsg(SCAN_MESSAGES[0])
    scanIntervalRef.current = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, SCAN_MESSAGES.length - 1)
      setScanMsg(SCAN_MESSAGES[msgIdx])
      setScanProgress(prev => Math.min(prev + 12, 85))
    }, 1500)

    try {
      let url = websiteUrl.trim()
      if (!url.startsWith('http')) url = `https://${url}`

      const res = await fetch('/api/brand/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      setScanProgress(100)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Scan failed' }))
        setScanError(err.error || 'Could not analyze website')
        setScanPhase('error')
        return
      }

      const { brand: b } = await res.json()
      setBrand(b)

      if (b.name) setBusinessName(b.name)
      if (b.industry) setIndustry(b.industry)
      if (b.tagline) setTagline(b.tagline)
      if (b.phone) setPhoneNum(b.phone)
      if (b.primary_color) setPrimaryColor(b.primary_color)
      if (b.services?.length) {
        setServices(b.services.map((s: { name: string }) => s.name).join(', '))
      }

      setScanPhase('done')

      // Auto-advance to review
      setTimeout(() => setStep(2), 1500)
    } catch {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      setScanError('Network error — check the URL and try again')
      setScanPhase('error')
    }
  }, [websiteUrl])

  // OAuth
  function connectLinkedin() {
    supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/onboarding` },
    })
  }

  // Complete
  async function handleLaunch() {
    setSaving(true)
    const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
    if (!user) { setSaving(false); return }

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

    await supabase.from('profiles').update({
      business_name: businessName,
      onboarding_complete: true,
    }).eq('id', user.id)

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

    await supabase.from('kb_content_queue').upsert({
      user_id: user.id,
      layer: 'K1',
      content: { business_name: businessName, industry, services, phone: phoneNum, website: websiteUrl, tagline },
      status: 'active',
    }, { onConflict: 'user_id,layer' })

    await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, industry, services, phone: phoneNum, website: websiteUrl }),
    }).catch(() => {})

    // Brief pause to show the success state
    setLaunchReady(true)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  // Skip handler
  function handleSkip() {
    if (step < 2) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  // Computed
  const progress = step === 3 && launchReady ? 100 : (step / (STEPS.length - 1)) * 100

  if (checkingOAuth) {
    return (
      <div className="min-h-screen bg-core-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-core-green animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-core-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* ─── Progress bar ─── */}
        <div className="mb-3">
          <div className="h-1 bg-core-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-core-green to-core-cyan rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ─── Step indicators ─── */}
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-500 ${
                i < step ? 'bg-core-green text-core-bg scale-90' :
                i === step ? 'bg-core-green text-core-bg scale-110 shadow-[0_0_12px_rgba(110,224,90,0.3)]' :
                'bg-core-border text-core-text-muted'
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block transition-colors duration-300 ${
                i <= step ? 'text-core-text' : 'text-core-text-muted'
              }`}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 lg:w-16 h-px mx-1 transition-colors duration-500 ${
                  i < step ? 'bg-core-green' : 'bg-core-border'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ─── STEP 0: Connect ─── */}
        <StepPanel active={step === 0}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-core-text mb-2">Welcome to 0nCore</h1>
            <p className="text-sm text-core-text-muted">Connect your accounts to get started. We'll set up everything automatically.</p>
          </div>

          <div className="space-y-3 mb-6">
            {/* LinkedIn */}
            <button
              onClick={connectLinkedin}
              disabled={linkedinConnected}
              className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                linkedinConnected
                  ? 'bg-core-green/5 border-core-green/30 text-core-green'
                  : 'bg-[#0A66C2]/8 border-[#0A66C2]/20 text-core-text hover:border-[#0A66C2]/50 hover:bg-[#0A66C2]/12 cursor-pointer'
              }`}
            >
              {linkedinConnected
                ? <CheckCircle className="w-5 h-5 text-core-green" />
                : <Linkedin className="w-5 h-5 text-[#0A66C2]" />
              }
              <span className="flex-1 text-left">
                {linkedinConnected ? `Connected — ${linkedinName}` : 'Connect with LinkedIn'}
              </span>
              {!linkedinConnected && <ArrowRight className="w-4 h-4 text-core-text-muted group-hover:translate-x-0.5 transition-transform" />}
              {linkedinConnected && <span className="text-xs text-core-green/60">Profile imported</span>}
            </button>

          </div>

          {/* Provisioning tick */}
          {provisioned && (
            <div className="flex items-center gap-2 mb-6 text-xs text-core-green/50">
              <CheckCircle className="w-3 h-3" />
              Account provisioned automatically
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="px-4 py-3 text-sm text-core-text-muted hover:text-core-text-dim transition-colors flex items-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
            <button
              onClick={() => setStep(1)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </StepPanel>

        {/* ─── STEP 1: Scan ─── */}
        <StepPanel active={step === 1}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-core-text mb-2">Scan your website</h1>
            <p className="text-sm text-core-text-muted">Enter your URL and our AI will extract your brand, services, and company details automatically.</p>
          </div>

          <div className="bg-core-card border border-core-border rounded-xl p-5 mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-core-text mb-3">
              <Globe className="w-4 h-4 text-core-cyan" />
              Website URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && scanPhase === 'idle' && handleScan()}
                placeholder="yourcompany.com"
                disabled={scanPhase === 'scanning'}
                className="flex-1 bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-cyan transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleScan}
                disabled={!websiteUrl.trim() || scanPhase === 'scanning'}
                className="flex items-center gap-2 px-5 py-2.5 bg-core-cyan text-core-bg font-semibold text-sm rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanPhase === 'scanning' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : scanPhase === 'done' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {scanPhase === 'scanning' ? 'Scanning...' : scanPhase === 'done' ? 'Done' : 'Scan'}
              </button>
            </div>

            {/* Scan progress */}
            {scanPhase === 'scanning' && (
              <div className="mt-4 space-y-2">
                <div className="h-1.5 bg-core-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-core-cyan to-core-green rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-core-cyan">
                  <div className="w-1.5 h-1.5 rounded-full bg-core-cyan animate-pulse" />
                  {scanMsg}
                </div>
              </div>
            )}

            {/* Scan result preview */}
            {scanPhase === 'done' && brand && (
              <div className="mt-4 p-3 bg-core-green/5 border border-core-green/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-core-green" />
                  <span className="text-sm font-semibold text-core-green">Brand detected</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {brand.name && <span className="px-2 py-1 bg-core-card rounded-md text-core-text">{brand.name}</span>}
                  {brand.industry && <span className="px-2 py-1 bg-core-card rounded-md text-core-text-dim">{brand.industry}</span>}
                  {brand.services?.length > 0 && <span className="px-2 py-1 bg-core-card rounded-md text-core-text-dim">{brand.services.length} services</span>}
                  {brand.primary_color && (
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-core-card rounded-md text-core-text-dim">
                      <span className="w-3 h-3 rounded-full border border-core-border" style={{ background: brand.primary_color }} />
                      {brand.primary_color}
                    </span>
                  )}
                </div>
              </div>
            )}

            {scanPhase === 'error' && (
              <p className="mt-3 text-xs text-core-red">{scanError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-4 py-3 text-sm text-core-text-muted hover:text-core-text-dim transition-colors">
              Back
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-3 text-sm text-core-text-muted hover:text-core-text-dim transition-colors flex items-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
            <button
              onClick={() => scanPhase === 'idle' && websiteUrl.trim() ? handleScan() : setStep(2)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all"
            >
              {scanPhase === 'done' ? 'Review Results' : websiteUrl.trim() && scanPhase === 'idle' ? 'Scan & Continue' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </StepPanel>

        {/* ─── STEP 2: Review ─── */}
        <StepPanel active={step === 2}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-core-text mb-2">Confirm your details</h1>
            <p className="text-sm text-core-text-muted">
              {brand ? 'We pulled this from your website. Adjust anything that needs it.' : 'Tell us a bit about your business.'}
            </p>
          </div>

          {/* Brand color swatch */}
          {primaryColor && (
            <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-core-card border border-core-border rounded-xl">
              <div className="w-8 h-8 rounded-lg border border-core-border" style={{ background: primaryColor }} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-core-text">Brand color</p>
                <p className="text-xs text-core-text-muted font-mono">{primaryColor}</p>
              </div>
              <Palette className="w-4 h-4 text-core-text-muted" />
            </div>
          )}

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
                <label className="text-xs font-semibold text-core-text-muted mb-1.5 uppercase tracking-wide block">Tagline</label>
                <input
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-core-text-muted mb-1.5 uppercase tracking-wide block">Services</label>
              <textarea
                value={services}
                onChange={e => setServices(e.target.value)}
                placeholder="SEO, Web Design, PPC, Social Media..."
                rows={2}
                className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text focus:outline-none focus:border-core-green transition-colors resize-none"
              />
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-4 mb-6 px-4 py-2.5 bg-core-card border border-core-border rounded-xl text-xs">
            <StatusChip connected={linkedinConnected} label="LinkedIn" />
            <StatusChip connected={provisioned} label="Account" />
            {brand && <StatusChip connected label="Brand" />}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-3 text-sm text-core-text-muted hover:text-core-text-dim transition-colors">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!businessName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </StepPanel>

        {/* ─── STEP 3: Launch ─── */}
        <StepPanel active={step === 3}>
          <div className="text-center py-6">
            <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all duration-700 ${
              launchReady
                ? 'bg-core-green shadow-[0_0_40px_rgba(110,224,90,0.3)] scale-110'
                : 'bg-gradient-to-br from-core-green/20 to-core-cyan/20 border border-core-green/30'
            }`}>
              {launchReady
                ? <CheckCircle className="w-10 h-10 text-core-bg" />
                : <Rocket className="w-10 h-10 text-core-green" />
              }
            </div>

            <h1 className="text-2xl font-bold text-core-text mb-2">
              {launchReady ? 'You\'re all set!' : 'Ready to launch?'}
            </h1>
            <p className="text-sm text-core-text-muted mb-2">
              {launchReady
                ? 'Redirecting to your dashboard...'
                : businessName
                  ? `${businessName} is configured and your AI is trained.`
                  : 'Your account is set up and ready to go.'
              }
            </p>

            {/* Summary */}
            {!launchReady && (
              <div className="mt-6 space-y-2 max-w-xs mx-auto text-left">
                {businessName && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-core-green shrink-0" />
                    <span className="text-core-text">{businessName}</span>
                    {industry && <span className="text-core-text-muted">({industry})</span>}
                  </div>
                )}
                {linkedinConnected && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-core-green shrink-0" />
                    <span className="text-core-text-dim">LinkedIn connected</span>
                  </div>
                )}
                {brand && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-core-green shrink-0" />
                    <span className="text-core-text-dim">Brand scanned</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-core-green shrink-0" />
                  <span className="text-core-text-dim">AI knowledge base seeded</span>
                </div>
              </div>
            )}
          </div>

          {!launchReady && (
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(2)} className="px-4 py-3 text-sm text-core-text-muted hover:text-core-text-dim transition-colors">
                Back
              </button>
              <button
                onClick={handleLaunch}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Launch Dashboard
                  </>
                )}
              </button>
            </div>
          )}
        </StepPanel>

      </div>
    </div>
  )
}

/* ─── Small components ─── */
function StatusChip({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {connected
        ? <CheckCircle className="w-3.5 h-3.5 text-core-green" />
        : <div className="w-3.5 h-3.5 rounded-full border border-core-border" />
      }
      <span className={connected ? 'text-core-green' : 'text-core-text-muted'}>{label}</span>
    </div>
  )
}
