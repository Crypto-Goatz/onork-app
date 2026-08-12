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
  Check, Circle, Copy, Loader2, Pencil, Search, ShieldCheck, Trash2, TriangleAlert, X,
} from 'lucide-react'
import { AGENCY_BILLING } from '@/lib/agency-billing'
import AppSidebar from './AppSidebar'

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

/**
 * The connected-and-secured mark.
 *
 * TWO SEPARATE CLAIMS, so they are two separate marks. The tick says the key
 * was accepted by the CRM; the vault says the key is sealed rather than sitting
 * somewhere readable. Merging them into one badge would let a client that is
 * merely reachable look like a client that is reachable AND protected.
 *
 * `justConnected` drives the animation only. The marks themselves persist for
 * as long as the client stays verified.
 */
function ConnectedSeal({ justConnected }: { justConnected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`oc-seal relative ${justConnected ? 'oc-seal-enter' : ''}`}
        role="img"
        aria-label="Connected"
      >
        <Check className="oc-seal-check h-3 w-3" strokeWidth={3.5} />
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full bg-[color:var(--oc-green-d)]/12 px-2 py-0.5 text-[11px] font-medium text-[color:var(--oc-green-d)]"
        title="This key is sealed in 0nVault — encrypted at rest and never rendered in the page."
      >
        <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
        0nVault
      </span>
    </span>
  )
}

export default function ClientsManager() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [query, setQuery] = useState('')
  // The client whose key was just accepted, so the seal animates once on the
  // row that earned it rather than on every verified row at every render.
  const [justConnected, setJustConnected] = useState<string | null>(null)
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
  /** Billable = connected minus the one included account. Never a literal. */
  const runningTotal = useMemo(() => {
    const billable = connected.filter((a) => !a.isFree).length
    return `$${((billable * AGENCY_BILLING.perClientCents) / 100).toFixed(2)}`
  }, [connected])
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
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      {/* The rail belongs on every page. Clients was the one surface without it,
          which made switching a client on feel like leaving the product. The
          counts come from the list already loaded here, so the rail agrees with
          the page instead of fetching the same thing again. */}
      <AppSidebar
        current="clients"
        activeCount={connected.length}
        totalCount={accounts?.length ?? 0}
        usageLabel={runningTotal}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-start justify-between gap-6">
          <header className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">
              Clients
            </h1>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[color:var(--oc-muted)]">
              {connected.length} connected · additional accounts {PRICE}/mo each ·{' '}
              {runningTotal}/month running total
            </p>
          </header>

          <div className="relative w-[280px] shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--oc-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or account ID"
              className="w-full rounded-[10px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] py-2.5 pl-9 pr-3 text-[13.5px] text-[color:var(--oc-ink)] outline-none transition placeholder:text-[color:var(--oc-muted)] focus:border-[color:var(--oc-green-d)]"
            />
          </div>
        </div>

        {note && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-3">
            <p className="flex-1 text-[12.5px] text-[color:var(--oc-ink)]">{note}</p>
            <button onClick={() => setNote(null)} aria-label="Dismiss" className="rounded p-1 hover:bg-[color:var(--oc-hover)]">
              <X className="h-3.5 w-3.5 text-[color:var(--oc-muted)]" />
            </button>
          </div>
        )}

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
                {shown(connected).map((a) => {
                  const broken = Boolean(a.error)
                  return (
                    <div
                      key={a.locationId}
                      className={[
                        'group rounded-2xl border p-4 transition-colors duration-150',
                        broken
                          ? 'border-[color:var(--oc-red)]/40 bg-[color:var(--oc-red)]/[0.07]'
                          : 'border-[color:var(--oc-border)] bg-[color:var(--oc-card)] hover:border-[color:var(--oc-border)]',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        {/* Orb reads state at a glance: green connected, red broken. */}
                        <span
                          className={[
                            'h-2.5 w-2.5 shrink-0 rounded-full',
                            broken
                              ? 'bg-[color:var(--oc-red)]'
                              : 'bg-[color:var(--oc-green-d)]',
                          ].join(' ')}
                          aria-hidden
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[15px] font-semibold text-[color:var(--oc-ink)]">
                              {a.name}
                            </span>
                            {/* Only a VERIFIED key earns the seal. A row that is
                                added but unverified must stay visibly unfinished,
                                because that is the state that silently fails on
                                the last step of a command. */}
                            {!broken && a.verifiedAt && (
                              <ConnectedSeal justConnected={justConnected === a.locationId} />
                            )}
                            {a.isFree && (
                              <span className="rounded-full bg-[color:var(--oc-green-d)]/12 px-2 py-0.5 text-[11px] font-medium text-[color:var(--oc-green-d)]">
                                Free · default
                              </span>
                            )}
                            {broken && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--oc-red)]/12 px-2 py-0.5 text-[11px] font-medium text-[color:var(--oc-red)]">
                                <TriangleAlert className="h-3 w-3" />
                                {a.error}
                              </span>
                            )}
                          </div>

                          {/* ID, key and price on ONE line — three stacked lines
                              made every row look like a form. */}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px]">
                            <span className="font-mono text-[color:var(--oc-muted)]">{a.locationId}</span>
                            <span className="font-mono tracking-[0.2em] text-[color:var(--oc-muted)]">••••••••</span>
                            <span className="text-[color:var(--oc-text)]">
                              {a.isFree ? 'Included' : `${PRICE}/mo`}
                            </span>
                          </div>
                        </div>

                        {broken ? (
                          <button
                            onClick={() => setEditing(editing === a.locationId ? null : a.locationId)}
                            className="shrink-0 rounded-full bg-[color:var(--oc-red)] px-4 py-1.5 text-[12.5px] font-semibold text-[#0d1117] transition hover:opacity-90 active:scale-[0.98]"
                          >
                            Reconnect
                          </button>
                        ) : (
                          /* Revealed on hover: three icon buttons on every row is
                             visual noise on a list of 12. Focus-within keeps them
                             reachable by keyboard. */
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                            <button onClick={() => copyKey(a.locationId)} title="Copy key"
                              aria-label={`Copy key for ${a.name}`}
                              className="rounded-lg p-2 text-[color:var(--oc-muted)] transition hover:bg-[color:var(--oc-hover)] hover:text-[color:var(--oc-ink)]">
                              <Copy className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditing(editing === a.locationId ? null : a.locationId)} title="Replace key"
                              aria-label={`Replace key for ${a.name}`}
                              className="rounded-lg p-2 text-[color:var(--oc-muted)] transition hover:bg-[color:var(--oc-hover)] hover:text-[color:var(--oc-ink)]">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => remove(a.locationId, a.name)} disabled={busy} title="Disconnect"
                              aria-label={`Disconnect ${a.name}`}
                              className="rounded-lg p-2 text-[color:var(--oc-red)]/80 transition hover:bg-[color:var(--oc-red)]/10 hover:text-[color:var(--oc-red)] disabled:opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {editing === a.locationId && (
                        <KeyForm
                          locationId={a.locationId}
                          isFree={a.isFree}
                          onDone={() => {
                            setEditing(null)
                            setJustConnected(a.locationId)
                            void load()
                            setNote(`${a.name} is connected and secured.`)
                          }}
                        />
                      )}
                    </div>
                  )
                })}
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
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[color:var(--oc-line)] bg-[color:var(--oc-card)] p-4 transition hover:border-[color:var(--oc-green)]"
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
                <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-4 rounded-xl border border-[color:var(--oc-line)] bg-[color:var(--oc-card)] p-4 shadow-lg">
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
      </main>
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
        className="w-full rounded-lg border border-[color:var(--oc-line)] bg-[color:var(--oc-card)] px-3 py-2 font-mono text-[12px] text-[color:var(--oc-ink)] outline-none focus:border-[color:var(--oc-green)]"
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

/**
 * Type a location ID and its key directly.
 *
 * This is the path every agency will use for a client the agency token cannot
 * see — a sub-account created after the last sync, or one outside the listed
 * page. It is also the path that had to exist before any of this could ship:
 * a product that only works when the cached list happens to contain the client
 * is not a product.
 */
function ManualAdd({ onDone }: { onDone: () => void }) {
  const [locationId, setLocationId] = useState('')
  const [pit, setPit] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/connect/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locationId.trim(), pit: pit.trim(), name: name.trim() }),
      })
      const j = await res.json()
      if (!res.ok) setError(j.error || 'Could not add that client.')
      else { setLocationId(''); setPit(''); setName(''); onDone() }
    } catch {
      setError('Could not reach the server.')
    } finally { setBusy(false) }
  }

  const ready = locationId.trim().length > 10 && pit.trim().startsWith('pit-')

  return (
    <div className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">Location ID</label>
          <input value={locationId} onChange={(e) => setLocationId(e.target.value)}
            placeholder="AeY8M0GNOuJPNkLQ7AAC"
            className="w-full rounded-xl border border-[#2a2a2a] bg-[color:var(--oc-input)] px-3 py-2.5 font-mono text-[12.5px] text-[#f5f5f5] outline-none placeholder:text-[#8a8a8a] focus:border-[color:var(--oc-green-d)]" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">Client key</label>
          <input type="password" value={pit} onChange={(e) => setPit(e.target.value)}
            placeholder="pit-…"
            className="w-full rounded-xl border border-[#2a2a2a] bg-[color:var(--oc-input)] px-3 py-2.5 font-mono text-[12.5px] text-[#f5f5f5] outline-none placeholder:text-[#8a8a8a] focus:border-[color:var(--oc-green-d)]" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">Name (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Harbor Dental"
            className="w-full rounded-xl border border-[#2a2a2a] bg-[color:var(--oc-input)] px-3 py-2.5 text-[12.5px] text-[#f5f5f5] outline-none placeholder:text-[#8a8a8a] focus:border-[color:var(--oc-green-d)]" />
        </div>
      </div>
      {error && <p className="mt-2.5 text-[12.5px] text-[color:var(--oc-red)]">{error}</p>}
      <p className="mt-2.5 text-[11.5px] text-[color:var(--oc-muted)]">
        The key is checked against that exact location before anything is saved.
      </p>
      <button onClick={add} disabled={busy || !ready}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--oc-ink)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-glow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Verify and add
      </button>
    </div>
  )
}
