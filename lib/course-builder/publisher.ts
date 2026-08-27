/**
 * 0n Course Builder — CRM Courses publisher.
 *
 * ONE endpoint exists: POST /courses/courses-exporter/public/import. The whole
 * course goes up in a single request — module > lesson groupings, lesson body,
 * quiz and resources inlined into the lesson description.
 *
 * ## What this file used to assert, and what is actually true
 *
 * Two comments here claimed *"the CRM Courses LMS renders markdown"*. They had
 * been load-bearing since 2026-05-02 and were never checked against a served
 * page. On 2026-08-26 Dex opened the published meta-course in the LMS: `#`,
 * `###`, `**bold**`, `---` and table pipes all render as literal characters,
 * and ~1,100 words of lesson body arrive as ONE paragraph because the field is
 * HTML and HTML collapses `\n` to a space. The field is HTML. It always was.
 * So we render markdown -> HTML here, before import, with the PORTABLE theme
 * (semantic tags, no colours of ours) since we do not control the LMS's CSS.
 *
 * ## The fallbacks that could never have run
 *
 * This file used to try three strategies and report failure as *"failed in
 * bulk-import, per-lesson-text, and per-lesson-video modes"* — one cause and
 * two fictions. Both fallbacks POST to `/courses`, and that route does not
 * exist. Measured on the agency PIT, 2026-08-27:
 *
 *     POST /courses                                  404  (empty body — no route)
 *     GET  /courses                                  404  (empty body — no route)
 *     POST /courses/courses-exporter/public/import   403  ("token does not have
 *                                                     access to this location")
 *
 * A 403 is a route that exists refusing a credential; a bodyless 404 is no
 * route at all. Same finding 2026-08-20 with a minted location token carrying
 * courses.readonly + courses.write, and the official API client's Courses
 * service has exactly one method (`importCourses`). Dead code that only runs
 * on the failure path is dead code nobody sees fail — it turned one honest
 * error into three, and the two extra were the ones that read like diagnosis.
 * Deleted. If a second endpoint ever appears, it gets added with a receipt.
 *
 * Local content is the source of truth. Once publish succeeds, the CRM
 * sub-location is the system of record.
 */

import { crmGet, crmPost, getAuthForLocation, fallbackCredentials } from '@/lib/crm'
import { renderMarkdownWith, PORTABLE } from '@/lib/markdown/render'
import type {
  GeneratedCourse,
  GeneratedLesson,
  QuizQuestion,
  LessonResource,
} from './types'

export interface PublishOk {
  ok: true
  method: 'bulk_import'
  crmCourseId: string
  crmLessonIds: string[]
  /**
   * How many lessons this publish put into the course — the number to SHOW.
   *
   * `crmLessonIds` is not that number and can never be it. Verified against
   * the live endpoint 2026-08-20: the import answers 201 with
   * `{ message, note, processingCourses:[{id,title,url}] }` and echoes no
   * per-post ids at all, so the id-collecting loop below always yields [] and
   * the UI rendered "0 lessons are now in your course area" after a publish
   * that carried five. The count of what we SENT is the honest figure.
   */
  lessonsPublished: number
  /**
   * True when the CRM accepted the course but is still importing it. The
   * endpoint says so in its own words: "The copying of courses may take some
   * time and will run in the background." A UI that claims "done" the instant
   * this returns is describing a queue receipt as a finished import.
   */
  pending: boolean
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

/**
 * The importer's contentType, measured — not inferred from one rejection.
 *
 * One call each into nphConTwfHcVE1oA0uep, 2026-08-23:
 *
 *     video       201        text   400  "Invalid Post content type"
 *     assignment  201        audio  400
 *     quiz        201        pdf    400 · html 400
 *
 * The old comment said *"contentType MUST be 'video' — text is rejected"*. It
 * was right about `text` and wrong that video is therefore the only option;
 * `assignment` and `quiz` are accepted and had never been tried. That matters
 * because a text lesson typed as a video is what puts an empty black player
 * and a placeholder icon at the top of every lesson in the LMS.
 *
 * It stays `video` until someone opens an `assignment` post in the LMS and
 * says which chrome it draws — swapping it blind trades a defect we have
 * measured for one we have not. It is a constant so that ruling is a one-line
 * change with the evidence sitting next to it.
 */
const LESSON_CONTENT_TYPE = 'video' as const

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

  try {
    const r = await publishViaBulkImport(locationId, course, priceCents, currency)
    if (!r.ok) console.warn('[course-builder.publish] bulk_import failed:', r.error)
    return r
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.warn('[course-builder.publish] bulk_import threw:', err)
    return {
      ok: false,
      error: `CRM publish failed: ${detail}. Content saved locally; retry available.`,
      attempts: 1,
      lastResponseBody: `bulk_import threw: ${detail}`,
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Bulk import — single POST, full course, modules + lessons
// ──────────────────────────────────────────────────────────────────────────

async function publishViaBulkImport(
  locationId: string,
  course: GeneratedCourse,
  priceCents: number,
  currency: string,
): Promise<PublishResult> {
  const auth = await getAuthForLocation(locationId)

  // Lessons group into ONE "Course Content" module so every published course
  // has a clean module structure in the dashboard sidebar.
  const lessonsModule = {
    title: 'Course Content',
    visibility: 'published' as const,
    posts: course.lessons.map((lesson) => buildLessonPost(lesson)),
  }

  const introModule = {
    title: 'Welcome',
    visibility: 'published' as const,
    posts: [
      {
        title: 'About this course',
        visibility: 'published' as const,
        contentType: LESSON_CONTENT_TYPE,
        description: buildAboutHtml(course),
      },
    ],
  }

  const modules = [introModule, lessonsModule]

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
        // location — we PATCH it after the fact below.
        categories: modules,
      },
    ],
  }

  const send = (token: string) =>
    fetch(`${CRM_BASE}/courses/courses-exporter/public/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

  let res = await send(auth.token)
  let txt = res.ok ? '' : await res.text().catch(() => '')

  /**
   * A scope refusal is not the end — try the next credential.
   *
   * The OAuth install for a location can be perfectly valid and still carry no
   * courses grant. Verified 2026-08-12: nphConTwfHcVE1oA0uep returned 401 "not
   * authorized for this scope" on the OAuth token and 201 on the env PIT for
   * the identical payload. This path used ONE credential and reported the
   * whole publish as failed while a working one sat unused.
   */
  if (!res.ok && res.status === 401 && /scope/i.test(txt)) {
    for (const next of await fallbackCredentials(auth)) {
      console.log(`[course-builder.publish] scope 401 — retrying with ${next.label}`)
      res = await send(next.token)
      if (res.ok) { txt = ''; break }
      txt = await res.text().catch(() => '')
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `bulk import failed: ${res.status}`,
      attempts: 1,
      lastResponseBody: txt.slice(0, 600),
    }
  }

  // Verified shape against nphConTwfHcVE1oA0uep + 6MSqx0trfxgLxeHBJE1k:
  //   { "message": "Migration for courses started",
  //     "processingCourses": [{ "id": "...", "title": "...", "url": "..." }] }
  // The other keys are older-version tolerance, kept because they cost nothing.
  type BulkResp = {
    id?: string
    course?: { id?: string }
    products?: Array<{ id?: string; courseId?: string; categories?: Array<{ posts?: Array<{ id?: string }> }> }>
    processingCourses?: Array<{ id?: string; title?: string; url?: string }>
    data?: { id?: string }
  }
  const data = (await res.json().catch(() => ({}))) as BulkResp
  const crmCourseId =
    data.processingCourses?.[0]?.id ??
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

  // Best-effort: collect lesson ids from the response shape if present.
  // Measured against the live endpoint this always yields [] — see
  // `lessonsPublished` above for the number that is safe to show a user.
  const crmLessonIds: string[] = []
  for (const cat of data.products?.[0]?.categories ?? []) {
    for (const post of cat.posts ?? []) {
      if (post?.id) crmLessonIds.push(post.id)
    }
  }

  // Capture the public dashboard URL when present — saves a follow-up GET.
  const dashboardUrl = data.processingCourses?.[0]?.url ?? null

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

  // Prefer the dashboard URL the importer just gave us; only fall back to
  // a follow-up GET if it's missing (some older locations).
  const enrollmentUrl =
    dashboardUrl || (await fetchEnrollmentUrl(locationId, crmCourseId))

  return {
    ok: true,
    method: 'bulk_import',
    crmCourseId,
    crmLessonIds,
    lessonsPublished: course.lessons.length,
    pending: true,
    enrollmentUrl,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lesson bodies
// ──────────────────────────────────────────────────────────────────────────

/**
 * Bulk-import lesson "post" shape — lesson content + quiz + resources all
 * inlined into the description so the dashboard renders one continuous lesson
 * page with everything the student needs.
 *
 * `description` is an HTML field (see the file header). Markdown goes in as
 * literal `###` and one collapsed paragraph.
 */
function buildLessonPost(lesson: GeneratedLesson) {
  return {
    title: lesson.title,
    visibility: 'published' as const,
    contentType: LESSON_CONTENT_TYPE,
    description: toLessonHtml(composeFullLessonMarkdown(lesson)),
  }
}

/**
 * The single source-of-truth lesson markdown. Lesson body, then quiz (with
 * answers + explanations), then resources.
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

/**
 * `escapeText` is on because every word of this is model-written and lands
 * under a customer's brand. A model that emits `<script>` or a stray `<div>`
 * must produce visible characters in a lesson, never markup in someone else's
 * page.
 */
function toLessonHtml(markdown: string): string {
  return renderMarkdownWith(markdown, PORTABLE, { escapeText: true })
}

/**
 * Quiz markdown, in constructs this renderer actually supports.
 *
 * It used to emit the question as `1.` and the options as three-space-indented
 * `A.` lines — nested-list markdown. The renderer has no nested lists, so the
 * options fell through to the paragraph buffer and came out as a `<p>` glued
 * inside the `<ol>`: invalid HTML, and every option on one line with the
 * answer. Rendering markdown fixed the lesson body and left the quiz collapsed
 * in exactly the way the lesson body had been.
 *
 * The renderer is ours, so the constraint is knowable: headings, flat lists,
 * emphasis, tables, rules. Write to it rather than around it. (Model-written
 * lesson bodies can still contain nested lists; those flatten to one level
 * rather than breaking — a degradation, not a collapse.)
 */
function formatQuiz(quiz: QuizQuestion[]): string {
  return quiz
    .map((q, i) => {
      const opts = q.options
        .map((o, j) => `- ${String.fromCharCode(65 + j)}. ${o}`)
        .join('\n')
      const answer = String.fromCharCode(65 + q.correctAnswer)
      return `### ${i + 1}. ${q.question}\n\n${opts}\n\n*Answer: ${answer} — ${q.explanation}*`
    })
    .join('\n\n')
}

function formatResources(resources: LessonResource[]): string {
  return resources.map((r) => `- [${r.title}](${r.url}) — *${r.type}*`).join('\n')
}

// ──────────────────────────────────────────────────────────────────────────
// "About this course" — computed, not written
// ──────────────────────────────────────────────────────────────────────────

/**
 * This used to be a model-written sales page, and it is the reason lesson #1
 * of a real client's published course promised five video lessons, quizzes,
 * downloadables, a live 30-minute Q&A, a certificate, lifetime updates, a
 * 30-day money-back guarantee, and that "spots are limited".
 *
 * The model did not hallucinate that. Our own prompt asked for
 * "high-conversion" copy and a "What's included (lessons, quizzes, resources,
 * certificate)" section, so it wrote exactly what it was told to and we
 * published the promises. **Mike's scope ruling: the Course Builder generates
 * simple course content, not a funnel.**
 *
 * So the description is built from values we have already computed. There is
 * nothing here to hallucinate: every number is counted, every title is a real
 * title, and no sentence commits the customer to anything they have not built.
 */
export function buildAboutMarkdown(course: GeneratedCourse): string {
  const lessonCount = course.lessons.length
  const quizCount = course.lessons.reduce((n, l) => n + (l.quiz?.length ?? 0), 0)
  const resourceCount = course.lessons.reduce((n, l) => n + (l.resources?.length ?? 0), 0)

  const parts: string[] = []

  if (course.outline.description?.trim()) {
    parts.push(course.outline.description.trim(), '')
  }

  parts.push('## What this course contains', '')
  parts.push(`- ${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`)
  parts.push(`- About ${course.totalWordCount.toLocaleString('en-US')} words of written material`)
  parts.push(`- Estimated reading time: ${course.estimatedDuration}`)
  if (quizCount > 0) {
    parts.push(`- ${quizCount} quiz ${quizCount === 1 ? 'question' : 'questions'} with answers and explanations`)
  }
  if (resourceCount > 0) {
    parts.push(`- ${resourceCount} linked ${resourceCount === 1 ? 'resource' : 'resources'}`)
  }
  parts.push('')

  if (lessonCount > 0) {
    parts.push('## Lessons', '')
    for (const l of course.lessons) {
      parts.push(`${l.index}. **${l.title}** — ${l.summary?.trim() || ''}`.trimEnd())
    }
  }

  return parts.join('\n')
}

function buildAboutHtml(course: GeneratedCourse): string {
  return toLessonHtml(buildAboutMarkdown(course))
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

export const __test__ = { composeFullLessonMarkdown, toLessonHtml, buildAboutMarkdown, LESSON_CONTENT_TYPE }
