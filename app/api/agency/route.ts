import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

// GET /api/agency — Fetch all sub-locations with stats
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin-only check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Agency access required' }, { status: 403 })
  }

  const agencyPit = process.env.CRM_AGENCY_PIT
  const companyId = process.env.CRM_COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'

  if (!agencyPit) {
    return NextResponse.json({ error: 'Agency PIT not configured' }, { status: 500 })
  }

  try {
    // Fetch all locations
    const locRes = await fetch(
      `${CRM_API}/locations/search?companyId=${companyId}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${agencyPit}`,
          Version: CRM_VERSION,
        },
      }
    )

    if (!locRes.ok) {
      return NextResponse.json({ error: `CRM ${locRes.status}` }, { status: locRes.status })
    }

    const locData = await locRes.json()
    const locations = (locData.locations || []).map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      email: loc.email,
      phone: loc.phone,
      address: loc.address || loc.city || '',
      website: loc.website || '',
      logoUrl: loc.logoUrl || '',
      settings: {
        timezone: loc.timezone || 'America/New_York',
        country: loc.country || 'US',
      },
    }))

    // Fetch contact counts per location (parallel)
    const statsPromises = locations.slice(0, 20).map(async (loc: any) => {
      try {
        const res = await fetch(
          `${CRM_API}/contacts/?locationId=${loc.id}&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${agencyPit}`,
              Version: CRM_VERSION,
            },
          }
        )
        if (res.ok) {
          const data = await res.json()
          return { locationId: loc.id, contacts: data.total || data.contacts?.length || 0 }
        }
        return { locationId: loc.id, contacts: 0 }
      } catch {
        return { locationId: loc.id, contacts: 0 }
      }
    })

    const stats = await Promise.all(statsPromises)
    const statsMap = Object.fromEntries(stats.map(s => [s.locationId, s.contacts]))

    const enriched = locations.map((loc: any) => ({
      ...loc,
      contactCount: statsMap[loc.id] || 0,
    }))

    return NextResponse.json({
      locations: enriched,
      total: enriched.length,
      companyId,
      agencyActive: true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

// POST /api/agency — Bulk operations
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Agency access required' }, { status: 403 })
  }

  const agencyPit = process.env.CRM_AGENCY_PIT
  if (!agencyPit) {
    return NextResponse.json({ error: 'Agency PIT not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { action, locationId, locationIds, data } = body

  try {
    switch (action) {
      case 'get_location_detail': {
        const res = await fetch(`${CRM_API}/locations/${locationId}`, {
          headers: {
            Authorization: `Bearer ${agencyPit}`,
            Version: CRM_VERSION,
          },
        })
        if (!res.ok) return NextResponse.json({ error: `CRM ${res.status}` }, { status: res.status })
        const detail = await res.json()
        return NextResponse.json({ location: detail.location || detail })
      }

      case 'get_pipelines': {
        const res = await fetch(`${CRM_API}/opportunities/pipelines?locationId=${locationId}`, {
          headers: {
            Authorization: `Bearer ${agencyPit}`,
            Version: CRM_VERSION,
          },
        })
        if (!res.ok) return NextResponse.json({ error: `CRM ${res.status}` }, { status: res.status })
        const pipelines = await res.json()
        return NextResponse.json({ pipelines: pipelines.pipelines || [] })
      }

      case 'get_calendars': {
        const res = await fetch(`${CRM_API}/calendars/?locationId=${locationId}`, {
          headers: {
            Authorization: `Bearer ${agencyPit}`,
            Version: CRM_VERSION,
          },
        })
        if (!res.ok) return NextResponse.json({ error: `CRM ${res.status}` }, { status: res.status })
        const calendars = await res.json()
        return NextResponse.json({ calendars: calendars.calendars || [] })
      }

      case 'get_users': {
        const res = await fetch(`${CRM_API}/users/?locationId=${locationId}`, {
          headers: {
            Authorization: `Bearer ${agencyPit}`,
            Version: CRM_VERSION,
          },
        })
        if (!res.ok) return NextResponse.json({ error: `CRM ${res.status}` }, { status: res.status })
        const users = await res.json()
        return NextResponse.json({ users: users.users || [] })
      }

      case 'get_conversations': {
        const res = await fetch(`${CRM_API}/conversations/search?locationId=${locationId}&limit=20`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${agencyPit}`,
            Version: CRM_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locationId }),
        })
        if (!res.ok) return NextResponse.json({ error: `CRM ${res.status}` }, { status: res.status })
        const convos = await res.json()
        return NextResponse.json({ conversations: convos.conversations || [] })
      }

      case 'bulk_tag': {
        if (!locationIds?.length || !data?.tagId) {
          return NextResponse.json({ error: 'Missing locationIds or tagId' }, { status: 400 })
        }
        const results = await Promise.all(
          locationIds.map(async (locId: string) => {
            try {
              const contactsRes = await fetch(
                `${CRM_API}/contacts/?locationId=${locId}&limit=100`,
                {
                  headers: {
                    Authorization: `Bearer ${agencyPit}`,
                    Version: CRM_VERSION,
                  },
                }
              )
              if (!contactsRes.ok) return { locationId: locId, success: false, error: 'fetch failed' }
              const contactsData = await contactsRes.json()
              const contacts = contactsData.contacts || []

              let tagged = 0
              for (const contact of contacts) {
                const tagRes = await fetch(`${CRM_API}/contacts/${contact.id}/tags`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${agencyPit}`,
                    Version: CRM_VERSION,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ tags: [data.tagId] }),
                })
                if (tagRes.ok) tagged++
              }
              return { locationId: locId, success: true, tagged }
            } catch (e: any) {
              return { locationId: locId, success: false, error: e.message }
            }
          })
        )
        return NextResponse.json({ results })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
