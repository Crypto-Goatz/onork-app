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
  const [tab, setTab] = useState<'home' | 'products' | 'apps' | 'account'>('home')

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

  const initial = (firstName || 'U').charAt(0).toUpperCase()
  const TABS = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'products' as const, label: 'Products', icon: LayoutGrid },
    { id: 'apps' as const, label: 'Apps', icon: Puzzle },
    { id: 'account' as const, label: 'You', icon: User },
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d1117] text-white">
      <div className="mx-auto flex h-full max-w-md flex-col">
        {/* App header */}
        <header className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <span className="text-lg font-extrabold tracking-tight">0n<span className="text-[#6EE05A]">Vault</span></span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#6EE05A]/15 text-sm font-black text-[#6EE05A]">{initial}</span>
        </header>

        {/* Scrollable app body */}
        <div className="flex-1 overflow-y-auto px-5 pb-32">
          {tab === 'home' && (
            <div>
              <h1 className="pt-2 text-[26px] font-black tracking-tight">Hi, {firstName}.</h1>
              <p className="mt-1 text-sm text-white/50">Your secure 0n home. One login, every product.</p>

              {/* Your key — tap to copy */}
              <button onClick={copy} disabled={!token} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition active:scale-[0.99] disabled:opacity-60">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6EE05A]"><KeyRound className="h-3.5 w-3.5" /> Your 0n key</div>
                <div className="mt-2 flex items-center gap-3">
                  <code className="min-w-0 flex-1 truncate font-mono text-sm text-white/80">{token || 'Loading…'}</code>
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#6EE05A] px-3 py-1.5 text-xs font-bold text-[#0d1117]">
                    {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/40">One key for every 0n product. Tap to copy.</p>
              </button>

              {/* Get the extension */}
              <a href="/downloads/0n-chrome-extension.zip" download className="mt-4 flex items-center gap-4 rounded-2xl border border-[#6EE05A]/25 bg-[#6EE05A]/[0.06] p-4 transition active:scale-[0.99]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#6EE05A]/15 text-[#6EE05A]"><Chrome className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">Get the 0n extension</div>
                  <p className="text-xs text-white/50">Login with 0n everywhere — no pasting.</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#6EE05A] px-3 py-2 text-xs font-bold text-[#0d1117]"><Download className="h-3.5 w-3.5" /> Get</span>
              </a>

              {/* Quick launch */}
              <div className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-white/40">Jump back in</div>
              <div className="grid grid-cols-2 gap-3">
                {PRODUCTS.filter((p) => p.status !== 'soon').slice(0, 4).map((p) => {
                  const Icon = p.icon
                  return (
                    <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition active:scale-[0.98]">
                      <span className={`grid h-10 w-10 place-items-center rounded-xl ${p.tile}`}><Icon className="h-5 w-5" /></span>
                      <span className="text-sm font-bold">{p.name}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'products' && (
            <div>
              <h1 className="pt-2 text-xl font-black">Products</h1>
              <p className="mt-1 text-sm text-white/50">Everything in your 0n account.</p>
              <div className="mt-4 space-y-3">
                {PRODUCTS.map((p) => {
                  const Icon = p.icon
                  const soon = p.status === 'soon'
                  const inner = (
                    <div className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition ${soon ? 'opacity-50' : 'active:scale-[0.99]'}`}>
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${p.tile}`}><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold">{p.name}</span>
                          {p.status === 'sso' && <span className="rounded-full bg-[#6EE05A]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6EE05A]">Login with 0n</span>}
                          {soon && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/40">Soon</span>}
                        </div>
                        <p className="truncate text-xs text-white/50">{p.desc}</p>
                      </div>
                      {!soon && <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />}
                    </div>
                  )
                  return soon ? <div key={p.name}>{inner}</div> : <a key={p.name} href={p.url} target="_blank" rel="noreferrer">{inner}</a>
                })}
              </div>
            </div>
          )}

          {tab === 'apps' && (
            <div>
              <h1 className="pt-2 text-xl font-black">Apps</h1>
              <p className="mt-1 text-sm text-white/50">Connect once, use across every 0n product.</p>
              <a href="https://www.0nmcp.com/vault" className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition active:scale-[0.99]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#6EE05A]/15 text-[#6EE05A]"><Puzzle className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">Connect your apps</div>
                  <p className="text-xs text-white/50">113 integrations — Slack, Gmail, Stripe, CRM & more.</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
              </a>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
                <div className="text-3xl font-black text-[#6EE05A]">{connected}</div>
                <div className="mt-0.5 text-xs text-white/50">app{connected === 1 ? '' : 's'} connected</div>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div>
              <h1 className="pt-2 text-xl font-black">You</h1>
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#6EE05A]/15 text-lg font-black text-[#6EE05A]">{initial}</span>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold">{firstName}</div>
                  <div className="text-xs text-white/50">{connected} app{connected === 1 ? '' : 's'} connected</div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <a href="https://www.0ncore.com/dashboard" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold transition active:scale-[0.99]"><LayoutGrid className="h-4 w-4 text-[#6EE05A]" /> Dashboard <ArrowRight className="ml-auto h-4 w-4 text-white/30" /></a>
                <a href="https://www.cro9.com" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold transition active:scale-[0.99]"><BarChart3 className="h-4 w-4 text-[#6EE05A]" /> Analytics <ArrowRight className="ml-auto h-4 w-4 text-white/30" /></a>
              </div>
              <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 transition active:scale-[0.99]"><LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          )}
        </div>

        {/* Bottom tab bar — the whole navigation, thumb-reachable */}
        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-white/10 bg-[#0d1117]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="grid grid-cols-4">
            {TABS.map((t) => {
              const Icon = t.icon
              const on = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition ${on ? 'text-[#6EE05A]' : 'text-white/45'}`}>
                  <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.5 : 2} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
