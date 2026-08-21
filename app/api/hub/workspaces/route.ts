/**
 * GET /api/hub/workspaces?addon=<slug> — the Contacts LOCATION ID Check.
 *
 * One endpoint, three consumers, deliberately:
 *   · the Hub's "My Workspaces" list
 *   · the workspace switcher the /x/ frame renders for every add-on
 *   · a publish picker ("choose which client to publish to")
 *
 * They are the same question — *which workspaces may this person act in, and
 * how* — and giving them one answer is the point. Three callers computing it
 * separately is how a switcher and a picker end up disagreeing about what a
 * customer owns, which is the two-sources-of-truth failure this codebase keeps
 * paying for.
 *
 * IT NEVER RETURNS A TOKEN. Location ids, names, roles and verdicts are enough
 * to render any of the three surfaces.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { resolveWorkspaces, resolveWorkspacesForIdentity, type WorkspaceResolution } from '@/lib/workspaces/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const addon = req.nextUrl.searchParams.get('addon')?.trim() || 'ai-course-builder'

  /**
   * TWO WAYS IN, because there are two kinds of user — the same pair
   * /api/crm/courses already accepts, and the reason this endpoint was broken.
   *
   * An agency at 0ncore.com carries a Supabase cookie. Someone who installed
   * from the marketplace has no account here: `useSso` deliberately keeps its
   * session as a JWT in sessionStorage precisely BECAUSE there is usually no
   * usable cookie inside the CRM iframe. Checking only the cookie meant this
   * route could authenticate a real embedded install only by accident — when a
   * leftover cookie from a direct 0nCore login happened to still be sitting in
   * the same browser. That is why it worked in testing and failed for the
   * customer, and why the failure looked intermittent rather than total.
   *
   * The bearer path is tried FIRST: inside the frame it is the only real
   * identity, and a stale cookie belonging to a different account must not win
   * over the session the user is actually in.
   */
  const session = verifyAppJwt(bearer(req))
  if (session.ok) {
    const email = session.claims.email ?? null
    // The SSO email is the join key every entry path carries (see
    // lib/account/ensure.ts), so a profile usually exists and carries the CRM
    // contact link. Its absence is not an error — it just means the contact id
    // is unknown, which the resolver already reports honestly.
    let crmContactId: string | null = null
    let crmLocationId: string | null = session.claims.activeLocationId ?? null
    if (email) {
      try {
        const db = createServiceClient()
        const { data: profile } = db
          ? await db
              .from('profiles')
              .select('crm_contact_id, crm_location_id')
              .eq('email', email.trim().toLowerCase())
              .maybeSingle()
          : { data: null }
        if (profile) {
          crmContactId = profile.crm_contact_id ?? null
          // The location the frame is open in wins — it is where the person is
          // working right now, not where their account was first created.
          crmLocationId = crmLocationId || (profile.crm_location_id ?? null)
        }
      } catch {
        // A missing profile lookup narrows the answer; it never invents one.
      }
    }

    const ssoResult = await resolveWorkspacesForIdentity(
      { email, crmContactId, crmLocationId, companyId: session.claims.companyId ?? null, fromSession: false },
      addon,
    )
    return NextResponse.json(payload(addon, ssoResult))
  }

  // getSession, never getUser — getUser races the middleware cookie refresh
  // and signs people out.
  let userId: string | null = null
  try {
    const supabase = await createClient()
    userId = (await supabase.auth.getSession()).data.session?.user?.id ?? null
  } catch {
    return NextResponse.json({ error: 'Could not read your session.' }, { status: 401 })
  }
  if (!userId) {
    // Name BOTH doors, because "Not signed in" sent an embedded user looking
    // for a login screen that cannot render inside an iframe.
    return NextResponse.json(
      { error: 'Not signed in — no CRM session token and no 0nCORE session on this request.' },
      { status: 401 },
    )
  }

  const result = await resolveWorkspaces(userId, addon)

  return NextResponse.json(payload(addon, result))
}

function payload(addon: string, result: WorkspaceResolution) {
  return {
    addon,
    ...result,
    // Counts said out loud so a UI never has to infer "empty because none" from
    // "empty because we could not tell" — those need different screens.
    counts: {
      total: result.workspaces.length,
      publishable: result.publishable.length,
      connectedButNotEntitled: result.workspaces.filter((w) => w.connected && !w.entitled).length,
      entitledButDisconnected: result.workspaces.filter((w) => !w.connected && w.entitled).length,
    },
  }
}
