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
export const maxDuration = 120

const TEST_LOCATION_ID = 'nphConTwfHcVE1oA0uep'

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
    crmLessonIds: number
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
  const lessonCount = Math.max(3, Math.min(5, Number(url.searchParams.get('lessons')) || 3))
  const learningOutcome =
    url.searchParams.get('outcome') ||
    'Send 50 cold emails per week with a measurable 15%+ reply rate'

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
      locationId: TEST_LOCATION_ID,
      course,
      priceCents: 0,
      currency: 'USD',
    })
    durations.publish_ms = Date.now() - tp
    if (!publish.ok) {
      errors.push(`publish: ${publish.error}`)
      report.errors = errors
      report.durations_ms.total_ms = Date.now() - t0
      return NextResponse.json(report, { status: 500 })
    }
    report.publish = {
      method: publish.method,
      crmCourseId: publish.crmCourseId,
      crmLessonIds: publish.crmLessonIds.length,
      enrollmentUrl: publish.enrollmentUrl,
    }
  } catch (e) {
    errors.push(`publish-throw: ${(e as Error).message}`)
    report.errors = errors
    report.durations_ms.total_ms = Date.now() - t0
    return NextResponse.json(report, { status: 500 })
  }

  // 4 — read back from CRM
  try {
    report.step = 'readback'
    const tr = Date.now()
    const res = await crmGet(`/courses/${publish.crmCourseId}`, TEST_LOCATION_ID)
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      report.readback = { error: `${res.status}: ${txt.slice(0, 200)}` }
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
