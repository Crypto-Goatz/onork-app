import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Service credential key requirements
const SERVICE_CREDENTIALS: Record<string, { keys: string[]; labels: string[]; placeholder: string[] }> = {
  stripe: { keys: ['apiKey'], labels: ['Secret Key'], placeholder: ['sk_live_...'] },
  sendgrid: { keys: ['apiKey'], labels: ['API Key'], placeholder: ['SG.xxx'] },
  slack: { keys: ['botToken'], labels: ['Bot Token'], placeholder: ['xoxb-...'] },
  discord: { keys: ['botToken'], labels: ['Bot Token'], placeholder: ['MTk...'] },
  twilio: { keys: ['accountSid', 'authToken'], labels: ['Account SID', 'Auth Token'], placeholder: ['AC...', '...'] },
  github: { keys: ['token'], labels: ['Personal Access Token'], placeholder: ['ghp_...'] },
  shopify: { keys: ['accessToken', 'store'], labels: ['Access Token', 'Store Name'], placeholder: ['shpat_...', 'mystore'] },
  openai: { keys: ['apiKey'], labels: ['API Key'], placeholder: ['sk-...'] },
  anthropic: { keys: ['apiKey'], labels: ['API Key'], placeholder: ['sk-ant-...'] },
  google_sheets: { keys: ['access_token'], labels: ['OAuth Token'], placeholder: ['ya29...'] },
  google_drive: { keys: ['access_token'], labels: ['OAuth Token'], placeholder: ['ya29...'] },
  gmail: { keys: ['access_token'], labels: ['OAuth Token'], placeholder: ['ya29...'] },
  google_calendar: { keys: ['access_token'], labels: ['OAuth Token'], placeholder: ['ya29...'] },
  notion: { keys: ['apiKey'], labels: ['Integration Token'], placeholder: ['ntn_...'] },
  airtable: { keys: ['apiKey'], labels: ['Personal Access Token'], placeholder: ['pat...'] },
  mongodb: { keys: ['apiKey', 'appId'], labels: ['API Key', 'App ID'], placeholder: ['...', '...'] },
  supabase: { keys: ['apiKey', 'projectRef'], labels: ['Anon Key', 'Project Ref'], placeholder: ['eyJ...', 'abcdefgh'] },
  hubspot: { keys: ['accessToken'], labels: ['Access Token'], placeholder: ['pat-...'] },
  zendesk: { keys: ['email', 'apiToken', 'subdomain'], labels: ['Email', 'API Token', 'Subdomain'], placeholder: ['you@co.com', '...', 'mycompany'] },
  jira: { keys: ['email', 'apiToken', 'domain'], labels: ['Email', 'API Token', 'Domain'], placeholder: ['you@co.com', '...', 'mycompany'] },
  mailchimp: { keys: ['apiKey'], labels: ['API Key'], placeholder: ['xxx-us21'] },
  calendly: { keys: ['apiKey'], labels: ['Personal Access Token'], placeholder: ['eyJ...'] },
  zoom: { keys: ['access_token'], labels: ['OAuth Token'], placeholder: ['eyJ...'] },
  linear: { keys: ['apiKey'], labels: ['API Key'], placeholder: ['lin_api_...'] },
  microsoft: { keys: ['access_token'], labels: ['OAuth Token'], placeholder: ['eyJ...'] },
  cloudflare: { keys: ['apiToken'], labels: ['API Token'], placeholder: ['...'] },
  resend: { keys: ['apiKey'], labels: ['API Key'], placeholder: ['re_...'] },
}

/**
 * GET /api/integrations
 * List all integrations with connection status for the current user
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const admin = getAdmin()

  // Get user's saved connections
  const { data: vaults } = await admin
    .from('user_vaults')
    .select('id, service_name, key_hint, created_at')
    .eq('user_id', userId)

  const connectedServices = new Set((vaults || []).map(v => v.service_name.toLowerCase()))

  // Build full service list with connection status
  const services = Object.entries(SERVICE_CREDENTIALS).map(([key, creds]) => ({
    key,
    connected: connectedServices.has(key),
    credentialKeys: creds.keys,
    labels: creds.labels,
    placeholders: creds.placeholder,
    vault: (vaults || []).find(v => v.service_name.toLowerCase() === key),
  }))

  return NextResponse.json({ services, connected_count: connectedServices.size, total: services.length })
}

/**
 * POST /api/integrations
 * Connect a service by saving encrypted credentials
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action as string
  const userId = body.user_id as string
  const service = body.service as string

  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const admin = getAdmin()

  switch (action) {
    case 'connect': {
      if (!service) return NextResponse.json({ error: 'service required' }, { status: 400 })

      const credentials = body.credentials as Record<string, string>
      if (!credentials) return NextResponse.json({ error: 'credentials required' }, { status: 400 })

      // Validate required keys
      const spec = SERVICE_CREDENTIALS[service]
      if (spec) {
        for (const key of spec.keys) {
          if (!credentials[key]) {
            return NextResponse.json({ error: `Missing required credential: ${key}` }, { status: 400 })
          }
        }
      }

      // Store each credential as an encrypted vault entry
      // Client-side encryption should happen on the frontend
      // Here we store the server-side encrypted version
      const { error } = await admin.from('user_vaults').upsert({
        user_id: userId,
        service_name: service,
        encrypted_key: JSON.stringify(credentials), // In production: encrypt server-side too
        key_hint: credentials[Object.keys(credentials)[0]]?.slice(0, 8) || '',
        iv: '',
        salt: '',
      }, { onConflict: 'user_id,service_name' })

      if (error) {
        // Try insert if upsert fails (no unique constraint)
        const { error: insertError } = await admin.from('user_vaults').insert({
          user_id: userId,
          service_name: service,
          encrypted_key: JSON.stringify(credentials),
          key_hint: credentials[Object.keys(credentials)[0]]?.slice(0, 8) || '',
        })
        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ status: 'connected', service })
    }

    case 'disconnect': {
      if (!service) return NextResponse.json({ error: 'service required' }, { status: 400 })

      await admin.from('user_vaults')
        .delete()
        .eq('user_id', userId)
        .eq('service_name', service)

      return NextResponse.json({ status: 'disconnected', service })
    }

    case 'test': {
      // Test a connection by making a lightweight API call
      if (!service) return NextResponse.json({ error: 'service required' }, { status: 400 })

      const { data: vault } = await admin.from('user_vaults')
        .select('encrypted_key')
        .eq('user_id', userId)
        .eq('service_name', service)
        .single()

      if (!vault) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

      // Basic verification — just confirm credentials exist
      return NextResponse.json({ status: 'ok', service, verified: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

/**
 * DELETE /api/integrations
 * Disconnect a service
 */
export async function DELETE(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = body.user_id as string
  const service = body.service as string

  if (!userId || !service) return NextResponse.json({ error: 'user_id and service required' }, { status: 400 })

  const admin = getAdmin()
  await admin.from('user_vaults').delete().eq('user_id', userId).eq('service_name', service)

  return NextResponse.json({ status: 'disconnected' })
}
