import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  const executionId = req.nextUrl.searchParams.get('executionId')
  if (!executionId) {
    return NextResponse.json({ error: 'executionId query param required' }, { status: 400 })
  }

  const supabase = getAdmin()
  const { data, error } = await supabase
    .from('workflow_executions')
    .select('id, status, steps, result, started_at, completed_at, error, workflow_type, input')
    .eq('id', executionId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: data.id,
    status: data.status,
    workflowType: data.workflow_type,
    steps: data.steps || [],
    result: data.result || null,
    input: data.input || null,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    error: data.error,
  })
}
