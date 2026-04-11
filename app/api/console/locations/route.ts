import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  if (!profile?.crm_location_id) {
    return Response.json({ locations: [] })
  }

  // Get locations accessible to this user via the agency PIT
  const agencyPit = process.env.CRM_AGENCY_PIT
  if (!agencyPit) {
    return Response.json({
      locations: [{ id: profile.crm_location_id, name: 'Primary Location' }],
    })
  }

  try {
    const res = await fetch(`${CRM_API}/locations/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agencyPit}`,
        'Version': CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: process.env.CRM_COMPANY_ID || '',
        limit: 50,
      }),
      cache: 'no-store',
    })

    const data = await res.json()
    const locations = (data.locations || []).map((loc: { id: string; name: string }) => ({
      id: loc.id,
      name: loc.name,
    }))

    // Make sure the user's current location is included
    if (!locations.find((l: { id: string }) => l.id === profile.crm_location_id)) {
      locations.unshift({ id: profile.crm_location_id, name: 'My Location' })
    }

    return Response.json({ locations })
  } catch {
    return Response.json({
      locations: [{ id: profile.crm_location_id, name: 'Primary Location' }],
    })
  }
}
