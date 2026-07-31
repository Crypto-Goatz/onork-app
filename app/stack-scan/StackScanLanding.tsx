'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ShieldCheck, Server, Lock, FileSearch, Globe, Fingerprint,
  AlertTriangle, Cookie, Network, Loader2,
} from 'lucide-react'
import AnimatedGrid from '@/components/animated-grid'

const PRICE_PER_BLOCK = 250
const CONTACTS_PER_BLOCK = 1500

const SCANS = [
  { icon: Fingerprint, t: 'Full tech fingerprint', d: 'CMS + version, theme, plugins, framework, language, server, CDN, analytics, JS libs — Wappalyzer-grade detection.' },
  { icon: ShieldCheck, t: '10 security headers', d: 'HSTS, CSP, X-Frame-Options, and 7 more — present/absent, graded.' },
  { icon: Lock, t: 'TLS posture', d: 'Detects TLS 1.0/1.1 (deprecated), cert expiry & issuer, cipher suite.' },
  { icon: FileSearch, t: 'Sensitive path audit', d: '25+ paths — phpinfo, .env, .git, backups, exposed configs, open registration.' },
  { icon: Cookie, t: 'Cookie + CORS', d: 'Secure/HttpOnly/SameSite flags, wildcard CORS + Authorization exposure.' },
  { icon: Server, t: 'EOL component flags', d: 'End-of-life PHP/OpenSSL/Apache with CVE counts and dates.' },
  { icon: Network, t: 'DNS + subdomains', d: 'A/MX/TXT/NS, SPF/DKIM/DMARC, CDN, and common subdomain exposure.' },
  { icon: AlertTriangle, t: 'HIPAA compliance score', d: 'Current-rule + 2026 NPRM grade (A–F) with findings & remediation.' },
]

export default function StackScanLanding() {
  const [contacts, setContacts] = useState(1500)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const blocks = Math.max(1, Math.ceil((Number(contacts) || 0) / CONTACTS_PER_BLOCK))
  const price = blocks * PRICE_PER_BLOCK

  async function buy() {
    setErr(''); setLoading(true)
    try {
      const r = await fetch('/api/services/stack-scan/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: Number(contacts) || CONTACTS_PER_BLOCK, email: email || undefined }),
      })
      const j = await r.json()
      if (j.url) window.location.href = j.url
      else setErr(j.error || 'Could not start checkout')
    } catch {
      setErr('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <AnimatedGrid />
        <div aria-hidden className="pointer-events-none absolute -top-32 left-[10%] h-[520px] w-[520px] rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
        <div aria-hidden className="pointer-events-none absolute top-[8%] right-[8%] h-[400px] w-[400px] rounded-full bg-[#00d4ff]/[0.05] blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 sm:py-28 lg:grid-cols-2">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
              <Fingerprint className="h-3.5 w-3.5" /> Done-for-you bulk scan
            </div>
            <h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              <span className="block text-white">Fingerprint any list of</span>
              <span className="block bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                websites at scale.
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/75">
              Send us your contact list — we scan every site's full tech stack, security posture,
              and HIPAA compliance from the outside. No login, no agents, no installs.
              <strong className="text-white"> 51 checks per URL.</strong>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="#buy" className="inline-flex items-center gap-2 rounded-xl bg-[#7ed957] px-7 py-3 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02]">
                Scan my list <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="font-mono text-sm text-white/55">$250 / 1,500 contacts</span>
            </div>
          </div>

          {/* What we scan, compact */}
          <div className="grid grid-cols-2 gap-3">
            {SCANS.slice(0, 8).map((s, i) => {
              const c = ['#7ed957', '#00d4ff', '#a78bfa'][i % 3]
              return (
                <div key={s.t} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border bg-[#0d1117]" style={{ borderColor: `${c}40`, boxShadow: `0 0 18px ${c}22` }}>
                    <s.icon className="h-4 w-4" style={{ color: c }} />
                  </div>
                  <div className="text-sm font-bold text-white">{s.t}</div>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{s.d}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* BUY / CALCULATOR */}
      <section id="buy" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[130px]" />
        <div className="relative mx-auto max-w-2xl px-6 py-24">
          <div className="mb-8 text-center">
            <span className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">Simple pricing</span>
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">$250 per 1,500 contacts.</span>
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[#7ed957]/25 bg-gradient-to-br from-[#7ed957]/[0.05] via-[#00d4ff]/[0.02] to-[#a78bfa]/[0.05] p-8 backdrop-blur sm:p-10">
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/55">How many contacts / sites?</label>
            <input
              type="number" min={1} step={100} value={contacts}
              onChange={(e) => setContacts(Math.max(1, Number(e.target.value)))}
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-5 py-4 text-2xl font-black text-white outline-none focus:border-[#7ed957]/50"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[1500, 3000, 7500, 15000].map((n) => (
                <button key={n} onClick={() => setContacts(n)} className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]">
                  {n.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">{blocks.toLocaleString()} × 1,500-contact block{blocks > 1 ? 's' : ''}</div>
                <div className="mt-1 text-sm text-white/60">Covers up to {(blocks * CONTACTS_PER_BLOCK).toLocaleString()} sites</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black"><span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">${price.toLocaleString()}</span></div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">one-time</div>
              </div>
            </div>

            <input
              type="email" value={email} placeholder="you@company.com (for your report)"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-6 w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#7ed957]/50"
            />
            {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
            <button
              onClick={buy} disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-7 py-4 text-base font-bold text-[#020810] shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout…</> : <>Pay ${price.toLocaleString()} & continue <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="mt-3 text-center text-xs text-white/45">
              <Globe className="mr-1 inline h-3 w-3" /> After payment you'll upload your list of sites. Results process automatically.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
