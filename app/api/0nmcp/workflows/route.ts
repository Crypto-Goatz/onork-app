import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { listWorkflows, runWorkflow } from '@/lib/0nmcp-client'

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get('onork_session')?.value !== 'authenticated') {
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
  const cookieStore = await cookies()
  if (cookieStore.get('onork_session')?.value !== 'authenticated') {
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
