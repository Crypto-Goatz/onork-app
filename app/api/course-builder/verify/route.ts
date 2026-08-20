/**
 * GET /api/course-builder/verify
 *
 * End-to-end verification endpoint for the marketplace submission. Runs the
 * full pipeline against the test location nphConTwfHcVE1oA0uep:
 *   1. generateOutline()    — real Groq call
 *   2. generateFullCourse() — outline + lessons + quizzes + resources +
 *                              sales page (Radial Burst)
 *   3. publishCourse()      — bulk import into the CRM sub-location
 *   4. crmGet               — read the course back, count modules + lessons
 *   5. Return a structured report
 *
 * Gated by a CRON_SECRET so this isn't publicly callable. Used by the
 * scheduled verification agent + ad-hoc admin checks.
 *
 * Query: ?topic=&audience=&lessons=3
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateOutline, generateFullCourse } from '@/lib/course-builder/generator'
import { publishCourse } from '@/lib/course-builder/publisher'
import { crmGet } from '@/lib/crm'
import type { CourseConfig } from '@/lib/course-builder/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // course gen + sales page + publish + readback can take 2-3 minutes

const DEFAULT_targetLocationId = 'nphConTwfHcVE1oA0uep'

// Allow-list — narrow to family locations Mike controls so this endpoint
// can never become a course-spammer if the secret leaks.
const ALLOWED_LOCATIONS = new Set<string>([
  'nphConTwfHcVE1oA0uep', // 0nCore (marketing sub)
  '6MSqx0trfxgLxeHBJE1k', // RocketOpp (agency master)
  'AeY8M0GNOuJPNkLQ7AAC', // In2sight LLC
  'Ev1Bzj84a2vljzCkfBEM', // 0nMCP
  'F76MNKOMQCMruMrumtdf', // client
])

interface VerifyReport {
  ok: boolean
  step: string
  durations_ms: Record<string, number>
  outline?: { title: string; lessonCount: number }
  course?: {
    title: string
    lessonCount: number
    totalWords: number
    estimatedDuration: string
    quizQuestionCount: number
    resourceCount: number
    salesPageBytes: number
  }
  publish?: {
    method: string
    crmCourseId: string
    /** Ids the CRM echoed. Structurally 0 on the bulk path — see lessonsPublished. */
    crmLessonIds: number
    /** Lessons actually sent in the payload — the number worth reporting. */
    lessonsPublished: number
    pending: boolean
    enrollmentUrl: string | null
  }
  readback?: {
    title?: string
    description_bytes?: number
    visible_lessons?: number
    error?: string
  }
  errors?: string[]
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)

  // Auth — admin-session OR a CRON_SECRET in the bearer or query
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    url.searchParams.get('secret') ||
    ''
  const expected = process.env.CRON_SECRET || ''
  if (!expected || provided !== expected) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized' } },
      { status: 401 },
    )
  }

  const topic = url.searchParams.get('topic') || 'How to write cold emails that get replies'
  const audience = url.searchParams.get('audience') || 'B2B SaaS founders doing their own outbound'
  const lessonCount = Math.max(3, Math.min(8, Number(url.searchParams.get('lessons')) || 3))
  const learningOutcome =
    url.searchParams.get('outcome') ||
    'Send 50 cold emails per week with a measurable 15%+ reply rate'

  // Allow targeting any allow-listed family location with custom pricing.
  const requestedLocation =
    url.searchParams.get('location') || DEFAULT_targetLocationId
  if (!ALLOWED_LOCATIONS.has(requestedLocation)) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'location_not_allowed', message: 'location must be a 0n family sub-account' },
      },
      { status: 400 },
    )
  }
  const targetLocationId = requestedLocation
  const priceCents = Math.max(0, Math.min(99900, Number(url.searchParams.get('price')) || 0))

  const config: CourseConfig = {
    topic,
    audience,
    lessonCount,
    includeQuizzes: true,
    learningOutcome,
    tone: 'professional',
  }

  const t0 = Date.now()
  const durations: Record<string, number> = {}
  const errors: string[] = []
  const report: VerifyReport = {
    ok: false,
    step: 'starting',
    durations_ms: durations,
  }

  // 1 — outline
  let outline
  try {
    report.step = 'outlining'
    const to = Date.now()
    outline = await generateOutline(config)
    durations.outline_ms = Date.now() - to
    report.outline = { title: outline.title, lessonCount: outline.lessons.length }
  } catch (e) {
    errors.push(`outline: ${(e as Error).message}`)
    report.errors = errors
    report.durations_ms.total_ms = Date.now() - t0
    return NextResponse.json(report, { status: 500 })
  }

  // 2 — full course (lessons + quizzes + resources + sales page)
  let course
  try {
    report.step = 'generating'
    const tg = Date.now()
    const result = await generateFullCourse(config, outline)
    course = result.course
    durations.generate_ms = Date.now() - tg
    if (result.failures.length) {
      errors.push(
        `lesson failures: ${result.failures.map((f) => f.lessonIndex).join(',')}`,
      )
    }
    report.course = {
      title: course.outline.title,
      lessonCount: course.lessons.length,
      totalWords: course.totalWordCount,
      estimatedDuration: course.estimatedDuration,
      quizQuestionCount: course.lessons.reduce((s, l) => s + (l.quiz?.length ?? 0), 0),
      resourceCount: course.lessons.reduce((s, l) => s + (l.resources?.length ?? 0), 0),
      salesPageBytes: (course.salesPageCopy ?? '').length,
    }
  } catch (e) {
    errors.push(`generate: ${(e as Error).message}`)
    report.errors = errors
    report.durations_ms.total_ms = Date.now() - t0
    return NextResponse.json(report, { status: 500 })
  }

  // 3 — publish
  let publish
  try {
    report.step = 'publishing'
    const tp = Date.now()
    publish = await publishCourse({
      locationId: targetLocationId,
      course,
      priceCents,
      currency: 'USD',
    })
    durations.publish_ms = Date.now() - tp
    if (!publish.ok) {
      errors.push(`publish: ${publish.error}`)
      if (publish.lastResponseBody) {
        errors.push(`publish-body: ${publish.lastResponseBody.slice(0, 600)}`)
      }
      report.errors = errors
      report.durations_ms.total_ms = Date.now() - t0
      return NextResponse.json(report, { status: 500 })
    }
    report.publish = {
      method: publish.method,
      crmCourseId: publish.crmCourseId,
      crmLessonIds: publish.crmLessonIds.length,
      lessonsPublished: publish.lessonsPublished,
      pending: publish.pending,
      enrollmentUrl: publish.enrollmentUrl,
    }
  } catch (e) {
    errors.push(`publish-throw: ${(e as Error).message}`)
    report.errors = errors
    report.durations_ms.total_ms = Date.now() - t0
    return NextResponse.json(report, { status: 500 })
  }

  /**
   * 4 — read back from CRM. THIS STEP CANNOT PASS TODAY, and that is the API's
   * doing, not ours.
   *
   * Probed live 2026-08-20 with a valid location token carrying courses.readonly
   * (and again with a location PIT): GET /courses/{id}, GET /courses,
   * /courses/products, /courses/courses-exporter[/public][/export] and
   * /memberships/* all answer 404 "Cannot GET …" — route-not-found, not a
   * permission refusal. The official @gohighlevel/api-client Courses service
   * ships exactly one method, importCourses. There is no public read surface
   * for courses or memberships, so lesson counts can only be confirmed in the
   * platform UI. The step stays because the day a read endpoint appears, this
   * turns green on its own — but its error must name the cause, or the next
   * reader burns an hour on auth for a route that does not exist.
   */
  try {
    report.step = 'readback'
    const tr = Date.now()
    const res = await crmGet(`/courses/${publish.crmCourseId}`, targetLocationId)
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      report.readback = {
        error:
          res.status === 404
            ? `${res.status}: no public course read endpoint exists (verified 2026-08-20) — confirm lessons in Memberships → Courses. Body: ${txt.slice(0, 160)}`
            : `${res.status}: ${txt.slice(0, 200)}`,
      }
    } else {
      type CourseDetail = {
        title?: string
        description?: string
        categories?: Array<{ posts?: unknown[] }>
        data?: { title?: string; description?: string; categories?: Array<{ posts?: unknown[] }> }
      }
      const d = (await res.json().catch(() => ({}))) as CourseDetail
      const root = d.data ?? d
      const visibleLessons = (root.categories ?? []).reduce(
        (s, c) => s + (c.posts?.length ?? 0),
        0,
      )
      report.readback = {
        title: root.title,
        description_bytes: (root.description ?? '').length,
        visible_lessons: visibleLessons,
      }
    }
    durations.readback_ms = Date.now() - tr
  } catch (e) {
    report.readback = { error: `readback-throw: ${(e as Error).message}` }
  }

  durations.total_ms = Date.now() - t0
  report.ok = true
  report.step = 'complete'
  if (errors.length) report.errors = errors
  return NextResponse.json(report)
}
