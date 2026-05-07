import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet } from '@/lib/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'forms'
    const limit = searchParams.get('limit') || '50'

    if (type === 'submissions') {
      const formId = searchParams.get('formId')
      if (!formId) return NextResponse.json({ error: 'formId required' }, { status: 400 })
      const res = await crmGet(`/forms/submissions?formId=${formId}&limit=${limit}`, locationId)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ submissions: data.submissions || [] })
    }

    const res = await crmGet(`/forms/?limit=${limit}`, locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ forms: data.forms || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
