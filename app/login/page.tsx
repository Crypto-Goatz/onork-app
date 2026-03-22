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
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-core-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-core-green">
            0ncore
          </Link>
          <p className="text-core-text-muted text-sm mt-2">Sign in to your command center</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-core-card border border-core-border rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-core-red">
              {error}
            </div>
          )}

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
              className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-core-green text-core-bg font-semibold py-2.5 rounded-lg hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-core-text-muted mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-core-green hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
