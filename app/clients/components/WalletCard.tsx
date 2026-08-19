'use client'

/**
 * The wallet card — balance, add-credits, and the receipts underneath it.
 *
 * THE RECEIPTS ARE ON THE SAME CARD AS THE BUTTON, deliberately. A balance that
 * changes with no visible trail is the thing customers do not trust, and a
 * ledger behind a second click is a ledger nobody reads.
 *
 * A FAILED READ IS NOT $0.00. balanceCents null renders as "unreadable", never
 * as an empty wallet — telling a client with money that they have none is the
 * one wallet bug that generates a phone call.
 *
 * DENOMINATIONS COME FROM THE SERVER, which reads them from config. No amount
 * is written into this component, so changing the offered top-ups is a config
 * change and not a deploy of this file.
 */
import { useState } from 'react'
import { Wallet, Plus, AlertTriangle, Check } from 'lucide-react'

export interface LedgerRow {
  id: string
  deltaCents: number
  kind: string
  mode: 'test' | 'live'
  description: string | null
  balanceAfter: number
  createdAt: string
}

function usd(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`
}

export default function WalletCard({
  endpoint, initialBalanceCents, initialLedger, denominations, testModeReason, title, subtitle,
}: {
  endpoint: string
  initialBalanceCents: number | null
  initialLedger: LedgerRow[]
  denominations: number[]
  testModeReason: string | null
  title: string
  subtitle: string
}) {
  const [balance, setBalance] = useState<number | null>(initialBalanceCents)
  const [ledger, setLedger] = useState<LedgerRow[]>(initialLedger)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<number | null>(null)

  async function addCredits(cents: number) {
    setBusy(cents); setError(null); setAdded(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A ref makes a double-click a replay instead of a double credit. The
        // server namespaces it; this only has to be unique per press.
        body: JSON.stringify({ cents, ref: `${Date.now()}-${cents}` }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'The credit could not be recorded.'); return }
      setBalance(data.balanceCents)
      setAdded(cents)
      // Re-read rather than splice a row in locally: the ledger the server
      // holds is the one that counts, and inventing a row here is how a UI
      // starts disagreeing with the ledger it is supposed to display.
      const fresh = await fetch(endpoint).then((r) => r.json()).catch(() => null)
      if (fresh?.ledger) setLedger(fresh.ledger)
    } catch {
      setError('The request did not reach the server. Nothing was added.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-white/85">
            <Wallet className="h-4 w-4 text-white/40" /> {title}
          </h2>
          <p className="mt-1 text-xs text-white/45">{subtitle}</p>
        </div>
        <p className={`text-2xl font-semibold ${balance === null ? 'text-[#f59e0b]' : 'text-white/90'}`}>
          {balance === null ? 'Unreadable' : usd(balance)}
        </p>
      </div>

      {testModeReason && (
        <p className="mt-4 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[#f59e0b]">
          {testModeReason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {denominations.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => addCredits(cents)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75 transition hover:border-[#6EE05A]/50 hover:text-white disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            {busy === cents ? 'Adding…' : usd(cents)}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#f59e0b]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      {added !== null && !error && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#6EE05A]">
          <Check className="h-3.5 w-3.5 shrink-0" /> {usd(added)} added — receipt below.
        </p>
      )}

      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-white/35">Receipts</p>
        {ledger.length === 0 ? (
          <p className="mt-3 text-xs text-white/40">No movements yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {ledger.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-white/70">{row.description ?? row.kind}</span>
                  <span className="block text-white/30">
                    {new Date(row.createdAt).toLocaleString()} · {row.kind}
                    {row.mode === 'test' && ' · test'}
                  </span>
                </span>
                <span className={row.deltaCents < 0 ? 'text-white/60' : 'text-[#6EE05A]'}>
                  {row.deltaCents > 0 ? '+' : ''}{usd(row.deltaCents)}
                </span>
                <span className="w-20 text-right text-white/35">{usd(row.balanceAfter)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
