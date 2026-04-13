/**
 * POST /api/automations/activate — Save and activate a visual builder workflow
 *
 * Saves the workflow to user_workflows table with nodes, edges, and .0n file.
 * Marks it as active. Returns the saved workflow ID.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, dot_on_file, nodes, edges, status } = body

  if (!name || !nodes || nodes.length === 0) {
    return NextResponse.json({ error: 'Name and at least one node required' }, { status: 400 })
  }

  const admin = getAdmin()

  // Get user's CRM location
  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || ''

  // Upsert to user_workflows
  const workflowData = {
    user_id: user.id,
    location_id: locationId,
    name,
    description: description || `${nodes.length} steps`,
    dot_on_file: dot_on_file || {},
    nodes: nodes || [],
    edges: edges || [],
    status: status || 'active',
    trigger_type: dot_on_file?.triggers?.[0]?.type || 'manual',
    last_executed_at: null,
  }

  // Check if workflow with same name exists for this user
  const { data: existing } = await admin
    .from('user_workflows')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle()

  let result
  if (existing) {
    const { data, error } = await admin
      .from('user_workflows')
      .update(workflowData)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await admin
      .from('user_workflows')
      .insert(workflowData)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  // Log activity
  await admin.from('dashboard_notifications').insert({
    user_id: user.id,
    type: 'success',
    title: 'Automation Activated',
    message: `"${name}" is now live with ${nodes.length} steps.`,
    metadata: { workflow_id: result?.id, node_count: nodes.length },
  }).then(() => {}, () => {})

  return NextResponse.json({
    success: true,
    workflow: result,
    message: `"${name}" activated with ${nodes.length} steps`,
  })
}
