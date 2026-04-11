import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  if (!profile?.crm_location_id) {
    return Response.json({ contacts: [], error: 'No location provisioned' })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || ''
  const params = new URLSearchParams({
    locationId: profile.crm_location_id,
    limit: '20',
  })
  if (query) params.set('query', query)

  const res = await fetch(`${CRM_API}/contacts/?${params}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CRM_PIT_RAW || process.env.CRM_PIT_TOKEN || ''}`,
      'Version': CRM_VERSION,
    },
    cache: 'no-store',
  })

  const data = await res.json()
  return Response.json({ contacts: data.contacts || [], total: data.total || 0 })
}
