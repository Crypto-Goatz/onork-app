/**
 * The agency's book of business, and the front door of the storefront.
 *
 * IT DOES NOT REPLACE /crm/clients, DELIBERATELY. That page is the connect-and-
 * key manager, and six surfaces link to it MEANING that — SetupAlert's
 * "clients_need_key", ConnectionHealth, "Clients & keys" in settings. Swapping
 * the page under them would send someone who needs to paste a key to a
 * storefront instead. Two pages over one list is only a duplicate when both
 * answer the same question; these answer "can we reach it" and "what can we
 * sell into it".
 *
 * WHAT MIKE ASKED FOR, VERBATIM: he logs in, his already-selected sub-locations
 * appear, each has a management page. This is the first half.
 *
 * IT SHOWS THE WHOLE ROSTER, FLAGGED — not just the accounts we hold a key for.
 * RocketOpp has 87 sub-accounts in the CRM and 6 connected here. A list of 6
 * would look like 81 clients had vanished; a list of 87 that implied we could
 * act in all of them would promise something we cannot deliver. So every client
 * is listed, and the ones we cannot act in say so and offer the one action that
 * fixes it.
 *
 * "WE COULD NOT CHECK" IS A THIRD STATE AND IT IS PRINTED. If the AI-layer read
 * fails, the page does not quietly render every client as bare — that would
 * invite an agency to buy an upgrade they already own.
 */
import Link from 'next/link'
import { ArrowRight, Building2, Plug, Sparkles, AlertTriangle, Wallet } from 'lucide-react'
import { resolveAgencyViewer } from '@/lib/clients/viewer'
import { getClientTiers } from '@/lib/clients/upgrade'
import { getCompanyLocationWallets } from '@/lib/wallets/scoped'
import { getSubLocationTier, usdShort, usd, testModeReason } from '@/lib/client-tiers'

export default async function ClientsStorefront() {
  const v = await resolveAgencyViewer()

  if (!v.ok) {
    return (
      <Shell>
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/70">{v.message}</p>
          <Link
            href={v.reason === 'signed-out' ? '/login' : '/connect'}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90"
          >
            {v.reason === 'signed-out' ? 'Sign in' : 'Connect your agency'} <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </Shell>
    )
  }

  const { viewer } = v
  const ids = viewer.clients.map((c) => c.locationId)
  const [tiers, wallets] = await Promise.all([getClientTiers(ids), getCompanyLocationWallets(viewer.companyId)])

  const bare = getSubLocationTier('bare')
  const ai = getSubLocationTier('ai')
  const connectedCount = viewer.clients.filter((c) => c.connected).length
  const aiCount = tiers ? [...tiers.values()].filter((t) => t === 'ai').length : null
  const testMode = testModeReason()

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Clients</h1>
          <p className="mt-2 text-sm text-white/55">
            {viewer.companyName ?? 'Your agency'} — {viewer.clients.length} client
            {viewer.clients.length === 1 ? '' : 's'}, {connectedCount} connected
            {aiCount === null ? ', AI layer unreadable' : `, ${aiCount} on the AI layer`}.
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90"
        >
          Add a client <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {testMode && (
        <p className="mt-6 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06] px-4 py-3 text-xs leading-relaxed text-[#f59e0b]">
          {testMode}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Standard" value={`${usdShort(bare.priceCents)} ${bare.cadence}`} hint="CRM, no AI" />
        <Stat label="Standard + AI" value={`${usdShort(ai.priceCents)} ${ai.cadence}`} hint="Born knowing the business" />
        <Stat
          label="Client wallets"
          value={wallets === null ? 'Unreadable' : usd([...wallets.values()].reduce((a, b) => a + b, 0))}
          hint={wallets === null ? 'The balance read failed' : 'Across every client'}
        />
      </div>

      {tiers === null && (
        <p className="mt-6 flex items-center gap-2 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06] px-4 py-3 text-xs text-[#f59e0b]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          We could not read which clients are on the AI layer, so every row below shows its plan as unknown.
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {viewer.clients.map((c) => {
          const tier = tiers?.get(c.locationId) ?? null
          const balance = wallets?.get(c.locationId) ?? null
          return (
            <li key={c.locationId}>
              <Link
                href={`/clients/${c.locationId}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 transition hover:border-white/25 hover:bg-white/[0.04]"
              >
                <Building2 className="h-4 w-4 shrink-0 text-white/30" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white/90">{c.name}</span>
                  <span className="block truncate font-mono text-[11px] text-white/30">{c.locationId}</span>
                </span>

                {c.error ? (
                  <Badge tone="amber" icon={AlertTriangle}>Connection broken</Badge>
                ) : c.connected ? (
                  <Badge tone="dim" icon={Plug}>Connected</Badge>
                ) : (
                  <Badge tone="dim">Not connected</Badge>
                )}

                {tier === 'ai' ? (
                  <Badge tone="green" icon={Sparkles}>AI layer</Badge>
                ) : tier === 'bare' ? (
                  <Badge tone="dim">Standard</Badge>
                ) : (
                  <Badge tone="amber">Plan unknown</Badge>
                )}

                <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                  <Wallet className="h-3.5 w-3.5 text-white/25" />
                  {balance === null ? '—' : usd(balance)}
                </span>

                <ArrowRight className="h-4 w-4 shrink-0 text-white/25" />
              </Link>
            </li>
          )
        })}
      </ul>

      {viewer.clients.length === 0 && (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/55">
          No clients on this agency yet.
        </p>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <main className="mx-auto max-w-[1100px] px-6 py-10 md:px-10">{children}</main>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
      <p className="text-[11px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white/90">{value}</p>
      <p className="mt-0.5 text-xs text-white/45">{hint}</p>
    </div>
  )
}

function Badge({
  children, tone, icon: Icon,
}: {
  children: React.ReactNode
  tone: 'green' | 'amber' | 'dim'
  icon?: React.ComponentType<{ className?: string }>
}) {
  const tones = {
    green: 'border-[#6EE05A]/30 bg-[#6EE05A]/[0.08] text-[#6EE05A]',
    amber: 'border-[#f59e0b]/30 bg-[#f59e0b]/[0.08] text-[#f59e0b]',
    dim: 'border-white/10 bg-white/[0.03] text-white/50',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${tones[tone]}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}
