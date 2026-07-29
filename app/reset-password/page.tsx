'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lock, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase handles the token exchange automatically via the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session)
      setChecking(false)
    })

    // Listen for auth state change (token exchange happens async)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)

    // Redirect to dashboard after 2 seconds
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#020810] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#7ed957] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020810] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/brand/0ncore-logo-dark.png" alt="0nCore" className="h-8 mx-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </Link>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.07] rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#7ed957]/15 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-[#7ed957]" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Password updated</h2>
              <p className="text-sm text-white/50">Redirecting to dashboard...</p>
            </div>
          ) : !validSession ? (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white mb-2">Invalid or expired link</h2>
              <p className="text-sm text-white/50 mb-4">
                This reset link has expired. Please request a new one.
              </p>
              <Link href="/forgot-password" className="text-sm text-[#7ed957] hover:underline no-underline">
                Request new reset link
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Lock className="w-8 h-8 text-white/30 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-white mb-1">Set new password</h2>
                <p className="text-sm text-white/40">
                  Choose a strong password for your account.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      className="w-full px-4 py-2.5 pr-10 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white text-sm outline-none focus:border-[#7ed957]/40 placeholder:text-white/15 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 bg-transparent border-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Confirm your password"
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white text-sm outline-none focus:border-[#7ed957]/40 placeholder:text-white/15 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7ed957] to-[#5cb83a] text-[#020810] font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
