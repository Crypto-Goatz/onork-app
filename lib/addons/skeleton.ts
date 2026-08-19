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
  /**
   * CRM marketplace app whose install grants this.
   *
   * null means EITHER "any live install counts" (ownApp false — the add-on is
   * delivered by the sub-account app the customer already has) OR "this add-on
   * has its own app and we do not know its ID yet" (ownApp true). Those two are
   * opposite instructions to the gate, which is why ownApp exists: reading null
   * alone made an unregistered product openable by anyone with any install.
   */
  appId: string | null
  /**
   * True when the add-on ships as its OWN marketplace app.
   *
   * The install source then requires an install of THAT app specifically — and
   * when the app ID is not known yet, contributes nothing at all rather than
   * falling back to "any install will do". Fail closed: an add-on somebody is
   * meant to buy should not be handed out on the strength of an unrelated
   * install while its own listing is still being created.
   */
  ownApp: boolean
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
  // 0nBlueprint — no default, and that is the point. The app is not registered
  // in the developer portal yet, so there is no ID to name; an invented one
  // would be matched against crm_installations as though it were real. Until
  // the env var is set this resolves to null WITH ownApp true, which the gate
  // reads as "not installable yet", not as "any install opens it".
  '0nblueprint': process.env.CRM_BLUEPRINT_APP_ID || '',
}

/**
 * Add-ons that ship as their OWN marketplace app.
 *
 * Separate from APP_ID_BY_SLUG because the two facts come apart exactly once —
 * in the window between deciding an add-on gets its own listing and that listing
 * existing. During that window the ID is unknown and the answer must still be
 * "no install opens this", which a missing map entry cannot express.
 */
const OWN_APP_SLUGS = new Set<string>(['ai-course-builder', '0nblueprint'])

/**
 * Explicit entry routes for add-ons that do not live at /x/<slug>.
 *
 * EMPTY, AND THAT IS THE FINDING. This map was added for the Course Builder and
 * lead0n migration on the assumption that each would keep the route it already
 * had. Production said otherwise: /dashboard/* is owner-only (the H1 gate), so
 * pointing a customer's Hub tile at /dashboard/course-builder bounced them to
 * /hub — a tile that said Open and led home. Both hosted add-ons are therefore
 * served AT /x/<slug>, rendering their own screen inside the frame; see
 * app/x/[slug]/HostedApp.tsx.
 *
 * The mechanism stays because the reason for it stands: an add-on that must
 * keep an old URL can say so here without the gate losing track of it. It
 * should hold an entry only for a route the entitled customer can actually
 * reach.
 */
const ENTRY_ROUTE_BY_SLUG: Record<string, string> = {}

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
    // `|| null`, not `?? null`: an env var that is set-but-empty is the same
    // as absent, and '' as an app id matches nothing while reading as truthy.
    appId: APP_ID_BY_SLUG[slug] || null,
    ownApp: OWN_APP_SLUGS.has(slug),
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
