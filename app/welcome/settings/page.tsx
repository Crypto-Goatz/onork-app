/**
 * /welcome/settings — minimal account screen for the welcome control panel.
 * Self-contained, light theme, no dashboard chrome. Inherits the welcome
 * layout's CSS variable overrides.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ChevronRight, ShieldCheck, Mail, User, Building2, KeyRound, LogOut } from 'lucide-react'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function WelcomeSettingsPage() {
  // Cookie-only check — see /welcome/page.tsx for the loop explanation.
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login?next=/welcome/settings')

  const { data: profile } = await admin()
    .from('profiles')
    .select('email, full_name, plan, crm_location_id, is_admin, stripe_customer_id, stripe_subscription_id, created_at')
    .eq('id', user.id)
    .maybeSingle()

  const planLabel = (profile?.plan ?? 'free').toString()
  const planDisplay = planLabel.charAt(0).toUpperCase() + planLabel.slice(1)

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <Link
        href="/welcome"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to welcome
      </Link>

      <div className="mt-6 mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your profile, plan, and CRM linkage.
        </p>
      </div>

      {/* Profile card */}
      <Section title="Profile">
        <Row icon={User} label="Name" value={profile?.full_name ?? '—'} />
        <Row icon={Mail} label="Email" value={profile?.email ?? user.email ?? '—'} />
        <Row
          icon={Building2}
          label="CRM Sub-Location"
          value={profile?.crm_location_id ?? 'Not linked'}
          status={profile?.crm_location_id ? 'connected' : 'missing'}
        />
      </Section>

      {/* Plan card */}
      <Section title="Plan">
        <Row icon={ShieldCheck} label="Tier" value={profile?.is_admin ? 'Admin' : planDisplay} />
        {profile?.stripe_customer_id && (
          <Row icon={KeyRound} label="Stripe customer" value={profile.stripe_customer_id} mono />
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-800">Manage subscription</div>
            <div className="text-xs text-slate-500">Upgrade, downgrade, or update payment.</div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-slate-300 hover:bg-slate-50"
          >
            See plans <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Section>

      {/* Quick links to deeper settings (these DO go into the dashboard chrome) */}
      <Section title="Connections & integrations">
        <LinkRow href="/dashboard/settings/extension" label="Chrome Extension Tokens" hint="Generate + revoke tokens for the 0n extension." />
        <LinkRow href="/dashboard/settings/accounts" label="CRM Accounts" hint="Connect or switch your CRM sub-location." />
        <LinkRow href="/dashboard/integrations" label="Integrations" hint="Slack, Google, LinkedIn, Stripe, and 90+ more." />
      </Section>

      {/* Sign out */}
      <div className="mt-8">
        <Link
          href="/api/auth/signout"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Link>
      </div>
    </div>
  )
}

// ── Bits ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  status,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  status?: 'connected' | 'missing'
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-600">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${mono ? 'font-mono text-xs' : ''} text-slate-900`}>{value}</span>
        {status === 'connected' && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
            linked
          </span>
        )}
        {status === 'missing' && (
          <Link href="/dashboard/settings/accounts" className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100">
            link →
          </Link>
        )}
      </div>
    </div>
  )
}

function LinkRow({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0 transition hover:bg-slate-50"
    >
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-500">{hint}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  )
}
