import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthContext } from '@/lib/auth-context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  try {
    // The caller's own provisioning state. The ?userId= form answered for any
    // UUID, which is an oracle over every account's CRM presence.
    const ctx = await getAuthContext(req)
    const userId = ctx?.userId || ''
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check profile for crm_location_id
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('crm_location_id, onboarding_complete, onboarding_step')
      .eq('id', userId)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ ready: false, stage: 'provisioning' })
    }

    const locationId = profile.crm_location_id

    if (!locationId) {
      return NextResponse.json({ ready: false, stage: 'provisioning' })
    }

    // Check if crm_installations has an active token for this location
    const { data: install } = await supabase
      .from('crm_installations')
      .select('id, access_token, status')
      .eq('location_id', locationId)
      .in('status', ['active', 'installed'])
      .limit(1)
      .maybeSingle()

    if (!install) {
      return NextResponse.json({
        ready: false,
        stage: 'oauth_pending',
        locationId,
      })
    }

    return NextResponse.json({
      ready: true,
      stage: 'ready',
      locationId,
    })
  } catch (err) {
    console.error('[check-provision] Error:', err)
    return NextResponse.json({ ready: false, stage: 'provisioning' })
  }
}
