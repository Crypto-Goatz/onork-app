import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

async function crmFetch(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${CRM_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.CRM_PIT_RAW || process.env.CRM_PIT}`,
      'Content-Type': 'application/json',
      Version: CRM_VERSION,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!pit || !locationId) {
    return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })
  }

  try {
    // Fetch pipelines
    const pipelinesRes = await crmFetch(`/opportunities/pipelines?locationId=${locationId}`)
    if (!pipelinesRes.ok) {
      const text = await pipelinesRes.text()
      return NextResponse.json(
        { error: `CRM API error: ${pipelinesRes.status}`, details: text },
        { status: pipelinesRes.status }
      )
    }
    const pipelinesData = await pipelinesRes.json()
    const pipelines = pipelinesData.pipelines || []

    // For each pipeline, fetch opportunities
    const results = []
    for (const pipeline of pipelines) {
      const oppsRes = await crmFetch(
        `/opportunities/search?locationId=${locationId}&pipeline_id=${pipeline.id}`
      )
      let opportunities: unknown[] = []
      if (oppsRes.ok) {
        const oppsData = await oppsRes.json()
        opportunities = oppsData.opportunities || []
      }

      results.push({
        ...pipeline,
        opportunities,
      })
    }

    return NextResponse.json({ pipelines: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT
  if (!pit) {
    return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { opportunityId, stageId, pipelineId } = body

    if (!opportunityId || !stageId) {
      return NextResponse.json({ error: 'opportunityId and stageId required' }, { status: 400 })
    }

    const res = await crmFetch(`/opportunities/${opportunityId}`, 'PUT', {
      stageId,
      ...(pipelineId ? { pipelineId } : {}),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `CRM API error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
