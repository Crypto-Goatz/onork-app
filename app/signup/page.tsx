'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-core-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="bg-core-card border border-core-border rounded-xl p-8">
            <div className="w-16 h-16 bg-core-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-core-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-core-text mb-2">Check your email</h2>
            <p className="text-core-text-dim text-sm mb-6">
              We sent a confirmation link to <span className="text-core-text">{email}</span>. Click it to activate your account.
            </p>
            <Link href="/login" className="text-core-green text-sm hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-core-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-core-green">
            0ncore
          </Link>
          <p className="text-core-text-muted text-sm mt-2">Create your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-core-red">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-core-text-dim mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm text-core-text-dim mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-core-text-dim mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-core-green text-core-bg font-semibold py-2.5 rounded-lg hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-core-text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-core-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
