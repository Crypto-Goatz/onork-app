"use client"

/**
 * /dashboard/cro9-engine/new — onboarding wizard for a new CRO9 site.
 *
 * Steps:
 *   1. Site URL
 *   2. GSC property (auto-guessed) + GA4 (optional)
 *   3. SerpAPI key (BYO) + apply mode
 *   4. Confirm — kicks off first analysis
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, ArrowRight, Check, AlertTriangle, ExternalLink } from 'lucide-react'

export default function Cro9NewSitePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [siteUrl, setSiteUrl] = useState('')
  const [gscProperty, setGscProperty] = useState('')
  const [ga4, setGa4] = useState('')
  const [serpapi, setSerpapi] = useState('')
  const [applyMode, setApplyMode] = useState<'briefs_only' | 'snippet' | 'wordpress'>('briefs_only')

  function normalizeUrl(v: string): string {
    return v.startsWith('http') ? v : `https://${v}`
  }

  function autoGuessGsc() {
    try {
      const u = new URL(normalizeUrl(siteUrl))
      setGscProperty(`sc-domain:${u.hostname.replace(/^www\./, '')}`)
    } catch { /* ignore */ }
  }

  async function submit() {
    setLoading(true); setErr(null)
    try {
      const supa = createClient()
      const { data: { session } } = await supa.auth.getSession()
      if (!session) { setErr('Please sign in'); setLoading(false); return }
      const r = await fetch('/api/cro9/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          site_url: normalizeUrl(siteUrl.trim()),
          gsc_property: gscProperty.trim() || undefined,
          ga4_property_id: ga4.trim() || undefined,
          serpapi_key: serpapi.trim() || undefined,
          apply_mode: applyMode,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'create_failed')
      router.push(`/dashboard/cro9-engine/${j.site.id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-xl mx-auto">
        <Link href="/dashboard/cro9-engine" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <StepDots step={step} />

        {err && (
          <Card className="mb-4 border-destructive/40 bg-destructive/5">
            <CardContent className="pt-5 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" />{err}
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Which site are we ranking?</CardTitle>
              <CardDescription>Paste any URL from the site. We&rsquo;ll resolve the domain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site-url">Site URL</Label>
                <Input
                  id="site-url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  onBlur={autoGuessGsc}
                  autoFocus
                />
              </div>
              <div className="flex justify-end">
                <Button disabled={!siteUrl.trim()} onClick={() => { autoGuessGsc(); setStep(2) }}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Connect your data</CardTitle>
              <CardDescription>Connect Google to access Search Console and Analytics — one click, all services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google OAuth Connect */}
              <GoogleConnectButton onConnected={(email) => {
                setErr(null)
              }} />

              <div className="border-t border-border pt-4">
                <Label htmlFor="gsc">Search Console property</Label>
                <Input id="gsc" value={gscProperty} onChange={(e) => setGscProperty(e.target.value)} placeholder="sc-domain:example.com" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Format: <code>sc-domain:example.com</code> (domain) or <code>https://example.com/</code> (URL prefix).
                </p>
              </div>
              <div>
                <Label htmlFor="ga4">GA4 property ID (optional)</Label>
                <Input id="ga4" value={ga4} onChange={(e) => setGa4(e.target.value)} placeholder="444978038" />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <Button disabled={!gscProperty.trim()} onClick={() => setStep(3)}>Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Drop in your SerpAPI key</CardTitle>
              <CardDescription>BYO keeps costs in your account and removes rate caps. We encrypt it at rest.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serp">SerpAPI key</Label>
                <Input id="serp" type="password" value={serpapi} onChange={(e) => setSerpapi(e.target.value)} placeholder="••••••••••••••••" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  No account yet?{' '}
                  <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener" className="underline inline-flex items-center gap-1">
                    Get one <ExternalLink className="h-3 w-3" />
                  </a>{' '}· free tier covers ~100 queries/month.
                </p>
              </div>
              <div>
                <Label>Apply mode</Label>
                <div className="mt-2 grid gap-2">
                  {(['briefs_only', 'snippet', 'wordpress'] as const).map((mode) => (
                    <label
                      key={mode}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer text-sm ${
                        applyMode === mode ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="apply"
                        checked={applyMode === mode}
                        onChange={() => setApplyMode(mode)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">
                          {mode === 'briefs_only' && 'Briefs only (you implement)'}
                          {mode === 'snippet' && 'Auto-apply JS snippet'}
                          {mode === 'wordpress' && 'WordPress plugin'}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {mode === 'briefs_only' && 'Engine generates briefs; you make the edits.'}
                          {mode === 'snippet' && 'Add one script tag, approved rewrites apply at page-load.'}
                          {mode === 'wordpress' && 'Install the WP plugin; engine writes straight to the CMS.'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <Button onClick={() => setStep(4)}>Review <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm + start 7-day trial</CardTitle>
              <CardDescription>We&rsquo;ll kick off the first analysis the moment you click Start.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <Row k="Site" v={siteUrl} />
                <Row k="Search Console" v={gscProperty || '(none)'} />
                <Row k="GA4" v={ga4 || '(skipped)'} />
                <Row k="SerpAPI" v={serpapi ? '••••' + serpapi.slice(-4) : '(skipped — limited mode)'} />
                <Row k="Apply mode" v={applyMode.replace('_', ' ')} />
              </dl>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <Button disabled={loading} onClick={submit}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Starting…</> : <>Start 7-day trial <Check className="h-4 w-4 ml-2" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0 border-border/60">
      <dt className="text-xs text-muted-foreground uppercase tracking-wider">{k}</dt>
      <dd className="font-mono text-sm truncate max-w-[60%] text-right">{v}</dd>
    </div>
  )
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1 rounded-full transition-all ${n === step ? 'w-10 bg-primary' : n < step ? 'w-6 bg-primary/50' : 'w-6 bg-muted'}`}
        />
      ))}
      <span className="ml-3 text-xs text-muted-foreground">Step {step} of 4</span>
    </div>
  )
}

function GoogleConnectButton({ onConnected }: { onConnected: (email: string) => void }) {
  const [connected, setConnected] = useState(false)
  const [email, setEmail] = useState('')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetch('/api/auth/google-connect/status').then(r => r.json()).then(d => {
      if (d.connected) { setConnected(true); setEmail(d.email || ''); onConnected(d.email || '') }
    }).catch(() => {})
  }, [])

  async function connect() {
    setConnecting(true)
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
            // Re-check status
            fetch('/api/auth/google-connect/status').then(r => r.json()).then(d => {
              if (d.connected) { setConnected(true); setEmail(d.email || ''); onConnected(d.email || '') }
            }).catch(() => {})
          }
        }, 500)
      }
    } catch {
      setConnecting(false)
    }
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
        <Check className="size-5 text-primary" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Google Connected</div>
          <div className="text-xs text-muted-foreground font-mono">{email}</div>
        </div>
        <span className="text-[10px] font-bold text-primary">GSC + GA4 Ready</span>
      </div>
    )
  }

  return (
    <button onClick={connect} disabled={connecting} className="w-full flex items-center justify-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-60">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span className="text-sm font-semibold text-foreground">{connecting ? 'Connecting...' : 'Connect Google (GSC + Analytics)'}</span>
    </button>
  )
}
