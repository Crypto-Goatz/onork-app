/**
 * GET /api/cron/cro9 — daily driver. Vercel cron hits this at 10:18 UTC.
 *
 * Iterates every active/trial site with a gsc_property set. For each:
 *   1. runAnalysis — new opportunities + briefs
 *   2. runMeasurement — close the loop on applied tasks, update weights
 *
 * Auth: Vercel Cron adds `x-vercel-cron: 1` automatically. We also accept
 * a CRON_SECRET bearer for manual / external triggers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/cro9/auth'
import { runAnalysis, runMeasurement, type Site } from '@/lib/cro9/engine'

export const runtime = 'nodejs'
export const maxDuration = 300

function isAuthedCron(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron') === '1') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthedCron(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = adminClient()
  const { data: sites, error } = await supabase
    .from('cro9_sites')
    .select('*')
    .in('status', ['trial', 'active'])
    .not('gsc_property', 'is', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ siteId: string; analyze: unknown; measure: unknown; error?: string }> = []
  for (const raw of sites || []) {
    const site = raw as Site
    try {
      // Sweep trial expirations first
      if (site.status === 'trial' && (raw.trial_ends_at && new Date(raw.trial_ends_at as string).getTime() < Date.now())) {
        await supabase.from('cro9_sites').update({ status: 'expired' }).eq('id', site.id)
        await supabase.from('cro9_action_history').insert({
          site_id: site.id, action_type: 'trial_expired', payload: null, outcome: { at: new Date().toISOString() },
        })
        results.push({ siteId: site.id, analyze: null, measure: null, error: 'trial_expired' })
        continue
      }

      const [analyze, measure] = await Promise.all([
        runAnalysis(site, { maxPages: 15, generateBriefs: true }),
        runMeasurement(site),
      ])
      results.push({ siteId: site.id, analyze, measure })
    } catch (e) {
      results.push({ siteId: site.id, analyze: null, measure: null, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ ok: true, ran: results.length, results })
}
