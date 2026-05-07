import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost, crmPut } from '@/lib/crm'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function resolveLocation(userId: string) {
  const { data: profile } = await admin.from('profiles').select('crm_location_id').eq('id', userId).single()
  return profile?.crm_location_id || process.env.CRM_LOCATION_ID || ''
}

async function syncToK2(userId: string, brandData: Record<string, unknown>) {
  await admin.from('profiles').update({ brand_board: brandData }).eq('id', userId)
  await admin.from('kb_content_queue').upsert({
    user_id: userId, layer: 'K2', content: brandData, status: 'active', updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,layer' }).select()
}

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(user.id)
  if (!locationId) return NextResponse.json({ error: 'No CRM location linked' }, { status: 400 })

  try {
    const [boardsRes, voicesRes, locRes] = await Promise.allSettled([
      crmGet('/brand-boards', locationId),
      crmGet('/brand-boards/brand-voices', locationId),
      crmGet(`/locations/${locationId}`, locationId),
    ])

    let boards: any[] = []
    let brandBoard: any = null
    if (boardsRes.status === 'fulfilled' && boardsRes.value.ok) {
      const d = await boardsRes.value.json()
      boards = d.brandBoards || d.data || []
      if (boards.length > 0) brandBoard = boards[0]
    } else {
      const errText = boardsRes.status === 'fulfilled' ? await boardsRes.value.text().catch(() => '') : ''
      console.error(`[Brand] GET /brand-boards: ${boardsRes.status === 'fulfilled' ? boardsRes.value.status : 'rejected'} ${errText.substring(0, 200)}`)
    }

    let voices: any[] = []
    if (voicesRes.status === 'fulfilled' && voicesRes.value.ok) {
      const d = await voicesRes.value.json()
      voices = d.brandVoices || d.data || []
    }

    let loc: any = null
    if (locRes.status === 'fulfilled' && locRes.value.ok) {
      const d = await locRes.value.json()
      loc = d.location || d
    }

    const brand = {
      name: brandBoard?.name || loc?.name || '',
      colors: brandBoard?.colors || {},
      fonts: brandBoard?.fonts || {},
      logos: brandBoard?.logos || {},
      boardId: brandBoard?.id || null,
      voices: voices.map((v: any) => ({ id: v.id, name: v.name, description: v.description, tone: v.tone, style: v.style })),
      business: {
        name: loc?.name || '', phone: loc?.phone || '', email: loc?.email || '',
        website: loc?.website || '', address: loc?.address || '', city: loc?.city || '',
        state: loc?.state || '', country: loc?.country || '', timezone: loc?.timezone || '',
        logoUrl: loc?.logoUrl || '',
      },
      locationId, syncedAt: new Date().toISOString(), source: 'crm',
    }

    await syncToK2(user.id, brand)
    return NextResponse.json({ brand, boards, voices, location: loc, synced: true })
  } catch (error) {
    console.error('[Brand] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch brand', detail: 'Check CRM connection' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(user.id)
  if (!locationId) return NextResponse.json({ error: 'No CRM location linked' }, { status: 400 })

  try {
    const body = await request.json()
    const { colors, fonts, logos, name, boardId, voices } = body

    const payload: Record<string, unknown> = { locationId }
    if (colors) payload.colors = colors
    if (fonts) payload.fonts = fonts
    if (logos) payload.logos = logos
    if (name) payload.name = name

    let result: any = {}
    if (boardId) {
      const res = await crmPut(`/brand-boards/${boardId}`, locationId, payload)
      if (res.ok) result = await res.json()
      else console.error(`[Brand] PUT ${boardId} failed: ${res.status}`)
    } else {
      const res = await crmPost('/brand-boards', locationId, payload)
      if (res.ok) result = await res.json()
      else console.error(`[Brand] POST create failed: ${res.status}`)
    }

    if (voices && Array.isArray(voices)) {
      for (const v of voices) {
        if (v.id) await crmPut(`/brand-boards/brand-voices/${v.id}`, locationId, { ...v, locationId })
        else await crmPost('/brand-boards/brand-voices', locationId, { ...v, locationId })
      }
    }

    await syncToK2(user.id, { name, colors, fonts, logos, voices, locationId, syncedAt: new Date().toISOString(), source: 'manual' })
    return NextResponse.json({ result, synced: true })
  } catch (error) {
    console.error('[Brand] POST Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update brand' }, { status: 502 })
  }
}
