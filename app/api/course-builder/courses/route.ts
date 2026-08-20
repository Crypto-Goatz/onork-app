/**
 * GET  /api/course-builder/courses        — list user's courses
 * POST /api/course-builder/courses        — create a course directly from the dashboard (skips chat)
 *                                            body: { topic, audience, lessonCount, includeQuizzes,
 *                                                    learningOutcome, tone? }
 *
 * ENTITLEMENT-GATED PER LOCATION, like every other add-on surface. Until Course
 * Builder was registered as a hosted add-on these routes checked only that you
 * were signed in — so any 0nCORE account on any plan, entitled or not, could
 * generate a course and publish it into a CRM. Being on the frame is what fixed
 * that: /x/ai-course-builder refuses at the door and this refuses again here,
 * because a door is a courtesy and the endpoint is the control.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveWorkspaces } from '@/lib/workspaces/resolve'
import { createClient } from '@supabase/supabase-js'
import { generateOutline, generateFullCourse } from '@/lib/course-builder/generator'
import type { CourseConfig } from '@/lib/course-builder/types'
import { requireAddonAccess } from '@/lib/addons/guard'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // 401 with no session, 402 when this location is not entitled, 503 when the
  // check itself could not run. Grace is allowed through — that is what it is.
  const access = await requireAddonAccess('ai-course-builder')
  if (!access.ok) return access.response
  const user = { id: access.userId }

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
  const access = await requireAddonAccess('ai-course-builder')
  if (!access.ok) return access.response
  const user = { id: access.userId }

  /**
   * WHICH WORKSPACE — resolved, not read from one stored column.
   *
   * `access.locationId` comes from `profiles.crm_location_id`, a single value
   * that is empty for 341 of 378 accounts. Worse, a marketplace install can
   * return COMPANY-level with a blank location: the 2026-08-20 Course Builder
   * install wrote one row with `location_id = ''` while the app was live in 100
   * sub-accounts. So this told a user with a perfectly good install and a live
   * token to "connect your CRM first" — a dead end pointing at a step they had
   * already completed.
   *
   * The resolver asks the platform where the app is actually installed, then
   * keeps only workspaces that are connected AND entitled. An explicit
   * `locationId` in the body still wins — that is the picker's choice — but it
   * is validated against the resolved set, because a client id arriving in a
   * request body is not proof of permission.
   */
  const resolution = await resolveWorkspaces(user.id, 'ai-course-builder')
  const requested = (await req.clone().json().catch(() => ({})))?.locationId as string | undefined

  let locationId = ''
  if (requested) {
    const ok = resolution.publishable.find((w) => w.locationId === requested)
    if (!ok) {
      return NextResponse.json(
        { error: 'You cannot publish to that workspace.', detail: resolution.workspaces.find((w) => w.locationId === requested)?.reason ?? 'Not among your workspaces.' },
        { status: 403 },
      )
    }
    locationId = requested
  } else if (resolution.publishable.length === 1) {
    locationId = resolution.publishable[0].locationId
  } else if (resolution.publishable.length > 1) {
    return NextResponse.json(
      { error: 'Choose which client to publish to.', workspaces: resolution.publishable },
      { status: 409 },
    )
  } else {
    // Fall back to the stored column before refusing — a single-tenant
    // sub-location install is legitimate and predates the resolver.
    locationId = access.locationId || ''
  }

  if (!locationId) {
    return NextResponse.json(
      {
        error: resolution.emptyReason || 'No workspace available to publish into.',
        // Say what we DID find, so "connect your CRM" is never shown to someone
        // who already has.
        detail: resolution.workspaces.length
          ? `${resolution.workspaces.length} workspace(s) found, none publishable yet.`
          : 'No connected workspace found for this account.',
      },
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
