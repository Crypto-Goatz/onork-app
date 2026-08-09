'use client'

/**
 * /crm/billing — the agency's billing, tied to their SSO. Plan, what it costs,
 * usage this month, card on file, invoices, and manage. Read from Stripe live.
 */
import { useEffect, useState } from 'react'
import { CreditCard, Loader2, ArrowUpRight, Zap, Users, Receipt, CheckCircle2, ExternalLink } from 'lucide-react'
import { useSso, authHeaders } from '../useSso'
import { LockGate } from '@/components/auth/LockGate'

interface Overview {
  authed: boolean; subscribed: boolean; subStatus: string | null; discount: string | null
  isFounding: boolean; baseFeeCents: number; perClientCents: number; perCallCents: number
  clients: number; freeClients: number; billableClients: number; monthlyClientCents: number
  usageThisMonth: number; usageCostCents: number
  card: { brand: string; last4: string } | null
  invoices: { amount: number; status: string; date: number; url: string | null }[]
  portalUrl: string | null
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`

export default function BillingPage() {
  const sso = useSso()
  const [d, setD] = useState<Overview | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (sso.state === 'pending') return
    let live = true
    fetch('/api/agency/billing-overview', { credentials: 'same-origin', headers: authHeaders(sso.token) })
      .then((r) => r.json()).then((j) => { if (live) setD(j) }).catch(() => {})
    return () => { live = false }
  }, [sso.state, sso.token])

  const subscribe = async () => {
    if (busy) return; setBusy(true)
    try {
      const r = await fetch('/api/agency/subscribe', { method: 'POST', headers: authHeaders(sso.token) })
      const j = await r.json()
      if (j?.url) { window.location.href = j.url; return }
      alert(j?.error || 'Could not start checkout.')
    } catch { alert('Could not start checkout.') } finally { setBusy(false) }
  }

  if (sso.state === 'standalone' || sso.state === 'rejected') {
    return <LockGate next="/crm/billing" title="Billing" subtitle="Sign in to see your plan and usage." />
  }

  return (
    <div className="oncore-app min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-2.5">
          <CreditCard className="h-5 w-5 text-[color:var(--oc-green-d)]" />
          <h1 className="text-[20px] font-bold text-[color:var(--oc-ink)]">Billing</h1>
          <a href="/crm" className="ml-auto text-[13px] font-medium text-[color:var(--oc-text)]/60 hover:text-[color:var(--oc-green-d)]">← Dashboard</a>
        </div>

        {!d ? (
          <div className="flex items-center gap-2 py-10 text-[13px] text-[color:var(--oc-text)]/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading your billing…</div>
        ) : (
          <div className="space-y-4">
            {/* Plan status */}
            <div className="oc-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--oc-text)]/55">Plan</div>
                  <div className="mt-1 flex items-center gap-2 text-[18px] font-bold text-[color:var(--oc-ink)]">
                    {d.subscribed ? <><CheckCircle2 className="h-4 w-4 text-[color:var(--oc-green-d)]" /> Active</> : 'Not activated'}
                    {d.isFounding && <span className="oc-chip border border-[color:var(--oc-green-d)]/40 bg-[color:var(--oc-green)]/12 px-2 py-0.5 text-[11px] text-[color:var(--oc-green-d)]">Founding — no monthly fee</span>}
                  </div>
                  {d.discount && <div className="mt-1 text-[12.5px] font-medium text-[color:var(--oc-green-d)]">{d.discount}</div>}
                </div>
                {d.subscribed
                  ? d.portalUrl && <a href={d.portalUrl} className="oc-btn inline-flex items-center gap-1.5 px-4 py-2 text-[13px]">Manage <ExternalLink className="h-3.5 w-3.5" /></a>
                  : <button onClick={subscribe} disabled={busy} className="oc-btn px-4 py-2 text-[13px] disabled:opacity-60">{busy ? 'Starting…' : 'Activate billing'}</button>}
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={CreditCard} label="Monthly base" value={d.isFounding ? '$0' : money(d.baseFeeCents)} sub={d.isFounding ? 'waived forever' : 'per month'} />
              <Metric icon={Users} label={`Clients (${d.freeClients} free)`} value={money(d.monthlyClientCents)} sub={`${d.billableClients} × ${money(d.perClientCents)}/mo`} />
              <Metric icon={Zap} label="Usage this month" value={money(d.usageCostCents)} sub={`${d.usageThisMonth} calls × ${money(d.perCallCents)}`} />
            </div>

            {/* Card on file */}
            <div className="oc-card p-5">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--oc-text)]/55">Payment method</div>
              {d.card
                ? <div className="mt-2 flex items-center gap-2 text-[14px] text-[color:var(--oc-ink)]"><CreditCard className="h-4 w-4 text-[color:var(--oc-text)]/50" /> {d.card.brand.toUpperCase()} •••• {d.card.last4}</div>
                : <div className="mt-2 text-[13px] text-[color:var(--oc-text)]/60">No card on file yet — added when you activate.</div>}
            </div>

            {/* Invoices */}
            <div className="oc-card p-5">
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[color:var(--oc-text)]/55"><Receipt className="h-3.5 w-3.5" /> Invoices</div>
              {d.invoices.length === 0
                ? <div className="text-[13px] text-[color:var(--oc-text)]/60">No invoices yet.</div>
                : <div className="space-y-1.5">
                    {d.invoices.map((i, n) => (
                      <div key={n} className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--oc-border)] bg-white px-3 py-2 text-[13px]">
                        <span className="text-[color:var(--oc-ink)]">{new Date(i.date * 1000).toLocaleDateString()}</span>
                        <span className="oc-mono text-[color:var(--oc-text)]/70">{money(i.amount)} · {i.status}</span>
                        {i.url && <a href={i.url} className="text-[color:var(--oc-green-d)] hover:underline">view <ArrowUpRight className="inline h-3 w-3" /></a>}
                      </div>
                    ))}
                  </div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, sub }: { icon: typeof Zap; label: string; value: string; sub: string }) {
  return (
    <div className="oc-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[color:var(--oc-text)]/55"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-1 text-[22px] font-bold text-[color:var(--oc-ink)]">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-[color:var(--oc-text)]/55">{sub}</div>
    </div>
  )
}
