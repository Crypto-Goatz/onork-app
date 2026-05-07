/**
 * POST /api/services/connect — Connect a service with user's API credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractToken } from '@/lib/0n-token'
import { getServiceById } from '@/lib/service-catalog'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  // Try 0n token first
  const token = extractToken(req)
  if (token) {
    const ctx = await validateToken(token)
    if (ctx) return ctx.userId
  }

  // Try Supabase session from cookies
  try {
    const supabase = await createServerClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    if (user?.id) return user.id
  } catch (e) {
    console.error('[services/connect] Auth error:', e)
  }

  return null
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated. Please log in first.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { service, credentials } = body as { service?: string; credentials?: Record<string, string> }

  if (!service || !credentials) {
    return NextResponse.json({ error: 'Missing service and credentials' }, { status: 400 })
  }

  const serviceDef = getServiceById(service)
  if (!serviceDef) {
    return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 })
  }

  for (const field of serviceDef.fields) {
    if (field.required && !credentials[field.key]) {
      return NextResponse.json({ error: `Missing required field: ${field.label}` }, { status: 400 })
    }
  }

  const admin = getAdmin()

  // Store credentials (upsert row first, then encrypt via Vault)
  const { error: upsertErr } = await admin
    .from('user_service_connections')
    .upsert({
      user_id: userId,
      service,
      credentials: { encrypted: false, _temp: true },
      status: 'pending',
      health_status: 'unknown',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,service' })

  if (upsertErr) {
    console.error('[services/connect] Upsert error:', upsertErr)
    return NextResponse.json({ error: `Failed to store: ${upsertErr.message}` }, { status: 500 })
  }

  // Encrypt credentials in Vault
  await admin.rpc('store_encrypted_credentials', {
    p_user_id: userId,
    p_service: service,
    p_credentials: credentials,
  }).then(() => {}, (err) => {
    console.error('[services/connect] Vault encryption failed, storing raw:', err)
    // Fallback: store raw if Vault fails
    admin.from('user_service_connections').update({ credentials }).eq('user_id', userId).eq('service', service)
  })

  // Verify the connection
  if (serviceDef.verifyEndpoint) {
    try {
      let url = serviceDef.verifyEndpoint
      for (const [key, val] of Object.entries(credentials)) {
        url = url.replace(`{${key}}`, String(val))
      }

      const headers = serviceDef.verifyHeaders(credentials)
      const verifyBody = serviceDef.verifyMethod === 'POST' ? '{}' : undefined

      const res = await fetch(url, {
        method: serviceDef.verifyMethod,
        headers,
        body: verifyBody,
        signal: AbortSignal.timeout(10_000),
      })

      if (res.ok || res.status === 405) {
        await admin.from('user_service_connections').update({
          status: 'active',
          health_status: 'healthy',
          last_verified_at: new Date().toISOString(),
        }).eq('user_id', userId).eq('service', service)

        return NextResponse.json({ status: 'active', service, verified: true })
      }

      const errText = await res.text().catch(() => '')
      await admin.from('user_service_connections').update({
        status: 'error',
        health_status: 'unhealthy',
      }).eq('user_id', userId).eq('service', service)

      return NextResponse.json({
        status: 'error', service, verified: false,
        error: `Verification failed (${res.status}): ${errText.slice(0, 200)}`,
      })
    } catch (err) {
      await admin.from('user_service_connections').update({
        status: 'error',
        health_status: 'unhealthy',
      }).eq('user_id', userId).eq('service', service)

      return NextResponse.json({
        status: 'error', service, verified: false,
        error: err instanceof Error ? err.message : 'Verification failed',
      })
    }
  }

  await admin.from('user_service_connections').update({
    status: 'active',
    health_status: 'unknown',
  }).eq('user_id', userId).eq('service', service)

  return NextResponse.json({ status: 'active', service, verified: false, note: 'No auto-verification for this service' })
}
