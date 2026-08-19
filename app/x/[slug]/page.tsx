/**
 * /x/[slug] — the one frame every bolt-on app is served through.
 *
 * THE POINT OF A PARAMETERIZED ROUTE: adding an add-on becomes a registry entry,
 * not a build. Before this, the add-ons surface listed 31 products and could
 * open none of them, because "opening" one had never been built — there were
 * three disagreeing catalogues and no door. This is the door, and it is the same
 * door for all of them.
 *
 * IT REFUSES BY DEFAULT, TWICE.
 *   · An unknown slug, or a listing with no implementation behind it, 404s
 *     rather than rendering an empty shell.
 *   · A known slug this LOCATION is not entitled to renders a locked panel that
 *     says what the add-on does and what would turn it on — never the frame
 *     with a Run button that then 403s. That button existed until now: the old
 *     gate read `product_keys` by user_id, a table with zero rows in it, so the
 *     frame rendered for everyone and the run failed for everyone.
 *
 * THE GATE IS SERVER-SIDE AND THE STATE IS TRI. active opens it, grace opens it
 * with a countdown the customer can see, locked does not render it at all. The
 * same verdict is enforced again in /api/addons/[slug]/{config,execute}, because
 * a page that hides a button is a courtesy and not a control.
 *
 * PERMISSION IS CHECKED BEFORE CAPABILITY, AND BOTH ARE CHECKED. The gate says
 * whether this location MAY open the add-on; resolveReconsent says whether the
 * CRM connection behind it can still answer. Those come apart, and the case
 * where they come apart — entitled, but the install is dead — is the only one
 * of the four that LOOKS fine. It rendered a Run button that 401'd. Now a dead
 * install renders the re-consent prompt instead of the frame, and a dying one
 * renders a banner above a frame that still works. See lib/crm/reconsent.ts.
 */
import { notFound, redirect } from 'next/navigation'
import { getAddonDefinition, isRunnableAddon } from '@/lib/addon-registry'
import { ADDONS, type MarketplaceAddon } from '@/lib/marketplace-data'
import { isOwnerEmail } from '@/lib/owner'
import { addonViewer } from '@/lib/addons/viewer'
import { resolveEntitlement } from '@/lib/addons/entitlements'
import { resolveReconsent } from '@/lib/crm/reconsent'
import { skeletonFor } from '@/lib/addons/skeleton'
import AddonFrame from './AddonFrame'
import AddonLocked from './AddonLocked'
import ReconsentPrompt from '@/components/addons/ReconsentPrompt'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const def = getAddonDefinition(slug)
  return { title: def ? `${def.name} — 0n` : 'Not found', robots: { index: false } }
}

export default async function AddonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // The registry is the only thing that can answer "is there code behind this".
  // A marketplace listing alone is a promise, not a product.
  const def = getAddonDefinition(slug)
  if (!def) notFound()

  const skeleton = skeletonFor(slug)
  if (!skeleton) notFound()

  const listing = (ADDONS as MarketplaceAddon[]).find((a) => a.slug === slug) ?? null
  const blurb = listing?.shortDesc ?? ''

  const { email, locationId, authed } = await addonViewer()

  if (!authed) {
    return (
      <AddonLocked
        name={def.name}
        blurb={blurb}
        signedOut
        reason="Add-ons are enabled per CRM location, so this needs to know which account you are on."
        requiredTier={skeleton.requiredEntitlement.minTier}
      />
    )
  }

  const verdict = await resolveEntitlement({
    slug,
    locationId,
    isOwner: isOwnerEmail(email),
  })

  if (verdict.state === 'locked') {
    return (
      <AddonLocked
        name={def.name}
        blurb={blurb}
        reason={verdict.reason}
        verified={verdict.verified}
        requiredTier={verdict.requiredTier}
        locationId={verdict.locationId}
      />
    )
  }

  /**
   * The connection behind the door. Owner override is exempt from BLOCKING:
   * the operator has to be able to look at a frame on an account with no live
   * CRM in order to look at it at all — but they still get the banner, because
   * an operator who cannot see the connection is dead is how it stays dead.
   */
  const reconsent = await resolveReconsent({
    locationId: verdict.locationId,
    appId: skeleton.appId,
    next: skeleton.entryRoute,
    appName: def.name,
  })

  if (reconsent.needed && reconsent.blocking && verdict.source !== 'owner') {
    return (
      <ReconsentPrompt
        appName={def.name}
        data={{
          severity: reconsent.severity as 'dying' | 'dead' | 'absent',
          blocking: true,
          headline: reconsent.headline,
          detail: reconsent.detail,
          actionLabel: reconsent.actionLabel,
          actionHref: reconsent.actionHref,
          locationId: reconsent.locationId,
          daysLeft: reconsent.daysLeft,
        }}
      />
    )
  }

  /**
   * A HOSTED ADD-ON IS HANDED OFF, NOT RE-RENDERED.
   *
   * Course Builder and lead0n shipped before this frame did and each has a real
   * UI. Rendering the generic configure-and-Run panel for them would replace a
   * course list and a lead search with an empty form — a migration that made
   * the product worse. What they migrate onto is the GATE: everything above
   * this line ran identically for them, and only now, having been let through,
   * do they get control of their own route.
   *
   * The redirect is deliberate rather than an inline render. Their routes carry
   * their own layouts and their own auth, and resolving the same page at two
   * URLs is how this codebase ended up with add-ons in three catalogues.
   */
  if (!isRunnableAddon(def)) {
    redirect(skeleton.entryRoute)
  }

  return (
    <AddonFrame
      slug={slug}
      name={def.name}
      schedule={def.schedule}
      fields={def.configSchema}
      blurb={blurb}
      grace={
        verdict.state === 'grace'
          ? { reason: verdict.reason, daysLeft: verdict.graceDaysLeft ?? 0, endsAt: verdict.graceEndsAt ?? '' }
          : null
      }
      access={{ source: verdict.source, reason: verdict.reason }}
      reconsent={
        reconsent.needed
          ? {
              severity: reconsent.severity as 'dying' | 'dead' | 'absent',
              blocking: false,
              headline: reconsent.headline,
              detail: reconsent.detail,
              actionLabel: reconsent.actionLabel,
              actionHref: reconsent.actionHref,
              locationId: reconsent.locationId,
              daysLeft: reconsent.daysLeft,
            }
          : null
      }
    />
  )
}
