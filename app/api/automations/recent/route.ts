// GET /api/automations/recent — Last N automation executions for a location
// Used by the Automation Status widget embedded in CRM pages
// Public endpoint (widget calls from iframe) but scoped to location

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '3')

  try {
    const { data: workflows } = await supabase
      .from('user_workflows')
      .select('id, name, status, last_executed_at, execution_count, success_rate, trigger_type')
      .eq('status', 'active')
      .order('last_executed_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    const activeCount = workflows?.length || 0
    const totalExecutions = workflows?.reduce((s, w) => s + (w.execution_count || 0), 0) || 0

    return NextResponse.json({
      active: activeCount > 0,
      activeCount,
      totalExecutions,
      recent: (workflows || []).map(w => ({
        name: w.name,
        status: w.status,
        lastRun: w.last_executed_at,
        runs: w.execution_count,
        successRate: w.success_rate,
        trigger: w.trigger_type,
      })),
    })
  } catch {
    return NextResponse.json({ active: false, activeCount: 0, totalExecutions: 0, recent: [] })
  }
}
