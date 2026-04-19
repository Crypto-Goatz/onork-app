'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LaunchPartyPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

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
  }

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/brand/0n-anim-logo.svg" alt="0nCore" style={{ height: 28 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}><span style={{ color: '#7ed957' }}>0n</span>CORE</span>
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        {/* Background effects */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(126,217,87,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', maxWidth: 560, position: 'relative', zIndex: 2 }}>
          {/* Date badge */}
          <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#7ed957', background: 'rgba(126,217,87,0.08)', padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(126,217,87,0.2)', marginBottom: 32, letterSpacing: '0.08em' }}>
            MAY 1, 2026 · 9:00 PM EST
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
            The <span style={{ color: '#7ed957' }}>0nCore</span><br />Launch Party
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 12 }}>
            Live demo. Exclusive early access. Behind-the-scenes look at the future of AI orchestration.
          </p>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 40 }}>
            {[
              { label: 'Live Demo', desc: 'See 0nCore in action' },
              { label: 'Early Access', desc: 'First 50 attendees' },
              { label: 'Q&A', desc: 'Direct with the team' },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#7ed957', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {submitted ? (
            <div style={{ padding: 32, borderRadius: 16, background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.2)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>You are on the list!</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                We will send you the exclusive invite link before May 1st. Keep an eye on your inbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRSVP} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto' }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none', textAlign: 'center' }} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" required style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none', textAlign: 'center' }} />
              <button type="submit" disabled={sending} style={{ padding: '16px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, border: 'none', fontSize: 16, cursor: 'pointer', boxShadow: '0 0 40px rgba(126,217,87,0.4)', letterSpacing: '0.02em' }}>
                {sending ? 'Reserving...' : 'Reserve My Spot'}
              </button>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Free · Limited to 50 seats · No credit card</span>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
