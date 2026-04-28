/**
 * GET /api/crm/installation-status
 *
 * Reports CRM connection health for the current user's location. Powers the
 * reauth banner on /crm and elsewhere. Requires Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkInstallationHealth } from '@/lib/crm-router'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Allow override via ?locationId= for users with multiple locations
  const overrideLocation = req.nextUrl.searchParams.get('locationId')

  let locationId = overrideLocation
  if (!locationId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .maybeSingle()
    locationId = profile?.crm_location_id ?? null
  }

  if (!locationId) {
    return NextResponse.json({
      locationId: null,
      status: 'no_install',
      needsReauth: true,
      message: 'No CRM location on file. Connect your CRM to continue.',
      reauthUrl: '/api/oauth/reauth',
    })
  }

  const health = await checkInstallationHealth(locationId)
  return NextResponse.json({
    ...health,
    reauthUrl: health.needsReauth ? '/api/oauth/reauth' : null,
  })
}
