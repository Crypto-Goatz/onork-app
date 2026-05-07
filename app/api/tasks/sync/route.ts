/**
 * POST /api/tasks/sync — Trigger full task sync for the current user.
 * Syncs Google Tasks, CRM Tasks, and runs the guardian.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAllTasks } from '@/lib/task-sync'

export async function POST() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await syncAllTasks(user.id)

  return NextResponse.json({
    synced: results.length,
    results,
    timestamp: new Date().toISOString(),
  })
}
