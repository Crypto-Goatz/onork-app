import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute } from '@/lib/0nmcp-client'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { task } = await request.json()
    if (!task || typeof task !== 'string') {
      return NextResponse.json({ error: 'task is required' }, { status: 400 })
    }

    const result = await execute(task)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Execution failed'
    return NextResponse.json({ status: 'failed', message }, { status: 502 })
  }
}
