'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, FileJson, CheckCircle, AlertCircle, ArrowRight,
  Loader2, Copy, Check, Sparkles, Layers, Zap
} from 'lucide-react'

type ImportPhase = 'choose' | 'scan' | 'scan-results' | 'hsm' | 'instructions' | 'dropzone' | 'importing' | 'done' | 'error'

interface ScanData {
  business_name: string
  tagline: string
  description: string
  industry: string
  services: string[]
  target_audience: string
  contact_email: string
  contact_phone: string
  brand_colors: { primary: string; secondary: string; accent: string }
  logo_url: string
  social_links: Record<string, string>
  tone: string
  content_topics: string[]
  site_url: string
  pages_scanned: number
}

export default function ImportPage() {
  const [phase, setPhase] = useState<ImportPhase>('choose')
  const [instructions, setInstructions] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [error, setError] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanData, setScanData] = useState<ScanData | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleScanWebsite() {
    if (!websiteUrl.trim()) return
    setScanning(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/scan-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Scan failed')
        setScanning(false)
        return
      }

      setScanData(data.scan)
      setBusinessName(data.scan.business_name || '')
      setPhase('scan-results')
    } catch {
      setError('Could not scan website. Please check the URL.')
    } finally {
      setScanning(false)
    }
  }

  const [hsmCommand, setHsmCommand] = useState('')
  const [hsmLoading, setHsmLoading] = useState(false)
  const [hsmResult, setHsmResult] = useState<string | null>(null)
  const [userToken, setUserToken] = useState('')

  async function handleAcceptScan() {
    if (!scanData) return
    // Move to HSM — the magic moment
    setPhase('hsm')

    // Fetch their token for display
    try {
      const res = await fetch('/api/auth/token')
      if (res.ok) {
        const data = await res.json()
        setUserToken(data.token || '')
      }
    } catch {}

    // Pre-suggest a command based on their business
    if (scanData.services.length > 0) {
      setHsmCommand(`Write a blog post about ${scanData.services[0]} for ${scanData.target_audience || 'my audience'}`)
    } else if (scanData.business_name) {
      setHsmCommand(`Write a social media post introducing ${scanData.business_name}`)
    }
  }

  async function executeHSM() {
    if (!hsmCommand.trim()) return
    setHsmLoading(true)
    setHsmResult(null)

    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: hsmCommand }),
      })

      const data = await res.json()
      setHsmResult(data.output || data.message || data.content || JSON.stringify(data, null, 2))
    } catch {
      setHsmResult('Something went wrong — but your account is set up! Head to the dashboard to try again.')
    } finally {
      setHsmLoading(false)
    }
  }

  async function finishOnboarding() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', user.id)
    }
    router.push('/dashboard')
  }

  // Fetch instructions
  async function loadInstructions() {
    setPhase('instructions')
    try {
      const res = await fetch('/api/onboarding/instructions')
      const data = await res.json()
      setInstructions(data.instructions)
    } catch {
      setInstructions('Failed to load instructions. Please refresh and try again.')
    }
  }

  // Copy instructions
  function handleCopy() {
    navigator.clipboard.writeText(instructions)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // Handle file drop or paste
  const handleImport = useCallback(async (json: string) => {
    setPhase('importing')
    setError('')

    try {
      const parsed = JSON.parse(json)

      if (!parsed.schema) {
        setError('Invalid file — missing "schema" field. Make sure your AI generated the correct format.')
        setPhase('error')
        return
      }

      const res = await fetch('/api/onboarding/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Import failed')
        setPhase('error')
        return
      }

      setResults(data.results || [])
      setBusinessName(data.message || 'Account configured')
      setPhase('done')
    } catch (err) {
      setError('Invalid JSON. Make sure you copied the entire output from your AI.')
      setPhase('error')
    }
  }, [])

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      handleImport(text)
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-core-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">

        {/* ─── Choose Path ─── */}
        {phase === 'choose' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-core-green/20 to-core-cyan/20 border border-core-green/30 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-core-green" />
              </div>
              <h1 className="text-2xl font-bold text-core-text mb-2">Load 0nCore</h1>
              <p className="text-sm text-core-text-muted">Choose how you want to configure your account.</p>
            </div>

            <div className="space-y-3">
              {/* Option 0: Website Scan (PRIMARY) */}
              <button onClick={() => setPhase('scan')}
                className="w-full flex items-start gap-4 p-5 bg-gradient-to-r from-core-green/[0.06] to-core-cyan/[0.04] border border-core-green/30 rounded-xl hover:border-core-green/50 transition-all text-left group relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-core-green/15 text-core-green text-[10px] font-bold">
                  FASTEST
                </div>
                <div className="w-10 h-10 rounded-xl bg-core-green/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-core-green" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-core-text mb-1">Scan Your Website</div>
                  <p className="text-xs text-core-text-muted leading-relaxed">
                    Paste your URL and we'll auto-detect your branding, services, audience, and contacts. Everything pre-filled in 10 seconds.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-core-green mt-3 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 1: AI Bridge */}
              <button onClick={loadInstructions}
                className="w-full flex items-start gap-4 p-5 bg-core-card border border-core-border rounded-xl hover:border-core-green/30 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-core-green" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-core-text mb-1">Load from Any AI</div>
                  <p className="text-xs text-core-text-muted leading-relaxed">
                    Get instructions to paste into Claude, ChatGPT, Gemini, or any AI. It will ask about your business and generate a config file. Drop it back here.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-core-text-muted mt-3 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 2: Drop .0n file */}
              <button onClick={() => setPhase('dropzone')}
                className="w-full flex items-start gap-4 p-5 bg-core-card border border-core-border rounded-xl hover:border-core-cyan/30 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl bg-core-cyan/10 flex items-center justify-center shrink-0 mt-0.5">
                  <FileJson className="w-5 h-5 text-core-cyan" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-core-text mb-1">Import .0n File</div>
                  <p className="text-xs text-core-text-muted leading-relaxed">
                    Already have a .0n config file? Drop it here or paste the JSON directly.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-core-text-muted mt-3 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 3: Dashboard */}
              <button onClick={() => router.push('/dashboard/onboarding')}
                className="w-full flex items-start gap-4 p-5 bg-core-card border border-core-border rounded-xl hover:border-core-purple/30 transition-all text-left group">
                <div className="w-10 h-10 rounded-xl bg-core-purple/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Upload className="w-5 h-5 text-core-purple" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-core-text mb-1">Use the Dashboard</div>
                  <p className="text-xs text-core-text-muted leading-relaxed">
                    Connect LinkedIn + Google, scan your website, set up manually. The guided flow.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-core-text-muted mt-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Website Scan Input ─── */}
        {phase === 'scan' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-core-green/20 to-core-cyan/20 border border-core-green/30 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-core-green" />
              </div>
              <h1 className="text-2xl font-bold text-core-text mb-2">Scan Your Website</h1>
              <p className="text-sm text-core-text-muted">
                We'll auto-detect your branding, services, and contact info to pre-fill your account.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-core-text-dim font-semibold uppercase tracking-wider mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScanWebsite()}
                  placeholder="yourbusiness.com"
                  autoFocus
                  className="w-full px-4 py-3 bg-core-card border border-core-border rounded-xl text-core-text text-sm placeholder:text-core-text-muted outline-none focus:border-core-green/50 transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-core-red/8 border border-core-red/20 rounded-xl text-core-red text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleScanWebsite}
                disabled={scanning || !websiteUrl.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-core-green to-core-green/80 text-core-bg font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning {websiteUrl.replace(/^https?:\/\//, '').split('/')[0]}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Scan Website
                  </>
                )}
              </button>

              <button
                onClick={() => { setPhase('choose'); setError('') }}
                className="w-full py-2 text-core-text-muted text-xs hover:text-core-text transition-colors cursor-pointer bg-transparent border-none"
              >
                Back to options
              </button>

              <p className="text-center text-[11px] text-core-text-muted">
                Optional — you can always set this up manually later.
              </p>
            </div>
          </div>
        )}

        {/* ─── Scan Results ─── */}
        {phase === 'scan-results' && scanData && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-core-green/15 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-core-green" />
              </div>
              <h1 className="text-xl font-bold text-core-text mb-1">We found your business</h1>
              <p className="text-sm text-core-text-muted">
                {scanData.pages_scanned} pages scanned. Review what we detected:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Business name + industry */}
              <div className="p-4 bg-core-card border border-core-border rounded-xl">
                <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-1">Business</div>
                <div className="text-lg font-bold text-core-text">{scanData.business_name}</div>
                {scanData.industry && (
                  <div className="text-xs text-core-text-dim mt-0.5">{scanData.industry}</div>
                )}
                {scanData.tagline && (
                  <div className="text-sm text-core-text-dim mt-1 italic">&ldquo;{scanData.tagline}&rdquo;</div>
                )}
              </div>

              {/* Services */}
              {scanData.services.length > 0 && (
                <div className="p-4 bg-core-card border border-core-border rounded-xl">
                  <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-2">Services Detected</div>
                  <div className="flex flex-wrap gap-1.5">
                    {scanData.services.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-core-green/10 text-core-green text-xs font-medium border border-core-green/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand colors */}
              {scanData.brand_colors && (
                <div className="p-4 bg-core-card border border-core-border rounded-xl">
                  <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-2">Brand Colors</div>
                  <div className="flex gap-3">
                    {Object.entries(scanData.brand_colors).map(([name, color]) => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md border border-core-border" style={{ backgroundColor: color }} />
                        <div>
                          <div className="text-[11px] text-core-text capitalize">{name}</div>
                          <div className="text-[10px] text-core-text-muted font-mono">{color}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact + social */}
              <div className="grid grid-cols-2 gap-3">
                {scanData.contact_email && (
                  <div className="p-3 bg-core-card border border-core-border rounded-xl">
                    <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-1">Email</div>
                    <div className="text-xs text-core-text truncate">{scanData.contact_email}</div>
                  </div>
                )}
                {scanData.contact_phone && (
                  <div className="p-3 bg-core-card border border-core-border rounded-xl">
                    <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-1">Phone</div>
                    <div className="text-xs text-core-text">{scanData.contact_phone}</div>
                  </div>
                )}
              </div>

              {/* Audience + tone */}
              {(scanData.target_audience || scanData.tone) && (
                <div className="p-4 bg-core-card border border-core-border rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    {scanData.target_audience && (
                      <div>
                        <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-1">Target Audience</div>
                        <div className="text-xs text-core-text-dim">{scanData.target_audience}</div>
                      </div>
                    )}
                    {scanData.tone && (
                      <div>
                        <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-1">Writing Tone</div>
                        <div className="text-xs text-core-text-dim capitalize">{scanData.tone}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content topics */}
              {scanData.content_topics.length > 0 && (
                <div className="p-4 bg-core-card border border-core-border rounded-xl">
                  <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-2">Content Topics</div>
                  <div className="flex flex-wrap gap-1.5">
                    {scanData.content_topics.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-core-cyan/10 text-core-cyan text-[11px] border border-core-cyan/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleAcceptScan}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-core-green to-core-green/80 text-core-bg font-bold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Looks Good — Set Up My Account
              </button>

              <button
                onClick={() => setPhase('scan')}
                className="w-full py-2 text-core-text-muted text-xs hover:text-core-text transition-colors cursor-pointer bg-transparent border-none"
              >
                Scan a different URL
              </button>
            </div>
          </div>
        )}

        {/* ─── HSM — Holy Shit Moment ─── */}
        {phase === 'hsm' && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-core-green/15 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-core-green" />
              </div>
              <h1 className="text-xl font-bold text-core-text mb-1">Your account is ready</h1>
              <p className="text-sm text-core-text-muted">
                Try your first command — describe what you want and watch it happen live.
              </p>
            </div>

            {/* Token display */}
            {userToken && (
              <div className="p-3 bg-core-card border border-core-border rounded-xl mb-4">
                <div className="text-[10px] text-core-text-muted font-semibold uppercase tracking-wider mb-1">Your 0n Token</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-core-green font-mono bg-core-bg rounded-md px-2 py-1.5 truncate">
                    {userToken}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(userToken); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="btn btn-ghost btn-sm shrink-0"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[10px] text-core-text-muted mt-1.5">
                  Use this token in the Chrome extension, Slack, WordPress, or any 0n integration.
                </p>
              </div>
            )}

            {/* Command input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-core-text-dim font-semibold uppercase tracking-wider mb-2">
                  Describe what you want
                </label>
                <textarea
                  value={hsmCommand}
                  onChange={e => setHsmCommand(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); executeHSM() } }}
                  rows={2}
                  placeholder="Write a blog post about AI tools for small businesses..."
                  className="w-full px-4 py-3 bg-core-card border border-core-border rounded-xl text-core-text text-sm placeholder:text-core-text-muted outline-none focus:border-core-green/50 transition-colors resize-none"
                />
              </div>

              {/* Suggestion pills */}
              {!hsmResult && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    scanData?.services?.[0] ? `Write a blog about ${scanData.services[0]}` : 'Write a blog post for my business',
                    'Show my CRM contacts',
                    'Check my Stripe balance',
                    `Create a social post for ${scanData?.business_name || 'my company'}`,
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setHsmCommand(s)}
                      className="px-2.5 py-1 rounded-md bg-core-card border border-core-border text-[11px] text-core-text-muted hover:text-core-text hover:border-core-green/30 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={executeHSM}
                disabled={hsmLoading || !hsmCommand.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-core-green to-core-green/80 text-core-bg font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {hsmLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Run It
                  </>
                )}
              </button>

              {/* Result */}
              {hsmResult && (
                <div className="p-4 bg-core-card border border-core-green/20 rounded-xl">
                  <div className="text-[10px] text-core-green font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Result
                  </div>
                  <div className="text-sm text-core-text-dim leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {hsmResult}
                  </div>
                </div>
              )}

              <button
                onClick={finishOnboarding}
                className={[
                  'w-full py-3 rounded-xl font-bold text-sm transition-opacity flex items-center justify-center gap-2',
                  hsmResult
                    ? 'bg-gradient-to-r from-core-cyan to-core-cyan/80 text-core-bg hover:opacity-90'
                    : 'bg-transparent border border-core-border text-core-text-muted hover:text-core-text',
                ].join(' ')}
              >
                <ArrowRight className="w-4 h-4" />
                {hsmResult ? 'Go to Dashboard' : 'Skip — go to Dashboard'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Instructions ─── */}
        {phase === 'instructions' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-core-text mb-2">Copy these instructions</h1>
              <p className="text-sm text-core-text-muted">Paste this into any AI. It will ask about your business and generate your config file.</p>
            </div>

            {instructions ? (
              <>
                <div className="bg-core-card border border-core-border rounded-xl overflow-hidden mb-4">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-core-border bg-core-bg/50">
                    <span className="text-xs font-semibold text-core-text-muted">0nCore Setup Instructions</span>
                    <button onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-core-green/10 text-core-green border border-core-green/20 hover:bg-core-green/20 transition-colors">
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy All'}
                    </button>
                  </div>
                  <pre className="p-4 text-xs text-core-text-dim leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap font-mono">{instructions}</pre>
                </div>

                <div className="bg-core-cyan/5 border border-core-cyan/20 rounded-xl p-4 mb-4">
                  <p className="text-xs text-core-cyan font-semibold mb-1">Next step</p>
                  <p className="text-xs text-core-text-dim">After your AI generates the JSON, come back and click "Import .0n File" below to drop it in.</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setPhase('choose')} className="px-4 py-3 text-sm text-core-text-muted hover:text-core-text-dim transition-colors">Back</button>
                  <button onClick={() => setPhase('dropzone')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all">
                    I have my file — Import
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-core-green animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* ─── Drop Zone ─── */}
        {phase === 'dropzone' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-core-text mb-2">Import your .0n file</h1>
              <p className="text-sm text-core-text-muted">Drop a file, upload, or paste the JSON directly.</p>
            </div>

            {/* File drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed cursor-pointer transition-all mb-4 ${
                dragOver ? 'border-core-green bg-core-green/5' : 'border-core-border bg-core-card hover:border-core-green/30'
              }`}
            >
              <input ref={fileRef} type="file" accept=".json,.0n" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="hidden" />
              <Upload className={`w-8 h-8 mb-3 ${dragOver ? 'text-core-green' : 'text-core-text-muted'}`} />
              <p className="text-sm font-semibold text-core-text mb-1">Drop .0n file here</p>
              <p className="text-xs text-core-text-muted">or click to browse</p>
            </div>

            {/* Paste JSON */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-1.5 block">Or paste JSON</label>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder='{"schema": "0n-config/v1", ...}'
                rows={6}
                className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-3 text-xs text-core-text font-mono focus:outline-none focus:border-core-green transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPhase('choose')} className="px-4 py-3 text-sm text-core-text-muted hover:text-core-text-dim transition-colors">Back</button>
              <button
                onClick={() => jsonInput.trim() && handleImport(jsonInput.trim())}
                disabled={!jsonInput.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                Import Config
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Importing ─── */}
        {phase === 'importing' && (
          <div className="animate-fade-in text-center py-12">
            <Loader2 className="w-10 h-10 text-core-green animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-core-text mb-2">Configuring your account...</h2>
            <p className="text-sm text-core-text-muted">Loading K-layers, setting up AI, provisioning services.</p>
          </div>
        )}

        {/* ─── Done ─── */}
        {phase === 'done' && (
          <div className="animate-fade-in text-center py-8">
            <div className="w-20 h-20 rounded-2xl bg-core-green shadow-[0_0_40px_rgba(110,224,90,0.3)] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-core-bg" />
            </div>
            <h1 className="text-2xl font-bold text-core-text mb-2">You're configured.</h1>
            <p className="text-sm text-core-text-muted mb-6">{businessName}</p>

            <div className="space-y-1.5 max-w-xs mx-auto text-left mb-8">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-core-green shrink-0" />
                  <span className="text-core-text-dim">{r}</span>
                </div>
              ))}
            </div>

            <button onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 mx-auto px-8 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all">
              Launch Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Error ─── */}
        {phase === 'error' && (
          <div className="animate-fade-in text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-core-red/20 border border-core-red/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-core-red" />
            </div>
            <h2 className="text-lg font-bold text-core-text mb-2">Import Failed</h2>
            <p className="text-sm text-core-red mb-6">{error}</p>
            <button onClick={() => setPhase('dropzone')}
              className="px-6 py-3 bg-core-card border border-core-border rounded-xl text-sm text-core-text-dim hover:text-core-text transition-colors">
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
