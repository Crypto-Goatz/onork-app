/**
 * GET /api/crm/sdk?module=contacts&action=search&query=Sarah
 *
 * Universal CRM SDK proxy — routes any SDK method call.
 * Uses @gohighlevel/api-client with proper token management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCrmClientForUser } from '@/lib/crm-sdk'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const module = searchParams.get('module')
  const action = searchParams.get('action')

  if (!module || !action) {
    return NextResponse.json({ error: 'module and action required' }, { status: 400 })
  }

  const result = await getCrmClientForUser(user.id)
  if (!result) {
    return NextResponse.json({ error: 'CRM not connected. Connect your CRM in Settings.' }, { status: 400 })
  }

  const { client, locationId } = result

  try {
    // Build params from search params
    const params: Record<string, unknown> = { locationId }
    searchParams.forEach((val, key) => {
      if (key !== 'module' && key !== 'action') params[key] = val
    })

    // Route to SDK module
    const mod = (client as unknown as Record<string, unknown>)[module]
    if (!mod || typeof mod !== 'object') {
      return NextResponse.json({ error: `Unknown CRM module: ${module}` }, { status: 400 })
    }

    const fn = (mod as Record<string, unknown>)[action]
    if (typeof fn !== 'function') {
      return NextResponse.json({ error: `Unknown action: ${module}.${action}` }, { status: 400 })
    }

    const data = await fn.call(mod, params)
    return NextResponse.json({ data, module, action, locationId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CRM request failed'
    console.error(`[crm/sdk] ${module}.${action} error:`, message)
    return NextResponse.json({ error: message, module, action }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { module, action, params: bodyParams } = body

  if (!module || !action) {
    return NextResponse.json({ error: 'module and action required' }, { status: 400 })
  }

  const result = await getCrmClientForUser(user.id)
  if (!result) {
    return NextResponse.json({ error: 'CRM not connected' }, { status: 400 })
  }

  const { client, locationId } = result

  try {
    const params = { locationId, ...(bodyParams || {}) }

    const mod = (client as unknown as Record<string, unknown>)[module]
    if (!mod || typeof mod !== 'object') {
      return NextResponse.json({ error: `Unknown CRM module: ${module}` }, { status: 400 })
    }

    const fn = (mod as Record<string, unknown>)[action]
    if (typeof fn !== 'function') {
      return NextResponse.json({ error: `Unknown action: ${module}.${action}` }, { status: 400 })
    }

    const data = await fn.call(mod, params)
    return NextResponse.json({ data, module, action, locationId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CRM request failed'
    console.error(`[crm/sdk] ${module}.${action} error:`, message)
    return NextResponse.json({ error: message, module, action }, { status: 502 })
  }
}
