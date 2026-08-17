/**
 * The course builder API — outline, generate, publish.
 *
 * WHY THIS EXISTS ALONGSIDE /api/courses/*. There are two course systems. The
 * older one generates titles and nothing else, and it is the one the pretty
 * page was wired to. This one — lib/course-builder — generates full lesson
 * markdown with quizzes and resources via a parallel radial burst, retries the
 * lessons that fail, and publishes with a bulk-import path plus a per-lesson
 * fallback. Only the second is worth having a UI.
 *
 * THREE STEPS, NOT ONE CALL. Outlining is fast and cheap; generating a whole
 * course is neither. Splitting them means someone approves the shape before
 * paying for the writing, and a bad outline costs seconds instead of minutes.
 *
 *   POST ?step=outline    → config → outline
 *   POST ?step=generate   → config + outline → full course
 *   POST ?step=publish    → course + client → live in their CRM
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import type { CourseConfig, CourseOutline, GeneratedCourse } from '@/lib/course-builder/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function cfg(raw: unknown): CourseConfig | null {
  const c = raw as Partial<CourseConfig> | undefined
  if (!c?.topic || !c?.audience) return null
  return {
    topic: String(c.topic).slice(0, 300),
    audience: String(c.audience).slice(0, 300),
    lessonCount: Math.min(Math.max(Number(c.lessonCount) || 5, 1), 20),
    includeQuizzes: c.includeQuizzes !== false,
    learningOutcome: String(c.learningOutcome ?? '').slice(0, 500),
    tone: String(c.tone ?? 'professional').slice(0, 40),
  }
}

export async function POST(req: NextRequest) {
  /**
   * TWO WAYS IN, because there are two kinds of user.
   *
   * An agency signed into app.0ncore.com carries a Supabase session. Someone who
   * installed this from the marketplace has no account here at all — their
   * identity arrives through the SSO handshake as a short-lived app JWT. This
   * route previously accepted only the first, so every marketplace install would
   * have met a 401 on its first click and looked broken on the day it was
   * reviewed.
   */
  const session = verifyAppJwt(bearer(req))
  let signedIn = session.ok
  if (!signedIn) {
    const supabase = await createClient()
    signedIn = Boolean((await supabase.auth.getSession()).data.session?.user)
  }
  if (!signedIn) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const step = req.nextUrl.searchParams.get('step') || 'outline'
  const body = await req.json().catch(() => ({}))

  try {
    if (step === 'outline') {
      const config = cfg(body?.config)
      if (!config) return NextResponse.json({ error: 'A topic and an audience are required.' }, { status: 400 })
      const { generateOutline } = await import('@/lib/course-builder/generator')
      return NextResponse.json({ outline: await generateOutline(config) })
    }

    if (step === 'generate') {
      const config = cfg(body?.config)
      const outline = body?.outline as CourseOutline | undefined
      if (!config || !outline?.lessons?.length) {
        return NextResponse.json({ error: 'Outline the course first.' }, { status: 400 })
      }
      const { generateFullCourse } = await import('@/lib/course-builder/generator')
      const { course, failures } = await generateFullCourse(config, outline)
      // Failures are REPORTED, not hidden. A course quietly missing lesson 4 is
      // worse than one that says lesson 4 needs another go.
      return NextResponse.json({ course, failures })
    }

    if (step === 'publish') {
      const course = body?.course as GeneratedCourse | undefined
      const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() : ''
      const priceCents = Math.max(0, Number(body?.priceCents) || 0)
      if (!course?.lessons?.length) return NextResponse.json({ error: 'Generate the course first.' }, { status: 400 })
      if (!locationId) return NextResponse.json({ error: 'Choose which client to publish to.' }, { status: 400 })

      /**
       * TWO WAYS TO BE CONNECTED, and this used to accept only one.
       *
       * The gate checked `location_connections` — the table an AGENCY writes
       * when it pastes a client key. That is correct for an operator using
       * 0nCORE, and completely wrong for the audience this app is being
       * submitted to: someone who installed 0n Course Builder from the
       * marketplace has an OAuth token in `crm_installations` and no agency
       * behind them at all. They would generate a whole course and then be told
       * "add its key in Clients first" — an instruction referring to a screen
       * they have never seen and cannot reach.
       *
       * A marketplace install IS a connection. getAuthForLocation already knows
       * that and reads both stores; the gate simply had not caught up.
       */
      const db = createServiceClient()
      if (db) {
        const [agencyKey, install] = await Promise.all([
          db.from('location_connections')
            .select('location_id').eq('location_id', locationId).eq('status', 'active').maybeSingle(),
          db.from('crm_installations')
            .select('location_id').eq('location_id', locationId).eq('status', 'active').maybeSingle(),
        ])
        if (!agencyKey.data && !install.data) {
          return NextResponse.json(
            {
              error:
                'This account is not connected yet. Install 0n Course Builder into it from the app marketplace, ' +
                'or if you are an agency, add the client key under Clients.',
            },
            { status: 400 },
          )
        }
      }

      const { publishCourse } = await import('@/lib/course-builder/publisher')
      const r = await publishCourse({ locationId, course, priceCents })
      if (!r.ok) {
        return NextResponse.json({ error: r.error || 'Could not publish the course.' }, { status: 502 })
      }
      return NextResponse.json({ ok: true, method: r.method, crmCourseId: r.crmCourseId, lessons: r.crmLessonIds?.length ?? 0 })
    }

    return NextResponse.json({ error: 'Unknown step.' }, { status: 400 })
  } catch (err) {
    console.error(`[crm/courses:${step}]`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong.' },
      { status: 500 },
    )
  }
}
