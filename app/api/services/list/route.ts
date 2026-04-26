/**
 * GET /api/services/list — List all available services + user's connection status
 *
 * Returns the full catalog with each service's connection status for the user.
 * Query params:
 *   ?type=connected — returns only connected_services (WordPress sites, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractToken } from '@/lib/0n-token'
import { SERVICES, SERVICE_CATEGORIES } from '@/lib/service-catalog'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const token = extractToken(req)
  if (token) {
    const ctx = await validateToken(token)
    if (ctx) return ctx.userId
  }
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  const type = req.nextUrl.searchParams.get('type')

  // Connected services mode — returns WordPress sites, etc.
  if (type === 'connected') {
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = getAdmin()
    const { data, error } = await admin
      .from('connected_services')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.error('[services/list] Connected services error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      services: data || [],
      total: data?.length || 0,
      authenticated: true,
    })
  }

  // Default: full catalog mode
  let connections: Record<string, { status: string; health: string; lastVerified: string | null }> = {}

  if (userId) {
    const admin = getAdmin()
    const { data } = await admin
      .from('user_service_connections')
      .select('service, status, health_status, last_verified_at')
      .eq('user_id', userId)

    if (data) {
      for (const row of data) {
        connections[row.service] = {
          status: row.status,
          health: row.health_status,
          lastVerified: row.last_verified_at,
        }
      }
    }
  }

  const services = SERVICES.map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    icon: s.icon,
    color: s.color,
    description: s.description,
    fields: s.fields.map(f => ({ key: f.key, label: f.label, type: f.type, placeholder: f.placeholder, required: f.required })),
    docUrl: s.docUrl,
    connection: connections[s.id] || null,
  }))

  const connected = Object.values(connections).filter(c => c.status === 'active').length

  return NextResponse.json({
    categories: SERVICE_CATEGORIES,
    services,
    totalServices: SERVICES.length,
    connected,
    authenticated: !!userId,
  })
}
