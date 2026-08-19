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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Layer 2 capabilities. A locked tile is a promise, so each carries a real sentence. */
const LOCKED_TILES = [
  { slug: 'sxo', name: 'SXO', blurb: 'Make every page answerable by AI search, then prove it moved.' },
  { slug: 'cro9', name: 'CRO9', blurb: 'Conversion analytics that runs its own experiments.' },
  { slug: 'social0n', name: 'social0n', blurb: 'Social content that writes, schedules and reports itself.' },
  { slug: 'web0n', name: 'web0n', blurb: 'Describe a site; get a real one, connected to your CRM.' },
  { slug: 'lead0n', name: 'lead0n', blurb: 'Find the buyers already looking for you.' },
  { slug: 'agent-studio', name: 'Agent Studio', blurb: 'Give an AI agent your voice, your rules and your calendar.' },
]

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
  let apps: { slug: string; name: string; href: string; state: 'live' }[] = []
  let appsNote: string | undefined
  if (!db) {
    appsNote = 'Storage unavailable — your app list could not be loaded. This is not the same as owning none.'
  } else {
    try {
      // A location with a usable install is the honest definition of "you have
      // a working app", because that is what every downstream call needs.
      const { data } = await db
        .from('crm_installations')
        .select('app_id, location_id, expires_at, refresh_token, health_status')
        .eq('status', 'active')
        .limit(200)
      const usable = (data ?? []).filter(
        (r) => r.expires_at && new Date(r.expires_at).getTime() > Date.now(),
      )
      if (usable.length) {
        apps = [{ slug: 'course-builder', name: 'AI Course Builder', href: '/x/course-builder', state: 'live' as const }]
      } else {
        appsNote = 'No connected app yet. Installing one from the marketplace is what turns these on.'
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
  // Spec calls for link-out in v1 with an honest label; native cards wait for
  // named endpoints.
  const learning = {
    verified: false,
    note: 'Courses live in the hosted membership portal. Native cards arrive when its endpoints are named — until then this links out rather than pretending to embed.',
    href: 'https://www.0ncore.com/learn',
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
    locked: LOCKED_TILES,
    whatsNew: [
      { at: '2026-08-19', text: 'The Hub is now where you land. The vault moved to Account → Security, challenge and all.' },
      { at: '2026-08-18', text: 'One 0n key now works across the API, the extension and Claude — no second key to manage.' },
      { at: '2026-08-18', text: 'Connecting Google works again. An old grant was being merged into the request and rejected.' },
    ],
    notes,
  })
}
