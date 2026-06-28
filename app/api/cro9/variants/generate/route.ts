/**
 * POST /api/cro9/variants/generate   { slot, site?, n? }
 *
 * Uses AI to write fresh candidate copy for a slot — the "dynamically revise
 * content to improve conversions" loop. New variants are inserted active +
 * is_ai_generated, then immediately enter the Thompson-sampling rotation so
 * they get real traffic and prove (or disprove) themselves.
 *
 * Protected: requires the internal secret (so it can be called by a cron or an
 * authenticated admin action, not anonymously).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { askAIForJson } from '@/lib/ai-call'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Human-readable purpose per slot so the AI writes on-brief copy.
const SLOT_BRIEF: Record<string, string> = {
  hero_headline: 'The main H1 of the 0nCore homepage. 0nCore is an AI-powered CRM that runs your business across 1,640+ tools and 109 services. Punchy, confident, <70 chars, no period unless it lands harder.',
  hero_subhead: 'The hero sub-headline under the H1. One or two sentences. Concretely names CRM capabilities (contacts, pipelines, email, SMS, booking, payments, funnels) plus the AI execution layer. <180 chars.',
  hero_cta: 'The primary call-to-action button label. 2–4 words, action-oriented, low-friction (it is free to start).',
  final_cta: 'The closing call-to-action line at the bottom of the page. Urgent, reassuring, mentions it is free and fast.',
}

export async function POST(req: NextRequest) {
  if (process.env.INTERNAL_DISPATCH_SECRET &&
      req.headers.get('x-internal-secret') !== process.env.INTERNAL_DISPATCH_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { slot?: string; site?: string; n?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const slot = body.slot
  const site = body.site || '0ncore'
  const n = Math.min(Math.max(body.n ?? 2, 1), 5)
  if (!slot || !SLOT_BRIEF[slot]) {
    return NextResponse.json({ error: `unknown slot. known: ${Object.keys(SLOT_BRIEF).join(', ')}` }, { status: 400 })
  }

  // Give the model the current best performers to riff on / beat.
  const { data: existing } = await admin
    .from('cro9_copy_variants')
    .select('content, impressions, conversions')
    .eq('site_slug', site).eq('slot', slot).eq('active', true)
    .order('conversions', { ascending: false }).limit(5)

  const current = (existing || []).map(v => {
    const cr = v.impressions ? ((v.conversions / v.impressions) * 100).toFixed(1) : 'n/a'
    return `- "${v.content}" (CR: ${cr}%)`
  }).join('\n')

  const prompt = `You are a senior conversion copywriter for 0nCore, an AI-powered CRM.
SLOT PURPOSE: ${SLOT_BRIEF[slot]}

CURRENT VARIANTS AND THEIR CONVERSION RATES:
${current || '(none yet)'}

Write ${n} NEW, distinct, higher-converting candidates for this slot. Make them sharper than the current ones — varied angles (outcome, speed, pain-relief, authority). Respect the length guidance. Return ONLY JSON: {"variants": ["...", "..."]}`

  const result = await askAIForJson<{ variants: string[] }>(prompt, { temperature: 0.8, maxTokens: 500 })
  const variants = Array.isArray(result?.data?.variants)
    ? result.data.variants.filter((v) => typeof v === 'string' && v.trim())
    : []
  if (!variants.length) {
    return NextResponse.json({ inserted: 0, note: 'AI returned no variants' }, { status: 200 })
  }

  // Dedupe against what already exists for this slot (the unique index is on an
  // md5() expression PostgREST can't target via onConflict, so we filter here).
  const { data: existingAll } = await admin
    .from('cro9_copy_variants').select('content').eq('site_slug', site).eq('slot', slot)
  const seen = new Set((existingAll || []).map((r) => (r.content || '').trim()))
  const fresh = [...new Set(variants.map((v) => v.trim()))].filter((v) => v && !seen.has(v))
  if (!fresh.length) {
    return NextResponse.json({ inserted: 0, note: 'all generated variants already existed' }, { status: 200 })
  }

  const rows = fresh.map((content) => ({ site_slug: site, slot, content, is_ai_generated: true, active: true }))
  const { data: ins, error } = await admin
    .from('cro9_copy_variants').insert(rows).select('id, content')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: ins?.length ?? 0, variants: ins }, { status: 200 })
}
