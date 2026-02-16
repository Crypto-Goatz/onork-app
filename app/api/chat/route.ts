import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { execute, isOnline } from '@/lib/0nmcp-client'
import { respond } from '@/lib/ai-responder'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get('onork_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, connectedServices } = await request.json()

  // Check if 0nMCP server is online
  const online = await isOnline()

  if (online) {
    // Route through 0nMCP for real execution
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
    } catch (error) {
      // Fall back to local responder on error
      const fallback = respond(message, {
        isC: (s: string) => (connectedServices || []).includes(s),
        n: (connectedServices || []).length,
      }, { f: [] })
      return NextResponse.json({
        response: fallback,
        source: 'local',
        note: '0nMCP server error — using local responder',
      })
    }
  }

  // 0nMCP offline — use local responder
  const response = respond(message, {
    isC: (s: string) => (connectedServices || []).includes(s),
    n: (connectedServices || []).length,
  }, { f: [] })

  return NextResponse.json({
    response,
    source: 'local',
    note: '0nMCP server offline — using local responder',
  })
}
