'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Loader2, Layout, Eye, Rocket, ChevronRight, Check,
  ArrowLeft, ExternalLink, Copy, Download,
} from 'lucide-react'

type Step = 'theme' | 'brand' | 'preview' | 'deployed'

interface Theme {
  id: string
  name: string
  description: string
  source: string
  fonts: { heading: string; body: string }
  section_count: number
  primary_color: string
}

const VOICE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'bold', label: 'Bold & confident' },
  { value: 'vibe', label: 'Casual / vibe' },
  { value: 'technical', label: 'Technical / dev' },
  { value: 'authority', label: 'Authority / expert' },
  { value: 'contrarian', label: 'Contrarian' },
]

export default function LandingPagesPage() {
  const [step, setStep] = useState<Step>('theme')
  const [themes, setThemes] = useState<Theme[]>([])
  const [themesLoading, setThemesLoading] = useState(true)
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [brand, setBrand] = useState({
    brand_name: '',
    tagline: '',
    voice: 'professional',
    icp_description: '',
    value_prop: '',
    keywords: '',
  })
  const [generating, setGenerating] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<unknown>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [deployment, setDeployment] = useState<{ url: string; deployment_id: string } | null>(null)

  useEffect(() => {
    fetch('/api/landing-pages/themes')
      .then(r => r.json())
      .then(d => setThemes(d.themes || []))
      .finally(() => setThemesLoading(false))
  }, [])

  async function handleGenerate() {
    if (!selectedTheme) return
    setGenerating(true)
    setGenerationError(null)
    try {
      const res = await fetch('/api/landing-pages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_id: selectedTheme.id,
          k_layer: {
            ...brand,
            keywords: brand.keywords.split(',').map(s => s.trim()).filter(Boolean),
          },
          include_html: true,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGeneratedHtml(data.html)
      setGeneratedContent(data.generated)
      setStep('preview')
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRegenerate() {
    setStep('brand')
    setGeneratedHtml(null)
  }

  async function handleDeploy() {
    if (!generatedHtml || !selectedTheme) return
    setDeploying(true)
    try {
      const res = await fetch('/api/landing-pages/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: generatedHtml,
          name: brand.brand_name || `landing-${selectedTheme.id}`,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDeployment({ url: data.url, deployment_id: data.deployment_id })
      setStep('deployed')
    } finally {
      setDeploying(false)
    }
  }

  function handleDownload() {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${brand.brand_name || 'landing'}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Header step={step} />

        {step === 'theme' && (
          <ThemeStep
            themes={themes}
            loading={themesLoading}
            selected={selectedTheme}
            onSelect={(t) => { setSelectedTheme(t); setStep('brand') }}
          />
        )}

        {step === 'brand' && selectedTheme && (
          <BrandStep
            theme={selectedTheme}
            brand={brand}
            setBrand={setBrand}
            onBack={() => setStep('theme')}
            onGenerate={handleGenerate}
            generating={generating}
            error={generationError}
          />
        )}

        {step === 'preview' && selectedTheme && generatedHtml && (
          <PreviewStep
            theme={selectedTheme}
            html={generatedHtml}
            brand={brand.brand_name}
            onBack={handleRegenerate}
            onDeploy={handleDeploy}
            onDownload={handleDownload}
            deploying={deploying}
          />
        )}

        {step === 'deployed' && deployment && (
          <DeployedStep
            url={deployment.url}
            onCreateAnother={() => {
              setStep('theme')
              setSelectedTheme(null)
              setBrand({ brand_name: '', tagline: '', voice: 'professional', icp_description: '', value_prop: '', keywords: '' })
              setGeneratedHtml(null)
              setDeployment(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

function Header({ step }: { step: Step }) {
  const steps: { key: Step; label: string; icon: typeof Layout }[] = [
    { key: 'theme', label: 'Pick a theme', icon: Layout },
    { key: 'brand', label: 'Describe your brand', icon: Sparkles },
    { key: 'preview', label: 'Preview & tune', icon: Eye },
    { key: 'deployed', label: 'Live', icon: Rocket },
  ]
  const currentIdx = steps.findIndex(s => s.key === step)

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-7 w-7 text-[#7ed957]" />
        <h1 className="text-3xl font-bold">Landing Pages</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#7ed957]/15 text-[#7ed957] border border-[#7ed957]/30 uppercase tracking-wider">
          Add-on
        </span>
      </div>
      <p className="text-white/60 mb-6">
        Pick a shadcn theme, describe your brand, and we&apos;ll generate a deployable landing page in seconds.
        Powered by 0nMCP.
      </p>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isActive = i === currentIdx
          const isDone = i < currentIdx
          return (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
                isActive
                  ? 'bg-[#7ed957]/15 border-[#7ed957]/40 text-[#7ed957]'
                  : isDone
                    ? 'bg-white/[0.04] border-white/[0.08] text-white/70'
                    : 'bg-white/[0.02] border-white/[0.04] text-white/30'
              }`}>
                {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                <span>{s.label}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-white/20" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ThemeStep({ themes, loading, selected, onSelect }: { themes: Theme[]; loading: boolean; selected: Theme | null; onSelect: (t: Theme) => void }) {
  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
  }
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Choose a starting theme</h2>
      <p className="text-sm text-white/50 mb-6">From the official shadcn theme set. You can customize after.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`text-left bg-white/[0.02] border rounded-xl p-5 transition group ${
              selected?.id === t.id
                ? 'border-[#7ed957]/60 ring-2 ring-[#7ed957]/20'
                : 'border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-lg shrink-0 border border-white/[0.1]"
                style={{ background: t.primary_color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-0.5">{t.name}</div>
                <div className="text-xs text-white/40 truncate">{t.fonts.heading} · {t.fonts.body}</div>
              </div>
            </div>
            <p className="text-sm text-white/60 mb-3 line-clamp-2 min-h-[2.5rem]">{t.description}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">{t.section_count} sections</span>
              <span className="text-[#7ed957] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                Pick <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function BrandStep({ theme, brand, setBrand, onBack, onGenerate, generating, error }: {
  theme: Theme
  brand: { brand_name: string; tagline: string; voice: string; icp_description: string; value_prop: string; keywords: string }
  setBrand: (b: typeof brand) => void
  onBack: () => void
  onGenerate: () => void
  generating: boolean
  error: string | null
}) {
  const canGenerate = brand.brand_name.trim().length > 0 && brand.value_prop.trim().length > 0

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to themes
      </button>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Tell us about your brand</h2>
            <p className="text-sm text-white/50 mb-5">The AI uses these as your K-Layer to write copy that sounds like you.</p>
          </div>

          <Field label="Brand name" required>
            <input
              value={brand.brand_name}
              onChange={e => setBrand({ ...brand, brand_name: e.target.value })}
              placeholder="e.g. RocketPost"
              className="input-base"
            />
          </Field>

          <Field label="Tagline (optional)">
            <input
              value={brand.tagline}
              onChange={e => setBrand({ ...brand, tagline: e.target.value })}
              placeholder="One short line that captures it"
              className="input-base"
            />
          </Field>

          <Field label="Value proposition" required help="One sentence: what problem do you solve?">
            <textarea
              value={brand.value_prop}
              onChange={e => setBrand({ ...brand, value_prop: e.target.value })}
              placeholder="e.g. AI-powered conversion optimization in one embed script"
              rows={2}
              className="input-base resize-none"
            />
          </Field>

          <Field label="Who is it for?" help="Your ideal customer in one sentence.">
            <textarea
              value={brand.icp_description}
              onChange={e => setBrand({ ...brand, icp_description: e.target.value })}
              placeholder="e.g. SaaS founders running their own marketing without a team"
              rows={2}
              className="input-base resize-none"
            />
          </Field>

          <Field label="Voice">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {VOICE_OPTIONS.map(v => (
                <button
                  key={v.value}
                  onClick={() => setBrand({ ...brand, voice: v.value })}
                  className={`px-3 py-2 rounded-lg text-sm border transition ${
                    brand.voice === v.value
                      ? 'bg-[#7ed957]/15 border-[#7ed957]/40 text-[#7ed957]'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Keywords (comma-separated)">
            <input
              value={brand.keywords}
              onChange={e => setBrand({ ...brand, keywords: e.target.value })}
              placeholder="conversion, ai, automation, saas"
              className="input-base"
            />
          </Field>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">{error}</div>
          )}

          <button
            onClick={onGenerate}
            disabled={!canGenerate || generating}
            className="w-full bg-[#7ed957] hover:bg-[#6bc847] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold rounded-lg py-3.5 inline-flex items-center justify-center gap-2 transition"
          >
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating with Groq…</> : <><Sparkles className="h-4 w-4" /> Generate landing page</>}
          </button>
        </div>

        <aside className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 h-fit sticky top-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Selected theme</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg border border-white/[0.1]" style={{ background: theme.primary_color }} />
            <div>
              <div className="font-semibold">{theme.name}</div>
              <div className="text-xs text-white/40">{theme.fonts.heading}</div>
            </div>
          </div>
          <p className="text-xs text-white/50 mb-4">{theme.description}</p>
          <div className="text-xs text-white/40">
            {theme.section_count} sections will be generated:
            <br/>hero · features · pricing · CTA · footer + more
          </div>
        </aside>
      </div>

      <style jsx>{`
        .input-base { width: 100%; padding: 0.625rem 0.875rem; border-radius: 0.625rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 0.875rem; outline: none; transition: border-color 0.15s; }
        .input-base:focus { border-color: rgba(126, 217, 87, 0.4); }
        .input-base::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}

function Field({ label, required, help, children }: { label: string; required?: boolean; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {help && <p className="text-[11px] text-white/35 mt-1">{help}</p>}
    </div>
  )
}

function PreviewStep({ theme, html, brand, onBack, onDeploy, onDownload, deploying }: {
  theme: Theme
  html: string
  brand: string
  onBack: () => void
  onDeploy: () => void
  onDownload: () => void
  deploying: boolean
}) {
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-4">
        <ArrowLeft className="h-4 w-4" /> Edit brand details
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Preview</h2>
          <p className="text-sm text-white/50">{theme.name} theme · {(html.length / 1024).toFixed(1)} KB</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onDownload} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm font-medium transition">
            <Download className="h-4 w-4" /> Download HTML
          </button>
          <button
            onClick={onDeploy}
            disabled={deploying}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#7ed957] hover:bg-[#6bc847] disabled:opacity-50 text-black font-bold text-sm transition"
          >
            {deploying ? <><Loader2 className="h-4 w-4 animate-spin" /> Deploying…</> : <><Rocket className="h-4 w-4" /> Deploy live</>}
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-2 text-xs text-white/50">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          <span className="ml-2 truncate">{brand || 'preview'}.0ncore.com (preview)</span>
        </div>
        <iframe
          srcDoc={html}
          className="w-full bg-white"
          style={{ height: '70vh', border: 0 }}
          sandbox="allow-same-origin"
          title="Landing page preview"
        />
      </div>
    </div>
  )
}

function DeployedStep({ url, onCreateAnother }: { url: string; onCreateAnother: () => void }) {
  function copy() { navigator.clipboard.writeText(url) }
  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[#7ed957]/15 border border-[#7ed957]/30 mb-6">
        <Rocket className="h-8 w-8 text-[#7ed957]" />
      </div>
      <h2 className="text-3xl font-bold mb-3">It&apos;s live.</h2>
      <p className="text-white/60 mb-8">Your landing page is deployed and reachable. Share the link, or attach a custom domain.</p>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mb-6 flex items-center gap-3">
        <code className="flex-1 text-left text-sm font-mono text-[#7ed957] truncate">{url}</code>
        <button onClick={copy} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition">
          <Copy className="h-4 w-4" />
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[#7ed957] hover:bg-[#6bc847] text-black transition">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="flex gap-3 justify-center">
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7ed957] hover:bg-[#6bc847] text-black font-bold text-sm transition">
          <ExternalLink className="h-4 w-4" /> Visit page
        </a>
        <button onClick={onCreateAnother} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm font-medium transition">
          <Sparkles className="h-4 w-4" /> Create another
        </button>
      </div>
    </div>
  )
}
