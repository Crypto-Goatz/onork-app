'use client'

/**
 * The 0n account — one identity across the ecosystem.
 *
 * WHY IT SHOWS REACH. "One account for everything" is a claim, and a page that
 * only listed name and email would leave it a claim. This shows what the
 * identity actually unlocks right now — clients connected, agency linked, how
 * you were authenticated — because the difference between an SSO story and an
 * SSO product is whether the user can see it working.
 *
 * IT SAVES FIELD BY FIELD, not behind a form submit. Someone editing their
 * company name in an iframe inside their CRM should not lose it because they
 * navigated away before pressing a button they did not notice.
 */
import { useCallback, useEffect, useState } from 'react'
import { Building2, Check, Globe, Loader2, ShieldCheck, User } from 'lucide-react'
import AppSidebar from './AppSidebar'
import { authHeaders } from './useSso'

interface Account {
  id: string; email: string | null; display_name: string | null; full_name: string | null
  company: string | null; business_name: string | null; business_type: string | null
  website: string | null; plan: string | null; brand_color: string | null
  onboarding_completed: boolean | null; crm_agency_id: string | null
  crm_location_id: string | null; created_at: string | null
  accountCreatedNow: boolean; authenticatedVia: string
}
interface Reach { connectedClients: number; hasAgency: boolean }

export default function AccountProfile() {
  const [token, setToken] = useState<string | null>(null)
  const [acct, setAcct] = useState<Account | null>(null)
  const [reach, setReach] = useState<Reach | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { try { setToken(sessionStorage.getItem('oncore.app.jwt')) } catch {} }, [])

  const load = useCallback(async () => {
    const r = await fetch('/api/account/me', { headers: authHeaders(token), cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(j.error || 'Could not load your account.'); return }
    setAcct(j.account); setReach(j.reach)
  }, [token])

  useEffect(() => { void load() }, [load])

  async function save(field: string, value: string) {
    setSaving(field); setErr(null)
    try {
      const r = await fetch('/api/account/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ [field]: value }),
      })
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || 'Could not save.'); return }
      setSaved(field); setTimeout(() => setSaved(null), 1600)
    } finally { setSaving(null) }
  }

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="settings" activeCount={reach?.connectedClients ?? 0}
                  totalCount={reach?.connectedClients ?? 0} usageLabel="Account" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[820px] px-8 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">Your 0n account</h1>
          <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-[color:var(--oc-muted)]">
            One identity across 0nCORE, 0nTask, web0n and every add-on. Created automatically
            however you signed in — you never make a second one.
          </p>

          {err && <p className="mt-4 rounded-xl bg-[color:var(--oc-amber)]/10 px-4 py-3 text-[13px] text-[color:var(--oc-amber)]">{err}</p>}
          {!acct && !err && <p className="mt-6 text-[13.5px] text-[color:var(--oc-muted)]">Loading…</p>}

          {acct && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Stat icon={ShieldCheck} label="Signed in via"
                      value={acct.authenticatedVia === 'app_jwt' ? 'Your CRM (SSO)' : '0nCORE'} />
                <Stat icon={Building2} label="Connected clients" value={String(reach?.connectedClients ?? 0)} />
                <Stat icon={Globe} label="Plan" value={acct.plan ?? 'free'} />
              </div>

              <section className="mt-8 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-6">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--oc-ink)]">
                  <User className="h-[18px] w-[18px] text-[color:var(--oc-green-d)]" /> Who you are
                </h2>
                <p className="mt-1 text-[12.5px] text-[color:var(--oc-muted)]">
                  Every 0n app reads from this. Changes save as you leave each field.
                </p>

                <Row label="Email" hint="Your identity across the ecosystem. Contact support to change it.">
                  <input value={acct.email ?? ''} readOnly className={`${INPUT} opacity-60`} />
                </Row>

                {([
                  ['display_name', 'Your name', 'Mike Mento'],
                  ['company', 'Company', 'RocketOpp LLC'],
                  ['business_type', 'What the business does', 'Marketing agency'],
                  ['website', 'Website', 'https://rocketopp.com'],
                ] as const).map(([field, label, ph]) => (
                  <Row key={field} label={label}>
                    <div className="relative">
                      <input
                        defaultValue={(acct[field] as string) ?? ''}
                        placeholder={ph}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v !== ((acct[field] as string) ?? '')) void save(field, v)
                        }}
                        className={INPUT}
                      />
                      {saving === field && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[color:var(--oc-muted)]" />}
                      {saved === field && <Check className="absolute right-3 top-3 h-4 w-4 text-[color:var(--oc-green-d)]" />}
                    </div>
                  </Row>
                ))}
              </section>

              <section className="mt-5 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-6">
                <h2 className="text-[15px] font-semibold text-[color:var(--oc-ink)]">What this account reaches</h2>
                <ul className="mt-3 space-y-2 text-[13.5px] text-[color:var(--oc-text)]">
                  <Reachable on={reach?.hasAgency}>Your agency and its client accounts</Reachable>
                  <Reachable on={(reach?.connectedClients ?? 0) > 0}>
                    {reach?.connectedClients ?? 0} connected client{reach?.connectedClients === 1 ? '' : 's'}
                  </Reachable>
                  <Reachable on={Boolean(acct.crm_location_id)}>Your CRM location</Reachable>
                  <Reachable on>Add-ons you install, billed to this account</Reachable>
                </ul>
                <p className="mt-4 text-[12px] text-[color:var(--oc-muted)]">
                  Account id <span className="font-mono">{acct.id.slice(0, 8)}…</span>
                  {acct.created_at ? ` · created ${new Date(acct.created_at).toLocaleDateString()}` : ''}
                </p>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-4">
      <Icon className="h-4 w-4 text-[color:var(--oc-green-d)]" />
      <p className="mt-2 text-[11px] uppercase tracking-wide text-[color:var(--oc-muted)]">{label}</p>
      <p className="text-[15px] font-semibold text-[color:var(--oc-ink)]">{value}</p>
    </div>
  )
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-[color:var(--oc-muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-[color:var(--oc-faint)]">{hint}</span>}
    </label>
  )
}
function Reachable({ on, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ background: on ? 'var(--oc-green-d)' : 'var(--oc-faint)' }} />
      <span className={on ? '' : 'text-[color:var(--oc-muted)]'}>{children}</span>
    </li>
  )
}

const INPUT = 'w-full rounded-xl border border-[color:var(--oc-border)] bg-white px-3.5 py-2.5 text-[13.5px] text-[color:var(--oc-ink)] outline-none transition focus:border-[color:var(--oc-green-d)]'
