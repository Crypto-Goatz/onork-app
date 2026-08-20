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
       * CONNECTED MEANS "WE CAN GET A CREDENTIAL" — nothing else.
       *
       * This gate used to ask a DIFFERENT question than the thing it guards.
       * It read two tables directly — `location_connections` (a pasted agency
       * key) and a `crm_installations` row whose `location_id` equals this
       * account — and rejected everything else. But a marketplace install of
       * this app comes back COMPANY-scoped: ONE row, `location_id = ''`,
       * covering every sub-account in the agency. None of those sub-accounts
       * has a row of its own, so all 49 publishable workspaces the picker
       * offers failed a gate that was looking for a row they will never have.
       *
       * Measured 2026-08-20 (Dex, live session): both a bulk-installed account
       * (OCq0PTnwBUJLyBZlEv2b) and one installed that same night
       * (mike — 0nCore) hit "not connected yet", while /api/hub/workspaces
       * marked both canPublish. Picker says yes, publish says no — the exact
       * split the resolver exists to prevent, one layer down.
       *
       * getAuthForLocation is the ONE place that answers this correctly, and
       * publishCourse already calls it: pasted key → location install →
       * MINT a location token from the Company-level agency install
       * (POST /oauth/locationToken, verified 201) → env PIT. So the gate now
       * asks it rather than re-deriving a narrower answer from two tables.
       * The mint result is cached into crm_installations by
       * ensureLocationInstall, so publishCourse's own resolve is a cache hit —
       * this costs no extra mint.
       *
       * And when it genuinely cannot resolve, the resolver's own instruction
       * names THIS account and the fix, instead of a generic banner telling a
       * marketplace user to visit a Clients screen they cannot reach.
       */
      const { getAuthForLocation } = await import('@/lib/crm')
      const auth = await getAuthForLocation(locationId)
      if (!auth.token) {
        return NextResponse.json(
          {
            error:
              auth.unresolved ||
              'This account is not connected yet. Install 0n Course Builder into it from the app marketplace, ' +
              'or if you are an agency, add the client key under Clients.',
          },
          { status: 400 },
        )
      }

      const { publishCourse } = await import('@/lib/course-builder/publisher')
      const r = await publishCourse({ locationId, course, priceCents })
      if (!r.ok) {
        return NextResponse.json({ error: r.error || 'Could not publish the course.' }, { status: 502 })
      }
      /**
       * `lessons` is what we SENT, not the ids the CRM echoed — because on the
       * bulk path it echoes none. Verified live 2026-08-20: the importer
       * answers 201 `{ message, note, processingCourses:[{id,title,url}] }`
       * with no per-post ids, so `crmLessonIds.length` was structurally 0 and
       * a five-lesson publish reported "0 lessons are now in your course area."
       */
      return NextResponse.json({
        ok: true,
        method: r.method,
        crmCourseId: r.crmCourseId,
        lessons: r.lessonsPublished,
        pending: r.pending,
        enrollmentUrl: r.enrollmentUrl,
      })
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
