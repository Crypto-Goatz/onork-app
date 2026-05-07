/**
 * POST /api/import — Import a .0n connection file
 *
 * Accepts a .0n file (JSON), validates it, and auto-connects
 * all services found in the connections array. Each connection
 * is stored encrypted via Vault.
 *
 * This is the "Turn it 0n" flow — paste your .0n file and
 * everything connects instantly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractToken } from '@/lib/0n-token'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const token = extractToken(req)
  if (token) {
    const ctx = await validateToken(token)
    if (ctx) return ctx.userId
  }
  try {
    const supabase = await createServerClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    return user?.id || null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let dotOnFile: Record<string, unknown>
  try {
    dotOnFile = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON — paste a valid .0n file' }, { status: 400 })
  }

  // Validate .0n format
  const meta = dotOnFile.$0n as Record<string, unknown> | undefined
  if (!meta) {
    return NextResponse.json({ error: 'Not a valid .0n file — missing $0n header' }, { status: 400 })
  }

  const admin = getAdmin()
  const results: { service: string; status: string; error?: string }[] = []

  // Process connections array
  const connections = (dotOnFile.connections || []) as Record<string, unknown>[]

  for (const conn of connections) {
    const service = conn.service as string
    const auth = conn.auth as Record<string, unknown>
    if (!service || !auth) {
      results.push({ service: service || 'unknown', status: 'skipped', error: 'Missing service or auth' })
      continue
    }

    const credentials = (auth.credentials || auth) as Record<string, string>

    try {
      // Upsert the connection
      await admin.from('user_service_connections').upsert({
        user_id: userId,
        service,
        credentials: { encrypted: false },
        status: 'active',
        health_status: 'unknown',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,service' })

      // Encrypt via Vault
      await admin.rpc('store_encrypted_credentials', {
        p_user_id: userId,
        p_service: service,
        p_credentials: credentials,
      })

      results.push({ service, status: 'connected' })
    } catch (err) {
      results.push({ service, status: 'error', error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  // Process CRM connection if present
  const crmConn = connections.find(c => c.service === 'crm')
  if (crmConn) {
    const auth = crmConn.auth as Record<string, unknown>
    const locationId = auth.location_id as string
    if (locationId) {
      await admin.from('profiles').update({ crm_location_id: locationId }).eq('id', userId)
    }
  }

  // Process MCP config if present
  const mcp = dotOnFile.mcp as Record<string, unknown> | undefined

  const connected = results.filter(r => r.status === 'connected').length
  const failed = results.filter(r => r.status === 'error').length

  // Send notification
  await admin.from('dashboard_notifications').insert({
    user_id: userId,
    type: failed === 0 ? 'success' : 'warning',
    title: `.0n File Imported — ${connected} services connected`,
    message: `Imported ${connections.length} connections. ${connected} connected, ${failed} failed.`,
    metadata: { results, source: (meta.generator as string) || 'import', format: meta.type },
  }).then(() => {}, () => {})

  return NextResponse.json({
    imported: true,
    total: connections.length,
    connected,
    failed,
    results,
    mcp_config: mcp || null,
  })
}
