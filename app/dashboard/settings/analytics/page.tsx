'use client'

import { useState, useEffect, useRef } from 'react'
import {
  BarChart2,
  Mail,
  Folder,
  Table2,
  CalendarDays,
  FileText,
  Search,
  CheckSquare,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react'

const GOOGLE_SERVICES = [
  { key: 'analytics', label: 'Google Analytics', Icon: BarChart2, desc: 'Website traffic, conversions, and audience data' },
  { key: 'gmail', label: 'Gmail', Icon: Mail, desc: 'Read, send, and manage email' },
  { key: 'drive', label: 'Google Drive', Icon: Folder, desc: 'Files, folders, and document storage' },
  { key: 'sheets', label: 'Google Sheets', Icon: Table2, desc: 'Spreadsheet data and reporting' },
  { key: 'calendar', label: 'Google Calendar', Icon: CalendarDays, desc: 'Events, scheduling, and availability' },
  { key: 'docs', label: 'Google Docs', Icon: FileText, desc: 'Document creation and editing' },
  { key: 'search_console', label: 'Search Console', Icon: Search, desc: 'Search performance and indexing' },
  { key: 'tasks', label: 'Google Tasks', Icon: CheckSquare, desc: 'Task lists and to-do management' },
]

export default function AnalyticsSettingsPage() {
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [saConnected, setSaConnected] = useState(false)
  const [saEmail, setSaEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
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
    if (params.get('google') === 'connected') {
      setSuccess('Google account connected successfully')
      setGoogleConnected(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('error')) {
      setError(`Connection failed: ${params.get('error')}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function checkStatus() {
    setLoading(true)
    try {
      const [googleRes, saRes] = await Promise.all([
        fetch('/api/auth/google-connect/status'),
        fetch('/api/settings/google-key'),
      ])
      const googleData = await googleRes.json().catch(() => ({}))
      const saData = await saRes.json().catch(() => ({}))
      setGoogleConnected(googleData.connected || false)
      setGoogleEmail(googleData.email || '')
      setSaConnected(saData.connected || false)
      setSaEmail(saData.email || '')
    } catch {}
    setLoading(false)
  }

  async function connectGoogle() {
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/auth/google-connect')
      const data = await res.json()
      if (data.url) {
        const w = 500, h = 600
        const left = window.screenX + (window.innerWidth - w) / 2
        const top = window.screenY + (window.innerHeight - h) / 2
        const popup = window.open(data.url, 'google-oauth', `width=${w},height=${h},left=${left},top=${top}`)
        const poll = setInterval(() => {
          if (popup?.closed) {
            clearInterval(poll)
            setConnecting(false)
            checkStatus()
          }
        }, 500)
      }
    } catch {
      setError('Failed to start Google connection')
      setConnecting(false)
    }
  }

  async function disconnectGoogle() {
    try {
      await fetch('/api/auth/google-connect/disconnect', { method: 'POST' })
      setGoogleConnected(false)
      setGoogleEmail('')
      setSuccess('Google account disconnected')
    } catch {
      setError('Failed to disconnect')
    }
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

  const isConnected = googleConnected || saConnected

  return (
    <div className="max-w-[700px] mx-auto px-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
          Google Integration
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
          Connect your Google account to unlock Analytics, Gmail, Drive, Sheets, Calendar, and more.
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

      {/* Primary: Google OAuth Connect */}
      <div className="bg-core-card border border-core-border rounded-xl p-6 mb-5">
        {googleConnected ? (
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[10px] bg-core-green/10 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-core-green" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-core-text">Google Account Connected</div>
              <div className="text-[12px] text-core-text-muted font-mono truncate">{googleEmail}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={testConnection}
                disabled={testing}
                className="px-3.5 py-1.5 rounded-lg border border-core-border bg-transparent text-core-cyan text-[12px] font-semibold cursor-pointer disabled:opacity-60"
              >
                {testing ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={disconnectGoogle}
                className="px-3.5 py-1.5 rounded-lg border border-core-red/20 bg-transparent text-core-red text-[12px] font-semibold cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-5">
            <div className="flex justify-center mb-3">
              <svg width="40" height="40" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h3 className="text-[16px] font-bold text-core-text mb-1.5">Connect Google Account</h3>
            <p className="text-[13px] text-core-text-muted mb-5 max-w-[400px] mx-auto">
              One click connects Analytics, Gmail, Drive, Sheets, Calendar, Docs, Search Console, and Tasks.
            </p>
            <button
              onClick={connectGoogle}
              disabled={connecting}
              className="px-8 py-3 rounded-[10px] bg-core-green text-core-bg text-[14px] font-bold cursor-pointer border-none disabled:opacity-70 shadow-[0_0_20px_rgba(110,224,90,0.2)]"
            >
              {connecting ? 'Connecting...' : 'Connect Google'}
            </button>
          </div>
        )}
      </div>

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

      {/* Connected Services Grid */}
      {googleConnected && (
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-core-text mb-3">Connected Services</h3>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {GOOGLE_SERVICES.map(({ key, label, Icon, desc }) => (
              <div
                key={key}
                className="bg-core-card border border-core-border rounded-[10px] px-4 py-3.5 flex items-center gap-2.5"
              >
                <Icon className="w-5 h-5 text-core-text-muted shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-core-text">{label}</div>
                  <div className="text-[10px] text-core-text-muted leading-tight">{desc}</div>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-core-green shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced: Service Account (collapsible) */}
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
