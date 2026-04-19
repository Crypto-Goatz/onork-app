'use client'

import { useState, useEffect, useRef } from 'react'

export default function AnalyticsSettingsPage() {
  const [connected, setConnected] = useState(false)
  const [saEmail, setSaEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { checkStatus() }, [])

  async function checkStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/google-key')
      const data = await res.json()
      setConnected(data.connected || false)
      setSaEmail(data.email || '')
    } catch {}
    setLoading(false)
  }

  async function handleFile(file: File) {
    setError('')
    setSuccess('')

    if (!file.name.endsWith('.json')) {
      setError('Please upload a .json file')
      return
    }

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      // Validate required fields
      if (!json.client_email || !json.private_key || !json.project_id) {
        setError('Invalid service account key. Must contain client_email, private_key, and project_id.')
        return
      }

      setUploading(true)
      const res = await fetch('/api/settings/google-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: json }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setSuccess('Service account key saved successfully')
      setConnected(true)
      setSaEmail(json.client_email)
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON file')
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    }
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
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

  if (loading) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 8px', display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #1e293b', borderTopColor: '#7ed957', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          Google Analytics
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: connected ? 'rgba(126,217,87,0.12)' : 'rgba(248,113,113,0.12)',
            color: connected ? '#7ed957' : '#f87171',
            border: `1px solid ${connected ? 'rgba(126,217,87,0.2)' : 'rgba(248,113,113,0.2)'}`,
          }}>{connected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Connect your Google Analytics service account for reporting</p>
      </div>

      {/* Current status */}
      {connected && (
        <div style={{
          background: '#161b22', border: '1px solid rgba(126,217,87,0.2)', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(126,217,87,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ed957" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>Service Account Connected</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{saEmail}</div>
          </div>
          <button
            onClick={testConnection}
            disabled={testing}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid #1e293b',
              background: 'transparent', color: '#00d4ff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', opacity: testing ? 0.6 : 1,
            }}
          >{testing ? 'Testing...' : 'Test Connection'}</button>
        </div>
      )}

      {testResult && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: testResult.ok ? 'rgba(126,217,87,0.06)' : 'rgba(248,113,113,0.06)',
          border: `1px solid ${testResult.ok ? 'rgba(126,217,87,0.15)' : 'rgba(248,113,113,0.15)'}`,
          color: testResult.ok ? '#7ed957' : '#f87171', fontSize: 13,
        }}>{testResult.message}</div>
      )}

      {/* Instructions */}
      <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8', marginBottom: 14 }}>How to get your Service Account key:</div>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Go to Google Cloud Console > IAM & Admin > Service Accounts',
            'Create a new service account (or use existing)',
            'Grant it the "Viewer" role on your GA4 property',
            'Create a JSON key for the service account',
            'In GA4 Admin > Property Access Management, add the service account email',
            'Upload the JSON key file below',
          ].map((step, i) => (
            <li key={i} style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
              {step}
            </li>
          ))}
        </ol>
        <a
          href="https://cloud.google.com/iam/docs/creating-managing-service-accounts"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 14, fontSize: 12, color: '#00d4ff', fontWeight: 600, textDecoration: 'none' }}
        >Create Service Account Tutorial &rarr;</a>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          background: dragOver ? 'rgba(126,217,87,0.04)' : '#161b22',
          border: `2px dashed ${dragOver ? '#7ed957' : '#1e293b'}`,
          borderRadius: 12, padding: '40px 20px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.15s', marginBottom: 16,
        }}
      >
        <input ref={fileRef} type="file" accept=".json" onChange={handleFileInput} style={{ display: 'none' }} />
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>&#128196;</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8', marginBottom: 4 }}>
          {uploading ? 'Uploading...' : 'Drop your JSON key file here'}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>or click to browse</div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}
      {success && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.15)', color: '#7ed957', fontSize: 13, marginBottom: 12 }}>{success}</div>
      )}
    </div>
  )
}
