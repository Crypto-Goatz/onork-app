/**
 * Device tokens — the credential a Chrome extension actually holds.
 *
 * WHY NOT THE APP JWT. The app JWT is a stateless HMAC with a 15-minute life
 * and NO revocation. That is right for the CRM iframe, which silently
 * re-handshakes with its parent. It is wrong for an extension, which keeps a
 * credential for weeks on a machine we do not control: if that laptop is lost
 * there is nothing to revoke, and the token stays valid until it expires.
 *
 * So SSO stays the ISSUER — identity still comes from the CRM handshake or a
 * signed-in session — but what it issues here is a `0n_live_…` device token:
 * hashed at rest, scoped, listable, and revocable per device. The extension
 * exchanges it for short app JWTs (see ./exchange).
 *
 *   POST   → issue one, returned EXACTLY once
 *   GET    → list devices (prefix only, never the token)
 *   DELETE → revoke one
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { generateToken, revokeToken, listUserTokens } from '@/lib/0n-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CHANNEL = 'extension'

/** The client this device acts in by default — the agency's free account. */
async function defaultLocationFor(userId: string): Promise<string | null> {
  const db = createServiceClient()
  if (!db) return null
  const { data } = await db
    .from('agency_connections')
    .select('free_location_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  return data?.free_location_id ?? null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' && body.name.trim()
    ? body.name.trim().slice(0, 60)
    : 'Chrome extension'

  // Scoped to the free/default account. Refusing here rather than defaulting to
  // "any client" means a device can never be handed broader reach than the
  // agency has actually set up.
  const locationId = await defaultLocationFor(user.id)
  if (!locationId) {
    return NextResponse.json(
      { error: 'Choose your free account first — a device key is scoped to a client.' },
      { status: 400 },
    )
  }

  const token = await generateToken({
    userId: user.id,
    locationId,
    name,
    channel: CHANNEL,
    scopes: ['read', 'write', 'execute'],
  })

  // Returned once. Nothing stores the raw value — only its hash — so there is
  // no second chance to read it, deliberately.
  return NextResponse.json({ ok: true, token, name, locationId, shownOnce: true })
}

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const rows = await listUserTokens(user.id)
  const devices = (rows ?? [])
    .filter((t: { channel?: string | null }) => t.channel === CHANNEL)
    .map((t: Record<string, unknown>) => ({
      id: t.id,
      name: t.name ?? 'Chrome extension',
      prefix: t.token_prefix,
      lastUsedAt: t.last_used_at ?? null,
      createdAt: t.created_at ?? null,
      revoked: Boolean(t.revoked),
    }))

  return NextResponse.json({ devices })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'Which device?' }, { status: 400 })

  // revokeToken checks the token belongs to this user — a device id alone is
  // not authority to revoke it.
  const ok = await revokeToken(id, user.id)
  if (!ok) return NextResponse.json({ error: 'Could not revoke that device.' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
