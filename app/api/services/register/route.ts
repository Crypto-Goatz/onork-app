/**
 * POST /api/services/register — WordPress site registration
 *
 * Called by 0nCore WordPress plugin on activation.
 * Auth: Bearer 0n_ token (verified against api_tokens via validate_0n_token RPC)
 *
 * Required Supabase table:
 *
 *   CREATE TABLE connected_services (
 *     id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *     site_id      text NOT NULL,
 *     service_type text NOT NULL DEFAULT 'wordpress',
 *     site_url     text NOT NULL,
 *     site_name    text,
 *     mcp_endpoint text,
 *     wp_version   text,
 *     plugin_version text,
 *     tools        jsonb DEFAULT '[]'::jsonb,
 *     status       text NOT NULL DEFAULT 'active',
 *     last_seen_at timestamptz DEFAULT now(),
 *     created_at   timestamptz DEFAULT now(),
 *     UNIQUE(user_id, site_id)
 *   );
 *
 *   ALTER TABLE connected_services ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "Users can read own services"
 *     ON connected_services FOR SELECT
 *     USING (auth.uid() = user_id);
 *
 *   CREATE INDEX idx_connected_services_user ON connected_services(user_id);
 *   CREATE INDEX idx_connected_services_status ON connected_services(status);
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractToken } from '@/lib/0n-token'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Authenticate via Bearer 0n_ token
  const token = extractToken(req)
  if (!token) {
    return NextResponse.json(
      { error: 'Missing Bearer token. Provide Authorization: Bearer 0n_...' },
      { status: 401 }
    )
  }

  const ctx = await validateToken(token)
  if (!ctx) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    site_id,
    service_type,
    site_url,
    site_name,
    mcp_endpoint,
    wp_version,
    plugin_version,
    tools,
  } = body as {
    site_id?: string
    service_type?: string
    site_url?: string
    site_name?: string
    mcp_endpoint?: string
    wp_version?: string
    plugin_version?: string
    tools?: string[]
  }

  if (!site_id || !site_url) {
    return NextResponse.json(
      { error: 'Missing required fields: site_id, site_url' },
      { status: 400 }
    )
  }

  const admin = getAdmin()

  const { error: upsertErr } = await admin
    .from('connected_services')
    .upsert(
      {
        user_id: ctx.userId,
        site_id,
        service_type: service_type || 'wordpress',
        site_url,
        site_name: site_name || null,
        mcp_endpoint: mcp_endpoint || null,
        wp_version: wp_version || null,
        plugin_version: plugin_version || null,
        tools: tools || [],
        status: 'active',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,site_id' }
    )

  if (upsertErr) {
    console.error('[services/register] Upsert error:', upsertErr)
    return NextResponse.json(
      { error: `Registration failed: ${upsertErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, registered: true })
}
