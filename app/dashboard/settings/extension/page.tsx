'use client'

/**
 * /dashboard/settings/extension — generate + manage Chrome Extension tokens.
 * The user clicks "Generate token", we show it ONCE in a copyable box, they
 * paste it into the extension popup. After that the extension uses it as
 * Bearer for all API calls.
 */

import { useEffect, useState } from 'react'
import {
  Chrome, Copy, Trash2, Key, Plus, ExternalLink, CheckCircle2, Loader2, ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface TokenRow {
  id: string
  name: string | null
  prefix: string | null
  last_used_at: string | null
  created_at: string
  expires_at: string | null
  revoked: boolean
}

export default function ExtensionTokenPage() {
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('My Chrome')
  const [generating, setGenerating] = useState(false)
  const [revealed, setRevealed] = useState<{ token: string; name: string } | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/extension/token')
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'load failed')
      setTokens(j.tokens ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function generate() {
    setGenerating(true)
    try {
      const r = await fetch('/api/extension/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'Chrome Extension' }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'generate failed')
      setRevealed({ token: j.token, name: j.name })
      await load()
      toast.success('Token generated — copy it now')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed')
    } finally {
      setGenerating(false)
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this token? Any extension using it will stop working immediately.')) return
    try {
      const r = await fetch(`/api/extension/token?id=${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('revoke failed')
      await load()
      toast.success('Revoked')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed')
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text)
    toast.success('Copied')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
          <Chrome className="h-3.5 w-3.5" /> Settings · Chrome Extension
        </div>
        <h1 className="mt-2 text-2xl font-semibold">Connect the 0n Chrome Extension</h1>
        <p className="mt-1 text-sm text-white/60">
          Generate a token, paste it into the extension popup, and it's connected to your account. The token is
          scoped to your CRM location and authenticates every extension API call.
        </p>
      </div>

      {/* Quick-link to install */}
      <Card className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
            <Chrome className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">0n — AI Command Center</div>
            <div className="text-xs text-white/60">Free Chrome extension · LinkedIn VPIS, content engine, MCP tools</div>
          </div>
        </div>
        <a
          href="https://chromewebstore.google.com/search/0n%20AI%20command%20center"
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open Chrome Web Store
          </Button>
        </a>
      </Card>

      {/* Generate */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Generate a new token
        </div>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label (e.g. My MacBook)" className="flex-1" />
          <Button onClick={generate} disabled={generating}>
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating</> : <><Key className="mr-2 h-4 w-4" /> Generate</>}
          </Button>
        </div>
        <p className="text-xs text-white/50">
          Tokens never expire automatically. Revoke any token to invalidate the extension instance using it.
        </p>
      </Card>

      {/* Revealed token (one-time) */}
      {revealed && (
        <Card className="space-y-3 border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
            <div className="text-sm font-semibold">Token created — copy it now</div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-xs">
            <span className="flex-1 break-all text-white/90">{revealed.token}</span>
            <Button variant="outline" size="sm" onClick={() => copy(revealed.token)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-300/80">
            <ShieldAlert className="h-3.5 w-3.5" />
            This is the ONLY time we'll show it. We store the hash, not the token.
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setRevealed(null)}>I've copied it</Button>
          </div>
        </Card>
      )}

      {/* Existing tokens */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Active tokens</div>
          <span className="text-xs text-white/50">{tokens.filter((t) => !t.revoked).length} active</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-white/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-white/50">No tokens yet. Generate one above to connect the extension.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                  t.revoked ? 'border-white/5 bg-white/[0.02] opacity-60' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{t.name ?? 'Untitled'}</span>
                    {t.revoked && <Badge variant="outline" className="text-[10px] uppercase">revoked</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-white/50">
                    <code className="rounded bg-black/30 px-1.5 py-0.5">{t.prefix}…</code>
                    <span>created {new Date(t.created_at).toLocaleDateString()}</span>
                    {t.last_used_at && (
                      <span>last used {new Date(t.last_used_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {!t.revoked && (
                  <Button variant="outline" size="sm" onClick={() => revoke(t.id)} title="Revoke">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* How to use */}
      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">How to connect</div>
        <ol className="space-y-2 text-sm text-white/70">
          <li><span className="mr-1.5 inline-block w-5 text-center font-mono text-[var(--accent)]">1.</span> Install <strong className="text-white">0n — AI Command Center</strong> from the Chrome Web Store.</li>
          <li><span className="mr-1.5 inline-block w-5 text-center font-mono text-[var(--accent)]">2.</span> Click the extension icon in Chrome's toolbar.</li>
          <li><span className="mr-1.5 inline-block w-5 text-center font-mono text-[var(--accent)]">3.</span> Paste your token from above into the &ldquo;Connect&rdquo; screen.</li>
          <li><span className="mr-1.5 inline-block w-5 text-center font-mono text-[var(--accent)]">4.</span> Done — the extension is signed in and tied to your 0nCore account.</li>
        </ol>
      </Card>
    </div>
  )
}
