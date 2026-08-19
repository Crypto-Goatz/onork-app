/**
 * The gate, applied at a hosted add-on's OWN route.
 *
 * WHY THIS EXISTS AT ALL. /x/<slug> resolves the entitlement and then hands a
 * hosted add-on control of its own URL — and that URL is a normal route anyone
 * can type. If the check lived only at /x/, the frame would be a suggestion:
 * skip it and Course Builder opens for anyone with an account. So the same
 * resolver runs again here, exactly as lib/addons/guard.ts runs it again for
 * every add-on API call. One resolver, three call sites, no second rule.
 *
 * IT RENDERS THE SAME LOCKED PANEL the frame does, rather than redirecting to
 * /x/<slug>. A redirect between two surfaces that each gate the other is a loop
 * waiting for one of them to change its mind, and the customer would learn
 * nothing on either hop.
 *
 * GRACE RENDERS THE APP. Only 'locked' withholds it — a lapsed card must not
 * take the product away mid-sentence, which is the entire point of grace. The
 * countdown is the frame's job on /x/<slug>; here the app is simply not taken
 * away.
 */
import { getAddonDefinition } from '@/lib/addon-registry'
import { ADDONS, type MarketplaceAddon } from '@/lib/marketplace-data'
import { resolveEntitlement } from '@/lib/addons/entitlements'
import { addonViewer } from '@/lib/addons/viewer'
import { isOwnerEmail } from '@/lib/owner'
import AddonLocked from '@/app/x/[slug]/AddonLocked'

export default async function HostedGate({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const def = getAddonDefinition(slug)
  const listing = (ADDONS as MarketplaceAddon[]).find((a) => a.slug === slug) ?? null
  const name = def?.name ?? listing?.name ?? slug
  const blurb = listing?.shortDesc ?? ''

  const { email, locationId, authed } = await addonViewer()

  if (!authed) {
    return (
      <AddonLocked
        name={name}
        blurb={blurb}
        signedOut
        reason="Add-ons are enabled per CRM location, so this needs to know which account you are on."
        requiredTier="starter"
      />
    )
  }

  const verdict = await resolveEntitlement({ slug, locationId, isOwner: isOwnerEmail(email) })

  if (verdict.state === 'locked') {
    return (
      <AddonLocked
        name={name}
        blurb={blurb}
        reason={verdict.reason}
        verified={verdict.verified}
        requiredTier={verdict.requiredTier}
        locationId={verdict.locationId}
      />
    )
  }

  return <>{children}</>
}
