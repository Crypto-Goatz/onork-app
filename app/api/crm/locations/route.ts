import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use agency PIT to list all locations
  const agencyPit = process.env.CRM_AGENCY_PIT
  const companyId = process.env.CRM_COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'

  if (!agencyPit) {
    return NextResponse.json({ error: 'Agency PIT not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${CRM_API}/locations/search?companyId=${companyId}&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${agencyPit}`,
          Version: CRM_VERSION,
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `CRM ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const locations = (data.locations || []).map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      email: loc.email,
      phone: loc.phone,
    }))

    return NextResponse.json({ locations })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { locationId } = await req.json()

  // Store active location in user metadata
  await supabase.auth.updateUser({
    data: { active_location_id: locationId }
  })

  return NextResponse.json({ success: true, locationId })
}
