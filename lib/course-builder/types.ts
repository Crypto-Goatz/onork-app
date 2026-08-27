/**
 * 0n Course Builder — shared types.
 */

export interface CourseConfig {
  topic: string
  audience: string
  lessonCount: number
  includeQuizzes: boolean
  learningOutcome: string
  tone: string // 'professional' | 'casual' | 'technical' | 'motivational'
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number // index into options
  explanation: string
}

export interface LessonResource {
  title: string
  url: string
  type: string // 'article' | 'video' | 'tool' | 'book' | 'docs'
}

export interface GeneratedLesson {
  index: number
  title: string
  summary: string
  content: string // full lesson markdown
  wordCount: number
  quiz: QuizQuestion[]
  resources: LessonResource[]
}

export interface CourseOutline {
  title: string
  description: string
  lessons: Array<{
    index: number
    title: string
    summary: string
    estimatedWords: number
    keyTopics: string[]
    quizTopics: string[]
  }>
  certificateEnabled: boolean
}

export interface GeneratedCourse {
  outline: CourseOutline
  lessons: GeneratedLesson[]
  totalWordCount: number
  estimatedDuration: string // e.g. "2 hours 30 minutes"
}

/**
 * `salesPageCopy` used to live here. It was model-written marketing copy that
 * published as lesson #1 under a customer's brand, promising a live Q&A, a
 * certificate and a money-back guarantee that nobody had agreed to. Removed
 * 2026-08-27 on Mike's scope ruling; the course description is now computed
 * from counted values in `publisher.buildAboutMarkdown()`. Sessions persisted
 * before that date may still carry the column — read it nowhere.
 */

export type ConversationState =
  | 'collecting_info'
  | 'outlining'
  | 'generating'
  | 'reviewing'
  | 'publishing'
  | 'complete'
  | 'failed'
