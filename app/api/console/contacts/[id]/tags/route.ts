import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { tags } = await req.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  if (!profile?.crm_location_id) {
    return Response.json({ error: 'No location provisioned' }, { status: 400 })
  }

  const res = await fetch(`${CRM_API}/contacts/${id}/tags`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRM_PIT_RAW || process.env.CRM_PIT_TOKEN || ''}`,
      'Version': CRM_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tags, locationId: profile.crm_location_id }),
  })

  return Response.json(await res.json())
}
