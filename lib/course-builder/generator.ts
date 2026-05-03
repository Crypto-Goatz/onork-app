/**
 * 0n Course Builder — Groq-powered generator.
 *
 * Strategy:
 *   1. generateOutline()         — single Groq call returns structured outline
 *   2. generateLessonsRadial()   — paced-serial lesson generation (one at a
 *                                   time with a small inter-lesson delay) so
 *                                   we stay under Groq TPM caps.
 *   3. generateSalesPage()       — final pass; takes the full course context.
 *
 * Model: configurable via COURSE_BUILDER_GROQ_MODEL env (default
 * `llama-3.1-8b-instant`). The 70b model has the lowest daily-token cap
 * on the free/on-demand tier (100k/day shared with everything else in
 * the codebase using Jaxx) — for sustained course generation throughput
 * the 8b instant model is the right pick. Quality is plenty for course
 * outlines, lessons, quizzes, and sales-page copy.
 *
 * Responses are JSON; we parse defensively. On parse failure we retry
 * once with a stricter prompt before bubbling the error.
 */

import { completion } from '@/lib/jaxx/groq'
import type {
  CourseConfig,
  CourseOutline,
  GeneratedCourse,
  GeneratedLesson,
  QuizQuestion,
  LessonResource,
} from './types'

const COURSE_GROQ_MODEL =
  process.env.COURSE_BUILDER_GROQ_MODEL || 'llama-3.1-8b-instant'

// ──────────────────────────────────────────────────────────────────────────
// Outline
// ──────────────────────────────────────────────────────────────────────────

const OUTLINE_SYSTEM = `You are an expert course architect. You produce structured JSON course outlines that are practical, sequenced from foundational to advanced, and tailored to the specified audience and learning outcome.`

function outlineUserPrompt(c: CourseConfig): string {
  return `Build a course outline.

Topic: ${c.topic}
Audience: ${c.audience}
Number of lessons: ${c.lessonCount}
Quizzes: ${c.includeQuizzes ? 'yes' : 'no'}
Learning outcome: ${c.learningOutcome}
Tone: ${c.tone}

Return ONLY valid JSON matching this exact shape (no prose, no markdown fences):
{
  "title": "Concise, clear course title",
  "description": "2-3 paragraph description of what the student will learn and accomplish",
  "lessons": [
    {
      "index": 1,
      "title": "Lesson title",
      "summary": "1-2 sentence summary",
      "estimatedWords": 1500,
      "keyTopics": ["topic 1", "topic 2", "topic 3"],
      "quizTopics": ["quiz topic 1", "quiz topic 2"]
    }
    // exactly ${c.lessonCount} lessons total, sequenced foundational → advanced
  ],
  "certificateEnabled": true
}`
}

function stripJsonFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

export async function generateOutline(config: CourseConfig): Promise<CourseOutline> {
  const result = await completion({
    model: COURSE_GROQ_MODEL,
    systemPrompt: OUTLINE_SYSTEM,
    messages: [{ role: 'user', content: outlineUserPrompt(config) }],
    temperature: 0.5,
    maxTokens: 2200,
  })

  const raw = stripJsonFences(result.content ?? '')
  let parsed: CourseOutline
  try {
    parsed = JSON.parse(raw) as CourseOutline
  } catch {
    // One retry with a stricter prompt
    const retry = await completion({
      model: COURSE_GROQ_MODEL,
      systemPrompt: OUTLINE_SYSTEM,
      messages: [
        { role: 'user', content: outlineUserPrompt(config) },
        { role: 'assistant', content: result.content ?? '' },
        {
          role: 'user',
          content:
            'That was not valid JSON. Return ONLY the JSON object, with no prose, no markdown fences, no comments.',
        },
      ],
      temperature: 0.2,
      maxTokens: 2200,
    })
    parsed = JSON.parse(stripJsonFences(retry.content ?? '')) as CourseOutline
  }

  // Defensive normalization
  if (!Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
    throw new Error('outline returned no lessons')
  }
  parsed.lessons = parsed.lessons.slice(0, config.lessonCount).map((l, i) => ({
    ...l,
    index: i + 1,
    estimatedWords: l.estimatedWords ?? 1500,
    keyTopics: l.keyTopics ?? [],
    quizTopics: l.quizTopics ?? [],
  }))
  parsed.certificateEnabled = parsed.certificateEnabled ?? true
  return parsed
}

// ──────────────────────────────────────────────────────────────────────────
// Lesson — single
// ──────────────────────────────────────────────────────────────────────────

const LESSON_SYSTEM = `You are an expert course author. You write substantive, practical lesson content that delivers real value and prepares the student to do the work, not just understand it. Output is markdown for the lesson body and structured JSON for quizzes and resources.`

function lessonUserPrompt(
  config: CourseConfig,
  outline: CourseOutline,
  lessonIndex: number
): string {
  const lesson = outline.lessons.find((l) => l.index === lessonIndex)!
  const wordTarget = lesson.estimatedWords || 1500

  return `Write lesson ${lessonIndex} of ${outline.lessons.length} for the course "${outline.title}".

Audience: ${config.audience}
Tone: ${config.tone}
Learning outcome of the whole course: ${config.learningOutcome}

Lesson title: ${lesson.title}
Lesson summary: ${lesson.summary}
Key topics to cover: ${lesson.keyTopics.join(', ')}
${config.includeQuizzes ? `Quiz topics: ${lesson.quizTopics.join(', ')}` : ''}

Word count target: ${wordTarget} (range: ${Math.max(800, wordTarget - 300)} - ${wordTarget + 300})

Return ONLY valid JSON matching this exact shape (no prose, no markdown fences):
{
  "title": "${lesson.title}",
  "summary": "1-2 sentence summary",
  "content": "Full lesson body in markdown. Include headings (##), examples, and a 'What's next' closer that previews the next lesson.",
  ${
    config.includeQuizzes
      ? `"quiz": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
    // exactly 5 questions, multiple choice
  ],`
      : `"quiz": [],`
  }
  "resources": [
    {
      "title": "Resource title",
      "url": "https://example.com",
      "type": "article"
    }
    // 3-5 resources mixing articles, videos, tools, docs
  ]
}`
}

async function generateLessonOnce(
  config: CourseConfig,
  outline: CourseOutline,
  lessonIndex: number
): Promise<GeneratedLesson> {
  const result = await completion({
    model: COURSE_GROQ_MODEL,
    systemPrompt: LESSON_SYSTEM,
    messages: [{ role: 'user', content: lessonUserPrompt(config, outline, lessonIndex) }],
    temperature: 0.55,
    maxTokens: 4096,
  })

  const raw = stripJsonFences(result.content ?? '')
  type LessonRaw = {
    title: string
    summary: string
    content: string
    quiz?: QuizQuestion[]
    resources?: LessonResource[]
  }
  let parsed: LessonRaw
  try {
    parsed = JSON.parse(raw) as LessonRaw
  } catch {
    const retry = await completion({
      model: COURSE_GROQ_MODEL,
      systemPrompt: LESSON_SYSTEM,
      messages: [
        { role: 'user', content: lessonUserPrompt(config, outline, lessonIndex) },
        { role: 'assistant', content: result.content ?? '' },
        {
          role: 'user',
          content: 'That was not valid JSON. Return ONLY the JSON object — no prose, no fences.',
        },
      ],
      temperature: 0.2,
      maxTokens: 4096,
    })
    parsed = JSON.parse(stripJsonFences(retry.content ?? '')) as LessonRaw
  }

  const wordCount = (parsed.content ?? '').trim().split(/\s+/).length

  return {
    index: lessonIndex,
    title: parsed.title,
    summary: parsed.summary,
    content: parsed.content,
    wordCount,
    quiz: parsed.quiz ?? [],
    resources: parsed.resources ?? [],
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lessons — paced burst (serialized to respect Groq's 12k TPM cap)
// ──────────────────────────────────────────────────────────────────────────

export interface RadialBurstResult {
  lessons: GeneratedLesson[]
  failures: Array<{ lessonIndex: number; error: string }>
  totalWordCount: number
}

/**
 * Lesson-generation pacing.
 *
 * Each lesson call uses ~3-4k tokens (prompt + 4096 max output). Groq's
 * `llama-3.3-70b-versatile` on-demand tier caps at 12,000 tokens / minute,
 * so true parallel `Promise.all` blows the cap on any course with 3+ lessons
 * (verified — every parallel run after lesson 1 returned 429).
 *
 * Solution: serialize with a configurable inter-lesson delay. With 5s
 * spacing a 6-lesson course finishes in ~30s of generation + 25s of
 * cumulative wait — well under the chat handler's 5-minute budget — and
 * stays comfortably under TPM. The function name keeps "Radial" for API
 * stability across callers; the implementation is now paced-serial.
 */
const LESSON_PACE_MS = Number(process.env.COURSE_BUILDER_LESSON_PACE_MS) || 5000

async function sleep(ms: number) {
  if (ms <= 0) return
  await new Promise<void>((r) => setTimeout(r, ms))
}

export async function generateLessonsRadial(
  config: CourseConfig,
  outline: CourseOutline
): Promise<RadialBurstResult> {
  const lessons: GeneratedLesson[] = []
  const failures: Array<{ lessonIndex: number; error: string }> = []

  for (let i = 0; i < outline.lessons.length; i++) {
    const idx = outline.lessons[i].index
    try {
      const lesson = await generateLessonOnce(config, outline, idx)
      lessons.push(lesson)
    } catch (e) {
      failures.push({
        lessonIndex: idx,
        error: e instanceof Error ? e.message : String(e),
      })
    }
    if (i < outline.lessons.length - 1) await sleep(LESSON_PACE_MS)
  }

  lessons.sort((a, b) => a.index - b.index)
  const totalWordCount = lessons.reduce((sum, l) => sum + l.wordCount, 0)
  return { lessons, failures, totalWordCount }
}

/**
 * Retry just the failed lesson indexes. Used by the chat handler when the
 * first burst returns partial results. Same paced-serial strategy.
 */
export async function retryLessons(
  config: CourseConfig,
  outline: CourseOutline,
  indexes: number[]
): Promise<RadialBurstResult> {
  const lessons: GeneratedLesson[] = []
  const failures: Array<{ lessonIndex: number; error: string }> = []

  for (let i = 0; i < indexes.length; i++) {
    const idx = indexes[i]
    try {
      const lesson = await generateLessonOnce(config, outline, idx)
      lessons.push(lesson)
    } catch (e) {
      failures.push({
        lessonIndex: idx,
        error: e instanceof Error ? e.message : String(e),
      })
    }
    if (i < indexes.length - 1) await sleep(LESSON_PACE_MS)
  }

  return {
    lessons: lessons.sort((a, b) => a.index - b.index),
    failures,
    totalWordCount: lessons.reduce((sum, l) => sum + l.wordCount, 0),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Sales page
// ──────────────────────────────────────────────────────────────────────────

const SALES_PAGE_SYSTEM = `You write high-conversion course sales pages. Lead with the outcome, anchor on a specific student transformation, then prove value with what's inside. End with an unmistakable CTA.`

export async function generateSalesPage(course: GeneratedCourse): Promise<string> {
  const lessonList = course.lessons
    .map((l) => `${l.index}. ${l.title} — ${l.summary}`)
    .join('\n')

  const result = await completion({
    model: COURSE_GROQ_MODEL,
    systemPrompt: SALES_PAGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Course title: ${course.outline.title}
Course description: ${course.outline.description}
Total lessons: ${course.lessons.length}
Total word count: ${course.totalWordCount}
Estimated duration: ${course.estimatedDuration}

Lesson list:
${lessonList}

Write a sales page (markdown) with:
- A magnetic headline
- A subhead that promises a specific outcome
- A "Who this is for" section
- A "What you'll learn" section listing the lessons as bullet outcomes (not just titles)
- A "What's included" section (lessons, quizzes, resources, certificate)
- An FAQ (3-5 questions)
- A clear CTA

Output the markdown directly — no JSON wrapping.`,
      },
    ],
    temperature: 0.6,
    maxTokens: 2200,
  })

  return result.content?.trim() ?? ''
}

// ──────────────────────────────────────────────────────────────────────────
// End-to-end orchestrator (used by the chat handler when entering 'generating')
// ──────────────────────────────────────────────────────────────────────────

export async function generateFullCourse(
  config: CourseConfig,
  outline: CourseOutline
): Promise<{ course: GeneratedCourse; failures: RadialBurstResult['failures'] }> {
  const burst = await generateLessonsRadial(config, outline)

  // If failures, retry once
  let lessons = burst.lessons
  let failures = burst.failures
  if (failures.length > 0) {
    const retry = await retryLessons(config, outline, failures.map((f) => f.lessonIndex))
    lessons = [...lessons, ...retry.lessons].sort((a, b) => a.index - b.index)
    failures = retry.failures
  }

  const totalWordCount = lessons.reduce((sum, l) => sum + l.wordCount, 0)
  const estimatedMinutes = Math.round(totalWordCount / 200) // ~200 wpm
  const hours = Math.floor(estimatedMinutes / 60)
  const minutes = estimatedMinutes % 60
  const estimatedDuration =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  const partialCourse: GeneratedCourse = {
    outline,
    lessons,
    salesPageCopy: '',
    totalWordCount,
    estimatedDuration,
  }

  // Sales page is optional — if it fails we proceed without it
  let salesPageCopy = ''
  try {
    salesPageCopy = await generateSalesPage(partialCourse)
  } catch (err) {
    console.warn('[course-builder] sales page generation failed:', err)
  }

  return {
    course: { ...partialCourse, salesPageCopy },
    failures,
  }
}
