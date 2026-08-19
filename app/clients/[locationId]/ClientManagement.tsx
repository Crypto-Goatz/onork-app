/**
 * One client's management page, which is a storefront.
 *
 * MOUNTED AT TWO PATHS ON PURPOSE. Middleware rewrites everything on
 * app.0ncore.com under /crm, so /clients/<id> becomes /crm/clients/<id> on the
 * host the agency actually uses. A page that exists at only one of the two
 * works perfectly in the codebase and 404s for the customer — which is exactly
 * how /clients and /automations broke before. One component, two thin routes.
 *
 * FOUR THINGS, IN THE ORDER AN AGENCY USES THEM:
 *   1. the AI layer card — locked promise, or on
 *   2. the wallet — balance, add credits, and the receipts under it
 *   3. the services grid — what else can be sold into this account
 *   4. the account's own facts, including whether we can act in it at all
 *
 * THE GRID IS HONEST ABOUT THREE STATES. open (code + entitlement), locked
 * (code, no entitlement — a promise with a price), listed (no code yet). The
 * distinction is computed in lib/clients/catalog.ts from the same registry the
 * /x door uses, so this page cannot advertise a door that 404s.
 *
 * OWNERSHIP IS PROVEN BEFORE ANYTHING RENDERS. resolveClient() looks the
 * location up inside the caller's own agency roster. A location id that is not
 * theirs gets the same answer as one that does not exist — a page that
 * distinguishes the two is an oracle for enumerating other agencies' accounts.
 */
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, Plug, AlertTriangle, Lock, Clock } from 'lucide-react'
import { resolveClient } from '@/lib/clients/viewer'
import { getClientTier } from '@/lib/clients/upgrade'
import { buildClientCatalog } from '@/lib/clients/catalog'
import { getWallet, listLedger } from '@/lib/wallets/scoped'
import { getSubLocationTier, upgradeDeltaCents, WALLET, testModeReason, usd } from '@/lib/client-tiers'
import WalletCard from '@/app/clients/components/WalletCard'
import AiLayerCard from '@/app/clients/components/AiLayerCard'

const STATUS_COPY: Record<string, { href: string; label: string }> = {
  'signed-out': { href: '/login', label: 'Sign in' },
  'no-agency': { href: '/connect', label: 'Connect your agency' },
  'not-yours': { href: '/clients', label: 'Back to clients' },
  unavailable: { href: '/clients', label: 'Back to clients' },
}

export default async function ClientManagement({ locationId }: { locationId: string }) {
  const r = await resolveClient(locationId)

  if (!r.ok) {
    const action = STATUS_COPY[r.reason] ?? STATUS_COPY['not-yours']
    return (
      <Shell>
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/70">{r.message}</p>
          <Link
            href={action.href}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-semibold text-[#062312] transition hover:opacity-90"
          >
            {action.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </Shell>
    )
  }

  const { viewer, client } = r

  const [tierState, wallet, ledger, services] = await Promise.all([
    getClientTier(client.locationId),
    getWallet('location', client.locationId, viewer.companyId),
    listLedger('location', client.locationId, 25),
    buildClientCatalog({ locationId: client.locationId, isOwner: viewer.isOwner }),
  ])

  const ai = getSubLocationTier('ai')
  const bare = getSubLocationTier('bare')
  const testMode = testModeReason()

  return (
    <Shell>
      <Link href="/clients" className="inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Clients
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl">
            <Building2 className="h-5 w-5 shrink-0 text-white/30" />
            <span className="truncate">{client.name}</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-white/30">{client.locationId}</p>
        </div>
        <p className="text-sm text-white/55">
          {tierState.verified
            ? tierState.tier === 'ai'
              ? `${ai.name} — ${usd(ai.priceCents)} ${ai.cadence}`
              : `${bare.name} — ${usd(bare.priceCents)} ${bare.cadence}`
            : 'Plan unreadable'}
        </p>
      </div>

      {client.error ? (
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.06] px-4 py-3 text-xs leading-relaxed text-[#f59e0b]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This account&apos;s connection has stopped working, so nothing can be run inside it until it is
            reconnected. Selling into it still works; delivering into it does not. ({client.error})
          </span>
        </p>
      ) : !client.connected ? (
        <p className="mt-6 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-white/55">
          <Plug className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <span>
            This client is on your CRM roster but not connected here, so we hold no key for it. It can be
            configured and sold to; nothing can run inside it yet.{' '}
            <Link href="/connect" className="text-[#6EE05A] hover:underline">Connect it</Link>.
          </span>
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AiLayerCard
          locationId={client.locationId}
          owned={tierState.tier === 'ai'}
          verified={tierState.verified}
          tierName={ai.name}
          tagline={ai.tagline}
          includes={ai.includes}
          deltaCents={upgradeDeltaCents()}
          priceCents={ai.priceCents}
          cadence={ai.cadence}
          testModeReason={testMode}
        />

        <WalletCard
          endpoint={`/api/clients/${encodeURIComponent(client.locationId)}/wallet`}
          initialBalanceCents={wallet ? wallet.balanceCents : null}
          initialLedger={ledger ?? []}
          denominations={[...WALLET.topupCents]}
          testModeReason={testMode}
          title="Client wallet"
          subtitle="Upgrades and usage draw from here. Every movement is receipted."
        />
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-white/85">Services</h2>
            <p className="mt-1 text-xs text-white/45">
              {services.filter((s) => s.state === 'open').length} open ·{' '}
              {services.filter((s) => s.state === 'locked').length} available to sell ·{' '}
              {services.filter((s) => s.state === 'listed').length} not built yet
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-white/85">{s.name}</p>
                  {s.state === 'open' ? (
                    s.entitlementState === 'grace' ? (
                      <Clock className="h-3.5 w-3.5 shrink-0 text-[#f59e0b]" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#6EE05A]" />
                    )
                  ) : s.state === 'locked' ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-white/25" />
                  ) : null}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/45">{s.shortDesc}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-white/35">{s.reason}</p>
                {s.state === 'open' && s.entitlementState === 'grace' && s.graceDaysLeft !== null && (
                  <p className="mt-1 text-[11px] text-[#f59e0b]">{s.graceDaysLeft} days left</p>
                )}
                {!s.verified && (
                  <p className="mt-1 text-[11px] text-[#f59e0b]">We could not check access for this one.</p>
                )}
                {s.state !== 'open' && s.priceCents > 0 && (
                  <p className="mt-2 text-[11px] text-white/50">{s.priceLabel}</p>
                )}
              </>
            )

            const tone =
              s.state === 'open'
                ? 'border-[#6EE05A]/25 bg-[#6EE05A]/[0.04] hover:border-[#6EE05A]/50'
                : s.state === 'locked'
                  ? 'border-white/10 bg-white/[0.02] hover:border-white/25'
                  : 'border-white/[0.06] bg-white/[0.01]'

            return s.href ? (
              <Link key={s.slug} href={s.href} className={`block rounded-xl border p-4 transition ${tone}`}>
                {body}
              </Link>
            ) : (
              <div key={s.slug} className={`rounded-xl border p-4 ${tone}`}>{body}</div>
            )
          })}
        </div>
      </section>
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
