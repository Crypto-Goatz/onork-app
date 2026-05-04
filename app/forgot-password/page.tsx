'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, Check } from 'lucide-react'
import { AuthShell, AuthInput, AuthButton, AuthError } from '@/components/auth/AuthShell'

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

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a reset link to ${email}`}>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
            <Check className="h-6 w-6 text-accent" />
          </div>
          <p className="text-sm text-text-muted text-center">
            Click the link in your email to choose a new password.
          </p>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-text-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset password" subtitle="We'll send you a reset link">
      <AuthError message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthButton type="submit" loading={loading}>
          Send reset link
        </AuthButton>
      </form>

      <div className="mt-5">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  )
}
