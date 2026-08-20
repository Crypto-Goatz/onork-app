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
import { resolveWorkspaces } from '@/lib/workspaces/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // getSession, never getUser — getUser races the middleware cookie refresh
  // and signs people out.
  let userId: string | null = null
  try {
    const supabase = await createClient()
    userId = (await supabase.auth.getSession()).data.session?.user?.id ?? null
  } catch {
    return NextResponse.json({ error: 'Could not read your session.' }, { status: 401 })
  }
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const addon = req.nextUrl.searchParams.get('addon')?.trim() || 'ai-course-builder'
  const result = await resolveWorkspaces(userId, addon)

  return NextResponse.json({
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
  })
}
