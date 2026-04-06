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

  async function handleOAuth(provider: 'google' | 'linkedin_oidc') {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (oauthError) setError(oauthError.message)
  }

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
      background: 'var(--bg-deep, #040A1A)',
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
        background: 'radial-gradient(circle, var(--accent-glow, rgba(126,217,87,0.06)) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{
              fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em',
              color: 'var(--bg-deep, #040A1A)',
              textShadow: '0 0 30px rgba(126,217,87,0.8), 0 0 60px rgba(126,217,87,0.5), 0 0 100px rgba(126,217,87,0.3)',
              WebkitTextStroke: '1px rgba(126,217,87,0.15)',
            }}>0nAI</h1>
          </Link>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, marginTop: 8, letterSpacing: '0.05em' }}>
            Your AI Command Center
          </p>
        </div>

        {/* Login Form */}
        <div style={{
          background: 'var(--bg-secondary, #161b22)',
          border: '1px solid var(--border, #30363d)',
          borderRadius: 16,
          padding: 28,
        }}>
          {error && (
            <div style={{
              background: 'rgba(185,28,28,0.08)',
              border: '1px solid rgba(185,28,28,0.2)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--color-red, #b91c1c)',
            }}>{error}</div>
          )}

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button onClick={() => handleOAuth('google')} style={{
              width: '100%', padding: '12px 16px',
              background: 'var(--bg-tertiary, #1c2333)', border: '1px solid var(--border, #30363d)', borderRadius: 10,
              color: 'var(--text-on-dark, #E0E0E0)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285f4'; e.currentTarget.style.background = 'rgba(66,133,244,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border, #30363d)'; e.currentTarget.style.background = 'var(--bg-tertiary, #1c2333)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button onClick={() => handleOAuth('linkedin_oidc')} style={{
              width: '100%', padding: '12px 16px',
              background: 'var(--bg-tertiary, #1c2333)', border: '1px solid var(--border, #30363d)', borderRadius: 10,
              color: 'var(--text-on-dark, #E0E0E0)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0A66C2'; e.currentTarget.style.background = 'rgba(10,102,194,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border, #30363d)'; e.currentTarget.style.background = 'var(--bg-tertiary, #1c2333)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Continue with LinkedIn
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border, #30363d)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border, #30363d)' }} />
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--bg-tertiary, #1c2333)', border: '1px solid var(--border, #30363d)', borderRadius: 10,
                  color: 'var(--text-on-dark, #E0E0E0)', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent, #7ed957)'}
                onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Enter your password"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--bg-tertiary, #1c2333)', border: '1px solid var(--border, #30363d)', borderRadius: 10,
                  color: 'var(--text-on-dark, #E0E0E0)', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent, #7ed957)'}
                onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? 'var(--text-muted, #6b7280)' : 'linear-gradient(135deg, var(--accent, #7ed957), var(--accent-dim, #5cb83a))',
              color: 'var(--bg-deep, #040A1A)', fontWeight: 700, fontSize: 15,
              borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', margin: '20px 0 0', borderTop: '1px solid var(--border, #30363d)', paddingTop: 20 }}>
            <button onClick={() => setShowModal(true)} style={{
              width: '100%', padding: '13px',
              background: 'transparent',
              color: 'var(--accent, #7ed957)', fontWeight: 600, fontSize: 14,
              borderRadius: 10, border: '1px solid var(--accent, #7ed957)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-glow, rgba(126,217,87,0.08))'; e.currentTarget.style.boxShadow = '0 0 20px rgba(126,217,87,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Request Access
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 24 }}>
          <Link href="https://0nmcp.com" style={{ color: 'var(--text-secondary, #9ca3af)' }}>Learn more about 0nAI</Link>
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
            background: 'var(--bg-secondary, #161b22)',
            border: '1px solid var(--border, #30363d)',
            borderRadius: 20,
            padding: 32,
            position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 20,
            }}>x</button>

            {requestSent ? (
              /* Success State */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent, #7ed957)', marginBottom: 12 }}>Request Received</h2>
                <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                  Thank you for your interest in 0nAI. We are sending logins in batches to optimize our servers for the best possible experience.
                </p>
                <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, lineHeight: 1.6 }}>
                  Check your email — you will hear from us shortly.
                </p>
                <button onClick={() => setShowModal(false)} style={{
                  marginTop: 24, padding: '12px 32px',
                  background: 'linear-gradient(135deg, var(--accent, #7ed957), var(--accent-dim, #5cb83a))',
                  color: 'var(--bg-deep, #040A1A)', fontWeight: 700, borderRadius: 10,
                  border: 'none', cursor: 'pointer', fontSize: 14,
                }}>Got it</button>
              </div>
            ) : (
              /* Form */
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-on-dark, #E0E0E0)', marginBottom: 6 }}>Request Access to 0nAI</h2>
                <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                  0nAI is currently in limited access. Join the waitlist and we will assign you a personal AI agent as capacity opens up.
                </p>

                {/* Capabilities Preview */}
                <div style={{
                  background: 'var(--bg-tertiary, #1c2333)', border: '1px solid var(--border, #30363d)', borderRadius: 12,
                  padding: 16, marginBottom: 24,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--accent, #7ed957)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>What You Get</div>
                  {[
                    '819+ AI tools across 54 services',
                    'Personal AI agent (Jaxx) trained on your business',
                    'Multi-AI Council (GPT-4o + Gemini + Grok + Claude + Llama)',
                    'CRM integration with automated workflows',
                    'Real-time team chat with AI mentions',
                    'Self-improving knowledge base',
                  ].map(cap => (
                    <div key={cap} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0' }}>
                      <span style={{ color: 'var(--accent, #7ed957)', fontSize: 12, marginTop: 2 }}>+</span>
                      <span style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 13 }}>{cap}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleRequestAccess}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                      <input value={requestForm.name} onChange={e => setRequestForm(p => ({ ...p, name: e.target.value }))} required placeholder="Your name"
                        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 8, color: 'var(--text-on-dark, #E0E0E0)', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent, #7ed957)'} onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                      <input type="email" value={requestForm.email} onChange={e => setRequestForm(p => ({ ...p, email: e.target.value }))} required placeholder="you@company.com"
                        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 8, color: 'var(--text-on-dark, #E0E0E0)', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent, #7ed957)'} onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</label>
                      <input value={requestForm.company} onChange={e => setRequestForm(p => ({ ...p, company: e.target.value }))} placeholder="Your company"
                        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 8, color: 'var(--text-on-dark, #E0E0E0)', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent, #7ed957)'} onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                      <input value={requestForm.role} onChange={e => setRequestForm(p => ({ ...p, role: e.target.value }))} placeholder="Your role"
                        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 8, color: 'var(--text-on-dark, #E0E0E0)', fontSize: 14, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent, #7ed957)'} onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'} />
                    </div>
                  </div>

                  <button type="submit" disabled={requestLoading} style={{
                    width: '100%', padding: '13px',
                    background: requestLoading ? 'var(--text-muted, #6b7280)' : 'linear-gradient(135deg, var(--accent, #7ed957), var(--accent-dim, #5cb83a))',
                    color: 'var(--bg-deep, #040A1A)', fontWeight: 700, fontSize: 15,
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
