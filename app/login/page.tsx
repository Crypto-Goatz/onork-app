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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) setError(oauthError.message)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault()
    setRequestLoading(true)
    try { await fetch('/api/request-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestForm) }) } catch {}
    setRequestSent(true)
    setRequestLoading(false)
  }

  return (
    <div className="login-root">
      {/* Animated green fog */}
      <div className="fog-layer fog-1" />
      <div className="fog-layer fog-2" />
      <div className="fog-layer fog-3" />

      {/* Content */}
      <div className="login-content">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/">
            <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 40, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 10, letterSpacing: '0.06em' }}>
            Your AI Command Center
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-login-card">
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* OAuth */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button onClick={() => handleOAuth('google')} className="oauth-btn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button onClick={() => handleOAuth('linkedin_oidc')} className="oauth-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Continue with LinkedIn
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label className="login-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="login-input" />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label className="login-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" className="login-input" />
            </div>
            <button type="submit" disabled={loading} className="login-submit">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setShowModal(true)} className="login-request-btn">
              Request Access
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 24 }}>
          <Link href="https://0nmcp.com" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Learn more about 0nAI</Link>
        </p>
      </div>

      {/* Request Access Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => !requestSent && setShowModal(false)}>
          <div className="glass-login-card" style={{ maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>x</button>

            {requestSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12, color: '#7ed957' }}>&#10003;</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#7ed957', marginBottom: 10 }}>Request Received</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.7 }}>
                  We are sending logins in batches. Check your email — you will hear from us shortly.
                </p>
                <button onClick={() => setShowModal(false)} className="login-submit" style={{ marginTop: 20, width: 'auto', padding: '10px 32px' }}>Got it</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Request Access</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
                  0nAI is in limited access. Join the waitlist for your personal AI agent.
                </p>
                <form onSubmit={handleRequestAccess}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label className="login-label">Name</label><input value={requestForm.name} onChange={e => setRequestForm(p => ({ ...p, name: e.target.value }))} required placeholder="Your name" className="login-input" /></div>
                    <div><label className="login-label">Email</label><input type="email" value={requestForm.email} onChange={e => setRequestForm(p => ({ ...p, email: e.target.value }))} required placeholder="you@company.com" className="login-input" /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                    <div><label className="login-label">Company</label><input value={requestForm.company} onChange={e => setRequestForm(p => ({ ...p, company: e.target.value }))} placeholder="Company" className="login-input" /></div>
                    <div><label className="login-label">Role</label><input value={requestForm.role} onChange={e => setRequestForm(p => ({ ...p, role: e.target.value }))} placeholder="Your role" className="login-input" /></div>
                  </div>
                  <button type="submit" disabled={requestLoading} className="login-submit">
                    {requestLoading ? 'Submitting...' : 'Request Access'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .login-root {
          min-height: 100vh;
          background: #020810;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .fog-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .fog-1 {
          background: radial-gradient(ellipse at 30% 60%, rgba(126,217,87,0.08) 0%, transparent 60%);
          animation: fog-drift-1 12s ease-in-out infinite alternate;
        }
        .fog-2 {
          background: radial-gradient(ellipse at 70% 30%, rgba(126,217,87,0.06) 0%, transparent 55%);
          animation: fog-drift-2 16s ease-in-out infinite alternate;
        }
        .fog-3 {
          background: radial-gradient(ellipse at 50% 80%, rgba(20,184,166,0.04) 0%, transparent 50%);
          animation: fog-drift-3 20s ease-in-out infinite alternate;
        }

        @keyframes fog-drift-1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          100% { transform: translate(40px, -30px) scale(1.15); opacity: 1; }
        }
        @keyframes fog-drift-2 {
          0% { transform: translate(0, 0) scale(1.1); opacity: 0.5; }
          100% { transform: translate(-50px, 20px) scale(1); opacity: 0.9; }
        }
        @keyframes fog-drift-3 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          100% { transform: translate(30px, -40px) scale(1.2); opacity: 0.7; }
        }

        .login-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 400px;
        }

        .glass-login-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px;
          position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .oauth-btn {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .oauth-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.15);
        }

        .login-label {
          display: block;
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          margin-bottom: 6px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .login-input {
          width: 100%;
          padding: 11px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .login-input:focus {
          border-color: rgba(126,217,87,0.5);
          box-shadow: 0 0 0 3px rgba(126,217,87,0.06);
        }
        .login-input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .login-submit {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #7ed957, #5cb83a);
          color: #020810;
          font-weight: 700;
          font-size: 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .login-submit:hover { opacity: 0.9; }
        .login-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-request-btn {
          width: 100%;
          padding: 12px;
          background: transparent;
          color: #7ed957;
          font-weight: 600;
          font-size: 13px;
          border-radius: 10px;
          border: 1px solid rgba(126,217,87,0.25);
          cursor: pointer;
          transition: all 0.2s;
        }
        .login-request-btn:hover {
          background: rgba(126,217,87,0.06);
          box-shadow: 0 0 20px rgba(126,217,87,0.1);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        @media (prefers-reduced-motion: reduce) {
          .fog-layer { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
