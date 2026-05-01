/**
 * POST /api/flows/callback/run-capability
 *
 * The 0nFlow engine on 0nmcp.com POSTs here when it encounters a capability
 * that has no native flow action (email/sms/tag_add/slack/webhook/wait).
 * We re-use the existing automations execute path on onork-app so the
 * capability runs through its canonical handler.
 *
 * Auth: shared FLOW_CALLBACK_SECRET in the x-flow-callback-secret header.
 *
 * Request body:
 *   {
 *     capability_id: string,
 *     workflow_id: string,
 *     config: Record<string, string>,
 *     contact: { id, email, name?, phone?, trigger? }
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
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

interface CallbackBody {
  capability_id?: string
  workflow_id?: string
  config?: Record<string, string>
  contact?: {
    id?: string
    email?: string
    name?: string
    phone?: string
    trigger?: Record<string, unknown>
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const expected = process.env.FLOW_CALLBACK_SECRET || process.env.INTERNAL_DISPATCH_SECRET || ''
  const got = req.headers.get('x-flow-callback-secret') || ''
  if (!expected || got !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: CallbackBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const capabilityId = body.capability_id
  const workflowId = body.workflow_id
  if (!capabilityId || !workflowId) {
    return NextResponse.json(
      { ok: false, error: 'capability_id and workflow_id required' },
      { status: 400 },
    )
  }

  // 2. Load workflow → user_id, location_id (for the execute call)
  const sb = admin()
  const { data: workflow } = await sb
    .from('user_workflows')
    .select('id, user_id, location_id, name')
    .eq('id', workflowId)
    .single()

  if (!workflow) {
    return NextResponse.json({ ok: false, error: 'workflow not found' }, { status: 404 })
  }

  // 3. Build a single-step workflow payload and call /api/automations/execute
  //    via the internal-secret bypass. This re-uses the existing capability
  //    routing and tool execution logic.
  const internalSecret = process.env.INTERNAL_DISPATCH_SECRET || ''
  if (!internalSecret) {
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_DISPATCH_SECRET not configured' },
      { status: 500 },
    )
  }

  const contact = body.contact || {}
  const triggerData = {
    contactId: contact.id || '',
    email: contact.email || '',
    name: contact.name || '',
    phone: contact.phone || '',
    ...(contact.trigger || {}),
  }

  const stepInputs: Record<string, unknown> = {
    contactId: contact.id || '',
    contactEmail: contact.email || '',
    contactName: contact.name || '',
    ...(body.config || {}),
  }

  const executeRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.0ncore.com'}/api/automations/execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        user_id: workflow.user_id,
        workflow: {
          name: `flow-callback:${workflow.name}`,
          trigger: { type: 'flow_callback', event: 'flow_callback', config: {} },
          steps: [
            {
              id: `${workflowId}-${capabilityId}-${Date.now()}`,
              name: capabilityId,
              tool: capabilityId,
              inputs: stepInputs,
              on_fail: 'skip',
            },
          ],
          variables: {},
        },
        triggerData,
      }),
    },
  )

  const data = await executeRes.json().catch(() => ({}))
  const stepResult = data?.results?.[0]

  if (!executeRes.ok || data?.success === false) {
    return NextResponse.json(
      {
        ok: false,
        error: stepResult?.error || data?.error || `execute failed: ${executeRes.status}`,
        result: stepResult || null,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    ok: true,
    capability_id: capabilityId,
    output: stepResult?.output ?? null,
  })
}
