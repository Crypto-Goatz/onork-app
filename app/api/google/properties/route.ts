import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { getOAuthClient } from '@/lib/google/auth'

// GET /api/google/properties — List user's GA4 properties
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's Google connection
  const { data: connection } = await supabase
    .from('user_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('status', 'active')
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 })
  }

  const oauth = getOAuthClient()
  oauth.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
  })

  try {
    const admin = google.analyticsadmin({ version: 'v1beta', auth: oauth })

    // List all GA4 accounts the user has access to
    const accountsRes = await admin.accounts.list()
    const accounts = accountsRes.data.accounts || []

    // For each account, list properties
    const properties: { id: string; name: string; account: string; accountName: string; websiteUrl: string | null; timeZone: string | null }[] = []

    for (const account of accounts) {
      if (!account.name) continue
      try {
        const propsRes = await admin.properties.list({
          filter: `parent:${account.name}`,
        })

        for (const prop of propsRes.data.properties || []) {
          // Extract numeric property ID from "properties/123456789"
          const numericId = prop.name?.replace('properties/', '') || ''
          properties.push({
            id: numericId,
            name: prop.displayName || numericId,
            account: account.name,
            accountName: account.displayName || '',
            websiteUrl: (prop as Record<string, unknown>).websiteUrl as string || null,
            timeZone: prop.timeZone || null,
          })
        }
      } catch {
        // Skip accounts we can't list properties for
      }
    }

    return NextResponse.json({
      properties,
      selectedProperty: connection.metadata?.ga4_property_id || null,
    })
  } catch (err) {
    console.error('[google/properties] Error:', err)
    return NextResponse.json({
      error: `Failed to list properties: ${err instanceof Error ? err.message : 'Unknown'}`,
    }, { status: 500 })
  }
}

// POST /api/google/properties — Select a GA4 property
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { property_id, property_name } = body

  if (!property_id) {
    return NextResponse.json({ error: 'property_id required' }, { status: 400 })
  }

  const { data: connection } = await supabase
    .from('user_connections')
    .select('id, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 403 })
  }

  const { error } = await supabase
    .from('user_connections')
    .update({
      metadata: {
        ...(connection.metadata || {}),
        ga4_property_id: property_id,
        ga4_property_name: property_name || property_id,
      },
    })
    .eq('id', connection.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ selected: property_id })
}
