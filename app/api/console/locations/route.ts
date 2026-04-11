import { createClient } from '@/lib/supabase/server'

// Known locations (hardcoded for reliability — agency PIT search is unreliable)
const KNOWN_LOCATIONS = [
  { id: '6MSqx0trfxgLxeHBJE1k', name: 'RocketOpp' },
  { id: 'nphConTwfHcVE1oA0uep', name: '0nCore Master' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const currentId = profile?.crm_location_id || ''

  // Build location list — include known + current
  const locations = [...KNOWN_LOCATIONS]

  // Add current location if not in known list
  if (currentId && !locations.find(l => l.id === currentId)) {
    locations.unshift({ id: currentId, name: 'Current Location' })
  }

  return Response.json({ locations, activeLocationId: currentId })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { locationId } = await req.json()
  if (!locationId) return Response.json({ error: 'locationId required' }, { status: 400 })

  // Update profile with new location
  await supabase.from('profiles').update({
    crm_location_id: locationId,
  }).eq('id', user.id)

  return Response.json({ ok: true, locationId })
}
