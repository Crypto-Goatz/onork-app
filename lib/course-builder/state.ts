/**
 * Course Builder — info-collection state helper.
 *
 * The conversation collects 5 fields before transitioning to outlining:
 *   topic, audience, lesson_count, include_quizzes, learning_outcome
 *
 * We use a simple "next missing field" approach. Each user reply gets
 * interpreted by the current question's parser, and if successful we
 * write back to the session and ask the next question.
 */

import type { CourseConfig } from './types'

export interface SessionInfoFields {
  topic: string | null
  audience: string | null
  lesson_count: number | null
  include_quizzes: boolean | null
  learning_outcome: string | null
  tone: string | null
}

export type CollectableField = keyof SessionInfoFields

export const COLLECTION_ORDER: CollectableField[] = [
  'topic',
  'audience',
  'lesson_count',
  'include_quizzes',
  'learning_outcome',
]

export const QUESTIONS: Record<CollectableField, string> = {
  topic: "Let's build your course. What do you want to teach?",
  audience: 'Who is this course for? (beginners, intermediate, advanced — and any specifics about who they are)',
  lesson_count:
    'How many lessons should it have? I usually recommend 5-8 for a first course. Pick a number.',
  include_quizzes: 'Should each lesson end with a quiz? (yes / no)',
  learning_outcome:
    'Last one — what should the student be able to DO after they finish? (the concrete outcome)',
  tone: 'Tone? (professional / casual / technical / motivational)',
}

export function nextMissingField(fields: SessionInfoFields): CollectableField | null {
  for (const f of COLLECTION_ORDER) {
    if (fields[f] === null || fields[f] === undefined || fields[f] === '') return f
  }
  return null
}

export interface ParseResult<T> {
  ok: boolean
  value?: T
  error?: string
}

export function parseField(field: CollectableField, raw: string): ParseResult<unknown> {
  const t = raw.trim()
  if (!t) return { ok: false, error: 'empty answer' }

  switch (field) {
    case 'topic':
    case 'audience':
    case 'learning_outcome':
    case 'tone':
      return { ok: true, value: t }

    case 'lesson_count': {
      const m = t.match(/\d+/)
      if (!m) return { ok: false, error: 'I need a number — how many lessons?' }
      const n = parseInt(m[0], 10)
      if (n < 1 || n > 20) return { ok: false, error: 'Pick a number between 1 and 20.' }
      return { ok: true, value: n }
    }

    case 'include_quizzes': {
      const lower = t.toLowerCase()
      if (/^(yes|y|yeah|yep|sure|please|do it|true)\b/.test(lower)) return { ok: true, value: true }
      if (/^(no|n|nope|skip|false)\b/.test(lower)) return { ok: true, value: false }
      return { ok: false, error: "Yes or no — should each lesson end with a quiz?" }
    }
  }
}

export function buildConfig(fields: SessionInfoFields): CourseConfig | null {
  if (
    !fields.topic ||
    !fields.audience ||
    fields.lesson_count === null ||
    fields.include_quizzes === null ||
    !fields.learning_outcome
  ) {
    return null
  }
  return {
    topic: fields.topic,
    audience: fields.audience,
    lessonCount: fields.lesson_count,
    includeQuizzes: fields.include_quizzes,
    learningOutcome: fields.learning_outcome,
    tone: fields.tone || 'professional',
  }
}

export function fieldFromSession(session: Record<string, unknown>): SessionInfoFields {
  return {
    topic: (session.topic as string) ?? null,
    audience: (session.audience as string) ?? null,
    lesson_count: (session.lesson_count as number) ?? null,
    include_quizzes:
      typeof session.include_quizzes === 'boolean' ? (session.include_quizzes as boolean) : null,
    learning_outcome: (session.learning_outcome as string) ?? null,
    tone: (session.tone as string) ?? null,
  }
}
