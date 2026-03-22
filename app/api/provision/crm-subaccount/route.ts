import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const CRM_AGENCY_PIT = process.env.CRM_AGENCY_PIT || ''
const CRM_COMPANY_ID = 'bknfhTkdDLapbwfZqQNi'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * POST /api/provision/crm-subaccount
 * Creates a CRM sub-account (location) for a user using the Agency PIT token.
 * Saves crm_location_id on the user's profile.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = body.user_id as string
  const email = body.email as string
  const name = body.name as string

  if (!userId || !email) {
    return NextResponse.json({ error: 'user_id and email required' }, { status: 400 })
  }

  if (!CRM_AGENCY_PIT) {
    return NextResponse.json({ error: 'CRM_AGENCY_PIT not configured' }, { status: 500 })
  }

  const admin = getAdmin()

  // Check if user already has a crm_location_id
  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id')
    .eq('id', userId)
    .single()

  if (profile?.crm_location_id) {
    return NextResponse.json({
      status: 'existing',
      crm_location_id: profile.crm_location_id,
    })
  }

  // Create CRM sub-account (location)
  try {
    const res = await fetch(`${CRM_API}/locations/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRM_AGENCY_PIT}`,
        'Content-Type': 'application/json',
        'Version': CRM_VERSION,
      },
      body: JSON.stringify({
        companyId: CRM_COMPANY_ID,
        name: `${name || 'User'}'s Account`,
        email,
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'US',
        postalCode: '',
        website: '',
        timezone: 'America/New_York',
        settings: {
          allowDuplicateContact: false,
          allowDuplicateOpportunity: false,
        },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({
        error: 'CRM sub-account creation failed',
        detail: data.message || data.error || JSON.stringify(data),
      }, { status: res.status })
    }

    const locationId = data.location?.id || data.id
    if (!locationId) {
      return NextResponse.json({
        error: 'CRM response missing location ID',
        detail: JSON.stringify(data),
      }, { status: 500 })
    }

    // Save location ID to profile
    await admin.from('profiles').update({
      crm_location_id: locationId,
    }).eq('id', userId)

    return NextResponse.json({
      status: 'created',
      crm_location_id: locationId,
    })
  } catch (err) {
    return NextResponse.json({
      error: 'CRM sub-account creation failed',
      detail: (err as Error).message,
    }, { status: 500 })
  }
}
