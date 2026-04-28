'use client'

import { useEffect, useState } from 'react'
import {
  GraduationCap,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface CourseSession {
  id: string
  topic: string | null
  audience: string | null
  lesson_count: number
  include_quizzes: boolean
  learning_outcome: string | null
  conversation_state: string
  generated_content: {
    outline?: { title?: string; description?: string }
    lessons?: Array<{ title: string; wordCount: number; quiz?: unknown[] }>
    totalWordCount?: number
    estimatedDuration?: string
  } | null
  course_outline: { title?: string; lessons?: Array<{ title: string }> } | null
  crm_course_id: string | null
  enrollment_url: string | null
  published: boolean
  published_at: string | null
  publish_error: string | null
  publish_method: string | null
  publish_attempts: number
  price_cents: number | null
  generation_completed_at: string | null
  created_at: string
}

const STATE_LABEL: Record<string, string> = {
  collecting_info: 'Asking',
  outlining: 'Outlining',
  generating: 'Writing',
  reviewing: 'Ready to publish',
  publishing: 'Publishing',
  complete: 'Live',
  failed: 'Needs retry',
}

const STATE_COLOR: Record<string, string> = {
  collecting_info: 'bg-white/10 text-white/60',
  outlining: 'bg-white/10 text-white/60',
  generating: 'bg-blue-500/15 text-blue-300',
  reviewing: 'bg-amber-500/15 text-amber-300',
  publishing: 'bg-blue-500/15 text-blue-300',
  complete: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
}

export default function CourseBuilderPage() {
  const [courses, setCourses] = useState<CourseSession[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [lessonCount, setLessonCount] = useState(6)
  const [includeQuizzes, setIncludeQuizzes] = useState(true)
  const [learningOutcome, setLearningOutcome] = useState('')
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical' | 'motivational'>('professional')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/course-builder/courses')
      if (!res.ok) {
        toast.error('Failed to load courses')
        return
      }
      const data = await res.json()
      setCourses(data.courses ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createCourse() {
    if (!topic.trim() || !audience.trim() || !learningOutcome.trim()) {
      toast.error('Fill in topic, audience, and learning outcome')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/course-builder/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          audience,
          lessonCount,
          includeQuizzes,
          learningOutcome,
          tone,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Generation failed')
        return
      }
      toast.success('Course generated. Set a price to publish.')
      setShowCreate(false)
      setTopic('')
      setAudience('')
      setLearningOutcome('')
      load()
    } finally {
      setCreating(false)
    }
  }

  async function retryPublish(id: string, priceCents: number) {
    const res = await fetch(`/api/course-builder/courses/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceCents }),
    })
    if (res.ok) {
      toast.success('Course published')
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(`Publish failed: ${err.error ?? 'unknown'}`)
      load()
    }
  }

  return (
    <div className="px-6 py-5 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#7ed957]" />
            Course Builder
          </h1>
          <p className="text-sm text-white/55 mt-1">
            Describe a course in plain English. Get a full course back — lessons, quizzes, sales page — published into your CRM.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New course
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className="mb-6 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#7ed957]" />
            <div className="font-semibold">New course</div>
          </div>
          <div className="space-y-3">
            <div>
              <Label>What do you want to teach? *</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Setting up AI automation for small business"
              />
            </div>
            <div>
              <Label>Who's it for? *</Label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. beginners with no technical background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lessons</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={lessonCount}
                  onChange={(e) => setLessonCount(parseInt(e.target.value) || 6)}
                />
              </div>
              <div>
                <Label>Tone</Label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as typeof tone)}
                  className="h-9 w-full rounded-md border border-white/10 bg-white/[0.02] px-3 text-sm focus:border-white/30 focus:outline-none"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                  <option value="motivational">Motivational</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Learning outcome — what should they DO after? *</Label>
              <Input
                value={learningOutcome}
                onChange={(e) => setLearningOutcome(e.target.value)}
                placeholder="e.g. Set up 3 working automations on their own"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
              <Label className="mb-0">Include 5-question quizzes per lesson</Label>
              <Switch checked={includeQuizzes} onCheckedChange={setIncludeQuizzes} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={createCourse} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                'Generate course'
              )}
            </Button>
          </div>
        </Card>
      )}

      {loading && courses.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-8 text-center">
          <GraduationCap className="h-10 w-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/60">No courses yet.</p>
          <p className="text-sm text-white/40 mt-1">Click "New course" or message your CRM Course Builder bot.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <CourseRow key={c.id} course={c} onRetryPublish={retryPublish} />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseRow({
  course,
  onRetryPublish,
}: {
  course: CourseSession
  onRetryPublish: (id: string, priceCents: number) => void
}) {
  const [showRetry, setShowRetry] = useState(false)
  const [retryPrice, setRetryPrice] = useState(course.price_cents ? course.price_cents / 100 : 0)

  const title =
    course.generated_content?.outline?.title ??
    course.course_outline?.title ??
    course.topic ??
    'Untitled course'
  const lessonCount =
    course.generated_content?.lessons?.length ?? course.course_outline?.lessons?.length ?? course.lesson_count
  const wordCount = course.generated_content?.totalWordCount

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold truncate">{title}</h3>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                STATE_COLOR[course.conversation_state] ?? 'bg-white/10 text-white/60'
              }`}
            >
              {STATE_LABEL[course.conversation_state] ?? course.conversation_state}
            </span>
          </div>
          <p className="text-xs text-white/55 line-clamp-1">
            {course.audience ?? '—'} · {lessonCount} lessons{course.include_quizzes ? ' · quizzes' : ''}
            {wordCount ? ` · ${wordCount.toLocaleString()} words` : ''}
            {course.generated_content?.estimatedDuration
              ? ` · ${course.generated_content.estimatedDuration}`
              : ''}
          </p>
        </div>
        {course.published && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        )}
      </div>

      {course.publish_error && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">Publish failed</div>
            <div className="text-red-200/70">{course.publish_error}</div>
            <div className="mt-1 text-red-200/40">
              Attempts: {course.publish_attempts} · Content saved locally
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="text-[11px] text-white/40">
          {new Date(course.created_at).toLocaleString()}
          {course.publish_method && ` · ${course.publish_method}`}
        </div>
        <div className="flex gap-2">
          {course.enrollment_url && (
            <a
              href={course.enrollment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#7ed957] hover:underline"
            >
              Enrollment <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {(course.conversation_state === 'reviewing' ||
            course.conversation_state === 'failed') &&
            course.generated_content && (
              <>
                {!showRetry ? (
                  <Button size="sm" variant="outline" onClick={() => setShowRetry(true)}>
                    {course.published ? 'Republish' : 'Publish'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/50">$</span>
                    <Input
                      type="number"
                      min={0}
                      value={retryPrice}
                      onChange={(e) => setRetryPrice(parseFloat(e.target.value) || 0)}
                      className="h-7 w-20 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        onRetryPublish(course.id, Math.round(retryPrice * 100))
                        setShowRetry(false)
                      }}
                    >
                      Go
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowRetry(false)}>
                      ✕
                    </Button>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </Card>
  )
}
