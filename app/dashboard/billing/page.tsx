'use client'

/**
 * Billing — prepaid wallet. Balance in USD, $0.05 per API execution, top up from $5.
 * Replaces the old Spark/Run credit store.
 */

import { useEffect, useState, useCallback } from 'react'

interface Ledger { kind: string; delta_cents: number; balance_after: number | null; description: string | null; created_at: string }
interface WalletData { balance_cents: number; lifetime_topup_cents: number; lifetime_spent_cents: number; execution_cost_cents: number; ledger: Ledger[] }

const TOPUPS = [500, 1000, 2500, 5000] // $5 / $10 / $25 / $50
const usd = (c: number) => `$${(c / 100).toFixed(2)}`

const KIND_COLOR: Record<string, string> = {
  topup: '#6EE05A', grant: '#60a5fa', execution: '#9ca3af', refund: '#fbbf24',
}

export default function BillingPage() {
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(async () => {
    const d = await fetch('/api/wallet').then(r => r.json()).catch(() => null)
    if (d && !d.error) setData(d)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function topUp(cents: number) {
    setBusy(cents)
    const r = await fetch('/api/wallet/topup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cents }),
    }).then(r => r.json()).catch(() => ({}))
    if (r.url) window.location.href = r.url
    else setBusy(null)
  }

  const cost = data?.execution_cost_cents ?? 5
  const runsLeft = data ? Math.floor(data.balance_cents / cost) : 0

  return (
    <div className="max-w-[860px] mx-auto px-2 py-2 text-core-text">
      <h1 className="text-[22px] font-bold mb-1">Billing & Wallet</h1>
      <p className="text-[13px] text-core-text-muted mb-6">
        Pay only for what you use — <b className="text-core-text">{usd(cost)} per API execution</b>. Top up from $5.
      </p>

      {/* Balance card */}
      <div className="rounded-xl border border-core-border bg-core-card p-6 mb-6">
        <div className="text-[12px] uppercase tracking-widest text-core-text-muted mb-1">Wallet balance</div>
        <div className="text-[40px] font-black leading-none text-core-green">
          {loading ? '—' : usd(data?.balance_cents ?? 0)}
        </div>
        <div className="text-[12px] text-core-text-muted mt-2">
          ≈ {runsLeft.toLocaleString()} executions left
          {data ? ` · ${usd(data.lifetime_spent_cents)} spent all-time` : ''}
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {TOPUPS.map(c => (
            <button key={c} onClick={() => topUp(c)} disabled={busy !== null}
              className="px-5 py-2.5 rounded-lg bg-core-green text-black text-[14px] font-bold border-0 cursor-pointer hover:brightness-110 disabled:opacity-50">
              {busy === c ? '…' : `Add ${usd(c)}`}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-core-text-muted mt-2">Secure one-time payment via Stripe. $5 minimum.</p>
      </div>

      {/* Ledger */}
      <div className="rounded-xl border border-core-border bg-core-card p-5">
        <div className="text-[13px] font-bold mb-3">Recent activity</div>
        {(!data || data.ledger.length === 0) ? (
          <p className="text-[13px] text-core-text-muted">No activity yet. Add funds to start running executions.</p>
        ) : (
          <div className="flex flex-col">
            {data.ledger.map((l, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-core-border/40 text-[13px] last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] uppercase tracking-wide font-bold w-16" style={{ color: KIND_COLOR[l.kind] || '#9ca3af' }}>{l.kind}</span>
                  <span className="text-core-text-muted">{l.description || '—'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: l.delta_cents >= 0 ? '#6EE05A' : '#9ca3af' }}>
                    {l.delta_cents >= 0 ? '+' : '−'}{usd(Math.abs(l.delta_cents))}
                  </span>
                  <span className="text-core-text-muted tabular-nums w-16 text-right">{l.balance_after != null ? usd(l.balance_after) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
