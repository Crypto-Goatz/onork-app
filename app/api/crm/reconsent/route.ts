/**
 * GET /api/crm/reconsent — "does this location need to re-authorize, and what
 * do I tell them?"
 *
 * The re-consent prompt renders server-side inside /x/[slug], so this endpoint
 * is NOT what draws it. It exists because three other surfaces ask the same
 * question and must not each grow their own answer: the Hub tiles, the Chrome
 * extension panel, and whoever writes the sweep email for accounts that never
 * open the app. One resolver, one set of words, four places.
 *
 * IT NEVER RETURNS A TOKEN, and it never returns another account's state. The
 * location is taken from the caller's profile, and an explicit ?locationId is
 * honoured only for the owner — otherwise this becomes an endpoint for reading
 * the connection health of arbitrary locations by guessing ids.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { isOwnerEmail } from '@/lib/owner'
import { resolveReconsent } from '@/lib/crm/reconsent'
import { skeletonFor } from '@/lib/addons/skeleton'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const owner = isOwnerEmail(user.email ?? null)
  const asked = (req.nextUrl.searchParams.get('locationId') || '').trim()

  let locationId = ''
  const db = createServiceClient()
  if (db) {
    const { data } = await db
      .from('profiles').select('crm_location_id').eq('id', user.id).maybeSingle()
    locationId = (data?.crm_location_id ?? '').trim()
  }
  // Only the owner may point this at a location that is not their own.
  if (asked && owner) locationId = asked

  // An add-on slug narrows the question to the app that actually serves it —
  // "is this location connected" and "is the app behind Course Builder
  // connected" are different questions with different answers.
  const slug = (req.nextUrl.searchParams.get('slug') || '').trim()
  const skeleton = slug ? skeletonFor(slug) : null

  const verdict = await resolveReconsent({
    locationId,
    appId: skeleton?.appId ?? null,
    next: skeleton?.entryRoute ?? null,
    appName: skeleton?.name,
  })

  return NextResponse.json({
    ...verdict,
    // Named so a caller can tell "we asked about one app" from "we asked about
    // the location". A prompt scoped to the wrong app is worse than none.
    scope: skeleton ? { slug: skeleton.slug, appId: skeleton.appId } : null,
  })
}
