/**
 * GET /api/addons/catalog — one honest answer to "what can I actually open?"
 *
 * WHY THIS EXISTS. There were three catalogues and none of them agreed:
 *
 *   lib/addon-registry.ts    3 add-ons with a real execute()
 *   lib/marketplace-data.ts  51 listing entries (31 public)
 *   app/api/addons/route.ts  its own hardcoded 5, whose slugs
 *                            (linkedin-scraper-pro, ai-composer-pro, crm-sync…)
 *                            appear in NEITHER of the others
 *
 * So the endpoint deciding what a customer owns was checking against a list of
 * things that do not exist anywhere else in the product. Nothing could open,
 * because nothing agreed on what "it" was. That is why the add-ons surface felt
 * like a brochure — it was one.
 *
 * The registry is the source of truth for CAN THIS RUN, because it holds the
 * code that runs it. The marketplace data is the source of truth for WHAT IS
 * THIS AND WHAT DOES IT COST. Every entry below is joined across both and
 * labelled with which of the two it came from, so a listing without an
 * implementation is visible as exactly that rather than quietly rendering as a
 * working product.
 *
 * ENTITLEMENT IS KEYED ON location_id, NEVER user_id — the doctrine, and the
 * old route violated it. One person can hold several locations; a user-keyed
 * entitlement either leaks an add-on into an account that did not buy it or
 * hides it from one that did.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { getAllAddonDefinitions } from '@/lib/addon-registry'
import { ADDONS, type MarketplaceAddon } from '@/lib/marketplace-data'
import { isOwnerEmail } from '@/lib/owner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** active · grace (paid, lapsed ≤7d) · locked. A boolean cannot express the middle one. */
type Entitlement = 'active' | 'grace' | 'locked'

export async function GET() {
  const notes: string[] = []

  let email: string | null = null
  try {
    const supabase = await createClient()
    email = (await supabase.auth.getSession()).data.session?.user?.email ?? null
  } catch {
    notes.push('Session unreadable — showing everything as locked rather than guessing.')
  }
  if (!email) return NextResponse.json({ authed: false }, { status: 200 })

  const owner = isOwnerEmail(email)
  const db = createServiceClient()

  // Which locations does this account actually hold a usable install for? That
  // is the honest definition of "connected", because it is what every
  // downstream call needs in order to do anything.
  const locations: string[] = []
  if (db) {
    try {
      const { data } = await db
        .from('crm_installations')
        .select('location_id, expires_at')
        .eq('status', 'active')
        .limit(500)
      for (const r of data ?? []) {
        if (r.location_id && r.expires_at && new Date(r.expires_at).getTime() > Date.now()) {
          locations.push(r.location_id)
        }
      }
    } catch (e) {
      notes.push(`Install lookup failed: ${(e as Error).message}. Entitlements below are unknown, not absent.`)
    }
  } else {
    notes.push('Storage unavailable — entitlements are unknown, not absent.')
  }

  // The registry is the only thing that can answer "does code exist for this".
  const runnable = new Map(getAllAddonDefinitions().map((d) => [d.slug, d]))

  const listed: MarketplaceAddon[] = (ADDONS as MarketplaceAddon[]).filter(
    (a) => owner || (a as { visibility?: string }).visibility !== 'owner',
  )

  const items = listed.map((a) => {
    const def = runnable.get(a.slug)
    // Owner sees everything as usable; that is the standing VIP rule. For
    // everyone else, an add-on is openable only if code exists AND the account
    // has a live install to run it against.
    const entitlement: Entitlement = owner
      ? 'active'
      : def && locations.length
        ? 'active'
        : 'locked'

    return {
      slug: a.slug,
      name: a.name,
      blurb: a.shortDesc || '',
      category: a.categories?.[0] ?? null,
      price: a.price ?? null,
      // THE FIELD THAT MATTERS. Not "is it advertised" — can you press it.
      runnable: !!def,
      entitlement,
      // Only ever an entry point when there is something behind it.
      href: def ? `/x/${a.slug}` : null,
      schedule: def?.schedule ?? null,
      configurable: !!def?.configSchema?.length,
      // Said plainly so a UI never has to infer it from three other fields.
      why: def
        ? entitlement === 'active'
          ? 'Ready to run.'
          : 'Built and ready — it needs a connected account before it can run.'
        : 'Listed, but not built yet. Nothing to open.',
    }
  })

  const openable = items.filter((i) => i.runnable && i.entitlement === 'active')

  return NextResponse.json({
    authed: true,
    isOwner: owner,
    connectedLocations: locations.length,
    counts: {
      // Three numbers, because collapsing them is what produced a brochure.
      listed: items.length,
      built: items.filter((i) => i.runnable).length,
      openable: openable.length,
    },
    items,
    notes,
  })
}
