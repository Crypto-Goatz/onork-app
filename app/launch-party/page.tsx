'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LaunchPartyPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [count, setCount] = useState(33)

  // Simulate growing count (base 33 + days since April 22)
  useEffect(() => {
    const base = 33
    const start = new Date('2026-04-22').getTime()
    const now = Date.now()
    const daysPassed = Math.floor((now - start) / (24 * 60 * 60 * 1000))
    const growth = Math.floor(daysPassed * 2.7 + Math.random() * 3) // ~2-3 new per day
    setCount(base + Math.max(0, growth))
  }, [])

  // Countdown to May 1
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 })
  useEffect(() => {
    const target = new Date('2026-05-01T21:00:00-04:00').getTime()
    const tick = () => {
      const diff = Math.max(0, target - Date.now())
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [])

  async function handleRSVP(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      await fetch('https://services.leadconnectorhq.com/hooks/nphConTwfHcVE1oA0uep/webhook-trigger/45345fec-2d97-4c7b-9de3-e3c190cf0847', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source: '0ncore-launch-party', type: 'launch_party_rsvp', event_date: '2026-05-01T21:00:00-04:00' }),
      })
    } catch {}
    setSubmitted(true)
    setSending(false)
    setCount(c => c + 1)
  }

  const shareUrl = 'https://0ncore.com/launch-party'
  const shareText = 'I just reserved my spot for the 0nCore Launch Party — May 1st. 1,554 AI tools, live demo, exclusive early access. Join me!'

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* ═══ Animated Background ═══ */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.4 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g1" cx="50%" cy="40%"><stop offset="0%" stopColor="#6EE05A" stopOpacity="0.08"/><stop offset="60%" stopColor="transparent"/></radialGradient>
          <radialGradient id="g2" cx="80%" cy="60%"><stop offset="0%" stopColor="#00B4FF" stopOpacity="0.06"/><stop offset="50%" stopColor="transparent"/></radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g1)"/>
        <rect width="100%" height="100%" fill="url(#g2)"/>
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <circle key={i} r={1 + Math.random() * 2} fill={i % 2 === 0 ? '#6EE05A' : '#00B4FF'} opacity={0.3 + Math.random() * 0.4}>
            <animate attributeName="cx" values={`${10 + Math.random() * 80}%;${20 + Math.random() * 60}%;${10 + Math.random() * 80}%`} dur={`${15 + Math.random() * 20}s`} repeatCount="indefinite"/>
            <animate attributeName="cy" values={`${10 + Math.random() * 80}%;${30 + Math.random() * 40}%;${10 + Math.random() * 80}%`} dur={`${20 + Math.random() * 15}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values={`${0.2 + Math.random() * 0.3};${0.5 + Math.random() * 0.3};${0.2 + Math.random() * 0.3}`} dur={`${3 + Math.random() * 4}s`} repeatCount="indefinite"/>
          </circle>
        ))}
        {/* Orbiting ring */}
        <circle cx="50%" cy="45%" r="200" fill="none" stroke="#6EE05A" strokeWidth="0.5" strokeDasharray="8 12" opacity="0.15">
          <animateTransform attributeName="transform" type="rotate" from="0 50% 45%" to="360 50% 45%" dur="60s" repeatCount="indefinite"/>
        </circle>
        <circle cx="50%" cy="45%" r="280" fill="none" stroke="#00B4FF" strokeWidth="0.5" strokeDasharray="4 16" opacity="0.1">
          <animateTransform attributeName="transform" type="rotate" from="360 50% 45%" to="0 50% 45%" dur="80s" repeatCount="indefinite"/>
        </circle>
      </svg>

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/investors" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600 }}>Investors</Link>
          <Link href="/affiliates" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600 }}>Affiliates</Link>
          <Link href="/login" style={{ fontSize: 12, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '6px 16px', borderRadius: 8, textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', maxWidth: 620 }}>

          {/* Live counter */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#6EE05A', background: 'rgba(110,224,90,0.06)', padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(110,224,90,0.15)', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6EE05A', boxShadow: '0 0 8px #6EE05A', animation: 'pulse 2s ease-in-out infinite' }}/>
            {count} people have reserved their spot
          </div>

          {/* Date */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
            May 1, 2026 · 9:00 PM EST
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 'clamp(40px, 7vw, 64px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
            The <span style={{ background: 'linear-gradient(135deg, #6EE05A, #00B4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>0nCore</span><br />Launch Party
          </h1>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 10, maxWidth: 480, margin: '0 auto 10px' }}>
            Live demo of 1,554 AI tools in action. Exclusive early access for the first 50 attendees. Behind-the-scenes look at the future.
          </p>

          {/* Countdown */}
          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 16px)', justifyContent: 'center', marginBottom: 36, marginTop: 24 }}>
            {[
              { val: countdown.days, label: 'Days' },
              { val: countdown.hours, label: 'Hours' },
              { val: countdown.mins, label: 'Minutes' },
              { val: countdown.secs, label: 'Seconds' },
            ].map(t => (
              <div key={t.label} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 'clamp(52px, 8vw, 72px)', height: 'clamp(52px, 8vw, 72px)',
                  borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                  color: '#f0f4f8',
                }}>
                  {String(t.val).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{t.label}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ display: 'flex', gap: 'clamp(12px, 3vw, 24px)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
            {[
              { icon: '⚡', label: 'Live Demo', desc: '1,554 tools in action' },
              { icon: '🎯', label: 'Early Access', desc: 'First 50 attendees' },
              { icon: '🧠', label: 'AI Deep Dive', desc: 'K-layers explained' },
              { icon: '💬', label: 'Live Q&A', desc: 'Ask anything' },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8' }}>{item.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {/* RSVP Form or Confirmation */}
          {submitted ? (
            <div style={{ padding: 32, borderRadius: 20, background: 'rgba(110,224,90,0.04)', border: '1px solid rgba(110,224,90,0.15)' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
                <circle cx="24" cy="24" r="22" stroke="#6EE05A" strokeWidth="2" fill="rgba(110,224,90,0.1)">
                  <animate attributeName="r" values="20;22;20" dur="2s" repeatCount="indefinite"/>
                </circle>
                <path d="M16 24l5 5 11-11" stroke="#6EE05A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <animate attributeName="stroke-dashoffset" from="30" to="0" dur="0.6s" fill="freeze"/>
                  <animate attributeName="stroke-dasharray" from="0 30" to="30 0" dur="0.6s" fill="freeze"/>
                </path>
              </svg>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>You&apos;re In!</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 20 }}>
                Spot #{count} reserved. We&apos;ll send your exclusive invite link before May 1st.
              </p>

              {/* Social Share */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(29,161,242,0.1)', border: '1px solid rgba(29,161,242,0.2)', color: '#1DA1F2', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Share on X
                </a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.2)', color: '#0A66C2', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
                <button onClick={() => { navigator.clipboard.writeText(shareUrl) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  Copy Link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRSVP} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380, margin: '0 auto' }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required
                style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', textAlign: 'center' }} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" required
                style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', textAlign: 'center' }} />
              <button type="submit" disabled={sending} style={{
                padding: '16px', background: 'linear-gradient(135deg, #6EE05A, #00B4FF)', color: '#020810',
                fontWeight: 800, borderRadius: 12, border: 'none', fontSize: 16, cursor: 'pointer',
                boxShadow: '0 0 40px rgba(110,224,90,0.3), 0 0 80px rgba(0,180,255,0.15)',
                letterSpacing: '0.02em', transition: 'transform 0.2s, box-shadow 0.2s',
              }}>
                {sending ? 'Reserving...' : 'Reserve My Spot'}
              </button>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>Free · Limited seats · No credit card required</span>
            </form>
          )}

          {/* Links */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
            <Link href="/investors" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              Investor Info
            </Link>
            <Link href="/affiliates" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              Become an Affiliate
            </Link>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share Event
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }
      `}</style>
    </div>
  )
}
