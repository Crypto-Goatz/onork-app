/**
 * Who is asking, and which LOCATION are they asking for.
 *
 * ONE COPY, because there are now two page-side callers — /x/[slug] and the
 * hosted add-ons' own routes — and the doctrine this codebase already paid for
 * is that a rule with two implementations is a rule with two behaviours. The
 * API side resolves the same pair inside lib/addons/guard.ts.
 *
 * getSession, NEVER getUser. getUser races the middleware cookie refresh and
 * signs people out, which is the long-running "click anything and you're logged
 * out" bug this project has already paid for twice.
 *
 * A THROW IS A SIGNED-OUT VIEWER, NOT A CRASH. Everything downstream treats
 * "we do not know who this is" as locked, so failing closed here is the safe
 * direction — but note the caller still gets verified:false from the resolver
 * when the entitlement READ failed, which is a different sentence entirely.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'

export interface AddonViewer {
  email: string | null
  /** Trimmed by resolveEntitlement. '' means no location on file. */
  locationId: string
  authed: boolean
}

export async function addonViewer(): Promise<AddonViewer> {
  try {
    const supabase = await createClient()
    const session = (await supabase.auth.getSession()).data.session
    const user = session?.user
    if (!user) return { email: null, locationId: '', authed: false }

    let locationId = ''
    const db = createServiceClient()
    if (db) {
      const { data } = await db.from('profiles').select('crm_location_id').eq('id', user.id).maybeSingle()
      locationId = data?.crm_location_id ?? ''
    }
    return { email: user.email ?? null, locationId, authed: true }
  } catch {
    return { email: null, locationId: '', authed: false }
  }
}
