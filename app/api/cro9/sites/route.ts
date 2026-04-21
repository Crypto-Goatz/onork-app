/**
 * GET  /api/cro9/sites       — list the caller's sites
 * POST /api/cro9/sites       — add a new site (creates 7-day trial if no paid key)
 *
 * Body for POST:
 *   { site_url, gsc_property?, ga4_property_id?, apply_mode?, serpapi_key? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminClient, makeSiteToken, requireCro9 } from '@/lib/cro9/auth'
import { encryptSecret } from '@/lib/cro9/crypto'
import { runAnalysis, type Site } from '@/lib/cro9/engine'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const r = await requireCro9(req)
  if (!r.ok) return r.response
  const supabase = adminClient()

  const { data: sites } = await supabase
    .from('cro9_sites')
    .select('id, site_url, domain, gsc_property, ga4_property_id, apply_mode, status, trial_ends_at, last_run_at, last_run_status, last_run_summary, created_at')
    .eq('user_id', r.user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ sites: sites || [], entitlement: r.entitlement })
}

export async function POST(req: NextRequest) {
  const r = await requireCro9(req)
  if (!r.ok) return r.response

  const body = await req.json().catch(() => ({}))
  const siteUrlRaw = String(body?.site_url || '').trim()
  if (!siteUrlRaw) return NextResponse.json({ error: 'site_url required' }, { status: 400 })

  let domain: string
  let siteUrl: string
  try {
    const withScheme = siteUrlRaw.startsWith('http') ? siteUrlRaw : `https://${siteUrlRaw}`
    const u = new URL(withScheme)
    domain = u.hostname.replace(/^www\./, '')
    siteUrl = `${u.protocol}//${u.hostname}${u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, '')}`
  } catch {
    return NextResponse.json({ error: 'invalid site_url' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data: existing } = await supabase
    .from('cro9_sites')
    .select('id, status')
    .eq('user_id', r.user.id)
    .eq('domain', domain)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'site_exists', siteId: existing.id }, { status: 409 })
  }

  const applyMode = ['briefs_only', 'snippet', 'wordpress'].includes(body?.apply_mode) ? body.apply_mode : 'briefs_only'
  const gscProperty = body?.gsc_property ? String(body.gsc_property) : `sc-domain:${domain}`
  const ga4 = body?.ga4_property_id ? String(body.ga4_property_id) : null
  const serpapiEncrypted = body?.serpapi_key ? encryptSecret(String(body.serpapi_key).trim()) : null
  const trialEndsAt = r.entitlement.hasProductKey ? null : new Date(Date.now() + 7 * 86400000).toISOString()
  const status = r.entitlement.hasProductKey ? 'active' : 'trial'

  const { data: site, error } = await supabase
    .from('cro9_sites')
    .insert({
      user_id: r.user.id,
      site_url: siteUrl,
      domain,
      gsc_property: gscProperty,
      ga4_property_id: ga4,
      apply_mode: applyMode,
      status,
      trial_ends_at: trialEndsAt,
      site_token: makeSiteToken(),
      serpapi_key_encrypted: serpapiEncrypted,
    })
    .select()
    .single()

  if (error || !site) {
    return NextResponse.json({ error: error?.message || 'insert_failed' }, { status: 500 })
  }

  await supabase.from('cro9_action_history').insert({
    site_id: site.id,
    action_type: 'site_created',
    payload: { apply_mode: applyMode, status, trialEndsAt },
    outcome: { domain, gsc_property: gscProperty },
  })

  // Kick off first analysis (non-blocking)
  runAnalysis(site as Site, { maxPages: 10, generateBriefs: true }).catch(() => {})

  return NextResponse.json({ ok: true, site })
}
