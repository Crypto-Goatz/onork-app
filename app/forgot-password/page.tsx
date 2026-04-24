'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, Check, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#020810] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/brand/0ncore-logo.png" alt="0nCore" className="h-8 mx-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </Link>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.07] rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#7ed957]/15 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-[#7ed957]" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
              <p className="text-sm text-white/50 mb-6">
                We sent a password reset link to <span className="text-white">{email}</span>
              </p>
              <Link href="/login" className="text-sm text-[#7ed957] hover:underline no-underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Mail className="w-8 h-8 text-white/30 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-white mb-1">Reset your password</h2>
                <p className="text-sm text-white/40">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white text-sm outline-none focus:border-[#7ed957]/40 placeholder:text-white/15 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7ed957] to-[#5cb83a] text-[#020810] font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="text-center mt-5 pt-4 border-t border-white/[0.05]">
                <Link href="/login" className="text-sm text-white/40 hover:text-white/60 no-underline flex items-center justify-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
