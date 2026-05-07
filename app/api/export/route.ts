/**
 * GET /api/export — Generate a .0n master connection file
 *
 * Exports all of the user's connected services as a portable
 * .0n connection file that can be imported into Claude Desktop,
 * Cursor, 0ntask, or any MCP-compatible client.
 *
 * Auth: Supabase session or 0n token
 *
 * The .0n file follows the 0n-spec connection schema:
 * https://0nork.com/schemas/connection.json
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractToken } from '@/lib/0n-token'
import { getUserVault } from '@/lib/token-vault'

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

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()

  // Get user profile
  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name, business_name, crm_location_id, tier_level')
    .eq('id', userId)
    .single()

  // Get all connected services from Vault
  const vault = await getUserVault(userId)
  const activeServices = vault.filter(v => v.status === 'active' && Object.keys(v.credentials).length > 0)

  // Get CRM installation
  const { data: crmInstall } = await admin
    .from('crm_installations')
    .select('location_id, access_token, refresh_token, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  // Build the .0n master connection file
  const now = new Date().toISOString()

  const connections: Record<string, unknown>[] = activeServices.map(svc => ({
    $0n: { type: 'connection', version: '1.0.0', created: now },
    service: svc.service,
    auth: {
      type: 'api_key',
      credentials: svc.credentials,
    },
    status: svc.status,
    health: svc.healthStatus,
    last_used: svc.lastUsedAt,
  }))

  // Add CRM connection if exists
  if (crmInstall) {
    connections.push({
      $0n: { type: 'connection', version: '1.0.0', created: now },
      service: 'crm',
      auth: {
        type: 'oauth',
        location_id: crmInstall.location_id,
        access_token: crmInstall.access_token,
        refresh_token: crmInstall.refresh_token,
      },
      status: crmInstall.status,
    })
  }

  // The master .0n file
  const masterFile = {
    $0n: {
      type: 'config',
      version: '1.0.0',
      name: `${profile?.business_name || profile?.full_name || 'My'} 0nCore Setup`,
      created: now,
      updated: now,
      generator: '0nCore v1.0',
    },
    profile: {
      user_id: userId,
      email: profile?.email || '',
      business: profile?.business_name || '',
      tier: profile?.tier_level || 0,
      crm_location: profile?.crm_location_id || '',
    },
    connections,
    mcp: {
      server: {
        command: 'npx',
        args: ['-y', '0nmcp@latest'],
      },
      config: {
        mcpServers: {
          '0nMCP': {
            command: 'npx',
            args: ['-y', '0nmcp@latest'],
          },
        },
      },
    },
    meta: {
      total_connections: connections.length,
      services: activeServices.map(s => s.service),
      crm_connected: !!crmInstall,
      exported_at: now,
      export_source: '0ncore.com',
    },
  }

  // Check if user wants download or JSON
  const format = req.nextUrl.searchParams.get('format')

  if (format === 'download') {
    const fileName = `0n-setup-${profile?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'my-config'}.0n`
    return new NextResponse(JSON.stringify(masterFile, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  }

  return NextResponse.json(masterFile)
}
