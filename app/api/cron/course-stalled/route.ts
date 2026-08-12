/**
 * GET /api/cron/course-stalled — fire oncore_student_stalled for quiet students.
 *
 * THE ONLY COURSE TRIGGER THAT FIRES WITHOUT THE STUDENT DOING ANYTHING, which
 * is precisely why it is the commercially useful one: completion tells an agency
 * something already went right, while silence is the state they can still act
 * on. A student who bought a course and stopped is a refund forming.
 *
 * FIRES ONCE PER STALL, NOT ONCE PER SWEEP. stalled_fired_at is stamped when the
 * trigger goes out and cleared by any real progress, so a student who goes quiet
 * for a month starts one automation rather than thirty. Re-enrolling or
 * completing a module clears it, so the same student can stall again later and
 * be caught again — which is the behaviour an agency actually wants.
 *
 * The threshold is a setting, not a literal: what counts as stalled differs
 * between a two-week onboarding course and a six-month certification.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { fireTrigger } from '@/lib/crm/triggers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_STALL_DAYS = 7
/** A sweep that tries to do everything at once is a sweep that times out. */
const BATCH = 200

export async function GET(req: NextRequest) {
  // Vercel Cron signs its calls; anything else needs the shared secret. Without
  // this the endpoint is a free way to spam an agency's automations.
  const secret = process.env.CRON_SECRET || ''
  const auth = req.headers.get('authorization') || ''
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron') ?? false
  if (secret && !isVercelCron && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Not authorised.' }, { status: 401 })
  }

  const db = createServiceClient()
  if (!db) return NextResponse.json({ ok: false, error: 'No database.' }, { status: 503 })

  const days = Number(process.env.COURSE_STALL_DAYS) || DEFAULT_STALL_DAYS
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

  const { data: stalled, error } = await db
    .from('crm_course_enrollments')
    .select('id, company_id, location_id, contact_id, course_id, last_activity_at')
    .eq('status', 'active')
    .lt('last_activity_at', cutoff)
    .is('stalled_fired_at', null)
    .limit(BATCH)

  if (error) {
    console.error('[cron/course-stalled] read failed:', error.message)
    return NextResponse.json({ ok: false, error: 'Could not read enrolments.' }, { status: 500 })
  }
  if (!stalled?.length) return NextResponse.json({ ok: true, checked: 0, fired: 0, stallDays: days })

  let fired = 0
  for (const e of stalled) {
    try {
      await fireTrigger({
        trigger: 'oncore_student_stalled',
        locationId: e.location_id,
        companyId: e.company_id,
        contactId: e.contact_id,
        data: {
          course_id: e.course_id,
          days_inactive: Math.floor((Date.now() - new Date(e.last_activity_at).getTime()) / 86_400_000),
        },
      })
      // Stamped only AFTER the trigger goes out. Stamping first would silence a
      // student whose automation never actually started.
      await db
        .from('crm_course_enrollments')
        .update({ stalled_fired_at: new Date().toISOString() })
        .eq('id', e.id)
      fired++
    } catch (err) {
      // One bad location must not stop the sweep for everyone else.
      console.error(`[cron/course-stalled] ${e.location_id}/${e.contact_id} failed:`, err)
    }
  }

  // Reported, not silent: BATCH is a cap, and a run that hits it has left work
  // behind. A sweep that quietly truncates reads as "nobody is stalled".
  if (stalled.length === BATCH) {
    console.warn(`[cron/course-stalled] hit the ${BATCH} cap — more enrolments are waiting for the next run.`)
  }

  return NextResponse.json({ ok: true, checked: stalled.length, fired, stallDays: days, capped: stalled.length === BATCH })
}
