import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const pit = process.env.CRM_AGENCY_PIT || process.env.CRM_PIT || ''
  const companyId = process.env.CRM_COMPANY_ID || ''

  if (!pit) {
    return Response.json({ error: 'CRM PIT not configured' }, { status: 500 })
  }

  try {
    const url = new URL(`${CRM_API}/locations/search`)
    const body: Record<string, string> = {}
    if (companyId) body.companyId = companyId

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `CRM API error: ${res.status}`, detail: text }, { status: 502 })
    }

    const data = await res.json()
    const locations = (data.locations || []).map((loc: { id: string; name: string; email?: string; phone?: string }) => ({
      id: loc.id,
      name: loc.name,
      email: loc.email || '',
      phone: loc.phone || '',
    }))

    return Response.json({ locations })
  } catch (err) {
    return Response.json({ error: 'Failed to fetch locations', detail: String(err) }, { status: 500 })
  }
}
