/**
 * 0n Course Builder — CRM Courses publisher.
 *
 * Strategy (rewritten 2026-05-02 — bulk-import first, per-lesson fallback):
 *   1. Bulk import via POST /courses/courses-exporter/public/import.
 *      One request, the whole course goes up: module > lesson groupings,
 *      lesson body, quiz + resources inlined into the lesson description
 *      (the CRM Courses LMS renders markdown). This is the path that
 *      reliably produces "fully complete content" inside the sub-location
 *      dashboard. Verified against location nphConTwfHcVE1oA0uep.
 *   2. If bulk import is rejected (older locations, scope mismatch), fall
 *      back to per-lesson POST flow with the same quiz+resource inlining.
 *   3. If both fail, return failure — caller (chat handler) saves
 *      generated_content locally and surfaces a retry button.
 *
 * Local content is the source of truth. Once publish succeeds, the CRM
 * sub-location is the system of record.
 */

import { crmGet, crmPost, getAuthForLocation } from '@/lib/crm'
import type {
  GeneratedCourse,
  GeneratedLesson,
  QuizQuestion,
  LessonResource,
} from './types'

export interface PublishOk {
  ok: true
  method: 'bulk_import' | 'per_lesson_text' | 'per_lesson_video'
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
const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

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
  let lastErrBody: string | undefined

  // ── Attempt 1: bulk-import (the proven, full-content path) ────────────
  attempts++
  try {
    const r = await publishViaBulkImport(locationId, course, priceCents, currency)
    if (r.ok) return r
    lastErrBody = r.lastResponseBody
    console.warn('[course-builder.publish] bulk_import failed:', r.error)
  } catch (err) {
    console.warn('[course-builder.publish] bulk_import threw:', err)
  }

  // ── Attempt 2: per-lesson text ─────────────────────────────────────────
  attempts++
  try {
    const r = await publishWithContentType(locationId, course, priceCents, currency, 'text')
    if (r.ok) return { ...r, method: 'per_lesson_text' }
    lastErrBody = r.lastResponseBody ?? lastErrBody
  } catch (err) {
    console.warn('[course-builder.publish] per_lesson_text threw:', err)
  }

  // ── Attempt 3: per-lesson video-fallback (description carries content) ─
  attempts++
  try {
    const r = await publishWithContentType(locationId, course, priceCents, currency, 'video_fallback')
    if (r.ok) return { ...r, method: 'per_lesson_video' }
    lastErrBody = r.lastResponseBody ?? lastErrBody
  } catch (err) {
    console.warn('[course-builder.publish] per_lesson_video threw:', err)
  }

  return {
    ok: false,
    error:
      'CRM publish failed in bulk-import, per-lesson-text, and per-lesson-video modes. ' +
      'Content saved locally; retry available.',
    attempts,
    lastResponseBody: lastErrBody,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Strategy 1 — Bulk import (single POST, full course, modules + lessons)
// ──────────────────────────────────────────────────────────────────────────

async function publishViaBulkImport(
  locationId: string,
  course: GeneratedCourse,
  priceCents: number,
  currency: string,
): Promise<PublishResult> {
  const auth = await getAuthForLocation(locationId)

  // Build the modules. v1 groups lessons into ONE "Course Content" module so
  // every published course has a clean module structure visible in the
  // dashboard sidebar. Sales-page copy gets its own intro module so it lands
  // as the first thing the student sees.
  const lessonsModule = {
    title: 'Course Content',
    visibility: 'published' as const,
    posts: course.lessons.map((lesson) => buildLessonPost(lesson)),
  }

  const introPost = course.salesPageCopy
    ? {
        title: 'About this course',
        visibility: 'published' as const,
        contentType: 'text' as const,
        description: course.salesPageCopy,
      }
    : null

  const introModule = introPost
    ? {
        title: 'Welcome',
        visibility: 'published' as const,
        posts: [introPost],
      }
    : null

  const modules = introModule ? [introModule, lessonsModule] : [lessonsModule]

  const payload = {
    locationId,
    products: [
      {
        title: course.outline.title,
        description: course.outline.description,
        instructorDetails: {
          name: '0n Course Builder',
          description: 'AI-generated by the 0n Course Builder app.',
        },
        // Pricing on the import endpoint isn't always honored on every
        // location — we re-apply it in attempt-2 fallback if needed.
        categories: modules,
      },
    ],
  }

  const res = await fetch(`${CRM_BASE}/courses/courses-exporter/public/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Version: CRM_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    return {
      ok: false,
      error: `bulk import failed: ${res.status}`,
      attempts: 1,
      lastResponseBody: txt.slice(0, 600),
    }
  }

  // The bulk endpoint returns a top-level course id, sometimes nested.
  type BulkResp = {
    id?: string
    course?: { id?: string }
    products?: Array<{ id?: string; courseId?: string; categories?: Array<{ posts?: Array<{ id?: string }> }> }>
    data?: { id?: string }
  }
  const data = (await res.json().catch(() => ({}))) as BulkResp
  const crmCourseId =
    data.id ??
    data.course?.id ??
    data.products?.[0]?.id ??
    data.products?.[0]?.courseId ??
    data.data?.id

  if (!crmCourseId) {
    return {
      ok: false,
      error: 'bulk import returned no course id',
      attempts: 1,
      lastResponseBody: JSON.stringify(data).slice(0, 600),
    }
  }

  // Best-effort: collect lesson ids from the response shape if present
  const crmLessonIds: string[] = []
  for (const cat of data.products?.[0]?.categories ?? []) {
    for (const post of cat.posts ?? []) {
      if (post?.id) crmLessonIds.push(post.id)
    }
  }

  // Best-effort: apply pricing (the importer doesn't accept pricing yet on
  // many locations, so we PATCH after the fact).
  if (priceCents > 0) {
    try {
      await crmPost(`${COURSES_BASE}/${crmCourseId}`, locationId, {
        pricing: { type: 'paid', amount: priceCents, currency },
      })
    } catch {
      // non-fatal — admin can adjust price in the CRM dashboard
    }
  }

  // Best-effort: enrollment URL
  const enrollmentUrl = await fetchEnrollmentUrl(locationId, crmCourseId)

  return {
    ok: true,
    method: 'bulk_import',
    crmCourseId,
    crmLessonIds,
    enrollmentUrl,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Strategy 2 + 3 — per-lesson POST flow
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
    return {
      ok: false,
      error: `course create failed: ${courseRes.status}`,
      attempts: 1,
      lastResponseBody: body.slice(0, 600),
    }
  }

  type CourseCreateResp = { id?: string; courseId?: string; data?: { id?: string } }
  const courseData = (await courseRes.json().catch(() => ({}))) as CourseCreateResp
  const crmCourseId = courseData.id ?? courseData.courseId ?? courseData.data?.id
  if (!crmCourseId) {
    return { ok: false, error: 'course create returned no id', attempts: 1 }
  }

  // 2) Add each lesson (with full content + quiz + resources inlined into
  //    the description so the student sees everything in the lesson view)
  const lessonIds: string[] = []
  let firstFailureBody: string | undefined

  for (const lesson of course.lessons) {
    const lessonBody = buildLessonBodyPerLesson(lesson, mode)
    const res = await crmPost(`${COURSES_BASE}/${crmCourseId}/lessons`, locationId, lessonBody)
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      firstFailureBody = txt.slice(0, 600)
      if (mode === 'text' && /content\s*type|contentType/i.test(txt)) {
        return {
          ok: false,
          error: `lesson reject (text mode): ${txt.slice(0, 200)}`,
          attempts: 1,
          lastResponseBody: firstFailureBody,
        }
      }
      return {
        ok: false,
        error: `lesson create failed: ${res.status}`,
        attempts: 1,
        lastResponseBody: firstFailureBody,
      }
    }
    type LessonCreateResp = { id?: string; lessonId?: string; data?: { id?: string } }
    const data = (await res.json().catch(() => ({}))) as LessonCreateResp
    const id = data.id ?? data.lessonId ?? data.data?.id
    if (id) lessonIds.push(id)
  }

  // 3) Try to flip status to published
  await crmPost(`${COURSES_BASE}/${crmCourseId}`, locationId, { status: 'published' }).catch(
    () => null,
  )

  // 4) Best-effort enrollment URL
  const enrollmentUrl = await fetchEnrollmentUrl(locationId, crmCourseId)

  return {
    ok: true,
    method: mode === 'text' ? 'per_lesson_text' : 'per_lesson_video',
    crmCourseId,
    crmLessonIds: lessonIds,
    enrollmentUrl,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lesson body builders
// ──────────────────────────────────────────────────────────────────────────

/**
 * Bulk-import lesson "post" shape — lesson content + quiz + resources all
 * inlined into the description so the dashboard renders one continuous
 * lesson page with everything the student needs.
 *
 * contentType MUST be 'video' for the bulk-import endpoint — text type is
 * rejected on most locations including RocketOpp ('Invalid Post content
 * type'). The body lives in `description` and renders as markdown.
 * Verified against location 6MSqx0trfxgLxeHBJE1k 2026-05-02 (course id
 * 56fb4a3c-3590-4eeb-bf18-410d48051635, HTTP 201).
 */
function buildLessonPost(lesson: GeneratedLesson) {
  return {
    title: lesson.title,
    visibility: 'published' as const,
    contentType: 'video' as const,
    description: composeFullLessonMarkdown(lesson),
  }
}

/**
 * Per-lesson POST shape (fallback). Same inline composition; the only
 * difference vs bulk-import is the wire format the CRM expects.
 */
function buildLessonBodyPerLesson(
  lesson: GeneratedLesson,
  mode: 'text' | 'video_fallback',
): Record<string, unknown> {
  const baseFields = {
    title: lesson.title,
    summary: lesson.summary,
    order: lesson.index,
  }

  if (mode === 'text') {
    return {
      ...baseFields,
      contentType: 'text',
      content: composeFullLessonMarkdown(lesson),
      // We still pass quiz+resources for any locations that surface them
      // separately; the inlined markdown is the load-bearing copy.
      quiz: lesson.quiz,
      resources: lesson.resources,
    }
  }

  // video_fallback — encode the lesson body in the description field so
  // students still see the content even though the lesson is typed 'video'.
  return {
    ...baseFields,
    contentType: 'video',
    description: composeFullLessonMarkdown(lesson),
    videoUrl: '', // intentionally empty — the description carries the lesson
  }
}

/**
 * The single source-of-truth lesson markdown. Lesson body, then quiz (with
 * answers + explanations), then resources. Used by every publish strategy
 * so what the student sees is identical regardless of which CRM endpoint
 * accepted the payload.
 */
function composeFullLessonMarkdown(lesson: GeneratedLesson): string {
  const parts: string[] = []

  parts.push(lesson.summary?.trim() || '')
  parts.push('')
  parts.push('---')
  parts.push('')
  parts.push(lesson.content?.trim() || '')

  if (lesson.quiz?.length) {
    parts.push('')
    parts.push('## Quiz')
    parts.push('')
    parts.push(formatQuiz(lesson.quiz))
  }

  if (lesson.resources?.length) {
    parts.push('')
    parts.push('## Resources')
    parts.push('')
    parts.push(formatResources(lesson.resources))
  }

  return parts.filter((p) => p !== null && p !== undefined).join('\n')
}

function formatQuiz(quiz: QuizQuestion[]): string {
  return quiz
    .map((q, i) => {
      const opts = q.options
        .map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`)
        .join('\n')
      const answer = String.fromCharCode(65 + q.correctAnswer)
      return `${i + 1}. ${q.question}\n${opts}\n   *Answer: ${answer} — ${q.explanation}*`
    })
    .join('\n\n')
}

function formatResources(resources: LessonResource[]): string {
  return resources.map((r) => `- [${r.title}](${r.url}) — *${r.type}*`).join('\n')
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

async function fetchEnrollmentUrl(locationId: string, courseId: string): Promise<string | null> {
  try {
    const res = await crmGet(`${COURSES_BASE}/${courseId}`, locationId)
    if (!res.ok) return null
    type CourseDetail = {
      enrollmentUrl?: string
      publicUrl?: string
      data?: { enrollmentUrl?: string; publicUrl?: string }
    }
    const d = (await res.json().catch(() => ({}))) as CourseDetail
    return (
      d.enrollmentUrl ??
      d.publicUrl ??
      d.data?.enrollmentUrl ??
      d.data?.publicUrl ??
      null
    )
  } catch {
    return null
  }
}
