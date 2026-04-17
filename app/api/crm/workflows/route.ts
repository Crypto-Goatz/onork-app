import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ workflows: [] })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''

  const res = await fetch(`${CRM_API}/workflows/?locationId=${locationId}`, {
    headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
  })

  if (!res.ok) return NextResponse.json({ workflows: [] })
  const data = await res.json()

  const { data: logs } = await supabase
    .from('workflow_logs')
    .select('workflow_id, action, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const logsByWorkflow: Record<string, { total: number; lastRun: string; errors: number }> = {}
  for (const log of (logs || [])) {
    if (!logsByWorkflow[log.workflow_id]) {
      logsByWorkflow[log.workflow_id] = { total: 0, lastRun: log.created_at, errors: 0 }
    }
    logsByWorkflow[log.workflow_id].total++
    if (log.status === 'error') logsByWorkflow[log.workflow_id].errors++
  }

  const workflows = (data.workflows || []).map((w: Record<string, unknown>) => ({
    ...w,
    stats: logsByWorkflow[w.id as string] || { total: 0, lastRun: null, errors: 0 },
  }))

  return NextResponse.json({ workflows })
}
