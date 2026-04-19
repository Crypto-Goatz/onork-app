'use client'

import { useState, useEffect } from 'react'

interface Token {
  id: string
  token_prefix: string
  label: string
  scopes: string[]
  created_at: string
  last_used_at?: string
}

export function TokenButton() {
  const [open, setOpen] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (open) fetchTokens()
  }, [open])

  async function fetchTokens() {
    setLoading(true)
    const res = await fetch('/api/tokens')
    if (res.ok) {
      const data = await res.json()
      setTokens(data.tokens || [])
    }
    setLoading(false)
  }

  async function generateToken() {
    if (!agreed) return
    setGenerating(true)
    setNewToken('')
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'WordPress Plugin', scopes: ['plugin:read', 'plugin:write', 'api:read'] }),
    })
    if (res.ok) {
      const data = await res.json()
      setNewToken(data.token)
      fetchTokens()
    }
    setGenerating(false)
  }

  async function revokeToken(id: string) {
    await fetch('/api/tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId: id }),
    })
    fetchTokens()
  }

  function copyToken() {
    navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Token button in header */}
      <button
        onClick={() => { setOpen(true); setNewToken(''); setAgreed(false) }}
        title="API Tokens"
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(126,217,87,0.08)',
          border: '1px solid rgba(126,217,87,0.15)',
          color: '#7ed957', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            background: '#0d1117', border: '1px solid #1e293b', borderRadius: 16,
            width: 480, maxHeight: '80vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            animation: 'tokenModalIn 0.25s ease',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ed957" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>API Tokens</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 18 }}>x</button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {/* Generate new token */}
              {!newToken ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8', marginBottom: 8 }}>Generate New Token</div>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
                    Tokens are used to authenticate the 0nCore WordPress plugin and other integrations. Each token is shown once — copy it immediately.
                  </p>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      style={{ marginTop: 3, accentColor: '#7ed957' }}
                    />
                    <span style={{ fontSize: 12, color: '#8b95a5', lineHeight: 1.5 }}>
                      I understand this token grants API access to my 0nCore account. I will store it securely and not share it publicly.
                    </span>
                  </label>

                  <button
                    onClick={generateToken}
                    disabled={!agreed || generating}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                      background: agreed ? '#7ed957' : '#1e293b',
                      color: agreed ? '#000' : '#4b5563',
                      fontSize: 13, fontWeight: 700, cursor: agreed ? 'pointer' : 'default',
                      opacity: generating ? 0.5 : 1,
                    }}
                  >
                    {generating ? 'Generating...' : 'Generate Token'}
                  </button>
                </div>
              ) : (
                <div style={{
                  marginBottom: 20, padding: 16, borderRadius: 10,
                  background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.2)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7ed957', marginBottom: 8 }}>Your new token (copy now — shown once):</div>
                  <div style={{
                    padding: '10px 12px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11,
                    background: '#0a0e17', border: '1px solid #1e293b', color: '#f0f4f8',
                    wordBreak: 'break-all', lineHeight: 1.5, marginBottom: 8,
                  }}>
                    {newToken}
                  </div>
                  <button onClick={copyToken} style={{
                    width: '100%', padding: '8px', borderRadius: 6, border: 'none',
                    background: copied ? 'rgba(126,217,87,0.2)' : '#7ed957',
                    color: copied ? '#7ed957' : '#000',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    {copied ? 'Copied' : 'Copy to Clipboard'}
                  </button>
                </div>
              )}

              {/* Existing tokens */}
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8', marginBottom: 8 }}>Active Tokens</div>
              {loading ? (
                <div style={{ color: '#4b5563', fontSize: 12, padding: 12 }}>Loading...</div>
              ) : tokens.length === 0 ? (
                <div style={{ color: '#4b5563', fontSize: 12, padding: 12, textAlign: 'center' }}>No active tokens</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tokens.map(t => (
                    <div key={t.id} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: '#161b22', border: '1px solid #1e293b',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8' }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace', marginTop: 2 }}>{t.token_prefix}</div>
                        <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>
                          Created {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => revokeToken(t.id)}
                        style={{
                          padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(248,113,113,0.3)',
                          background: 'rgba(248,113,113,0.08)', color: '#f87171',
                          fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tokenModalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </>
  )
}
