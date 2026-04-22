'use client'

import { useState, useEffect, useRef } from 'react'

const GOOGLE_SERVICES = [
  { key: 'analytics', label: 'Google Analytics', icon: '📊', desc: 'Website traffic, conversions, and audience data' },
  { key: 'gmail', label: 'Gmail', icon: '✉️', desc: 'Read, send, and manage email' },
  { key: 'drive', label: 'Google Drive', icon: '📁', desc: 'Files, folders, and document storage' },
  { key: 'sheets', label: 'Google Sheets', icon: '📋', desc: 'Spreadsheet data and reporting' },
  { key: 'calendar', label: 'Google Calendar', icon: '📅', desc: 'Events, scheduling, and availability' },
  { key: 'docs', label: 'Google Docs', icon: '📝', desc: 'Document creation and editing' },
  { key: 'search_console', label: 'Search Console', icon: '🔍', desc: 'Search performance and indexing' },
  { key: 'tasks', label: 'Google Tasks', icon: '✓', desc: 'Task lists and to-do management' },
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
    // Check for OAuth callback result
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
        // Open OAuth in popup
        const w = 500, h = 600
        const left = window.screenX + (window.innerWidth - w) / 2
        const top = window.screenY + (window.innerHeight - h) / 2
        const popup = window.open(data.url, 'google-oauth', `width=${w},height=${h},left=${left},top=${top}`)

        // Poll for popup close (OAuth callback redirects back)
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
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 8px', display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border, #30363d)', borderTopColor: 'var(--primary, #6EE05A)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const isConnected = googleConnected || saConnected

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          Google Integration
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: isConnected ? 'rgba(110,224,90,0.12)' : 'rgba(248,113,113,0.12)',
            color: isConnected ? 'var(--primary, #6EE05A)' : '#f87171',
            border: `1px solid ${isConnected ? 'rgba(110,224,90,0.2)' : 'rgba(248,113,113,0.2)'}`,
          }}>{isConnected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground, #6b7280)', marginTop: 4 }}>
          Connect your Google account to unlock Analytics, Gmail, Drive, Sheets, Calendar, and more.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}
      {success && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(110,224,90,0.06)', border: '1px solid rgba(110,224,90,0.15)', color: 'var(--primary, #6EE05A)', fontSize: 13, marginBottom: 12 }}>{success}</div>
      )}

      {/* ═══ Primary: Google OAuth Connect ═══ */}
      <div style={{
        background: 'var(--card, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 12,
        padding: '24px', marginBottom: 20,
      }}>
        {googleConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(110,224,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary, #6EE05A)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground, #f0f4f8)' }}>Google Account Connected</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground, #6b7280)', fontFamily: 'monospace' }}>{googleEmail}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={testConnection}
                disabled={testing}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border, #30363d)',
                  background: 'transparent', color: '#00d4ff', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', opacity: testing ? 0.6 : 1,
                }}
              >{testing ? 'Testing...' : 'Test'}</button>
              <button
                onClick={disconnectGoogle}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)',
                  background: 'transparent', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >Disconnect</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" style={{ margin: '0 auto' }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground, #f0f4f8)', marginBottom: 6 }}>Connect Google Account</h3>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground, #6b7280)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
              One click connects Analytics, Gmail, Drive, Sheets, Calendar, Docs, Search Console, and Tasks.
            </p>
            <button
              onClick={connectGoogle}
              disabled={connecting}
              style={{
                padding: '12px 32px', borderRadius: 10,
                background: 'var(--primary, #6EE05A)', color: 'var(--primary-foreground, #0d1117)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
                opacity: connecting ? 0.7 : 1,
                boxShadow: '0 0 20px rgba(110,224,90,0.2)',
              }}
            >
              {connecting ? 'Connecting...' : 'Connect Google'}
            </button>
          </div>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: testResult.ok ? 'rgba(110,224,90,0.06)' : 'rgba(248,113,113,0.06)',
          border: `1px solid ${testResult.ok ? 'rgba(110,224,90,0.15)' : 'rgba(248,113,113,0.15)'}`,
          color: testResult.ok ? 'var(--primary, #6EE05A)' : '#f87171', fontSize: 13,
        }}>{testResult.message}</div>
      )}

      {/* ═══ Connected Services Grid ═══ */}
      {googleConnected && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground, #f0f4f8)', marginBottom: 12 }}>Connected Services</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {GOOGLE_SERVICES.map(svc => (
              <div key={svc.key} style={{
                background: 'var(--card, #161b22)', border: '1px solid var(--border, #30363d)',
                borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>{svc.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground, #f0f4f8)' }}>{svc.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-foreground, #6b7280)' }}>{svc.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--primary, #6EE05A)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Advanced: Service Account (collapsible) ═══ */}
      <div style={{ borderTop: '1px solid var(--border, #30363d)', paddingTop: 16 }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            color: 'var(--muted-foreground, #6b7280)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transition: 'transform 0.2s', transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0)' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Advanced: Service Account Key
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 16 }}>
            {saConnected && (
              <div style={{
                background: 'var(--card, #161b22)', border: '1px solid rgba(110,224,90,0.2)', borderRadius: 10,
                padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary, #6EE05A)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                <span style={{ fontSize: 12, color: 'var(--foreground, #f0f4f8)' }}>SA: </span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground, #6b7280)', fontFamily: 'monospace' }}>{saEmail}</span>
              </div>
            )}

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              style={{
                background: dragOver ? 'rgba(110,224,90,0.04)' : 'var(--card, #161b22)',
                border: `2px dashed ${dragOver ? 'var(--primary, #6EE05A)' : 'var(--border, #30363d)'}`,
                borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
              }}
            >
              <input ref={fileRef} type="file" accept=".json" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground, #f0f4f8)' }}>
                {uploading ? 'Uploading...' : 'Drop service account JSON here'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground, #6b7280)', marginTop: 4 }}>or click to browse</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
