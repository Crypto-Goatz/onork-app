'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, FileJson, CheckCircle, AlertCircle, ArrowRight,
  Loader2, Copy, Check, Sparkles, Layers
} from 'lucide-react'

type ImportPhase = 'choose' | 'instructions' | 'dropzone' | 'importing' | 'done' | 'error'

export default function ImportPage() {
  const [phase, setPhase] = useState<ImportPhase>('choose')
  const [instructions, setInstructions] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [error, setError] = useState('')
  const [businessName, setBusinessName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

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
