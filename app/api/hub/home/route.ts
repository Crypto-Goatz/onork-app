/**
 * GET /api/hub/home — everything Hub v1 renders, in one call.
 *
 * THE RULE THIS ENDPOINT EXISTS TO ENFORCE: a tile is only allowed to say
 * something the server actually checked. Hub v1 is the first thing a cold
 * visitor sees after the invite email, and the exit test for it is "click
 * everything, reach either a working flow or a locked tile, never a maze". A
 * tile that claims a subscription because a query quietly failed is exactly the
 * maze — it sends someone to a page that then contradicts it.
 *
 * So every field below is one of three things, never a fourth:
 *   · a measured value
 *   · null, WITH a note saying why it could not be measured
 *   · explicitly labelled unverified, when the surface it describes has not
 *     been proven end to end yet
 *
 * Nothing here returns 0 to mean "we could not tell". This codebase has already
 * shipped a card that told someone their day was clear on the strength of a
 * failed request.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { isOwnerEmail } from '@/lib/owner'
import { ADDONS, type MarketplaceAddon } from '@/lib/marketplace-data'
import { allSkeletons } from '@/lib/addons/skeleton'
import { resolveEntitlement } from '@/lib/addons/entitlements'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Tiles come from the REGISTRY, and their state comes from the GATE.
 *
 * A hardcoded tile array is how a Hub ends up advertising something that does
 * not exist — it is a fourth catalogue in a codebase that already had three
 * that disagreed. Reading the registry means a new add-on appears here by being
 * registered, and a tile can never promise a product with no code behind it.
 *
 * AND IT ASKS THE SAME GATE THE DOOR ASKS. This used to open every registered
 * tile the moment ANY location in the table had a live install — not the
 * viewer's location, any location. So a visitor with nothing connected saw
 * three "Open" tiles that led to a Run button which then 403'd. That is exactly
 * the maze the exit test forbids: a tile is open here only if
 * /x/<slug> would actually open for THIS location.
 */
async function tiles(opts: { owner: boolean; locationId: string }) {
  const runnable = allSkeletons()
  const listed = (ADDONS as MarketplaceAddon[]).filter(
    (a) => opts.owner || (a as { visibility?: string }).visibility !== 'owner',
  )
  const open: { slug: string; name: string; href: string; state: 'live' | 'grace'; note?: string }[] = []
  const locked: { slug: string; name: string; blurb: string }[] = []

  const verdicts = new Map(
    await Promise.all(
      runnable.map(async (s) =>
        [s.slug, await resolveEntitlement({ slug: s.slug, locationId: opts.locationId, isOwner: opts.owner })] as const,
      ),
    ),
  )

  for (const a of listed) {
    const v = verdicts.get(a.slug)
    if (v && v.state !== 'locked') {
      open.push({
        slug: a.slug,
        name: a.name,
        href: v.entryRoute,
        state: v.state === 'grace' ? 'grace' : 'live',
        note: v.state === 'grace' ? v.reason : undefined,
      })
    } else {
      // Locked says WHY when the gate had a sentence, and falls back to what the
      // product does. Either way it is a promise, never a bare padlock.
      locked.push({ slug: a.slug, name: a.name, blurb: v?.reason || a.shortDesc || '' })
    }
  }
  // A locked wall of 40 is noise, not a promise. Show the strongest handful.
  return { open, locked: locked.slice(0, 6) }
}

export async function GET() {
  const notes: string[] = []

  // getSession, never getUser — getUser races the middleware cookie refresh and
  // signs people out, which is the long-running "click anything and you're
  // logged out" bug this project already paid for.
  let email: string | null = null
  let firstName = 'there'
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const session = (await supabase.auth.getSession()).data.session
    email = session?.user?.email ?? null
    userId = session?.user?.id ?? null
    const full = (session?.user?.user_metadata?.full_name as string) || ''
    // "Hi, Mke." shipped because a stored name was trusted blindly. Trim it,
    // and fall back to the email local-part rather than rendering a typo.
    const cleaned = full.trim().replace(/\s+/g, ' ')
    firstName = cleaned ? cleaned.split(' ')[0] : (email ? email.split('@')[0] : 'there')
  } catch {
    notes.push('Could not read the session, so this page is showing its signed-out state.')
  }

  if (!email) return NextResponse.json({ authed: false }, { status: 200 })

  const db = createServiceClient()

  // ── Apps this account can actually use ───────────────────────────────
  //
  // "Can actually use" means the gate at /x/<slug> would let this LOCATION in.
  // Not "someone somewhere has an install", which is what this asked before.
  let apps: { slug: string; name: string; href: string; state: 'live' | 'grace'; note?: string }[] = []
  let locked: { slug: string; name: string; blurb: string }[] = []
  let appsNote: string | undefined

  let locationId = ''
  if (!db) {
    appsNote = 'Storage unavailable — your app list could not be loaded. This is not the same as owning none.'
  } else {
    try {
      if (userId) {
        const { data: profile } = await db
          .from('profiles').select('crm_location_id').eq('id', userId).maybeSingle()
        locationId = profile?.crm_location_id ?? ''
      }
      const t = await tiles({ owner: isOwnerEmail(email), locationId })
      apps = t.open
      locked = t.locked
      if (!apps.length) {
        appsNote = locationId
          ? 'Nothing is switched on for this location yet. Installing an add-on from the marketplace is what turns these on.'
          : 'No CRM location is connected yet. Add-ons are enabled per location, so connecting one is the first step.'
      }
    } catch (e) {
      appsNote = `App list unavailable: ${(e as Error).message}`
    }
  }

  // ── Billing ──────────────────────────────────────────────────────────
  // Named honestly. There is no verified subscription read on this account
  // yet, and inventing a "Free plan" badge would be a claim about billing.
  const billing = {
    plan: null as string | null,
    status: 'unverified' as const,
    note: 'Subscription status is not wired to a verified billing read yet. Rather than show a plan we have not checked, this says nothing.',
    manageHref: '/api/billing/portal',
  }

  // ── Learning ─────────────────────────────────────────────────────────
  //
  // LOCKED, NOT LINKED — a correction, not a downgrade.
  //
  // This tile shipped pointing at https://www.0ncore.com/learn, which 404s.
  // "Open courses" rendered in Hub green and landing on a not-found page is
  // exactly the failure the cold-visitor exit test exists to catch: something
  // that looks live and then dead-ends. Every candidate was checked before
  // this was changed, and there is no customer-facing course shelf today:
  //   · /portal is live, but it is the member PROFILE widget — name, email,
  //     phone, address. No courses in it. Sending "Open courses" there would
  //     be a quieter version of the same lie.
  //   · /crm/courses is the agency operator screen, not a member's shelf.
  //   · /dashboard/courses is owner-only behind the H1 gate, so a customer
  //     following it is bounced straight back to /hub.
  //
  // A capability that is real but not yet reachable is precisely what the
  // locked state is for. It renders behind glass with a sentence saying what
  // it will do, and becomes a link again the day a members' course URL exists
  // — set `href` here and the tile turns itself back into one.
  const learning = {
    verified: false,
    state: 'locked' as const,
    blurb: 'Free and paid courses on one shelf, opened straight from your account — no second login.',
    note: 'The course shelf has no customer-facing address yet, so this is shown locked rather than linked to a page that would 404.',
  }

  return NextResponse.json({
    authed: true,
    firstName,
    email,
    isOwner: isOwnerEmail(email),
    userId,
    apps,
    appsNote,
    // Count derives from the array. A separate number is how "0 apps" got shown
    // next to a list that had entries.
    appCount: apps.length,
    billing,
    learning,
    locked,
    whatsNew: [
      { at: '2026-08-19', text: 'The Hub is now where you land. The vault moved to Account → Security, challenge and all.' },
      { at: '2026-08-18', text: 'One 0n key now works across the API, the extension and Claude — no second key to manage.' },
      { at: '2026-08-18', text: 'Connecting Google works again. An old grant was being merged into the request and rejected.' },
    ],
    notes,
  })
}
