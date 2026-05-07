/**
 * GET  /api/course-builder/courses        — list user's courses
 * POST /api/course-builder/courses        — create a course directly from the dashboard (skips chat)
 *                                            body: { topic, audience, lessonCount, includeQuizzes,
 *                                                    learningOutcome, tone? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateOutline, generateFullCourse } from '@/lib/course-builder/generator'
import type { CourseConfig } from '@/lib/course-builder/types'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 200)
  const status = req.nextUrl.searchParams.get('status')

  let q = admin()
    .from('course_builder_sessions')
    .select(
      'id, topic, audience, lesson_count, include_quizzes, learning_outcome, conversation_state, generated_content, course_outline, crm_course_id, enrollment_url, published, published_at, publish_error, publish_method, publish_attempts, price_cents, currency, generation_started_at, generation_completed_at, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('conversation_state', status)

  const { data } = await q
  return NextResponse.json({ courses: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .maybeSingle()

  const locationId = profile?.crm_location_id
  if (!locationId) {
    return NextResponse.json(
      { error: 'No CRM location on file. Connect your CRM first.' },
      { status: 403 }
    )
  }

  let body: Partial<CourseConfig>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.topic || !body.audience || !body.learningOutcome) {
    return NextResponse.json(
      { error: 'topic, audience, and learningOutcome are required' },
      { status: 400 }
    )
  }

  const config: CourseConfig = {
    topic: body.topic,
    audience: body.audience,
    lessonCount: body.lessonCount ?? 6,
    includeQuizzes: body.includeQuizzes ?? true,
    learningOutcome: body.learningOutcome,
    tone: body.tone ?? 'professional',
  }

  // Create the session row first so we have an id to attach state to
  const sb = admin()
  const { data: session, error: sErr } = await sb
    .from('course_builder_sessions')
    .insert({
      user_id: user.id,
      location_id: locationId,
      conversation_id: `dashboard:${user.id}:${Date.now()}`,
      conversation_state: 'outlining',
      topic: config.topic,
      audience: config.audience,
      lesson_count: config.lessonCount,
      include_quizzes: config.includeQuizzes,
      learning_outcome: config.learningOutcome,
      tone: config.tone,
      generation_started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (sErr || !session) {
    return NextResponse.json({ error: 'failed to create session' }, { status: 500 })
  }

  // Generate outline + full course synchronously (single API call)
  try {
    const outline = await generateOutline(config)
    await sb
      .from('course_builder_sessions')
      .update({ course_outline: outline, conversation_state: 'generating' })
      .eq('id', session.id)

    const { course, failures } = await generateFullCourse(config, outline)

    await sb
      .from('course_builder_sessions')
      .update({
        generated_content: course,
        conversation_state: 'reviewing',
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    return NextResponse.json({
      sessionId: session.id,
      outline,
      course,
      failures,
    })
  } catch (err) {
    await sb
      .from('course_builder_sessions')
      .update({
        conversation_state: 'failed',
        publish_error: err instanceof Error ? err.message : 'unknown error',
      })
      .eq('id', session.id)
    return NextResponse.json({ error: 'generation failed', detail: String(err) }, { status: 500 })
  }
}
