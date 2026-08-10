'use client'

/**
 * /connect — agency onboarding and account connection.
 *
 * Base framework: correct behaviour, design-system tokens, no visual flourish.
 * Structured so the three steps are separable components once design lands.
 *
 * The flow it encodes: agency PIT + company ID → their client list → pick the
 * one free account → connect any others at $8.99/mo. The per-account PIT step
 * is unavoidable — an agency token can list accounts but cannot act inside one.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  Search,
  TriangleAlert,
} from 'lucide-react'

const PRICE_PER_ACCOUNT = '$8.99'

interface Account {
  locationId: string
  name: string
  connected: boolean
  isFree: boolean
  billingStatus: string | null
  verifiedAt: string | null
  error: string | null
}

export default function ConnectPage() {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/connect/accounts', { cache: 'no-store' })
      const json = await res.json()
      setConnected(Boolean(json.connected))
      setAccounts(Array.isArray(json.accounts) ? json.accounts : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const hasFree = accounts.some((a) => a.isFree)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || a.locationId.toLowerCase().includes(q),
    )
  }, [accounts, query])

  const paidCount = accounts.filter((a) => a.connected && !a.isFree).length

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d1117] px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="h-32 animate-pulse rounded-xl border border-[#30363d] bg-[#161b22]" />
        </div>
      </main>
    )
  }

  if (!connected) {
    return <AgencyStep onDone={load} />
  }

  return (
    <main className="min-h-screen bg-[#0d1117] px-6 py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            Your client accounts
          </h1>
          <p className="text-sm leading-relaxed text-[#c9d1d9]">
            {accounts.length} accounts found in your CRM.{' '}
            {hasFree
              ? `One is included free. Additional accounts are ${PRICE_PER_ACCOUNT}/month each.`
              : 'Pick one to be your free account, then connect any others you want.'}
          </p>
          {paidCount > 0 && (
            <p className="text-xs text-[#8b949e]">
              {paidCount} paid {paidCount === 1 ? 'account' : 'accounts'} — {PRICE_PER_ACCOUNT}
              /month each.
            </p>
          )}
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b949e]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts…"
            className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] py-2 pl-9 pr-3 text-sm text-[#e6edf3] transition-colors duration-150 placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((a) => (
            <AccountRow key={a.locationId} account={a} canTakeFree={!hasFree} onDone={load} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-[#8b949e]">No accounts match that search.</p>
          )}
        </div>
      </div>
    </main>
  )
}

/** Step 1 — agency token + company ID. */
function AgencyStep({ onDone }: { onDone: () => void }) {
  const [pit, setPit] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/connect/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyPit: pit, companyId }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error || 'Could not connect.')
      else onDone()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1117] px-6 py-8">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3">
          <Building2 className="h-8 w-8 text-[#6EE05A]" />
          <h1 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            Connect your agency
          </h1>
          <p className="text-sm leading-relaxed text-[#c9d1d9]">
            Paste your agency token and company ID. We&apos;ll read your client list — nothing is
            changed in your CRM.
          </p>
        </header>

        <div className="space-y-4 rounded-xl border border-[#30363d] bg-[#161b22] p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Agency token</label>
            <div className="relative">
              <input
                type={reveal ? 'text' : 'password'}
                value={pit}
                onChange={(e) => setPit(e.target.value)}
                placeholder="pit-…"
                className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] py-2 pl-3 pr-10 font-mono text-sm text-[#e6edf3] transition-colors duration-150 placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Hide token' : 'Show token'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#8b949e] transition-all duration-150 hover:bg-[#21262d] hover:text-[#e6edf3]"
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Company ID</label>
            <input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="Your CRM company ID"
              className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 font-mono text-sm text-[#e6edf3] transition-colors duration-150 placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 text-xs text-[#f87171]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={busy || !pit || !companyId}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-medium text-[#0d1117] transition-all duration-150 hover:bg-[#5bc74a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            {busy ? 'Checking…' : 'Connect'}
          </button>
        </div>
      </div>
    </main>
  )
}

/** One client account — connected, free, or awaiting its own token. */
function AccountRow({
  account,
  canTakeFree,
  onDone,
}: {
  account: Account
  canTakeFree: boolean
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pit, setPit] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/connect/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: account.locationId, pit, isFree: canTakeFree }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error || 'Could not connect that account.')
      else {
        setOpen(false)
        setPit('')
        onDone()
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 transition-colors duration-150 hover:border-[#484f58]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-[#e6edf3]">{account.name}</p>
          <p className="font-mono text-xs text-[#8b949e]">{account.locationId}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {account.isFree && (
            <span className="rounded-full bg-[#6EE05A]/10 px-2.5 py-1 text-xs font-medium text-[#6EE05A]">
              Free
            </span>
          )}
          {account.connected && !account.isFree && (
            <span className="rounded-full bg-[#6EE05A]/10 px-2.5 py-1 text-xs font-medium text-[#6EE05A]">
              <Check className="mr-1 inline h-3 w-3" />
              Connected
            </span>
          )}
          {!account.connected && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm font-medium text-[#c9d1d9] transition-all duration-150 hover:bg-[#30363d] hover:text-[#e6edf3] active:scale-[0.98]"
            >
              {canTakeFree ? 'Make this free' : `Connect · ${PRICE_PER_ACCOUNT}/mo`}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {account.error && (
        <p className="mt-3 flex items-start gap-2 text-xs text-[#f87171]">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {account.error}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-[#30363d] pt-4">
          <label className="block text-xs font-medium text-[#8b949e]">
            Token for this account
          </label>
          <input
            type="password"
            value={pit}
            onChange={(e) => setPit(e.target.value)}
            placeholder="pit-…"
            className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 font-mono text-sm text-[#e6edf3] transition-colors duration-150 placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
          />
          <p className="text-xs text-[#8b949e]">
            Generate this inside <span className="text-[#c9d1d9]">{account.name}</span> — an agency
            token will not work here.
          </p>
          {error && <p className="text-xs text-[#f87171]">{error}</p>}
          <button
            onClick={connect}
            disabled={busy || !pit}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-medium text-[#0d1117] transition-all duration-150 hover:bg-[#5bc74a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Checking…' : 'Connect account'}
          </button>
        </div>
      )}
    </div>
  )
}
