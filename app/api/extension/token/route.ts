/**
 * GET    /api/extension/token  — list current user's extension tokens
 * POST   /api/extension/token  — issue a new extension token
 *                                body: { name?, location_id }
 *                                returns: { token: <raw, shown ONCE>, prefix, name, expires_at }
 * DELETE /api/extension/token?id=…  — revoke
 *
 * Auth: Supabase session (the dashboard view).
 *
 * The raw token is returned exactly once. We store only its SHA-256 hash.
 * The user copies the token, pastes it into the Chrome extension, and from
 * there every extension API call sends `Authorization: Bearer 0n_live_…`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateToken, listUserTokens, revokeToken } from '@/lib/0n-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokens = await listUserTokens(user.id)
  // Only show extension-channel tokens for this UI
  return NextResponse.json({
    tokens: tokens
      .filter((t) => t.channel === 'extension')
      .map((t) => ({
        id: t.id,
        name: t.name,
        prefix: t.token_prefix,
        last_used_at: t.last_used_at,
        created_at: t.created_at,
        expires_at: t.expires_at,
        revoked: t.revoked,
      })),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; location_id?: string }
  try { body = await req.json() } catch { body = {} }

  // Resolve the user's CRM location (default for the token)
  const sb = admin()
  const { data: profile } = await sb
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .maybeSingle()

  const locationId = body.location_id ?? profile?.crm_location_id ?? 'unbound'

  let raw: string
  try {
    raw = await generateToken({
      userId: user.id,
      locationId,
      name: body.name?.trim() || 'Chrome Extension',
      channel: 'extension',
      scopes: ['read', 'write', 'execute'],
      metadata: { issued_for: 'chrome_extension' },
      expiresAt: null, // long-lived for now; user revokes when needed
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'token generation failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    token: raw,                      // ← SHOWN ONCE; user must copy this
    prefix: raw.slice(0, 12),
    name: body.name?.trim() || 'Chrome Extension',
    note: 'Copy this token now. We hash and store it — it cannot be retrieved later.',
  })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const ok = await revokeToken(id, user.id)
  if (!ok) return NextResponse.json({ error: 'revoke failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
