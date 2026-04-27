'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SAMPLE_APP = `{
  "format": "0n-app",
  "version": "1.0.0",
  "id": "my-app",
  "name": "My App",
  "slug": "my-app",
  "description": "Short description (one line).",
  "category": "automation",
  "tags": ["productivity"],
  "required_services": [],
  "required_plan": "starter",
  "trigger": { "type": "manual" },
  "steps": [
    { "id": "log_1", "name": "Say hello", "type": "log", "inputs": { "message": "Hello {{trigger.name}}" } }
  ]
}`

export default function PublishAppPage() {
  const [appJson, setAppJson] = useState(SAMPLE_APP)
  const [longDescription, setLongDescription] = useState('')
  const [priceCents, setPriceCents] = useState(0)
  const [priceType, setPriceType] = useState<'one_time' | 'recurring'>('one_time')
  const [demoUrl, setDemoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; appId?: string } | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result
      if (typeof text === 'string') setAppJson(text)
    }
    reader.readAsText(file)
  }

  async function publish() {
    setSubmitting(true)
    setResult(null)

    try {
      let parsed: unknown
      try { parsed = JSON.parse(appJson) } catch (err) {
        setResult({ ok: false, message: `Invalid JSON: ${(err as Error).message}` })
        setSubmitting(false)
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setResult({ ok: false, message: 'Please sign in to publish' })
        setSubmitting(false)
        return
      }

      const res = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          user_id: user.id,
          app_config: parsed,
          metadata: { long_description: longDescription },
          demo_url: demoUrl || undefined,
          price_cents: priceCents,
          price_type: priceType,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const detail = Array.isArray(data.details) ? data.details.join(', ') : ''
        setResult({ ok: false, message: `${data.error}${detail ? ` (${detail})` : ''}` })
      } else {
        setResult({
          ok: true,
          message: data.status === 'active' ? 'Published live to marketplace.' : 'Submitted for review.',
          appId: data.app?.id,
        })
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Publish failed' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition">
          <ArrowLeft className="h-4 w-4" /> Marketplace
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Publish an App</h1>
          <p className="text-white/60">Upload a .0n manifest, set pricing, ship it. 70% revenue share.</p>
        </div>

        <div className="space-y-5">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> .0n Manifest</label>
              <label className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs cursor-pointer transition flex items-center gap-2">
                <Upload className="h-3 w-3" /> Upload .0n file
                <input type="file" accept=".0n,.json" onChange={handleFile} className="hidden" />
              </label>
            </div>
            <textarea
              value={appJson}
              onChange={e => setAppJson(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.06] rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-[#7ed957]/50"
              rows={20}
              spellCheck={false}
            />
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <label className="font-semibold mb-2 block">Long Description</label>
            <textarea
              value={longDescription}
              onChange={e => setLongDescription(e.target.value)}
              placeholder="Detailed description shown on the app detail page. Markdown supported."
              className="w-full bg-black/40 border border-white/[0.06] rounded-lg p-3 text-sm focus:outline-none focus:border-[#7ed957]/50"
              rows={5}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <label className="font-semibold mb-2 block">Price (USD)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={priceCents / 100}
                  onChange={e => setPriceCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                  min="0"
                  step="0.01"
                  className="flex-1 bg-black/40 border border-white/[0.06] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#7ed957]/50"
                />
                <select
                  value={priceType}
                  onChange={e => setPriceType(e.target.value as 'one_time' | 'recurring')}
                  className="bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7ed957]/50"
                >
                  <option value="one_time">One-time</option>
                  <option value="recurring">Monthly</option>
                </select>
              </div>
              <p className="text-xs text-white/50 mt-2">$0 = free. You receive 70%.</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <label className="font-semibold mb-2 block">Demo URL (optional)</label>
              <input
                type="url"
                value={demoUrl}
                onChange={e => setDemoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/40 border border-white/[0.06] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#7ed957]/50"
              />
              <p className="text-xs text-white/50 mt-2">Live preview, video, or docs.</p>
            </div>
          </div>

          {result && (
            <div className={`border rounded-xl p-4 flex items-start gap-3 ${
              result.ok ? 'bg-[#7ed957]/10 border-[#7ed957]/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              {result.ok ? <CheckCircle2 className="h-5 w-5 text-[#7ed957] flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="text-sm">
                <p className="text-white">{result.message}</p>
                {result.appId && (
                  <Link href={`/dashboard/marketplace/${result.appId}`} className="text-[#7ed957] hover:underline text-xs">
                    View listing →
                  </Link>
                )}
              </div>
            </div>
          )}

          <button
            onClick={publish}
            disabled={submitting}
            className="w-full bg-[#7ed957] hover:bg-[#6bc847] disabled:opacity-50 text-black font-semibold rounded-lg py-3 transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Publishing...' : 'Publish App'}
          </button>
        </div>
      </div>
    </div>
  )
}
