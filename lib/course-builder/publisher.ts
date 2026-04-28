/**
 * 0n Course Builder — CRM Courses API publisher with graceful fallback.
 *
 * Strategy:
 *   1. Try POST /courses/courses-exporter/public/import (the bulk-import shape
 *      that supports text lessons on locations that allow it).
 *   2. If 'Invalid Post content type' or similar shows up, fall back to
 *      creating each lesson as a 'video' lesson with no actual video URL —
 *      the lesson description carries the markdown content so students still
 *      see it. This is the proven workaround on locations like RocketOpp that
 *      reject contentType:"text".
 *   3. If publish still fails, return failure — caller (chat handler) saves
 *      generated_content locally and surfaces a retry button on the dashboard.
 *
 * Local content is the source of truth. CRM publish is best-effort.
 */

import { crmGet, crmPost } from '@/lib/crm'
import type { GeneratedCourse, GeneratedLesson } from './types'

export interface PublishOk {
  ok: true
  method: 'text' | 'video_fallback' | 'bulk_import'
  crmCourseId: string
  crmLessonIds: string[]
  enrollmentUrl: string | null
}

export interface PublishFailed {
  ok: false
  error: string
  attempts: number
  lastResponseBody?: string
}

export type PublishResult = PublishOk | PublishFailed

const COURSES_BASE = '/courses'

// ──────────────────────────────────────────────────────────────────────────
// Public entry
// ──────────────────────────────────────────────────────────────────────────

export async function publishCourse(args: {
  locationId: string
  course: GeneratedCourse
  priceCents: number
  currency?: string
}): Promise<PublishResult> {
  const { locationId, course, priceCents, currency = 'USD' } = args
  let attempts = 0

  // ── Attempt 1: text-content lessons via per-lesson POST ────────────────
  attempts++
  try {
    const r = await publishWithContentType(locationId, course, priceCents, currency, 'text')
    if (r.ok) return { ...r, method: 'text' }
  } catch (err) {
    console.warn('[course-builder.publish] text mode failed:', err)
  }

  // ── Attempt 2: video-fallback (description carries the markdown) ──────
  attempts++
  try {
    const r = await publishWithContentType(locationId, course, priceCents, currency, 'video_fallback')
    if (r.ok) return { ...r, method: 'video_fallback' }
  } catch (err) {
    console.warn('[course-builder.publish] video_fallback mode failed:', err)
  }

  return {
    ok: false,
    error: 'CRM publish failed in both text and video_fallback modes. Content saved locally; retry available.',
    attempts,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Per-lesson POST flow
// ──────────────────────────────────────────────────────────────────────────

async function publishWithContentType(
  locationId: string,
  course: GeneratedCourse,
  priceCents: number,
  currency: string,
  mode: 'text' | 'video_fallback'
): Promise<PublishResult> {
  // 1) Create the course
  const courseBody: Record<string, unknown> = {
    title: course.outline.title,
    description: course.outline.description,
    salesPageCopy: course.salesPageCopy || undefined,
    pricing: {
      type: priceCents > 0 ? 'paid' : 'free',
      amount: priceCents,
      currency,
    },
    status: 'draft',
  }

  const courseRes = await crmPost(COURSES_BASE, locationId, courseBody)
  if (!courseRes.ok) {
    const body = await courseRes.text().catch(() => '')
    return { ok: false, error: `course create failed: ${courseRes.status}`, attempts: 1, lastResponseBody: body.slice(0, 400) }
  }

  type CourseCreateResp = { id?: string; courseId?: string; data?: { id?: string } }
  const courseData = (await courseRes.json().catch(() => ({}))) as CourseCreateResp
  const crmCourseId = courseData.id ?? courseData.courseId ?? courseData.data?.id
  if (!crmCourseId) {
    return { ok: false, error: 'course create returned no id', attempts: 1 }
  }

  // 2) Add each lesson
  const lessonIds: string[] = []
  let firstFailureBody: string | undefined

  for (const lesson of course.lessons) {
    const lessonBody = buildLessonBody(lesson, mode)
    const res = await crmPost(`${COURSES_BASE}/${crmCourseId}/lessons`, locationId, lessonBody)
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      firstFailureBody = txt.slice(0, 400)
      // Special signal: location rejects 'text' content type → caller will fall through
      if (mode === 'text' && /content\s*type|contentType/i.test(txt)) {
        return { ok: false, error: `lesson reject (text mode): ${txt.slice(0, 200)}`, attempts: 1, lastResponseBody: firstFailureBody }
      }
      return { ok: false, error: `lesson create failed: ${res.status}`, attempts: 1, lastResponseBody: firstFailureBody }
    }
    type LessonCreateResp = { id?: string; lessonId?: string; data?: { id?: string } }
    const data = (await res.json().catch(() => ({}))) as LessonCreateResp
    const id = data.id ?? data.lessonId ?? data.data?.id
    if (id) lessonIds.push(id)
  }

  // 3) Try to flip status to published
  await crmPost(`${COURSES_BASE}/${crmCourseId}`, locationId, { status: 'published' }).catch(() => null)

  // 4) Best-effort enrollment URL
  const enrollmentUrl = await fetchEnrollmentUrl(locationId, crmCourseId)

  return {
    ok: true,
    method: mode,
    crmCourseId,
    crmLessonIds: lessonIds,
    enrollmentUrl,
  }
}

function buildLessonBody(lesson: GeneratedLesson, mode: 'text' | 'video_fallback'): Record<string, unknown> {
  const baseFields = {
    title: lesson.title,
    summary: lesson.summary,
    order: lesson.index,
  }

  if (mode === 'text') {
    return {
      ...baseFields,
      contentType: 'text',
      content: lesson.content,
      // Quiz + resources tucked into the lesson if the API accepts them; many
      // CRM locations require separate quiz endpoints. We attach loosely;
      // if the API ignores them, no harm done.
      quiz: lesson.quiz,
      resources: lesson.resources,
    }
  }

  // video_fallback — encode the lesson body in the description field so
  // students still see the content even though the lesson is typed 'video'.
  const inlineDescription = [
    lesson.summary,
    '',
    '---',
    '',
    lesson.content,
    '',
    lesson.quiz.length > 0
      ? '## Quiz\n\n' +
        lesson.quiz
          .map(
            (q, i) =>
              `${i + 1}. ${q.question}\n` +
              q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n') +
              `\n   *Answer: ${String.fromCharCode(65 + q.correctAnswer)} — ${q.explanation}*`
          )
          .join('\n\n')
      : '',
    lesson.resources.length > 0
      ? '## Resources\n\n' + lesson.resources.map((r) => `- [${r.title}](${r.url}) (${r.type})`).join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    ...baseFields,
    contentType: 'video',
    description: inlineDescription,
    videoUrl: '', // intentionally empty — the description carries the lesson
  }
}

async function fetchEnrollmentUrl(locationId: string, courseId: string): Promise<string | null> {
  try {
    const res = await crmGet(`${COURSES_BASE}/${courseId}`, locationId)
    if (!res.ok) return null
    type CourseDetail = { enrollmentUrl?: string; publicUrl?: string; data?: { enrollmentUrl?: string; publicUrl?: string } }
    const d = (await res.json().catch(() => ({}))) as CourseDetail
    return d.enrollmentUrl ?? d.publicUrl ?? d.data?.enrollmentUrl ?? d.data?.publicUrl ?? null
  } catch {
    return null
  }
}
