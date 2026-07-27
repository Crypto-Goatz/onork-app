/**
 * POST /api/bridge/firebase — Firebase ↔ pwu account bridge.
 *
 * app.0ntask.com (Firebase front door) verifies its user server-side, then calls
 * this with the shared INTERNAL_DISPATCH_SECRET + the verified {uid, email}. We
 * resolve (or create) the matching pwu account by email — email is the join key,
 * matching our email-unified identity model — and return the account's 0n_ token.
 * That single token then unlocks the user's shared vault connections everywhere.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateProfileToken } from '@/lib/0n-token'

export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bridge-secret')
  if (!secret || secret !== process.env.INTERNAL_DISPATCH_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({} as any))
  const uid = String(body.uid || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const sb = admin()
  try {
    // 1) Existing pwu account by email?
    let { data: profile } = await sb
      .from('profiles')
      .select('id, access_token')
      .eq('email', email)
      .maybeSingle()

    // 2) None → create the pwu auth user (trigger creates the profile row).
    if (!profile) {
      const { data: created, error: cErr } = await sb.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name, firebase_uid: uid, source: '0ntask' },
      })
      let userId = created?.user?.id
      if (cErr || !userId) {
        // Auth user may already exist without a matching profile row — re-query.
        const again = await sb.from('profiles').select('id, access_token').eq('email', email).maybeSingle()
        if (again.data) { profile = again.data }
        else return NextResponse.json({ error: cErr?.message || 'could not create account' }, { status: 500 })
      }
      if (!profile && userId) {
        // Defensive: ensure the profile row exists (trigger normally makes it).
        await sb.from('profiles').upsert({ id: userId, email, full_name: name }, { onConflict: 'id' })
        profile = { id: userId, access_token: null }
      }
    }

    if (!profile) return NextResponse.json({ error: 'account resolution failed' }, { status: 500 })

    // 3) Mint or reuse the 0n_ token.
    const token = profile.access_token || (await generateProfileToken(profile.id))

    // 4) Read the 0nTask entitlement (tier), recorded by the Stripe webhook or a beta grant.
    let tier = 'solo', status: string | null = null, founder = false, beta = false, seats = 1
    try {
      const { data: ent } = await sb
        .from('ontask_entitlements')
        .select('tier, status, founder, beta, seats')
        .eq('email', email)
        .maybeSingle()
      if (ent) {
        tier = ent.tier || 'solo'
        status = ent.status || null
        founder = !!ent.founder
        beta = !!ent.beta
        seats = ent.seats || 1
      }
    } catch { /* entitlement is best-effort; default to solo */ }

    return NextResponse.json({ ok: true, token, userId: profile.id, email, tier, status, founder, beta, seats })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'bridge failed' }, { status: 500 })
  }
}
