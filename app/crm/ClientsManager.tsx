'use client'

/**
 * Clients — every account you have connected, and the ones you have not.
 *
 * CONNECTED IS NOT THE SAME AS EXISTS. Signing up lists your sub-accounts; it
 * connects none of them. Nothing is switched on until it is ticked and added,
 * because each one carries a charge and each one needs its own key. The list
 * shows both states so the difference is visible rather than assumed.
 *
 * THE KEY IS NEVER RENDERED. Copy fetches it on the press, so it crosses the
 * wire on a deliberate act and never sits in a screenshot or a shared screen.
 *
 * Styling uses the existing .oncore-app tokens only.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check, Circle, Copy, Loader2, Pencil, Search, Trash2, TriangleAlert, X,
} from 'lucide-react'
import { AGENCY_BILLING } from '@/lib/agency-billing'

const PRICE = `$${(AGENCY_BILLING.perClientCents / 100).toFixed(2)}`

interface Account {
  locationId: string
  name: string
  connected: boolean
  isFree: boolean
  billingStatus: string | null
  verifiedAt: string | null
  error: string | null
}

export default function ClientsManager() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/connect/accounts', { cache: 'no-store' })
    const j = await res.json().catch(() => ({}))
    setAccounts(Array.isArray(j.accounts) ? j.accounts : [])
  }, [])

  useEffect(() => { void load() }, [load])

  const connected = useMemo(() => (accounts ?? []).filter((a) => a.connected), [accounts])
  const available = useMemo(() => (accounts ?? []).filter((a) => !a.connected), [accounts])

  const shown = useCallback(
    (list: Account[]) => {
      const q = query.trim().toLowerCase()
      if (!q) return list
      return list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.locationId.toLowerCase().includes(q),
      )
    },
    [query],
  )

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copyKey(locationId: string) {
    setNote(null)
    try {
      const res = await fetch(`/api/connect/location/pit?locationId=${encodeURIComponent(locationId)}`)
      const j = await res.json()
      if (!res.ok) { setNote(j.error || 'Could not read that key.'); return }
      await navigator.clipboard.writeText(j.pit)
      setNote('Key copied to your clipboard.')
    } catch {
      setNote('Could not copy the key.')
    }
  }

  async function remove(locationId: string, name: string) {
    // Disconnecting stops work for that client and lowers the bill, so it is
    // confirmed rather than instant.
    if (!window.confirm(`Disconnect ${name}? 0nCORE will stop acting in this account and it will no longer be billed.`)) return
    setBusy(true)
    try {
      await fetch(`/api/connect/location?locationId=${encodeURIComponent(locationId)}`, { method: 'DELETE' })
      await load()
      setNote(`${name} disconnected.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="oncore-app min-h-screen bg-[color:var(--oc-bg)]">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">Clients</h1>
          <p className="text-sm leading-relaxed text-[color:var(--oc-text)]/70">
            {connected.length} connected. Additional accounts are {PRICE}/month each — your free
            account is marked and is the default for any command that does not name a client.
          </p>
        </header>

        {note && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--oc-line)] bg-white p-3">
            <p className="flex-1 text-[12.5px] text-[color:var(--oc-ink)]">{note}</p>
            <button onClick={() => setNote(null)} aria-label="Dismiss" className="rounded p-1 hover:bg-black/5">
              <X className="h-3.5 w-3.5 text-[color:var(--oc-text)]/50" />
            </button>
          </div>
        )}

        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--oc-text)]/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or account ID…"
            className="w-full rounded-xl border border-[color:var(--oc-line)] bg-white py-2.5 pl-9 pr-3 text-sm text-[color:var(--oc-ink)] outline-none transition focus:border-[color:var(--oc-green)]"
          />
        </div>

        {!accounts && (
          <div className="mt-8 flex items-center gap-2 text-sm text-[color:var(--oc-text)]/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
          </div>
        )}

        {accounts && (
          <>
            <section className="mt-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--oc-text)]/40">
                Connected — {connected.length}
              </h2>
              {connected.length === 0 && (
                <p className="text-sm text-[color:var(--oc-text)]/60">
                  No clients connected yet. Tick one below and add it.
                </p>
              )}
              <div className="space-y-2">
                {shown(connected).map((a) => (
                  <div
                    key={a.locationId}
                    className="rounded-xl border border-[color:var(--oc-line)] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {/* The free account reads at a glance — it is also the
                              default target, so it must be obvious which it is. */}
                          {a.isFree && (
                            <Circle
                              className="h-2.5 w-2.5 shrink-0 fill-[color:var(--oc-green)] text-[color:var(--oc-green)]"
                              aria-label="Free account"
                            />
                          )}
                          <span className="truncate text-[14px] font-semibold text-[color:var(--oc-ink)]">
                            {a.name}
                          </span>
                          {a.isFree && (
                            <span className="rounded-full bg-[color:var(--oc-green)]/10 px-2 py-0.5 text-[11px] font-medium text-[color:var(--oc-green-d)]">
                              Free · default
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-[color:var(--oc-text)]/50">
                          {a.locationId}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[color:var(--oc-text)]/50">
                          <span>Key</span>
                          <span className="font-mono tracking-widest">••••••••</span>
                          <span>·</span>
                          <span>{a.isFree ? 'Included' : `${PRICE}/mo`}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => copyKey(a.locationId)}
                          aria-label={`Copy key for ${a.name}`}
                          title="Copy key"
                          className="rounded-lg p-2 text-[color:var(--oc-text)]/50 transition hover:bg-black/5 hover:text-[color:var(--oc-ink)]"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(editing === a.locationId ? null : a.locationId)}
                          aria-label={`Replace key for ${a.name}`}
                          title="Replace key"
                          className="rounded-lg p-2 text-[color:var(--oc-text)]/50 transition hover:bg-black/5 hover:text-[color:var(--oc-ink)]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(a.locationId, a.name)}
                          disabled={busy}
                          aria-label={`Disconnect ${a.name}`}
                          title="Disconnect"
                          className="rounded-lg p-2 text-[color:var(--oc-red)]/70 transition hover:bg-[color:var(--oc-red)]/10 hover:text-[color:var(--oc-red)] disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {a.error && (
                      <p className="mt-2 flex items-start gap-2 text-[12px] text-[color:var(--oc-red)]">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {a.error}
                      </p>
                    )}

                    {editing === a.locationId && (
                      <KeyForm
                        locationId={a.locationId}
                        isFree={a.isFree}
                        onDone={() => { setEditing(null); void load(); setNote(`${a.name} updated.`) }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--oc-text)]/40">
                Not connected — {available.length}
              </h2>
              <p className="mb-3 text-[12.5px] text-[color:var(--oc-text)]/60">
                Tick the clients you want 0nCORE to work in. Each one needs its own key, added after
                you add it.
              </p>
              <div className="space-y-2">
                {shown(available).map((a) => (
                  <label
                    key={a.locationId}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[color:var(--oc-line)] bg-white p-4 transition hover:border-[color:var(--oc-green)]"
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(a.locationId)}
                      onChange={() => toggle(a.locationId)}
                      className="h-4 w-4 accent-[color:var(--oc-green)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[color:var(--oc-ink)]">
                        {a.name}
                      </span>
                      <span className="block font-mono text-[11px] text-[color:var(--oc-text)]/50">
                        {a.locationId}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] text-[color:var(--oc-text)]/60">{PRICE}/mo</span>
                  </label>
                ))}
              </div>

              {picked.size > 0 && (
                <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-4 rounded-xl border border-[color:var(--oc-line)] bg-white p-4 shadow-lg">
                  <div className="text-[13px] text-[color:var(--oc-ink)]">
                    {picked.size} selected — {PRICE} each,{' '}
                    <strong>
                      ${((picked.size * AGENCY_BILLING.perClientCents) / 100).toFixed(2)}/month
                    </strong>
                  </div>
                  <AddPicked
                    ids={Array.from(picked)}
                    accounts={accounts}
                    onDone={(added) => {
                      setPicked(new Set())
                      void load()
                      setNote(`${added} client${added === 1 ? '' : 's'} added. Add each one's key to switch it on.`)
                    }}
                  />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

/** Paste or replace one client's key. */
function KeyForm({
  locationId, isFree, onDone,
}: { locationId: string; isFree: boolean; onDone: () => void }) {
  const [pit, setPit] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/connect/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, pit, isFree }),
      })
      const j = await res.json()
      if (!res.ok) setError(j.error || 'Could not save that key.')
      else onDone()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-[color:var(--oc-line)] pt-3">
      <input
        type="password"
        value={pit}
        onChange={(e) => setPit(e.target.value)}
        placeholder="pit-…"
        className="w-full rounded-lg border border-[color:var(--oc-line)] bg-white px-3 py-2 font-mono text-[12px] text-[color:var(--oc-ink)] outline-none focus:border-[color:var(--oc-green)]"
      />
      <p className="text-[11px] text-[color:var(--oc-text)]/50">
        Generate this inside that sub-account — an agency token will not work here.
      </p>
      {error && <p className="text-[12px] text-[color:var(--oc-red)]">{error}</p>}
      <button
        onClick={save}
        disabled={busy || !pit}
        className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--oc-ink)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Save key
      </button>
    </div>
  )
}

/** Add every ticked client in one press. */
function AddPicked({
  ids, accounts, onDone,
}: { ids: string[]; accounts: Account[]; onDone: (added: number) => void }) {
  const [busy, setBusy] = useState(false)

  async function add() {
    setBusy(true)
    let added = 0
    // Sequential on purpose: each add writes a row and re-syncs the Stripe
    // quantity, and firing those concurrently races the count.
    for (const id of ids) {
      const name = accounts.find((a) => a.locationId === id)?.name ?? id
      const res = await fetch('/api/connect/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: id, name, pending: true }),
      }).catch(() => null)
      if (res?.ok) added += 1
    }
    setBusy(false)
    onDone(added)
  }

  return (
    <button
      onClick={add}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[color:var(--oc-green)] px-4 py-2 text-[13px] font-semibold text-[color:var(--oc-ink)] transition hover:opacity-90 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      Add {ids.length}
    </button>
  )
}
