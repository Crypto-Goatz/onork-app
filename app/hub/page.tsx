'use client'

// 0nVault — the vault door, on 0ncore.com (the 0n account home). Standalone,
// fully gated. Locked without login → "Welcome, {First}" + power button → IKY
// challenge on unrecognized devices → the vault interior. Tailwind + Lucide only.
import { useEffect, useState } from 'react'
import {
  Power, ShieldCheck, Lock, ArrowRight, Loader2, KeyRound, Copy, Check,
  CheckSquare, Globe, Gauge, Share2, Boxes, LayoutGrid, Puzzle,
  Download, Home, User, BarChart3, Chrome, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Phase = 'loading' | 'locked' | 'welcome' | 'challenge' | 'booting' | 'inside'

const PRODUCTS = [
  { name: '0nTask', tag: 'app.0ntask.com', desc: 'One screen for tasks — humans, AI & automations.', url: 'https://app.0ntask.com', icon: CheckSquare, tile: 'bg-[#16a34a]/15 text-[#16a34a]', status: 'live' as const },
  { name: 'web0n', tag: 'web0n.com', desc: 'Self-serve AI website builder.', url: 'https://web0n.com', icon: Globe, tile: 'bg-[#0891b2]/15 text-[#0891b2]', status: 'sso' as const },
  { name: 'CRO9', tag: 'cro9.com', desc: 'Conversion analytics that acts on itself.', url: 'https://www.cro9.com', icon: Gauge, tile: 'bg-[#22d3ee]/15 text-[#22d3ee]', status: 'live' as const },
  { name: 'social0n', tag: 'social0n.com', desc: 'AI social content on autopilot.', url: 'https://social0n.com', icon: Share2, tile: 'bg-[#7c3aed]/15 text-[#7c3aed]', status: 'soon' as const },
  { name: '0nMCP', tag: '0nmcp.com', desc: 'The orchestrator — 1,640 tools, 109 services.', url: 'https://www.0nmcp.com', icon: Boxes, tile: 'bg-[#6EE05A]/15 text-[#6EE05A]', status: 'live' as const },
  { name: '0nCore', tag: '0ncore.com', desc: 'Your customer portal & command deck.', url: 'https://www.0ncore.com/dashboard', icon: LayoutGrid, tile: 'bg-[#f59e0b]/15 text-[#f59e0b]', status: 'live' as const },
]

export default function VaultDoor() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [firstName, setFirstName] = useState('there')
  const [deviceKnown, setDeviceKnown] = useState(false)
  const [challenge, setChallenge] = useState<{ id: string; question: string } | null>(null)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [connected, setConnected] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/hub/session', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.authed) { setPhase('locked'); return }
        setFirstName(d.firstName || 'there')
        setDeviceKnown(!!d.deviceKnown)
        setChallenge(d.challenge || null)
        setPhase('welcome')
      })
      .catch(() => setPhase('locked'))
  }, [])

  const loadInside = () => {
    fetch('/api/hub/inside', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setToken(d.token || null); setConnected(d.connected || 0) } })
      .catch(() => {})
  }

  const powerOn = () => {
    if (deviceKnown || !challenge) { setPhase('booting'); loadInside(); setTimeout(() => setPhase('inside'), 900) }
    else setPhase('challenge')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || busy || !challenge) return
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/hub/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ challengeId: challenge.id, answer: answer.trim() }) })
      const d = await r.json()
      if (d.ok) { setPhase('booting'); loadInside(); setTimeout(() => setPhase('inside'), 900) }
      else setErr(d.message || "That doesn't match. Try again.")
    } catch { setErr('Something went wrong — try again.') }
    finally { setBusy(false) }
  }

  const signOut = async () => {
    try { await createClient().auth.signOut() } catch { /* */ }
    window.location.href = '/login?next=/hub'
  }

  // Sign in with Google straight into the vault (pwu — the master profile).
  const signInWithGoogle = async () => {
    try {
      await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/hub` },
      })
    } catch { window.location.href = '/login?next=/hub' }
  }

  const copy = () => { if (token) { navigator.clipboard?.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500) } }

  const SHELL = 'fixed inset-0 z-[100] overflow-y-auto bg-[#080b10] bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(110,224,90,0.10),transparent_55%)] text-[#f0f4f8]'

  if (phase === 'loading') return <div className={`${SHELL} grid place-items-center`}><Loader2 className="h-7 w-7 animate-spin text-[#6EE05A]" /></div>

  if (phase === 'locked') {
    return (
      <div className={`${SHELL} grid place-items-center px-6`}>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/onvault-light.png" alt="0nVault" width={200} height={52} className="mx-auto h-12 w-auto object-contain opacity-90" />
          <div className="mx-auto mt-10 grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.03]"><Lock className="h-8 w-8 text-[#6b7c9c]" /></div>
          <h1 className="mt-6 text-2xl font-black">Access restricted</h1>
          <p className="mx-auto mt-2 max-w-xs text-[#9fb0cc]">This is your secure 0n vault. Sign in to your 0n account to unlock it.</p>
          <button onClick={signInWithGoogle} className="mx-auto mt-7 flex items-center gap-2.5 rounded-xl bg-white px-7 py-3 text-sm font-bold text-[#0d1117] shadow-sm transition-transform hover:scale-[1.02]">
            <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path></svg>
            Continue with Google
          </button>
          <a href="/login?next=/hub" className="mt-3 inline-block text-xs font-semibold text-[#9fb0cc] hover:text-[#6EE05A]">or sign in with email</a>
          <p className="mt-3 text-xs text-[#6b7c9c]">No account? <a href="/signup?next=/hub" className="font-semibold text-[#6EE05A] hover:underline">Create one free</a></p>
        </div>
      </div>
    )
  }

  if (phase === 'welcome' || phase === 'booting') {
    const booting = phase === 'booting'
    return (
      <div className={`${SHELL} grid place-items-center px-6`}>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/onvault-light.png" alt="0nVault" width={180} height={46} className="mx-auto h-9 w-auto object-contain opacity-80" />
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.3em] text-[#6EE05A]">Welcome</p>
          <h1 className="mt-2 text-balance text-5xl font-black tracking-tight sm:text-7xl">{firstName}.</h1>
          <p className="mx-auto mt-4 max-w-sm text-[#9fb0cc]">{booting ? 'Unlocking your vault…' : 'Everything you build lives here, secured. Power on to enter.'}</p>
          <button
            onClick={powerOn}
            disabled={booting}
            aria-label="Power on to enter"
            className={`group mx-auto mt-10 grid h-36 w-36 place-items-center rounded-full border-2 border-[#6EE05A]/40 bg-[#6EE05A]/[0.06] shadow-[0_0_60px_-10px_rgba(110,224,90,0.5)] transition-all hover:scale-105 hover:border-[#6EE05A] hover:bg-[#6EE05A]/[0.12] disabled:opacity-80 ${booting ? 'animate-pulse' : ''}`}
          >
            {booting ? <Loader2 className="h-14 w-14 animate-spin text-[#6EE05A]" /> : <Power className="h-14 w-14 text-[#6EE05A] transition-transform group-hover:scale-110" />}
          </button>
          {!booting && <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[#6b7c9c]">Press to enter</p>}
        </div>
      </div>
    )
  }

  if (phase === 'challenge') {
    return (
      <div className={`${SHELL} grid place-items-center px-6`}>
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#6EE05A]/30 bg-[#6EE05A]/[0.06]"><ShieldCheck className="h-7 w-7 text-[#6EE05A]" /></div>
          <h1 className="mt-6 text-2xl font-black">Quick check, {firstName}</h1>
          <p className="mt-2 text-[#9fb0cc]">We don&apos;t recognize this device. Just confirm it&apos;s you.</p>
          <form onSubmit={verify} className="mt-6 text-left">
            <label className="text-sm font-semibold text-[#f0f4f8]">{challenge?.question}</label>
            <input
              autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-[#f0f4f8] placeholder:text-[#6b7c9c] focus:border-[#6EE05A]/50 focus:outline-none"
            />
            {err && <p className="mt-2 text-sm font-semibold text-[#ff6b6b]">{err}</p>}
            <button type="submit" disabled={busy || !answer.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6EE05A] py-3 text-sm font-bold text-[#0d1117] disabled:opacity-40">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Unlock <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-4 text-xs text-[#6b7c9c]">Not you? <button type="button" onClick={signOut} className="font-semibold text-[#9fb0cc] hover:text-[#6EE05A]">Sign out</button></p>
        </div>
      </div>
    )
  }

  const NAV = [
    { label: 'Overview', icon: Home, href: '#', active: true },
    { label: 'Products', icon: LayoutGrid, href: '#products', active: false },
    { label: 'Apps', icon: Puzzle, href: 'https://www.0nmcp.com/vault', active: false, ext: true },
    { label: 'Analytics', icon: BarChart3, href: 'https://www.cro9.com', active: false, ext: true },
    { label: 'Account', icon: User, href: 'https://www.0ncore.com/dashboard', active: false, ext: true },
  ]
  const wordmark = (
    <span className="text-xl font-extrabold tracking-tight text-white">0n<span className="text-emerald-400">Vault</span></span>
  )

  return (
    <div className="fixed inset-0 z-[100] flex overflow-hidden bg-neutral-50 text-neutral-900">
      {/* Black sidebar — web0n dashboard shell */}
      <aside className="hidden w-64 flex-col bg-black p-4 md:flex">
        <div className="mb-6 px-2 pt-1">{wordmark}</div>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon
            return (
              <a key={n.label} href={n.href} target={n.ext ? '_blank' : undefined} rel={n.ext ? 'noreferrer' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${n.active ? 'bg-emerald-600/90 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <Icon className="h-[18px] w-[18px]" /> {n.label}
                {n.ext && <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-40" />}
              </a>
            )
          })}
        </nav>
        <div className="mt-auto space-y-2 border-t border-white/10 pt-3">
          <div className="px-3">
            <p className="truncate text-sm font-semibold text-white">{firstName}</p>
            <p className="text-xs text-white/40">{connected} app{connected === 1 ? '' : 's'} connected</p>
          </div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
            <LogOut className="h-[18px] w-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between bg-black px-4 py-3 md:hidden">
          {wordmark}
          <button onClick={signOut} className="text-xs font-semibold text-white/70 hover:text-white">Sign out</button>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome in, {firstName}.</h1>
          <p className="mt-1 text-sm text-neutral-500">Your secure 0n home — one login, every product, all your connections.</p>

          {/* Download the extension — the glue */}
          <div className="mt-6 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-900 p-6 text-white sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Chrome className="h-6 w-6" /></span>
              <div>
                <div className="text-lg font-bold">Get the 0n extension</div>
                <p className="mt-0.5 max-w-md text-sm text-white/60">One login everywhere. It carries your 0n account across every site — no pasting, "Login with 0n" wherever you go.</p>
              </div>
            </div>
            <a href="/downloads/0n-chrome-extension.zip" download className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-neutral-950 transition hover:bg-emerald-400">
              <Download className="h-4 w-4" /> Download now
            </a>
          </div>

          {/* Token */}
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600"><KeyRound className="h-3.5 w-3.5" /> Your 0n token · one key for every 0n product</div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm text-neutral-800">{token || 'No token yet'}</code>
              <button onClick={copy} disabled={!token} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-neutral-950 hover:bg-emerald-400 disabled:opacity-40">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Products */}
          <div id="products" className="mt-10 mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500"><LayoutGrid className="h-3.5 w-3.5 text-emerald-600" /> Your 0n products</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => {
              const Icon = p.icon
              const soon = p.status === 'soon'
              const Card = (
                <div className={`group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all ${soon ? 'opacity-60' : 'hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md'}`}>
                  <div className="flex items-start justify-between">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl ${p.tile}`}><Icon className="h-5 w-5" /></span>
                    {p.status === 'sso'
                      ? <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><ShieldCheck className="h-2.5 w-2.5" /> Login with 0n</span>
                      : soon ? <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Soon</span>
                      : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Live</span>}
                  </div>
                  <div className="mt-3 text-[17px] font-black">{p.name}</div>
                  <div className="text-[12px] font-mono text-neutral-400">{p.tag}</div>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-neutral-500">{p.desc}</p>
                  <div className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${soon ? 'text-neutral-400' : 'text-emerald-600'}`}>
                    {soon ? 'Coming soon' : <>Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
                  </div>
                </div>
              )
              return soon ? <div key={p.name}>{Card}</div> : <a key={p.name} href={p.url} target="_blank" rel="noreferrer">{Card}</a>
            })}
          </div>

          {/* Connect apps */}
          <a href="https://www.0nmcp.com/vault" className="mt-6 flex items-center justify-between rounded-2xl border border-dashed border-neutral-300 bg-white p-5 transition hover:border-emerald-400">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><Puzzle className="h-5 w-5" /></span>
              <div>
                <div className="text-[15px] font-bold">Connect your apps</div>
                <div className="text-[13px] text-neutral-500">113 integrations — connect once, use across every 0n product.</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-emerald-600" />
          </a>
        </div>
      </main>
    </div>
  )
}
