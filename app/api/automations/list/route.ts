/**
 * GET /api/automations/list — List all user workflows
 * DELETE /api/automations/list — Delete a workflow by ID
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

  const admin = getAdmin()
  const { data: workflows, error } = await admin
    .from('user_workflows')
    .select('id, name, description, status, trigger_type, trigger_config, source_platform, nodes, edges, dot_on_file, webhook_id, cron_schedule, last_executed_at, execution_count, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (workflows || []).map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    status: w.status,
    trigger_type: w.trigger_type,
    node_count: w.nodes?.length || 0,
    execution_count: w.execution_count || 0,
    last_executed_at: w.last_executed_at,
    created_at: w.created_at,
    updated_at: w.updated_at,
    dot_on_file: w.dot_on_file,
    nodes: w.nodes,
    edges: w.edges,
    webhook_id: w.webhook_id,
  }))

  return NextResponse.json({ workflows: mapped })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 })

  const admin = getAdmin()

  // Get webhook ID to clean up
  const { data: workflow } = await admin
    .from('user_workflows')
    .select('webhook_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Delete CRM webhook if exists
  if (workflow?.webhook_id) {
    const crmPit = process.env.CRM_PIT || ''
    if (crmPit) {
      await fetch(`https://services.leadconnectorhq.com/hooks/${workflow.webhook_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${crmPit}`, 'Version': '2021-07-28' },
      }).catch(() => {})
    }
  }

  // Delete workflow
  const { error } = await admin
    .from('user_workflows')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true, id })
}
