/**
 * What the agency may sell to THIS client, and the honest state of each item.
 *
 * THE HONESTY RULE, CARRIED OVER FROM THE HUB. There are three states and a
 * surface that blurs them is how a dashboard advertises a product nobody can
 * open:
 *
 *   'open'   — code exists AND this location is entitled. The tile is a door.
 *   'locked' — code exists, this location is not entitled. The tile is a
 *              PROMISE: what it does, why it is shut, what would open it.
 *   'listed' — a marketplace listing with nothing running behind it. Sold as
 *              "coming", never rendered with a button that 404s.
 *
 * The line between 'locked' and 'listed' is drawn by lib/addons/skeleton.ts —
 * "is there a registered definition behind this slug" — and not by a hand-kept
 * list here. This codebase has already paid for three catalogues that disagreed
 * about what exists; a fourth would be the same bill again.
 *
 * ENTITLEMENT IS RESOLVED, NOT RE-DERIVED. Every 'open' verdict comes from
 * resolveEntitlement(), the same function the /x door enforces with. If this
 * grid ever said "open" while the door said "locked", the grid would be lying —
 * so it asks the door rather than reimplementing it.
 *
 * COST: the resolver is only called for slugs that HAVE code (3 today, of 51
 * listings). The other 48 are 'listed' by definition and need no read.
 */
import { visibleAddons, type MarketplaceAddon } from '@/lib/marketplace-data'
import { skeletonFor } from '@/lib/addons/skeleton'
import { resolveEntitlement, type EntitlementState } from '@/lib/addons/entitlements'
import type { TierSlug } from '@/lib/pricing'

export type ServiceState = 'open' | 'locked' | 'listed'

export interface ClientService {
  slug: string
  name: string
  shortDesc: string
  categories: string[]
  priceCents: number
  priceLabel: string
  state: ServiceState
  /** Sentence the tile prints. Always present, including when open. */
  reason: string
  /** Where the tile goes when state is 'open'. null otherwise — no dead links. */
  href: string | null
  requiredTier: TierSlug | null
  /** grace only ever accompanies state 'open'. */
  entitlementState: EntitlementState | null
  graceDaysLeft: number | null
  /** false when the entitlement READ failed. The tile says so rather than
   *  claiming the customer does not own it. */
  verified: boolean
}

export async function buildClientCatalog(args: {
  locationId: string
  /** Operator override — opens frames and reveals owner-only listings. */
  isOwner: boolean
}): Promise<ClientService[]> {
  // Owner-only listings must be ABSENT for everyone else, not merely labelled.
  const listings = visibleAddons({ isOwner: args.isOwner }) as MarketplaceAddon[]

  const out: ClientService[] = []
  for (const listing of listings) {
    const skeleton = skeletonFor(listing.slug)

    if (!skeleton) {
      out.push({
        slug: listing.slug,
        name: listing.name,
        shortDesc: listing.shortDesc,
        categories: listing.categories,
        priceCents: listing.price,
        priceLabel: listing.priceLabel,
        state: 'listed',
        reason: 'Listed — there is nothing running behind this one yet.',
        href: null,
        requiredTier: null,
        entitlementState: null,
        graceDaysLeft: null,
        verified: true,
      })
      continue
    }

    const verdict = await resolveEntitlement({
      slug: listing.slug,
      locationId: args.locationId,
      // The owner override lets Mike open a frame on an account with no live
      // CRM, which is the only way to look at one at all. It never implies a
      // purchase and is reported as source 'owner' by the resolver.
      isOwner: args.isOwner,
    })

    const open = verdict.state === 'active' || verdict.state === 'grace'
    out.push({
      slug: listing.slug,
      name: listing.name,
      shortDesc: listing.shortDesc,
      categories: listing.categories,
      priceCents: listing.price,
      priceLabel: listing.priceLabel,
      state: open ? 'open' : 'locked',
      reason: verdict.reason,
      href: open ? verdict.entryRoute : null,
      requiredTier: verdict.requiredTier,
      entitlementState: verdict.state,
      graceDaysLeft: verdict.graceDaysLeft ?? null,
      verified: verdict.verified,
    })
  }

  // Doors first, then promises, then the not-yet. Selling starts with what
  // works.
  const rank: Record<ServiceState, number> = { open: 0, locked: 1, listed: 2 }
  out.sort((a, b) => rank[a.state] - rank[b.state] || a.name.localeCompare(b.name))
  return out
}
