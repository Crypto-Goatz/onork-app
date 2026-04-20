'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RequestPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [useCase, setUseCase] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    // Fire to CRM webhook
    try {
      await fetch('https://services.leadconnectorhq.com/hooks/nphConTwfHcVE1oA0uep/webhook-trigger/45345fec-2d97-4c7b-9de3-e3c190cf0847', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, useCase, source: '0ncore-request', type: 'access_request' }),
      })
    } catch {}
    setSubmitted(true)
    setSending(false)
  }

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/brand/0n-anim-logo.svg" alt="0nCore" style={{ height: 28 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}><span style={{ color: '#7ed957' }}>0n</span>CORE</span>
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 24px)' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Request Received</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 24 }}>
              We will review your request and get back to you within 24 hours. In the meantime, join us at the Launch Party.
            </p>
            <Link href="/launch-party" style={{ padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>
              RSVP for Launch Party →
            </Link>
          </div>
        ) : (
          <div style={{ maxWidth: 480, width: '100%' }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Request Access</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.6 }}>
              0nCore is currently in early access. Tell us about your use case and we will get you set up.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none' }} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" required style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none' }} />
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company (optional)" style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none' }} />
              <textarea value={useCase} onChange={e => setUseCase(e.target.value)} placeholder="Tell us about your use case..." rows={4} style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              <button type="submit" disabled={sending} style={{ padding: '14px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, border: 'none', fontSize: 15, cursor: 'pointer', boxShadow: '0 0 30px rgba(126,217,87,0.3)' }}>
                {sending ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
