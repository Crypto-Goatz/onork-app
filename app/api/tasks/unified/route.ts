/**
 * GET/POST /api/tasks/unified — CRUD for unified tasks.
 * Single endpoint for all task operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const guardian = searchParams.get('guardian')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  let query = admin
    .from('unified_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (guardian) {
    query = query.eq('guardian_status', guardian)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Stats
  const { data: allTasks } = await admin
    .from('unified_tasks')
    .select('status, guardian_status')
    .eq('user_id', user.id)

  const stats = {
    total: allTasks?.length || 0,
    todo: allTasks?.filter(t => t.status === 'todo').length || 0,
    in_progress: allTasks?.filter(t => t.status === 'in_progress').length || 0,
    done: allTasks?.filter(t => t.status === 'done').length || 0,
    overdue: allTasks?.filter(t => t.guardian_status === 'overdue').length || 0,
    stalled: allTasks?.filter(t => t.guardian_status === 'stalled').length || 0,
  }

  return NextResponse.json({ tasks: data || [], stats })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await admin
    .from('unified_tasks')
    .insert({
      user_id: user.id,
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
      project: body.project || null,
      tags: body.tags || [],
      assigned_to: body.assigned_to || null,
      client_id: body.client_id || null,
      recurring: body.recurring || false,
      recurrence_rule: body.recurrence_rule || null,
      next_occurrence: body.next_occurrence || null,
      sources: body.sources || [],
      guardian_enabled: body.guardian_enabled ?? true,
      stall_threshold_hours: body.stall_threshold_hours || 72,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

  if (updates.status === 'done') {
    updates.completed_at = new Date().toISOString()
  }

  const { data, error } = await admin
    .from('unified_tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data })
}
