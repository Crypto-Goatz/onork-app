/**
 * The API-side half of the add-on gate.
 *
 * THE PAGE HIDING A BUTTON IS A COURTESY; THIS IS THE CONTROL. /x/[slug] refuses
 * to render the frame when a location is not entitled, but the execute endpoint
 * is a POST anyone can send, so the same verdict is resolved again here. One
 * resolver, two call sites — a second copy of the rule is a second chance to
 * get it wrong.
 *
 * GRACE MAY RUN. That is the entire point of grace: the work keeps happening
 * while the billing problem gets fixed. Only 'locked' refuses.
 *
 * 402, NOT 403. "Payment required" is what this actually is, and it lets the
 * client tell "you need to add this" apart from "you may not do this at all".
 * The body carries the resolver's sentence verbatim, because a gate that says
 * "Forbidden" sends people to support with nothing to act on.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { isOwnerEmail } from '@/lib/owner'
import { resolveEntitlement, type EntitlementVerdict } from '@/lib/addons/entitlements'

export type AddonAccess =
  | { ok: true; userId: string; email: string; locationId: string; verdict: EntitlementVerdict }
  | { ok: false; response: NextResponse }

export async function requireAddonAccess(slug: string): Promise<AddonAccess> {
  // getSession, never getUser — see lib/owner.ts for the five-month bug.
  const supabase = await createClient()
  const session = (await supabase.auth.getSession()).data.session
  const user = session?.user
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  let locationId = ''
  const db = createServiceClient()
  if (db) {
    const { data } = await db.from('profiles').select('crm_location_id').eq('id', user.id).maybeSingle()
    locationId = data?.crm_location_id ?? ''
  }

  const email = user.email ?? ''
  const verdict = await resolveEntitlement({ slug, locationId, isOwner: isOwnerEmail(email) })

  if (verdict.state === 'locked') {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: verdict.reason,
          state: verdict.state,
          // false means the check itself failed. The client must not render
          // this as "you don't own it".
          verified: verdict.verified,
          requiredTier: verdict.requiredTier,
          locationId: verdict.locationId,
        },
        // A failed read is our fault and retryable; an honest lock is 402.
        { status: verdict.verified ? 402 : 503 },
      ),
    }
  }

  return { ok: true, userId: user.id, email, locationId: verdict.locationId, verdict }
}
