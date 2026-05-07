/**
 * GET /api/automations/runs?workflow_id=...&limit=...
 *
 * Returns recent rows from workflow_executions for the authenticated user.
 * If workflow_id is provided, scopes to that workflow.
 *
 * Schema reminder (workflow_executions):
 *   id uuid, user_id uuid, location_id text, workflow_type text,
 *   input jsonb, result jsonb, steps jsonb, status text,
 *   started_at timestamptz, completed_at timestamptz, error text
 *
 * The webhook handler stores workflow metadata inside `input`:
 *   { workflow_id, workflow_name, trigger_type, trigger_data }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflow_id') || ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10) || 25, 200)

  const admin = getAdmin()
  let query = admin
    .from('workflow_executions')
    .select('id, user_id, location_id, workflow_type, input, result, steps, status, started_at, completed_at, error')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (workflowId) {
    query = query.eq('input->>workflow_id', workflowId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data || []).map(r => {
    const input = (r.input || {}) as Record<string, unknown>
    const result = (r.result || {}) as Record<string, unknown>
    const startMs = r.started_at ? new Date(r.started_at as string).getTime() : null
    const endMs = r.completed_at ? new Date(r.completed_at as string).getTime() : null
    const duration = startMs && endMs ? Math.max(0, endMs - startMs) : (result.duration_ms ?? null)
    return {
      id: r.id,
      workflow_id: input.workflow_id || null,
      workflow_name: input.workflow_name || null,
      trigger_type: input.trigger_type || null,
      trigger_data: input.trigger_data || null,
      status: r.status,
      error: r.error,
      total_steps: result.totalSteps ?? null,
      succeeded: result.succeeded ?? null,
      failed: result.failed ?? null,
      duration_ms: duration,
      steps: r.steps || [],
      started_at: r.started_at,
      completed_at: r.completed_at,
    }
  })

  return NextResponse.json({ runs: rows, count: rows.length })
}
