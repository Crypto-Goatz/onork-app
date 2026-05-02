/**
 * GET /api/connections/list
 *
 * Returns all OAuth connections for the authenticated 0nCore user from the
 * unified `user_connections` table. The dashboard, Slack home, and the
 * /welcome page all read from this so the same connection state surfaces
 * everywhere.
 *
 * Identity is keyed by 0nCore user_id, which itself is keyed by email —
 * Slack/LinkedIn/Google/CRM all resolve to the same row when their
 * provider_email matches the user's profile.email.
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { listConnections } from '@/lib/oauth/connections'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await listConnections(user.id)
  return NextResponse.json({
    user: { id: user.id, email: user.email },
    connections: rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      provider_email: r.provider_email,
      provider_name: r.provider_name,
      provider_avatar: r.provider_avatar,
      scopes: r.scopes,
      status: r.status,
      health_status: r.health_status,
      expires_at: r.expires_at,
      updated_at: r.updated_at,
      // Identity guarantee: provider_email should match user.email. If it
      // doesn't, the upserter would have rejected — so this is informational.
      email_match: (r.provider_email || '').toLowerCase() === (user.email || '').toLowerCase(),
    })),
  })
}
