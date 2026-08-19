/**
 * The add-on skeleton: { appId, entryRoute, requiredEntitlement }.
 *
 * ONE SHAPE FOR EVERY BOLT-ON. Adding an add-on should be a registry entry and
 * a definition, never a new page with its own idea of who may see it. Three
 * facts are all a generic frame needs:
 *
 *   appId               — the CRM marketplace app whose install grants this.
 *                         null means "any live install at this location counts"
 *                         (most add-ons ride the sub-account app). An add-on
 *                         with its own listing names it, so an install of some
 *                         OTHER app never opens it.
 *   entryRoute          — where the frame lives. Derived as /x/<slug>, but
 *                         stated rather than assumed so a migrated add-on can
 *                         keep an old URL without the gate losing track of it.
 *   requiredEntitlement — the location-scoped key the gate demands, plus the
 *                         rung of the pricing ladder that satisfies it.
 *
 * IT IS DERIVED, NOT DECLARED. This codebase has already paid for having three
 * catalogues that disagreed about what exists (fixed in 6900db5 / 2e79aab), so
 * a skeleton is computed from the two registries that already exist —
 * lib/addon-registry.ts for "is there code behind it" and lib/marketplace-data
 * for "what plan is it sold on". Adding a fourth hand-written list is how the
 * Hub ends up advertising a product nobody can open.
 */
import type { TierSlug } from '@/lib/pricing'
import { getAddonDefinition } from '@/lib/addon-registry'
import { ADDONS, type MarketplaceAddon } from '@/lib/marketplace-data'

export interface RequiredEntitlement {
  /** Location-scoped key. Matches addon_entitlements.addon_slug. */
  key: string
  /** The lowest plan that includes this add-on without a separate purchase. */
  minTier: TierSlug
}

export interface AddonSkeleton {
  slug: string
  name: string
  /** CRM marketplace app whose install grants this. null = any live install. */
  appId: string | null
  entryRoute: string
  requiredEntitlement: RequiredEntitlement
}

/**
 * Marketplace plan names → pricing.ts tier slugs.
 *
 * The two vocabularies drifted before this map existed: listings say
 * 'professional' and 'unlimited', pricing.ts says 'pro' and 'agency'. Rather
 * than rename 40 listings and risk missing one, the translation lives in a
 * single place that fails loudly on an unknown value.
 */
const PLAN_TO_TIER: Record<MarketplaceAddon['requiredPlan'], TierSlug> = {
  free: 'free',
  starter: 'starter',
  professional: 'pro',
  unlimited: 'agency',
}

/**
 * Add-ons that ship as their own CRM marketplace app.
 *
 * Only entries here demand a specific install. Everything else accepts any live
 * install at the location, because everything else is delivered by the
 * sub-account app the customer already has.
 */
const APP_ID_BY_SLUG: Record<string, string> = {
  // Course Builder — canonical registration. The second one (6a7ea3e8…) is
  // retired, recorded in lib/crm-apps.ts, and must never be named here.
  'ai-course-builder': process.env.CRM_COURSE_APP_ID || '69801f7a533633818a22921c',
}

/**
 * Explicit entry routes for add-ons that do not live at /x/<slug>.
 *
 * THIS IS THE MIGRATION PATH, and the reason entryRoute is stated rather than
 * computed. Both entries below are add-ons that shipped before the frame did.
 * Their URLs are load-bearing in ways a tidier path would break:
 *
 *   ai-course-builder — /dashboard/course-builder is the surface for a signed-in
 *       0nCORE user, which is exactly who the Hub sends here. Course Builder's
 *       other doors are for other audiences and are NOT the entry route:
 *       /app/course is the marketplace Custom Page (SSO in an iframe, no 0nCORE
 *       account) and /crm/courses is the agency console.
 *
 *   lead0n — /dashboard/lead0n, NOT /crm/leadscout. The latter is the URL on
 *       the marketplace build sheet and must keep matching it exactly, but it
 *       is the iframe Custom Page: it authenticates by SSO handshake and, opened
 *       from the Hub, correctly refuses because there is no parent to hand over
 *       a token. Pointing the Hub at it would unlock a tile onto a dead end.
 *       Both routes render the same component with a different `auth` prop.
 *       (The slug is the current name and /crm/leadscout is the registered
 *       route; the LeadScout->lead0n sweep is Stage C cleanup.)
 */
const ENTRY_ROUTE_BY_SLUG: Record<string, string> = {
  'ai-course-builder': '/dashboard/course-builder',
  lead0n: '/dashboard/lead0n',
}

export function entryRouteFor(slug: string): string {
  return ENTRY_ROUTE_BY_SLUG[slug] ?? `/x/${slug}`
}

/**
 * The skeleton for a slug, or null when nothing can run behind it.
 *
 * Returns null for a marketplace listing with no registered definition on
 * purpose: a frame for a product with no code is the dead end the Hub's exit
 * test forbids. Listing-only entries are locked TILES, never openable routes.
 */
export function skeletonFor(slug: string): AddonSkeleton | null {
  const def = getAddonDefinition(slug)
  if (!def) return null

  const listing = (ADDONS as MarketplaceAddon[]).find((a) => a.slug === slug) ?? null
  // No listing means no declared plan. Default to the top rung rather than the
  // bottom: an add-on nobody priced should not be free by omission.
  const minTier: TierSlug = listing ? (PLAN_TO_TIER[listing.requiredPlan] ?? 'enterprise') : 'enterprise'

  return {
    slug,
    name: def.name,
    appId: APP_ID_BY_SLUG[slug] ?? null,
    entryRoute: entryRouteFor(slug),
    requiredEntitlement: { key: slug, minTier },
  }
}

/** Every add-on that has both a definition and therefore a working door. */
export function allSkeletons(): AddonSkeleton[] {
  const out: AddonSkeleton[] = []
  for (const a of ADDONS as MarketplaceAddon[]) {
    const s = skeletonFor(a.slug)
    if (s) out.push(s)
  }
  return out
}
