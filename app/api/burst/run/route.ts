import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { verifyPlan } from '@/lib/burst/plan-token'
import { executeLeg, type LegResult } from '@/lib/burst/executor'
import { listAgencyLocations } from '@/lib/crm/locations'
import { fireTrigger } from '@/lib/crm/triggers'
import { reportApiUsage } from '@/lib/usage'

/**
 * POST /api/burst/run — execute an approved plan.
 *
 * THE ONLY ROUTE THAT WRITES TO A CLIENT ACCOUNT, and it will not move without
 * all four of these:
 *
 *   a valid session      — companyId comes from the signed JWT, never the body
 *   a signed plan        — the exact legs that were shown and approved
 *   a matching agency    — the plan's companyId must equal the session's
 *   a fresh plan id      — the unique index on burst_runs.plan_id means the
 *                          same approval cannot run twice, even if the request
 *                          is replayed or the button is double-clicked
 *
 * RECEIPTS ARE WRITTEN BEFORE THE CALL, not after. A receipt created from a
 * response cannot record the calls that never came back — a timeout mid-write
 * would leave a client account changed and nothing on our side saying so. Rows
 * start 'pending' and are settled afterwards, so a stuck 'pending' is itself the
 * signal that something went out and we lost the answer.
 *
 * LEGS RUN IN SEQUENCE. Parallelism here would multiply the blast radius of a
 * bad plan and make the receipt order meaningless.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) {
    return NextResponse.json({ error: 'Open 0nCORE from inside your CRM to run a plan.' }, { status: 401 })
  }
  const { companyId, sub: crmUserId } = session.claims

  const body = await req.json().catch(() => ({}))
  const verdict = verifyPlan(typeof body?.planToken === 'string' ? body.planToken : null, companyId)
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.error }, { status: 400 })
  }
  const plan = verdict.plan

  const sb = admin()

  // Claim the plan id first. If this insert loses to a duplicate key, the plan
  // has already been run and we stop here rather than doing the work twice.
  const { data: run, error: claimErr } = await sb
    .from('burst_runs')
    .insert({
      company_id: companyId,
      crm_user_id: crmUserId,
      command: plan.command?.slice(0, 500) ?? null,
      plan_id: plan.planId,
      leg_count: plan.legs.length,
      status: 'running',
    })
    .select('id')
    .single()

  if (claimErr || !run) {
    const duplicate = (claimErr?.code === '23505') || /duplicate key/i.test(claimErr?.message ?? '')
    if (duplicate) {
      return NextResponse.json({ error: 'This plan has already been run.' }, { status: 409 })
    }
    console.error('[burst/run] could not open a run:', claimErr)
    // Refusing to proceed without a run row is deliberate: work we cannot
    // record is work nobody can audit or reverse.
    return NextResponse.json({ error: 'Could not start the run. Nothing was changed.' }, { status: 500 })
  }

  // Names for the receipts. A failure here costs a label, not the run.
  const { locations } = await listAgencyLocations(companyId).catch(() => ({ locations: [] as { id: string; name: string }[] }))
  const nameFor = (id?: string) => locations.find((l) => l.id === id)?.name ?? null

  const results: (LegResult & { capability: string; location?: string | null; receiptId?: string })[] = []
  let okCount = 0, failedCount = 0, billedCents = 0

  for (const leg of plan.legs) {
    const locationName = nameFor(leg.locationId)

    const { data: receipt } = await sb
      .from('burst_receipts')
      .insert({
        run_id: run.id,
        company_id: companyId,
        location_id: leg.locationId ?? null,
        location_name: locationName,
        capability: leg.capability,
        intent: null,
        status: 'pending',
      })
      .select('id')
      .single()

    const result = await executeLeg({
      capability: leg.capability,
      locationId: leg.locationId,
      locationName: locationName ?? undefined,
      params: leg.params,
      companyId,
      // Written before the call, so the charge can key off it.
      receiptId: receipt?.id,
    })

    if (result.status === 'ok') okCount += 1
    else if (result.status === 'failed') failedCount += 1
    if (result.billed) billedCents += result.priceCents

    if (receipt?.id) {
      await sb
        .from('burst_receipts')
        .update({
          status: result.status,
          detail: result.detail?.slice(0, 1000) ?? null,
          error: result.error?.slice(0, 500) ?? null,
          targets: result.targets,
          price_cents: result.priceCents,
          billed: result.billed,
          settled_at: new Date().toISOString(),
        })
        .eq('id', receipt.id)
    }

    results.push({ ...result, capability: leg.capability, location: locationName, receiptId: receipt?.id })

    // T1 — let the agency's own native workflow react to what we just did.
    // Deliberately not awaited: a burst must not wait on, or fail because of, a
    // notification about work that has already happened.
    if (result.status === 'ok' && leg.locationId) {
      void fireTrigger({
        trigger: 'oncore_burst_completed',
        locationId: leg.locationId,
        companyId,
        data: { capability: leg.capability, detail: result.detail.slice(0, 200), targets: result.targets },
      })
    }
  }

  const status = failedCount === 0 ? 'complete' : okCount > 0 ? 'partial' : 'failed'
  await sb
    .from('burst_runs')
    .update({
      status,
      ok_count: okCount,
      failed_count: failedCount,
      billed_cents: billedCents,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id)

  // Meter usage — each successful action is one billable API call ($0.01).
  // Fire-and-forget: a metering failure must never affect the run's response.
  void reportApiUsage(companyId, okCount)

  return NextResponse.json({
    ok: true,
    runId: run.id,
    status,
    okCount,
    failedCount,
    billedCents,
    results,
  })
}
