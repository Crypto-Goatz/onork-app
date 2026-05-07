/**
 * GET /api/automations/[id]/runs
 *
 * Returns 0nFlow enrollments + steps for a single workflow.
 * Reads directly from pwujhhmlrtxjmjzyttwn.flow_enrollments / flow_steps.
 *
 * Auth: workflow must belong to the authenticated user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params

  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()

  // 1. Load workflow + ownership check
  const { data: workflow } = await sb
    .from('user_workflows')
    .select('id, name, user_id, flow_slug, status, trigger_type, last_executed_at, execution_count')
    .eq('id', workflowId)
    .maybeSingle()

  if (!workflow || workflow.user_id !== user.id) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  if (!workflow.flow_slug) {
    return NextResponse.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        flow_slug: null,
      },
      enrollments: [],
      note: 'No 0nFlow companion — this workflow has no time-delayed steps.',
    })
  }

  // 2. Resolve flow id from slug
  const { data: flow } = await sb
    .from('flows')
    .select('id, slug, name, default_provider, default_location_id, active, created_at')
    .eq('slug', workflow.flow_slug)
    .maybeSingle()

  if (!flow) {
    return NextResponse.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        flow_slug: workflow.flow_slug,
      },
      enrollments: [],
      error: `flow ${workflow.flow_slug} not found in flows table`,
    })
  }

  // 3. Pull recent enrollments for this flow
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200)

  const { data: enrollments, error: enrErr } = await sb
    .from('flow_enrollments')
    .select('id, contact_id, contact_email, contact_data, status, current_step, enrolled_at, completed_at, cancelled_at, metadata')
    .eq('flow_id', flow.id)
    .order('enrolled_at', { ascending: false })
    .limit(limit)

  if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 })

  // 4. Fetch all steps for these enrollments in one round-trip
  const enrollmentIds = (enrollments || []).map((e) => e.id)
  let stepsByEnrollment = new Map<string, unknown[]>()
  if (enrollmentIds.length > 0) {
    const { data: steps } = await sb
      .from('flow_steps')
      .select('id, enrollment_id, step_index, action, params, scheduled_at, status, attempts, last_error, result, sent_at, created_at')
      .in('enrollment_id', enrollmentIds)
      .order('step_index', { ascending: true })

    stepsByEnrollment = (steps || []).reduce((map, step) => {
      const list = map.get(step.enrollment_id) || []
      list.push(step)
      map.set(step.enrollment_id, list)
      return map
    }, new Map<string, unknown[]>())
  }

  const shaped = (enrollments || []).map((e) => ({
    id: e.id,
    contact_id: e.contact_id,
    contact_email: e.contact_email,
    contact_data: e.contact_data,
    status: e.status,
    current_step: e.current_step,
    enrolled_at: e.enrolled_at,
    completed_at: e.completed_at,
    cancelled_at: e.cancelled_at,
    metadata: e.metadata,
    steps: stepsByEnrollment.get(e.id) || [],
  }))

  // 5. Aggregate counters
  const summary = {
    total: shaped.length,
    active: shaped.filter((e) => e.status === 'active').length,
    completed: shaped.filter((e) => e.status === 'completed').length,
    failed: shaped.filter((e) => e.status === 'failed').length,
    cancelled: shaped.filter((e) => e.status === 'cancelled').length,
  }

  return NextResponse.json({
    workflow: {
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      flow_slug: workflow.flow_slug,
      trigger_type: workflow.trigger_type,
      last_executed_at: workflow.last_executed_at,
      execution_count: workflow.execution_count,
    },
    flow: {
      id: flow.id,
      slug: flow.slug,
      name: flow.name,
      active: flow.active,
      default_provider: flow.default_provider,
      default_location_id: flow.default_location_id,
      created_at: flow.created_at,
    },
    summary,
    enrollments: shaped,
  })
}
