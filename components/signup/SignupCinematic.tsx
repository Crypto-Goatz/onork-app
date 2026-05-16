'use client'

/**
 * Agency-styled signup. Three fields, staged reveal, big editorial type.
 *
 * Flow:
 *  1. User lands. Name field is visible. Email + company are hidden.
 *  2. As soon as the name has 2+ characters, email fades in.
 *  3. As soon as email is valid, company fades in.
 *  4. As soon as company has 2+ characters, password fades in.
 *  5. Submit fires /api/auth/signup, then signs them in client-side, then
 *     unmounts the form in favor of <ProvisioningTakeover/>.
 *
 * OAuth path stays available above the form for the fast lane.
 */

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProvisioningTakeover from './ProvisioningTakeover'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface StepFieldProps {
  show: boolean
  label: string
  children: React.ReactNode
}

function StepField({ show, label, children }: StepFieldProps) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <label className="block text-[10px] uppercase tracking-[0.2em] text-[#6b7681] mb-2 mt-5">
            {label}
          </label>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const FIELD_CLASS =
  'w-full bg-transparent border-0 border-b border-[#30363d] focus:border-[#6EE05A]/70 text-xl sm:text-2xl text-white placeholder:text-[#6b7681] pb-3 pt-1 focus:outline-none transition-colors'

export default function SignupCinematic({
  refCode,
  initialEmail,
}: {
  refCode?: string
  initialEmail?: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(initialEmail?.trim() ?? '')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiDone, setApiDone] = useState(false)

  // Stash ref cookie once
  useEffect(() => {
    if (!refCode || typeof window === 'undefined') return
    try {
      document.cookie = `0n_ref=${encodeURIComponent(refCode)}; path=/; max-age=2592000; SameSite=Lax`
    } catch {
      /* ignore */
    }
  }, [refCode])

  // If email is prefilled from the homepage, advance the reveal so the user
  // doesn't see fields disappear after they already typed their email.
  const hasPrefilledEmail = !!initialEmail && EMAIL_RE.test(initialEmail.trim())
  const showEmail = fullName.trim().length >= 2 || hasPrefilledEmail
  const showCompany = showEmail && EMAIL_RE.test(email.trim())
  const showPassword = showCompany && company.trim().length >= 2
  const canSubmit =
    showPassword && password.length >= 8 && !submitting

  async function handleOAuth(provider: 'linkedin_oidc') {
    setError(null)
    const options: Record<string, unknown> = {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'openid profile email w_member_social',
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    })
    if (oauthError) setError(oauthError.message)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    setApiDone(false)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          company: company.trim(),
          password,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error || `Signup failed (${res.status})`)
        setSubmitting(false)
        setApiDone(false)
        return
      }

      // Sign in to establish session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInError) {
        setError('Account created, but sign-in failed. Please try /login.')
        setSubmitting(false)
        setApiDone(false)
        return
      }

      setApiDone(true) // takeover can now finish & redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
      setSubmitting(false)
      setApiDone(false)
    }
  }

  if (submitting) {
    return (
      <ProvisioningTakeover
        name={fullName}
        email={email}
        apiReady={apiDone}
        onDone={() => router.push('/welcome')}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-[1.3fr_1fr] gap-16">
        {/* LEFT — editorial intro */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#6b7681] hover:text-white mb-12"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#6EE05A]" />
            0nCore
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]"
          >
            Your command
            <br />
            center awaits.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg text-[#8b949e] leading-relaxed max-w-xl"
          >
            1,640+ AI tools, real-time CRM, MCP infrastructure — all
            orchestrated for you. Free forever. Set up in 60 seconds.
          </motion.p>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 space-y-3 text-sm text-[#8b949e]"
          >
            {[
              'Free forever — no card required',
              'AI brain registry, MCP tools, Slack + CRM all connected',
              'CRM workspace ready when you are — claim it in one click',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6EE05A] shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-xs text-[#6b7681]"
          >
            Already have an account?{' '}
            <Link href="/login" className="text-[#6EE05A] hover:underline">
              Sign in
            </Link>
          </motion.div>
        </div>

        {/* RIGHT — form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#161b22]/80 backdrop-blur border border-[#30363d] rounded-2xl p-7"
        >
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6EE05A] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Free signup
          </div>

          {/* OAuth row — LinkedIn only (Google removed) */}
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={() => handleOAuth('linkedin_oidc')}
              className="w-full flex items-center justify-center gap-2.5 text-sm font-medium bg-[#0077B5] text-white py-2.5 rounded-lg hover:bg-[#005f8a] transition"
            >
              Continue with LinkedIn
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#30363d]" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#6b7681]">
              or with email
            </span>
            <div className="flex-1 h-px bg-[#30363d]" />
          </div>

          <form onSubmit={onSubmit}>
            {/* Name */}
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#6b7681] mb-2">
              Your name
            </label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className={FIELD_CLASS}
            />

            {/* Email */}
            <StepField show={showEmail} label="Work email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                className={FIELD_CLASS}
              />
            </StepField>

            {/* Company */}
            <StepField show={showCompany} label="Company">
              <input
                type="text"
                required
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className={FIELD_CLASS}
              />
            </StepField>

            {/* Password */}
            <StepField show={showPassword} label="Pick a password — 8+ chars">
              <input
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={FIELD_CLASS}
              />
            </StepField>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-start gap-2 text-xs text-[#f87171]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={!canSubmit}
              animate={{
                opacity: canSubmit ? 1 : 0.4,
                scale: canSubmit ? 1 : 0.98,
              }}
              transition={{ duration: 0.3 }}
              className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-[#6EE05A] text-[#0d1117] py-3 rounded-lg font-semibold text-sm hover:bg-[#7dec6e] transition disabled:cursor-not-allowed"
            >
              Create account
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>

          <p className="mt-5 text-[10px] text-[#6b7681] leading-relaxed">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </main>
  )
}
