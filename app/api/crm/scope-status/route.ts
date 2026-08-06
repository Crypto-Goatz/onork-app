/**
 * GET /api/crm/scope-status
 *
 * The honest answer to "does our install actually hold the scope this feature
 * needs?" — read straight off the token the CRM issued, not off what we asked
 * for. A request list is a wish; the token's `scope` field is the grant, and
 * they diverge exactly when a portal checkbox was missed. This endpoint exists
 * so that divergence is one click, not a SQL session.
 *
 * ?level=agency (default) checks the agency install; ?level=sub checks the
 * per-location marketplace install for the caller's location.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AGENCY_V2_APP } from '@/lib/crm-apps'
import {
  AGENCY_SCOPES,
  SUBACCOUNT_SCOPES,
  grantedFrom,
  missingFrom,
} from '@/lib/crm/scopes'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const level = req.nextUrl.searchParams.get('level') === 'sub' ? 'sub' : 'agency'
  const requested: string[] = level === 'agency' ? [...AGENCY_SCOPES] : [...SUBACCOUNT_SCOPES]

  // Find the install to inspect. Agency: the one AGENCY_V2 app. Sub: the
  // install tied to the caller's location.
  let query = supabase
    .from('crm_installations')
    .select('app_id, company_id, location_id, status, scopes, expires_at')
    .eq('status', 'active')

  if (level === 'agency') {
    query = query.eq('app_id', AGENCY_V2_APP.appId)
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .maybeSingle()
    const locationId = profile?.crm_location_id
    if (!locationId) {
      return NextResponse.json({ level, install: null, message: 'No CRM location on file for this user.' })
    }
    query = query.eq('location_id', locationId)
  }

  const { data: install } = await query.order('expires_at', { ascending: false, nullsFirst: false }).maybeSingle()

  if (!install) {
    return NextResponse.json({
      level,
      install: null,
      message:
        level === 'agency'
          ? 'No active agency install found. Install the agency app at the company level first.'
          : 'No active marketplace install found for this location.',
    })
  }

  const granted = [...grantedFrom(install.scopes)].sort()
  const missing = missingFrom(requested, install.scopes)

  // Scopes the token carries that we do not track — informational, and a hint
  // that the app offers more than lib/crm/scopes.ts documents.
  const grantedSet = grantedFrom(install.scopes)
  const untracked = [...grantedSet].filter((s) => !requested.includes(s)).sort()

  return NextResponse.json({
    level,
    appId: install.app_id,
    companyId: install.company_id ?? null,
    locationId: install.location_id ?? null,
    expiresAt: install.expires_at ?? null,
    counts: { requested: requested.length, granted: granted.length, missing: missing.length },
    // The actionable field: what to add in the portal + reinstall to close.
    missing,
    granted,
    untracked,
    complete: missing.length === 0,
  })
}
