'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react'

export default function AnalyticsSettingsPage() {
  const [saConnected, setSaConnected] = useState(false)
  const [saEmail, setSaEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkStatus()
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) {
      setError(`Connection failed: ${params.get('error')}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function checkStatus() {
    setLoading(true)
    try {
      const saRes = await fetch('/api/settings/google-key')
      const saData = await saRes.json().catch(() => ({}))
      setSaConnected(saData.connected || false)
      setSaEmail(saData.email || '')
    } catch {}
    setLoading(false)
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/google/analytics?report=overview')
      const data = await res.json()
      if (res.ok) {
        setTestResult({ ok: true, message: `Connected. ${data.rows?.length || 0} data rows returned.` })
      } else {
        setTestResult({ ok: false, message: data.error || 'Connection test failed' })
      }
    } catch {
      setTestResult({ ok: false, message: 'Could not reach analytics endpoint' })
    }
    setTesting(false)
  }

  async function handleFile(file: File) {
    setError('')
    setSuccess('')
    if (!file.name.endsWith('.json')) { setError('Please upload a .json file'); return }
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (!json.client_email || !json.private_key || !json.project_id) {
        setError('Invalid service account key.'); return
      }
      setUploading(true)
      const res = await fetch('/api/settings/google-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: json }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setSuccess('Service account key saved')
      setSaConnected(true)
      setSaEmail(json.client_email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="max-w-[700px] mx-auto px-2 flex justify-center pt-20">
        <Loader2 className="w-8 h-8 text-core-green animate-spin" />
      </div>
    )
  }

  const isConnected = saConnected

  return (
    <div className="max-w-[700px] mx-auto px-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
          Google Analytics
          <span className={[
            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
            isConnected
              ? 'bg-core-green/10 text-core-green border-core-green/20'
              : 'bg-core-red/10 text-core-red border-core-red/20',
          ].join(' ')}>
            {isConnected ? 'CONNECTED' : 'NOT CONNECTED'}
          </span>
        </h1>
        <p className="text-[13px] text-core-text-muted mt-1">
          Upload a Google service account key to enable GA4 + Search Console reporting.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-core-red/5 border border-core-red/15 text-core-red text-[13px] mb-3">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-2.5 rounded-lg bg-core-green/5 border border-core-green/15 text-core-green text-[13px] mb-3">
          {success}
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div className={[
          'px-4 py-2.5 rounded-lg border text-[13px] mb-4',
          testResult.ok
            ? 'bg-core-green/5 border-core-green/15 text-core-green'
            : 'bg-core-red/5 border-core-red/15 text-core-red',
        ].join(' ')}>
          {testResult.message}
        </div>
      )}

      {saConnected && (
        <div className="mb-4">
          <button
            onClick={testConnection}
            disabled={testing}
            className="px-3.5 py-1.5 rounded-lg border border-core-border bg-transparent text-core-cyan text-[12px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {testing ? 'Testing...' : 'Test Analytics Connection'}
          </button>
        </div>
      )}

      {/* Service Account (always shown — primary path now) */}
      <div className="border-t border-core-border pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 bg-transparent border-none text-core-text-muted text-[12px] font-semibold cursor-pointer p-0"
        >
          <ChevronRight
            className={['w-3 h-3 transition-transform duration-200', showAdvanced ? 'rotate-90' : ''].join(' ')}
          />
          Advanced: Service Account Key
        </button>

        {showAdvanced && (
          <div className="mt-4">
            {saConnected && (
              <div className="bg-core-card border border-core-green/20 rounded-[10px] px-4 py-3 mb-3 flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-core-green shrink-0" strokeWidth={2.5} />
                <span className="text-[12px] text-core-text">SA: </span>
                <span className="text-[11px] text-core-text-muted font-mono">{saEmail}</span>
              </div>
            )}

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={[
                'rounded-[10px] px-4 py-6 text-center cursor-pointer border-2 border-dashed transition-colors',
                dragOver ? 'bg-core-green/[0.04] border-core-green' : 'bg-core-card border-core-border',
              ].join(' ')}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                className="hidden"
              />
              <div className="text-[13px] font-semibold text-core-text">
                {uploading ? 'Uploading...' : 'Drop service account JSON here'}
              </div>
              <div className="text-[11px] text-core-text-muted mt-1">or click to browse</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
