import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { execute, isOnline } from '@/lib/0nmcp-client'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message } = await request.json()

  const online = await isOnline()

  if (online) {
    try {
      const result = await execute(message)
      return NextResponse.json({
        response: result.message || 'Task completed.',
        source: '0nmcp',
        status: result.status,
        steps: result.steps_executed,
        services: result.services_used,
        plan: result.plan,
      })
    } catch {
      return NextResponse.json({
        response: '0nMCP encountered an error processing your request.',
        source: 'error',
      })
    }
  }

  return NextResponse.json({
    response: '0nMCP server is offline. Start it with: 0nmcp serve',
    source: 'offline',
  })
}
