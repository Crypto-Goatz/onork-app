/**
 * GET /api/account/me — the universal profile, from whichever door you came in.
 *
 * Accepts EITHER auth: the app JWT (CRM iframe, marketplace, extension) or a
 * Supabase session (website). One account either way — that is the entire point
 * of the identity layer, and a profile endpoint that only understood one of them
 * would recreate the split it exists to close.
 *
 * It also ENSURES the account rather than assuming it. Someone whose first ever
 * visit is this page should leave with an account, not a 404.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { ensureOnAccount } from '@/lib/account/ensure'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const jwt = verifyAppJwt(bearer(req))

  let email: string | null = null
  let companyId: string | null = null
  let locationId: string | null = null
  let via: 'app_jwt' | 'session' | null = null

  if (jwt.ok) {
    via = 'app_jwt'
    email = (jwt.claims as { email?: string }).email ?? null
    companyId = jwt.claims.companyId ?? null
    locationId = (jwt.claims as { activeLocationId?: string }).activeLocationId ?? null
  } else {
    const supabase = await createClient()
    const session = (await supabase.auth.getSession()).data.session
    if (session?.user) {
      via = 'session'
      email = session.user.email ?? null
    }
  }

  if (!via) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const ensured = await ensureOnAccount({
    email, companyId, locationId,
    source: via === 'app_jwt' ? 'crm_sso' : 'signup',
  })
  if (!ensured.ok) return NextResponse.json({ error: ensured.error }, { status: 500 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const { data: p } = await db
    .from('profiles')
    .select('id, email, display_name, full_name, company, business_name, business_type, website, plan, avatar_url, brand_color, onboarding_completed, crm_agency_id, crm_location_id, created_at')
    .eq('id', ensured.account.id)
    .maybeSingle()

  // What this identity can already reach. Read, never assumed — the whole
  // promise of one account is that it can prove what it unlocks.
  const [{ count: clients }, { count: devices }] = await Promise.all([
    companyId
      ? db.from('location_connections').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('status', 'active')
      : Promise.resolve({ count: 0 }),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('id', ensured.account.id),
  ])

  return NextResponse.json({
    account: {
      ...p,
      accountCreatedNow: ensured.account.created,
      authenticatedVia: via,
    },
    reach: {
      connectedClients: clients ?? 0,
      hasAgency: Boolean(companyId),
      devices: devices ?? 0,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const jwt = verifyAppJwt(bearer(req))
  let email: string | null = null
  let companyId: string | null = null

  if (jwt.ok) {
    email = (jwt.claims as { email?: string }).email ?? null
    companyId = jwt.claims.companyId ?? null
  } else {
    const supabase = await createClient()
    email = (await supabase.auth.getSession()).data.session?.user?.email ?? null
  }
  if (!email && !companyId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const ensured = await ensureOnAccount({ email, companyId, source: 'signup' })
  if (!ensured.ok) return NextResponse.json({ error: ensured.error }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  // An allow-list, not a spread. A profile endpoint that accepted arbitrary
  // columns would let a client set plan, role or is_admin on itself.
  const ALLOWED = ['display_name', 'full_name', 'company', 'business_name', 'business_type', 'website', 'brand_color', 'avatar_url'] as const
  const patch: Record<string, unknown> = {}
  for (const k of ALLOWED) if (typeof body?.[k] === 'string') patch[k] = String(body[k]).slice(0, 300)

  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })
  await db.from('profiles').update(patch).eq('id', ensured.account.id)

  return NextResponse.json({ ok: true, updated: Object.keys(patch) })
}
