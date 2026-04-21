/**
 * CRO9 auth helpers — validate the caller has either:
 *   (a) an active `cro9-neuro-engine` product key, OR
 *   (b) a live trial on the specific site they're hitting.
 *
 * All CRO9 API routes call one of these before touching site data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const CRO9_SLUG = 'cro9-neuro-engine'
export const CRO9_CAPABILITIES = ['cro9_analyze', 'cro9_brief', 'cro9_apply', 'cro9_history'] as const

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function bearer(req: NextRequest): string | null {
  const raw = req.headers.get('authorization')
  if (raw?.startsWith('Bearer ')) return raw.slice(7).trim()
  return null
}

export interface AuthedUser {
  id: string
  email?: string | null
}

export async function resolveUser(req: NextRequest): Promise<AuthedUser | null> {
  const supabase = adminClient()
  const token = bearer(req)
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    return user ? { id: user.id, email: user.email } : null
  }
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/sb-access-token=([^;]+)/)
  if (m) {
    const { data: { user } } = await supabase.auth.getUser(decodeURIComponent(m[1]))
    return user ? { id: user.id, email: user.email } : null
  }
  return null
}

export interface Entitlement {
  hasProductKey: boolean
  activeSiteCount: number
}

export async function checkEntitlement(userId: string): Promise<Entitlement> {
  const supabase = adminClient()

  const { data: keys } = await supabase
    .from('product_keys')
    .select('status')
    .eq('user_id', userId)
    .eq('product_slug', CRO9_SLUG)
    .eq('status', 'active')

  const { count: activeSites } = await supabase
    .from('cro9_sites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['trial', 'active'])

  return {
    hasProductKey: Array.isArray(keys) && keys.length > 0,
    activeSiteCount: activeSites || 0,
  }
}

export async function requireCro9(req: NextRequest): Promise<
  | { ok: true; user: AuthedUser; entitlement: Entitlement }
  | { ok: false; response: NextResponse }
> {
  const user = await resolveUser(req)
  if (!user) return { ok: false, response: NextResponse.json({ error: 'unauthorised' }, { status: 401 }) }
  const entitlement = await checkEntitlement(user.id)
  return { ok: true, user, entitlement }
}

export async function requireSiteOwner(req: NextRequest, siteId: string): Promise<
  | { ok: true; user: AuthedUser; site: Record<string, unknown>; entitlement: Entitlement }
  | { ok: false; response: NextResponse }
> {
  const r = await requireCro9(req)
  if (!r.ok) return r

  const supabase = adminClient()
  const { data: site } = await supabase
    .from('cro9_sites')
    .select('*')
    .eq('id', siteId)
    .eq('user_id', r.user.id)
    .maybeSingle()

  if (!site) return { ok: false, response: NextResponse.json({ error: 'site_not_found' }, { status: 404 }) }

  const trialLive = site.trial_ends_at && new Date(site.trial_ends_at as string).getTime() > Date.now()
  const paidActive = site.status === 'active'
  if (!r.entitlement.hasProductKey && !trialLive && !paidActive) {
    return {
      ok: false,
      response: NextResponse.json({
        error: 'trial_expired',
        message: 'Free trial ended — activate the cro9-neuro-engine add-on to continue.',
      }, { status: 402 }),
    }
  }
  return { ok: true, user: r.user, site: site as Record<string, unknown>, entitlement: r.entitlement }
}

export function makeSiteToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return 'cro9_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
