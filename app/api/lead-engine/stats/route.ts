import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

/**
 * GET /api/lead-engine/stats — what the lead engine has actually caught.
 *
 * COUNTS THE OUTCOMES SEPARATELY, because they mean different things and a
 * single "leads found" number hides the one that matters. A duplicate is the
 * engine working correctly; a contact-only is an opportunity that never landed
 * and needs looking at. Rolling them together would make a broken pipeline
 * stage look like success.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data, error } = await sb
    .from('lead_engine_seen')
    .select('business, crm_contact_id, source_url, outcome, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: 'Could not read the lead engine.' }, { status: 500 })

  const rows = data ?? []
  const since = (h: number) => rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < h * 3600_000).length
  const by = (o: string) => rows.filter((r) => r.outcome === o).length

  // Every created lead is a $1,085 opportunity, per the engine's own rule.
  const created = by('created')

  return NextResponse.json({
    ok: true,
    totals: {
      captured: rows.length,
      created,
      duplicates: by('already-in-crm'),
      contactOnly: by('contact-only'),
      pipelineValue: created * 1085,
    },
    today: since(24),
    thisWeek: since(24 * 7),
    recent: rows.slice(0, 25),
    // A engine that has stopped is invisible unless the age is stated.
    lastCapture: rows[0]?.created_at ?? null,
  })
}
