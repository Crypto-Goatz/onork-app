import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listWorkflows, runWorkflow } from '@/lib/0nmcp-client'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const workflows = await listWorkflows()
    return NextResponse.json({ workflows })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list workflows'
    return NextResponse.json({ workflows: [], error: message }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { workflow, inputs } = await request.json()
    if (!workflow) {
      return NextResponse.json({ error: 'workflow name is required' }, { status: 400 })
    }

    const result = await runWorkflow(workflow, inputs)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workflow execution failed'
    return NextResponse.json({ status: 'failed', message }, { status: 502 })
  }
}
