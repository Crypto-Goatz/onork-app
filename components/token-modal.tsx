'use client'

import { useState, useEffect } from 'react'
import { KeyRound, X } from 'lucide-react'

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
        className="w-8 h-8 rounded-lg bg-[#6EE05A]/[.08] border border-[#6EE05A]/15 text-[#6EE05A] cursor-pointer flex items-center justify-center"
      >
        <KeyRound size={16} />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-[8px] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col animate-[tokenModalIn_0.25s_ease]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-[#6EE05A]" />
                <span className="text-[15px] font-bold text-[#f0f4f8]">API Tokens</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="bg-transparent border-none text-[#4b5563] cursor-pointer flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {/* Generate new token */}
              {!newToken ? (
                <div className="mb-5">
                  <div className="text-[13px] font-semibold text-[#f0f4f8] mb-2">Generate New Token</div>
                  <p className="text-[12px] text-[#6b7280] leading-relaxed mb-3">
                    Tokens are used to authenticate the 0nCore WordPress plugin and other integrations. Each token is shown once — copy it immediately.
                  </p>

                  <label className="flex items-start gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      className="mt-[3px] accent-[#6EE05A]"
                    />
                    <span className="text-[12px] text-[#9ca3af] leading-relaxed">
                      I understand this token grants API access to my 0nCore account. I will store it securely and not share it publicly.
                    </span>
                  </label>

                  <button
                    onClick={generateToken}
                    disabled={!agreed || generating}
                    className={[
                      'w-full py-2.5 rounded-lg border-none text-[13px] font-bold transition-colors',
                      agreed
                        ? 'bg-[#6EE05A] text-black cursor-pointer'
                        : 'bg-[#30363d] text-[#4b5563] cursor-default',
                      generating ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    {generating ? 'Generating...' : 'Generate Token'}
                  </button>
                </div>
              ) : (
                <div className="mb-5 p-4 rounded-[10px] bg-[#6EE05A]/[.06] border border-[#6EE05A]/20">
                  <div className="text-[12px] font-bold text-[#6EE05A] mb-2">Your new token (copy now — shown once):</div>
                  <div className="px-3 py-2.5 rounded-md font-mono text-[11px] bg-[#0d1117] border border-[#30363d] text-[#f0f4f8] break-all leading-relaxed mb-2 select-all overflow-x-auto">
                    {newToken}
                  </div>
                  <button
                    onClick={copyToken}
                    className={[
                      'w-full py-2 rounded-md border-none text-[12px] font-bold cursor-pointer',
                      copied
                        ? 'bg-[#6EE05A]/20 text-[#6EE05A]'
                        : 'bg-[#6EE05A] text-black',
                    ].join(' ')}
                  >
                    {copied ? 'Copied' : 'Copy to Clipboard'}
                  </button>
                </div>
              )}

              {/* Existing tokens */}
              <div className="text-[13px] font-semibold text-[#f0f4f8] mb-2">Active Tokens</div>
              {loading ? (
                <div className="text-[#4b5563] text-[12px] p-3">Loading...</div>
              ) : tokens.length === 0 ? (
                <div className="text-[#4b5563] text-[12px] p-3 text-center">No active tokens</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {tokens.map(t => (
                    <div
                      key={t.id}
                      className="px-3 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[12px] font-semibold text-[#f0f4f8]">{t.label}</div>
                        <div className="text-[10px] text-[#4b5563] font-mono mt-0.5">{t.token_prefix}</div>
                        <div className="text-[10px] text-[#4b5563] mt-0.5">
                          Created {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => revokeToken(t.id)}
                        className="px-2.5 py-1 rounded border border-[#ef4444]/30 bg-[#ef4444]/[.08] text-[#f87171] text-[10px] font-semibold cursor-pointer"
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
