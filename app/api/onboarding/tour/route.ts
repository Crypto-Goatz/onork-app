/**
 * POST /api/onboarding/tour — record how a user left the welcome tour.
 *
 * Writes into the EXISTING `onboarding_events` table rather than a new
 * tour-specific one. A second onboarding store would immediately disagree with
 * the first about who completed what.
 *
 * "Completed" vs "skipped" is the number that matters here: skipping is where
 * a user declines the AI key, and that population is exactly who later hits
 * the shared allowance and cannot explain why.
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tour?: string; outcome?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tour = (body.tour || '').trim()
  const outcome = (body.outcome || '').trim()
  if (!tour || !['completed', 'skipped'].includes(outcome)) {
    return NextResponse.json({ error: 'tour and outcome (completed|skipped) required' }, { status: 400 })
  }

  const { error } = await supabase.from('onboarding_events').insert({
    user_id: user.id,
    step: tour,
    event_type: outcome,
    metadata: { surface: 'welcome-tour' },
  })

  // Report the platform's own words. A generic 500 here would make an RLS
  // problem indistinguishable from a network blip for whoever debugs it next.
  if (error) {
    console.error('[tour] could not record outcome:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
