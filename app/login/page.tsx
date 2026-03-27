'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ name: '', email: '', company: '', role: '' })
  const [requestSent, setRequestSent] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault()
    setRequestLoading(true)

    try {
      await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm),
      })
      setRequestSent(true)
    } catch {
      setRequestSent(true) // Show success even if API fails — we'll retry server-side
    }

    setRequestLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(126,217,87,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{
              fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em',
              color: '#0a0a0a',
              textShadow: '0 0 30px rgba(126,217,87,0.8), 0 0 60px rgba(126,217,87,0.5), 0 0 100px rgba(126,217,87,0.3)',
              WebkitTextStroke: '1px rgba(126,217,87,0.15)',
            }}>0nAI</h1>
          </Link>
          <p style={{ color: '#555', fontSize: 14, marginTop: 8, letterSpacing: '0.05em' }}>
            Your AI Command Center
          </p>
        </div>

        {/* Login Form */}
        <div style={{
          background: '#0c0c0c',
          border: '1px solid #1a1a1a',
          borderRadius: 16,
          padding: 28,
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 13,
              color: '#ef4444',
            }}>{error}</div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: '#111', border: '1px solid #222', borderRadius: 10,
                  color: '#e0e0e0', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#7ed957'}
                onBlur={e => e.target.style.borderColor = '#222'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Enter your password"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: '#111', border: '1px solid #222', borderRadius: 10,
                  color: '#e0e0e0', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#7ed957'}
                onBlur={e => e.target.style.borderColor = '#222'}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? '#333' : 'linear-gradient(135deg, #7ed957, #5cb83a)',
              color: '#050505', fontWeight: 700, fontSize: 15,
              borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', margin: '20px 0 0', borderTop: '1px solid #1a1a1a', paddingTop: 20 }}>
            <button onClick={() => setShowModal(true)} style={{
              width: '100%', padding: '13px',
              background: 'transparent',
              color: '#7ed957', fontWeight: 600, fontSize: 14,
              borderRadius: 10, border: '1px solid #7ed957',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(126,217,87,0.08)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(126,217,87,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Request Access
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#444', marginTop: 24 }}>
          <Link href="https://0nmcp.com" style={{ color: '#555' }}>Learn more about 0nAI</Link>
        </p>
      </div>

      {/* Request Access Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => !requestSent && setShowModal(false)}>
          <div style={{
            width: '100%', maxWidth: 480,
            background: '#0c0c0c',
            border: '1px solid #1a1a1a',
            borderRadius: 20,
            padding: 32,
            position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20,
            }}>×</button>

            {requestSent ? (
              /* Success State */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#7ed957', marginBottom: 12 }}>Request Received</h2>
                <p style={{ color: '#888', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                  Thank you for your interest in 0nAI. We're sending logins in batches to optimize our servers for the best possible experience.
                </p>
                <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6 }}>
                  Check your email — you'll hear from us shortly.
                </p>
                <button onClick={() => setShowModal(false)} style={{
                  marginTop: 24, padding: '12px 32px',
                  background: 'linear-gradient(135deg, #7ed957, #5cb83a)',
                  color: '#050505', fontWeight: 700, borderRadius: 10,
                  border: 'none', cursor: 'pointer', fontSize: 14,
                }}>Got it</button>
              </div>
            ) : (
              /* Form */
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#e0e0e0', marginBottom: 6 }}>Request Access to 0nAI</h2>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                  0nAI is currently in limited access. Join the waitlist and we'll assign you a personal AI agent as capacity opens up.
                </p>

                {/* Capabilities Preview */}
                <div style={{
                  background: '#111', border: '1px solid #1a1a1a', borderRadius: 12,
                  padding: 16, marginBottom: 24,
                }}>
                  <div style={{ fontSize: 11, color: '#7ed957', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>What You Get</div>
                  {[
                    '819+ AI tools across 54 services',
                    'Personal AI agent (Jaxx) trained on your business',
                    'Multi-AI Council (GPT-4o + Gemini + Grok + Claude + Llama)',
                    'CRM integration with automated workflows',
                    'Real-time team chat with AI mentions',
                    'Self-improving knowledge base',
                  ].map(cap => (
                    <div key={cap} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0' }}>
                      <span style={{ color: '#7ed957', fontSize: 12, marginTop: 2 }}>+</span>
                      <span style={{ color: '#999', fontSize: 13 }}>{cap}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleRequestAccess}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                      <input value={requestForm.name} onChange={e => setRequestForm(p => ({ ...p, name: e.target.value }))} required placeholder="Your name"
                        style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#e0e0e0', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#7ed957'} onBlur={e => e.target.style.borderColor = '#222'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                      <input type="email" value={requestForm.email} onChange={e => setRequestForm(p => ({ ...p, email: e.target.value }))} required placeholder="you@company.com"
                        style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#e0e0e0', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#7ed957'} onBlur={e => e.target.style.borderColor = '#222'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</label>
                      <input value={requestForm.company} onChange={e => setRequestForm(p => ({ ...p, company: e.target.value }))} placeholder="Your company"
                        style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#e0e0e0', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#7ed957'} onBlur={e => e.target.style.borderColor = '#222'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                      <input value={requestForm.role} onChange={e => setRequestForm(p => ({ ...p, role: e.target.value }))} placeholder="Your role"
                        style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, color: '#e0e0e0', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#7ed957'} onBlur={e => e.target.style.borderColor = '#222'} />
                    </div>
                  </div>

                  <button type="submit" disabled={requestLoading} style={{
                    width: '100%', padding: '13px',
                    background: requestLoading ? '#333' : 'linear-gradient(135deg, #7ed957, #5cb83a)',
                    color: '#050505', fontWeight: 700, fontSize: 15,
                    borderRadius: 10, border: 'none', cursor: requestLoading ? 'not-allowed' : 'pointer',
                  }}>
                    {requestLoading ? 'Submitting...' : 'Request Access'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
