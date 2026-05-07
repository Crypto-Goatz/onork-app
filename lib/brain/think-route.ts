/**
 * Shared `/think` route helper. Every AI add-on uses this — the brain loop
 * is identical, only the executor differs.
 *
 * Usage in app/api/<slug>/think/route.ts:
 *
 *   export const runtime = 'nodejs'
 *   export const dynamic = 'force-dynamic'
 *   export const maxDuration = 60
 *
 *   export async function POST(req: NextRequest) {
 *     return handleThink(req, {
 *       slug: 'service_packager',
 *       execute: async (decision, body, userId) => {
 *         // call existing handlers / libs based on decision.tool
 *       },
 *     })
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { think, record, type Decision } from '@/lib/brain'

interface ThinkConfig {
  slug: string
  /**
   * Run the chosen tool. Return { output, success }. Output is stored in
   * brain_outcomes; success drives the running confidence per tool.
   */
  execute: (
    decision: Decision,
    body: Record<string, unknown>,
    userId: string
  ) => Promise<{ output: Record<string, unknown>; success: boolean }>
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function handleThink(req: NextRequest, cfg: ThinkConfig) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // Optional feedback on the previous outcome
  const feedback = body.feedback as string | undefined
  const previousOutcomeId = body.previous_outcome_id as string | undefined
  if (feedback && previousOutcomeId) {
    await admin()
      .from('brain_outcomes')
      .update({ user_feedback: feedback })
      .eq('id', previousOutcomeId)
      .eq('user_id', user.id)
  }

  const input = (body.input as string | undefined)?.trim()
  if (!input) return NextResponse.json({ error: 'input required' }, { status: 400 })

  const start = Date.now()

  let decision: Decision
  try {
    const out = await think(user.id, cfg.slug, input)
    decision = out.decision
  } catch (err) {
    return NextResponse.json(
      { error: `think failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }

  // Execute the chosen tool
  let output: Record<string, unknown> = {}
  let success = false
  try {
    const result = await cfg.execute(decision, body, user.id)
    output = result.output
    success = result.success
  } catch (err) {
    output = { error: err instanceof Error ? err.message : String(err) }
    success = false
  }

  // Close the loop — record the outcome
  await record({
    userId: user.id,
    appSlug: cfg.slug,
    action: decision.tool,
    input: { input },
    decision,
    output,
    success,
    durationMs: Date.now() - start,
  })

  // Return the outcome id so the client can attach feedback
  const { data: lastOutcome } = await admin()
    .from('brain_outcomes')
    .select('id')
    .eq('user_id', user.id)
    .eq('app_slug', cfg.slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    decision,
    output,
    success,
    outcome_id: lastOutcome?.id ?? null,
  })
}
