'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { VideoBg } from '@/components/video-bg'
import { Check, X } from 'lucide-react'

const FEATURES = [
  '1,554+ AI tools across 96 services',
  '31 add-on modules — unlock what you need',
  'Voice AI agents with knowledge base',
  'AI course builder — auto-import to CRM',
  'Social media OAuth — connect all platforms',
  'Email campaigns with IP warm-up',
  'Automation switches — one-click workflows',
  'Multi-channel execution — Slack, MCP, API, CLI',
  'Real-time workflow monitoring & logging',
  'Full CRM integration with 140+ OAuth scopes',
  'Stripe billing + marketplace rebilling',
  '5 patents pending — Three-Level Execution',
]

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
    const options: Record<string, unknown> = {
      redirectTo: `${window.location.origin}/auth/callback`,
    }

    // Request extended scopes so the login also grants analytics/workspace access
    if (provider === 'google') {
      options.queryParams = {
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/calendar',
        ].join(' '),
      }
    }

    if (provider === 'linkedin_oidc') {
      options.scopes = 'openid profile email w_member_social'
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options,
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
    <div className="login-split relative">
      {/* Video background */}
      <VideoBg opacity={0.08} />

      {/* LEFT — Login */}
      <div className="login-left">
        <div className="login-left-inner">
          <div className="text-center mb-8">
            <Link href="/">
              <img src="/brand/0ncore-logo.png" alt="0nCore" className="h-9 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </Link>
            <p className="text-white/35 text-[12px] mt-2 tracking-[0.06em]">
              Your AI Command Center
            </p>
          </div>

          <div className="glass-login-card">
            {error && (
              <div className="bg-[#ef4444]/[0.08] border border-[#ef4444]/20 rounded-[10px] px-[14px] py-[10px] mb-[14px] text-[13px] text-[#ef4444]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-[10px] mb-[18px]">
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

            <div className="flex items-center gap-3 mb-[18px]">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-white/25 uppercase tracking-[0.1em]">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="login-label">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="login-input" />
              </div>
              <div className="mb-5">
                <label className="login-label">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" className="login-input" />
              </div>
              <button type="submit" disabled={loading} className="login-submit">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="text-center mt-4 pt-4 border-t border-white/[0.05]">
              <button onClick={() => setShowModal(true)} className="login-request-btn">
                Request Access
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-white/20 mt-5">
            <Link href="https://0nmcp.com" className="text-white/30 no-underline">Learn more about 0nAI</Link>
          </p>
        </div>
      </div>

      {/* RIGHT — Features */}
      <div className="login-right">
        <div className="login-right-inner">
          <div className="text-center mb-10">
            <img src="/brand/0n-icon-white.svg" alt="0n" className="h-14 object-contain drop-shadow-[0_0_30px_rgba(126,217,87,0.4)]" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>

          <h2 className="features-title">
            Scale with <span className="text-[#7ed957]">AI</span>
          </h2>
          <p className="features-subtitle">Everything you need to automate your business.</p>

          <div className="features-list">
            {FEATURES.map((f, i) => (
              <div key={f} className="feature-item" style={{ animationDelay: `${i * 150}ms` }}>
                <span className="feature-check">
                  <Check size={10} strokeWidth={3} />
                </span>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="features-stats">
            <div className="features-stat">
              <div className="features-stat-value">313</div>
              <div className="features-stat-label">CRM Tools</div>
            </div>
            <div className="features-stat">
              <div className="features-stat-value">31</div>
              <div className="features-stat-label">Add-ons</div>
            </div>
            <div className="features-stat">
              <div className="features-stat-value">96</div>
              <div className="features-stat-label">Services</div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Access Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => !requestSent && setShowModal(false)}>
          <div className="glass-login-card max-w-[480px] w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 bg-transparent border-none text-white/40 cursor-pointer text-lg leading-none p-0">
              <X size={18} />
            </button>
            {requestSent ? (
              <div className="text-center py-5">
                <div className="mb-3 text-[#7ed957] flex justify-center">
                  <Check size={40} strokeWidth={2} />
                </div>
                <h2 className="text-xl font-extrabold text-[#7ed957] mb-[10px]">Request Received</h2>
                <p className="text-white/50 text-[13px] leading-[1.7]">Check your email — you will hear from us shortly.</p>
                <button onClick={() => setShowModal(false)} className="login-submit mt-5 w-auto px-8 py-[10px]">Got it</button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-extrabold text-white mb-[6px]">Request Access</h2>
                <p className="text-white/40 text-[12px] mb-5">Join the waitlist for your personal AI agent.</p>
                <form onSubmit={handleRequestAccess}>
                  <div className="grid grid-cols-2 gap-[10px] mb-[10px]">
                    <div><label className="login-label">Name</label><input value={requestForm.name} onChange={e => setRequestForm(p => ({ ...p, name: e.target.value }))} required placeholder="Your name" className="login-input" /></div>
                    <div><label className="login-label">Email</label><input type="email" value={requestForm.email} onChange={e => setRequestForm(p => ({ ...p, email: e.target.value }))} required placeholder="you@company.com" className="login-input" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-[10px] mb-[18px]">
                    <div><label className="login-label">Company</label><input value={requestForm.company} onChange={e => setRequestForm(p => ({ ...p, company: e.target.value }))} placeholder="Company" className="login-input" /></div>
                    <div><label className="login-label">Role</label><input value={requestForm.role} onChange={e => setRequestForm(p => ({ ...p, role: e.target.value }))} placeholder="Your role" className="login-input" /></div>
                  </div>
                  <button type="submit" disabled={requestLoading} className="login-submit">{requestLoading ? 'Submitting...' : 'Request Access'}</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .login-split {
          min-height: 100vh;
          background: #020810;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        .fog-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .fog-1 { background: radial-gradient(ellipse at 20% 60%, rgba(126,217,87,0.07) 0%, transparent 55%); animation: fog-drift-1 12s ease-in-out infinite alternate; }
        .fog-2 { background: radial-gradient(ellipse at 80% 30%, rgba(126,217,87,0.05) 0%, transparent 50%); animation: fog-drift-2 16s ease-in-out infinite alternate; }
        .fog-3 { background: radial-gradient(ellipse at 50% 90%, rgba(20,184,166,0.04) 0%, transparent 50%); animation: fog-drift-3 20s ease-in-out infinite alternate; }

        @keyframes fog-drift-1 { 0% { transform: translate(0,0) scale(1); opacity:.6; } 100% { transform: translate(40px,-30px) scale(1.15); opacity:1; } }
        @keyframes fog-drift-2 { 0% { transform: translate(0,0) scale(1.1); opacity:.5; } 100% { transform: translate(-50px,20px) scale(1); opacity:.9; } }
        @keyframes fog-drift-3 { 0% { transform: translate(0,0) scale(1); opacity:.4; } 100% { transform: translate(30px,-40px) scale(1.2); opacity:.7; } }

        .login-left {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          position: relative;
          z-index: 10;
        }
        .login-left-inner { width: 100%; max-width: 380px; }

        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          position: relative;
          z-index: 10;
          border-left: 1px solid rgba(255,255,255,0.04);
        }
        .login-right-inner { width: 100%; max-width: 440px; }

        @media (max-width: 900px) {
          .login-split { flex-direction: column; }
          .login-right { border-left: none; border-top: 1px solid rgba(255,255,255,0.04); padding: 24px 16px; }
          .login-left { padding: 24px 16px; }
        }
        @media (max-width: 480px) {
          .glass-login-card { padding: 20px; }
          .grid-cols-2 { grid-template-columns: 1fr !important; }
        }

        .glass-login-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px;
          position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .oauth-btn {
          width: 100%; padding: 11px 16px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .oauth-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }

        .login-label { display: block; font-size: 10px; color: rgba(255,255,255,0.3); margin-bottom: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
        .login-input {
          width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s;
        }
        .login-input:focus { border-color: rgba(126,217,87,0.4); box-shadow: 0 0 0 3px rgba(126,217,87,0.05); }
        .login-input::placeholder { color: rgba(255,255,255,0.15); }

        .login-submit {
          width: 100%; padding: 11px; background: linear-gradient(135deg, #7ed957, #5cb83a);
          color: #020810; font-weight: 700; font-size: 14px; border-radius: 10px; border: none; cursor: pointer; transition: opacity 0.2s;
        }
        .login-submit:hover { opacity: 0.9; }
        .login-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-request-btn {
          width: 100%; padding: 11px; background: transparent; color: #7ed957; font-weight: 600; font-size: 13px;
          border-radius: 10px; border: 1px solid rgba(126,217,87,0.2); cursor: pointer; transition: all 0.2s;
        }
        .login-request-btn:hover { background: rgba(126,217,87,0.05); box-shadow: 0 0 20px rgba(126,217,87,0.08); }

        .features-title {
          font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0 0 8px;
        }
        .features-subtitle {
          font-size: 14px; color: rgba(255,255,255,0.4); margin: 0 0 32px;
        }

        .features-list { display: flex; flex-direction: column; gap: 0; }

        .feature-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 0;
          font-size: 13px; color: rgba(255,255,255,0.6); border-bottom: 1px solid rgba(255,255,255,0.03);
          opacity: 0; animation: feature-fade-in 0.4s ease forwards;
        }
        .feature-check {
          color: #7ed957; font-size: 12px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
          background: rgba(126,217,87,0.08); border-radius: 6px; flex-shrink: 0;
        }

        @keyframes feature-fade-in {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .features-stats {
          display: flex; gap: 16px; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);
        }
        .features-stat { flex: 1; text-align: center; }
        .features-stat-value { font-size: 24px; font-weight: 800; color: #7ed957; }
        .features-stat-label { font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

        .modal-backdrop {
          position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 24px;
        }

        @media (prefers-reduced-motion: reduce) {
          .fog-layer, .feature-item { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  )
}
