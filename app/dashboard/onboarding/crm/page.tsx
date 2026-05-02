'use client'

/**
 * /dashboard/onboarding/crm — the CRM 2-way sync verification step.
 *
 * Three phases:
 *   1. Verify       — read-only ping. Shows location info + counts + sample
 *   2. Test sync    — one-click write+read of a test contact
 *   3. Complete     — green confirmation, links to next onboarding step
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Crown,
  Database,
  AlertTriangle,
} from 'lucide-react'

interface VerifyResult {
  ok: boolean
  stage: string
  message?: string
  location?: {
    id: string
    name: string
    email: string | null
    family_member: boolean
    family_name: string | null
    family_vip: boolean
  }
  counts?: { contacts: number; pipelines: number }
  sample_contact?: { name: string; email: string | null } | null
  pipelines?: Array<{ id: string; name: string; stages: number }>
  pit_redacted?: string
  profile?: { business_name: string | null; plan: string }
}

interface SyncResult {
  ok: boolean
  contactId?: string
  testEmail?: string
  message?: string
  stage?: string
  write?: { ok: boolean; status?: number; raw?: string }
  read?: { ok: boolean; tags?: string[]; raw?: string }
}

export default function CrmOnboardingPage() {
  const [verify, setVerify] = useState<VerifyResult | null>(null)
  const [verifying, setVerifying] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sync, setSync] = useState<SyncResult | null>(null)

  async function runVerify() {
    setVerifying(true)
    try {
      const res = await fetch('/api/onboarding/crm/verify', { cache: 'no-store' })
      const data = (await res.json()) as VerifyResult
      setVerify(data)
    } catch (e) {
      setVerify({ ok: false, stage: 'network', message: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setVerifying(false)
    }
  }

  async function runTestSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/onboarding/crm/test-sync', { method: 'POST' })
      const data = (await res.json()) as SyncResult
      setSync(data)
    } catch (e) {
      setSync({ ok: false, message: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { runVerify() }, [])

  const ok = !!verify?.ok
  const noLocation = verify?.stage === 'no_location'
  const noPit = verify?.stage === 'no_pit'

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-10 text-[#c9d1d9] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/25 bg-[#7ed957]/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
            <Database className="h-3 w-3" />
            Onboarding · Step 1 of 4
          </div>
          <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Connect your CRM brain.
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            We&apos;re going to verify your CRM sub-account is reachable, count what&apos;s already there, and prove the
            two-way sync works by writing &amp; reading a test contact.
          </p>
        </div>

        {/* Verify card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/55">
              <Building2 className="h-4 w-4" /> Sub-account
            </div>
            <button
              onClick={runVerify}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/65 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Checking…' : 'Re-verify'}
            </button>
          </div>

          {verifying && !verify ? (
            <div className="flex items-center gap-3 text-sm text-white/65">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your CRM sub-account…
            </div>
          ) : noLocation ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <div className="flex items-center gap-2 font-semibold text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                No CRM sub-account linked yet.
              </div>
              <p className="mt-2 text-xs leading-relaxed">
                Your profile doesn&apos;t have a <span className="font-mono">crm_location_id</span> set. If your email is
                tied to a known family sub-account, sign out and back in to trigger the auto-link.
              </p>
            </div>
          ) : noPit ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <div className="flex items-center gap-2 font-semibold text-rose-100">
                <XCircle className="h-4 w-4" />
                Sub-account linked, but no PIT configured.
              </div>
              <p className="mt-2 text-xs leading-relaxed">
                Location <span className="font-mono">{verify?.location?.id}</span> needs a PIT env var on Vercel. The
                fallback chain (CRM_AGENCY_PIT_NEW → onCorePit) didn&apos;t produce a token.
              </p>
            </div>
          ) : ok && verify?.location ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-bold text-white">{verify.location.name || verify.location.id}</div>
                  <div className="mt-1 font-mono text-xs text-white/40">{verify.location.id}</div>
                  {verify.location.email && (
                    <div className="mt-1 text-xs text-white/55">{verify.location.email}</div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Read access verified
                    </span>
                    {verify.location.family_member && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#7ed957]/15 px-2 py-1 text-xs font-medium text-[#7ed957]">
                        Family · {verify.location.family_name}
                      </span>
                    )}
                    {verify.location.family_vip && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-300">
                        <Crown className="h-3 w-3" /> VIP
                      </span>
                    )}
                    {verify.pit_redacted && (
                      <span className="font-mono text-[10px] text-white/30">PIT {verify.pit_redacted}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Contacts</div>
                  <div className="mt-1 text-2xl font-black text-white">
                    {verify.counts?.contacts?.toLocaleString() ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Pipelines</div>
                  <div className="mt-1 text-2xl font-black text-white">
                    {verify.counts?.pipelines ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Plan</div>
                  <div className="mt-1 text-base font-bold uppercase text-white">
                    {verify.profile?.plan || 'Free'}
                  </div>
                </div>
              </div>

              {verify.sample_contact && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/55">
                  Sample contact: <span className="font-medium text-white">{verify.sample_contact.name}</span>
                  {verify.sample_contact.email ? ` · ${verify.sample_contact.email}` : ''}
                </div>
              )}

              {verify.pipelines && verify.pipelines.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">Pipelines</div>
                  <ul className="space-y-1 text-sm">
                    {verify.pipelines.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-white/75">
                        <span>{p.name}</span>
                        <span className="font-mono text-[11px] text-white/40">{p.stages} stages</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <div className="flex items-center gap-2 font-semibold text-rose-100">
                <XCircle className="h-4 w-4" />
                Verification failed.
              </div>
              <p className="mt-2 text-xs">{verify?.message}</p>
            </div>
          )}
        </div>

        {/* 2-way sync test card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
          <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/55">
            <Sparkles className="h-4 w-4" /> Two-way sync test
          </div>
          <h2 className="text-xl font-bold text-white">Prove the wire works.</h2>
          <p className="mt-2 text-sm text-white/65">
            One click writes a test contact tagged{' '}
            <span className="font-mono text-white/85">0n-onboarding-test</span>, then immediately reads it back.
            Idempotent — running twice updates the same contact, never duplicates.
          </p>

          <button
            onClick={runTestSync}
            disabled={!ok || syncing}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_28px_rgba(126,217,87,0.35)] transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {syncing ? 'Syncing…' : 'Run sync test'}
          </button>

          {sync && (
            <div
              className={`mt-5 rounded-xl border p-4 text-sm ${
                sync.ok
                  ? 'border-[#7ed957]/30 bg-[#7ed957]/10 text-[#7ed957]'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {sync.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {sync.message}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="font-mono uppercase tracking-widest text-white/40">Write</div>
                  <div className="mt-0.5 text-white/85">
                    {sync.write?.ok ? `OK · ${sync.write?.status ?? '—'}` : `Failed${sync.write?.status ? ` (${sync.write.status})` : ''}`}
                  </div>
                </div>
                <div>
                  <div className="font-mono uppercase tracking-widest text-white/40">Read</div>
                  <div className="mt-0.5 text-white/85">
                    {sync.read?.ok ? `OK · ${(sync.read?.tags || []).length} tags` : 'Failed'}
                  </div>
                </div>
              </div>
              {sync.contactId && (
                <div className="mt-2 font-mono text-[10px] text-white/40">contact id {sync.contactId}</div>
              )}
            </div>
          )}
        </div>

        {/* Next */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#7ed957]/[0.06] via-transparent to-[#00d4ff]/[0.04] p-6 backdrop-blur">
          <h3 className="text-base font-bold text-white">Next: connect your AI brain</h3>
          <p className="mt-2 text-sm text-white/65">
            Free Groq API key for unlimited AI tasks — VPIS scoring, post generation, scanner recommendations.
            Takes 60 seconds.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard/settings/groq"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-5 py-2.5 text-sm font-bold text-[#020810] shadow-[0_0_24px_rgba(126,217,87,0.3)] transition-transform hover:scale-[1.01]"
            >
              Connect Groq
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/welcome"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-white/30"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
