/**
 * GET /api/cron/task-guardian — Run the task guardian for all active users.
 * Checks for stalled, overdue, and recurring tasks. Spawns new instances.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runTaskGuardian, syncAllTasks } from '@/lib/task-sync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all users who have unified tasks
  const { data: users } = await supabase
    .from('unified_tasks')
    .select('user_id')
    .eq('guardian_enabled', true)
    .not('status', 'in', '("done","cancelled")')

  if (!users || users.length === 0) {
    return NextResponse.json({ checked: 0, message: 'No active tasks' })
  }

  const uniqueUsers = [...new Set(users.map(u => u.user_id))]
  const results = []

  for (const userId of uniqueUsers) {
    try {
      // Sync all services first
      const syncResults = await syncAllTasks(userId)

      // Run guardian
      const guardianResult = await runTaskGuardian(userId)

      results.push({
        user_id: userId,
        sync: syncResults.map(r => ({ service: r.service, created: r.created, updated: r.updated })),
        guardian: guardianResult,
      })
    } catch (err) {
      results.push({
        user_id: userId,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    users_checked: uniqueUsers.length,
    results,
    timestamp: new Date().toISOString(),
  })
}
