/**
 * POST /api/course-builder/chat
 *
 * CRM Conversation AI webhook for the 0n Course Builder.
 *
 * State machine per session:
 *   collecting_info → outlining → generating → reviewing → publishing → complete
 *                                                                     ↘ failed
 *
 * Reuses Jaxx security primitives (HMAC verify, identity split, scrubber,
 * rate limit). One session row per (location_id, conversation_id). Local
 * generated_content is the source of truth — CRM publish is best-effort.
 *
 * Always returns 200 to CRM.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crmPost } from '@/lib/crm'
import { verifyMarketplaceHmac, resolveIdentities, checkRateLimit } from '@/lib/jaxx/security'
import { scrubResponse } from '@/lib/jaxx/disclosure'
import { generateOutline, generateFullCourse } from '@/lib/course-builder/generator'
import { publishCourse } from '@/lib/course-builder/publisher'
import {
  COLLECTION_ORDER,
  QUESTIONS,
  buildConfig,
  fieldFromSession,
  nextMissingField,
  parseField,
  type CollectableField,
  type SessionInfoFields,
} from '@/lib/course-builder/state'
import type { CourseOutline, GeneratedCourse, ConversationState } from '@/lib/course-builder/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function ok() {
  return NextResponse.json({ ok: true })
}

interface InboundPayload {
  locationId?: string
  contactId?: string
  conversationId?: string
  messageBody?: string
  body?: string
  direction?: string
  type?: string
  contactName?: string
  contactEmail?: string
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. HMAC verify ─────────────────────────────────────────────────
    const rawBody = await req.text()
    const signature =
      req.headers.get('x-wh-signature') ||
      req.headers.get('x-signature') ||
      req.headers.get('x-hub-signature-256') ||
      null
    if (!verifyMarketplaceHmac({ rawBody, signature })) {
      console.warn('[course-builder/chat] HMAC verify failed')
      return ok()
    }

    // ── 2. Parse + filter ──────────────────────────────────────────────
    let payload: InboundPayload
    try {
      payload = JSON.parse(rawBody) as InboundPayload
    } catch {
      return ok()
    }

    const direction = (payload.direction || '').toLowerCase()
    if (direction && direction !== 'inbound') return ok()

    const locationId = payload.locationId
    const contactId = payload.contactId ?? null
    const conversationId =
      payload.conversationId ?? `crm:${locationId}:${contactId ?? 'unknown'}`
    const messageBody = (payload.messageBody || payload.body || '').trim()
    const channelType = (payload.type || 'SMS').trim()

    if (!locationId || !messageBody) return ok()

    // ── 3. Rate limit ──────────────────────────────────────────────────
    const rl = await checkRateLimit({
      locationId,
      contactId,
      dailyCap: 200,
      hourlyCap: 30,
    })
    if (!rl.allowed) return ok()

    // ── 4. Identity ────────────────────────────────────────────────────
    const ids = await resolveIdentities({
      locationId,
      contactId,
      contactSnapshot: { name: payload.contactName, email: payload.contactEmail },
    })
    if (!ids.actor.userId) {
      // No 0nCore user mapped to this location — silently drop
      return ok()
    }

    // ── 5. Load or create session ──────────────────────────────────────
    const sb = admin()
    const { data: existing } = await sb
      .from('course_builder_sessions')
      .select('*')
      .eq('location_id', locationId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let session = existing
    if (!session) {
      const { data: created } = await sb
        .from('course_builder_sessions')
        .insert({
          user_id: ids.actor.userId,
          location_id: locationId,
          conversation_id: conversationId,
          conversation_state: 'collecting_info',
        })
        .select('*')
        .single()
      session = created
    }
    if (!session) return ok()

    // ── 6. Route by state ──────────────────────────────────────────────
    const state = (session.conversation_state as ConversationState) || 'collecting_info'

    let reply = ''

    if (state === 'collecting_info') {
      reply = await handleCollecting(session.id, session, messageBody)
    } else if (state === 'outlining') {
      reply = await handleOutlining(session.id, session, messageBody)
    } else if (state === 'reviewing') {
      reply = await handleReviewing(session.id, session, messageBody)
    } else if (state === 'complete') {
      reply = `Your course "${session.generated_content?.outline?.title ?? 'Untitled'}" is already live. Want to start a new one? Reply "new course".`
      if (/new\s*course|start\s*over|build\s*another/i.test(messageBody)) {
        // Reset by creating a fresh session row — preserves history.
        await sb.from('course_builder_sessions').insert({
          user_id: ids.actor.userId,
          location_id: locationId,
          conversation_id: conversationId,
          conversation_state: 'collecting_info',
        })
        reply = QUESTIONS.topic
      }
    } else if (state === 'failed') {
      reply = `That last build hit a snag — your content is saved. Open the dashboard to retry the publish, or reply "new course" to start fresh.`
      if (/new\s*course|start\s*over|build\s*another/i.test(messageBody)) {
        await sb.from('course_builder_sessions').insert({
          user_id: ids.actor.userId,
          location_id: locationId,
          conversation_id: conversationId,
          conversation_state: 'collecting_info',
        })
        reply = QUESTIONS.topic
      }
    } else {
      // generating / publishing — async work in flight
      reply = `Still working on your course. I'll message you when it's ready.`
    }

    // ── 7. Scrub + post back to CRM ────────────────────────────────────
    const scrub = scrubResponse(reply)
    await postReply({
      locationId,
      contactId,
      conversationId,
      channelType,
      message: scrub.cleaned,
    })

    return ok()
  } catch (err) {
    console.error('[course-builder/chat] error:', err)
    return ok()
  }
}

// ──────────────────────────────────────────────────────────────────────────
// State handlers
// ──────────────────────────────────────────────────────────────────────────

async function handleCollecting(sessionId: string, session: Record<string, unknown>, message: string): Promise<string> {
  const sb = admin()
  const fields = fieldFromSession(session)

  // Determine current field (the previous question we asked)
  const current = nextMissingField(fields)
  if (!current) {
    return await transitionToOutlining(sessionId, fields)
  }

  // Is this the very first message? If so, the user already gave us the topic
  // implicitly OR we should ask the topic question. We always advance
  // regardless: try to parse the message as the current question's answer.
  const parsed = parseField(current, message)

  if (!parsed.ok) {
    // Re-ask, with the parser's correction if any
    return parsed.error ? `${parsed.error}\n\n${QUESTIONS[current]}` : QUESTIONS[current]
  }

  // Save the parsed value
  const updates: Record<string, unknown> = { [current]: parsed.value, updated_at: new Date().toISOString() }
  await sb.from('course_builder_sessions').update(updates).eq('id', sessionId)

  const updatedFields: SessionInfoFields = { ...fields, [current]: parsed.value as never }
  const next = nextMissingField(updatedFields)

  if (next) {
    return QUESTIONS[next]
  }

  // All fields collected — transition to outlining
  return await transitionToOutlining(sessionId, updatedFields)
}

async function transitionToOutlining(
  sessionId: string,
  fields: SessionInfoFields
): Promise<string> {
  const sb = admin()
  const config = buildConfig(fields)
  if (!config) {
    return 'I lost track of one of the answers — let me restart. ' + QUESTIONS.topic
  }

  await sb
    .from('course_builder_sessions')
    .update({ conversation_state: 'outlining', updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Generate outline synchronously (one Groq call, fast)
  let outline: CourseOutline
  try {
    outline = await generateOutline(config)
  } catch (err) {
    await sb
      .from('course_builder_sessions')
      .update({ conversation_state: 'failed', publish_error: 'outline failed', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
    return `I couldn't build the outline — ${err instanceof Error ? err.message : 'unknown error'}. Reply "new course" to try again.`
  }

  await sb
    .from('course_builder_sessions')
    .update({ course_outline: outline, updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Present to user
  const lessonList = outline.lessons
    .map((l) => `${l.index}. ${l.title}`)
    .join('\n')

  return `Here's the plan:

📚 **${outline.title}**

${outline.description}

Lessons:
${lessonList}

${config.includeQuizzes ? 'Each lesson includes a 5-question quiz.\n' : ''}Reply "yes" to generate all lesson content, or tell me what to change.`
}

async function handleOutlining(sessionId: string, session: Record<string, unknown>, message: string): Promise<string> {
  const sb = admin()
  const lower = message.toLowerCase()

  if (/^(yes|y|go|do it|build|generate|let's go|ship it)\b/.test(lower)) {
    // Begin generation — async; we return a holding message and trigger the work.
    await sb
      .from('course_builder_sessions')
      .update({
        conversation_state: 'generating',
        generation_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    // Fire and don't await — generator will message back via CRM Conversations
    void runGeneration(sessionId).catch((err) => {
      console.error('[course-builder] generation crashed:', err)
    })

    const lessonCount = (session.course_outline as CourseOutline | null)?.lessons.length ?? 0
    return `Generating ${lessonCount} lessons in parallel — I'll be back in 60-90 seconds with the full course.`
  }

  // User wants to revise the outline — for now we restart info collection
  return `What would you like to change? Tell me and I'll rebuild the outline. Or reply "yes" to generate as-is.`
}

async function handleReviewing(sessionId: string, session: Record<string, unknown>, message: string): Promise<string> {
  const sb = admin()
  const lower = message.toLowerCase()

  // Parse a price if present
  const priceMatch = message.match(/\$?\s*(\d{1,5})(?:\.(\d{2}))?/)
  const wantsPublish = /\b(publish|launch|go live|set price)\b/i.test(lower) || priceMatch
  const wantsCancel = /\b(cancel|nevermind|stop)\b/i.test(lower)

  if (wantsCancel) {
    await sb
      .from('course_builder_sessions')
      .update({ conversation_state: 'failed', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
    return 'Cancelled. Your content is saved on the dashboard.'
  }

  if (wantsPublish) {
    let priceCents = (session.price_cents as number) ?? 0
    if (priceMatch) {
      const dollars = parseInt(priceMatch[1], 10) || 0
      const cents = priceMatch[2] ? parseInt(priceMatch[2], 10) : 0
      priceCents = dollars * 100 + cents
    }

    await sb
      .from('course_builder_sessions')
      .update({
        conversation_state: 'publishing',
        price_cents: priceCents,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    void runPublish(sessionId).catch((err) => {
      console.error('[course-builder] publish crashed:', err)
    })

    return priceCents > 0
      ? `Publishing at $${(priceCents / 100).toFixed(2)}. I'll send the enrollment link in a moment.`
      : `Publishing as a free course. I'll send the enrollment link in a moment.`
  }

  return `Reply "publish at $XX" to set a price and go live, "publish" to launch as free, or "cancel" to keep it as a draft.`
}

// ──────────────────────────────────────────────────────────────────────────
// Async workers — generation + publishing
// ──────────────────────────────────────────────────────────────────────────

async function runGeneration(sessionId: string) {
  const sb = admin()
  const { data: session } = await sb
    .from('course_builder_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return

  const fields = fieldFromSession(session)
  const config = buildConfig(fields)
  const outline = session.course_outline as CourseOutline | null
  if (!config || !outline) return

  const { course, failures } = await generateFullCourse(config, outline)

  await sb
    .from('course_builder_sessions')
    .update({
      generated_content: course,
      conversation_state: 'reviewing',
      generation_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  // Notify user via CRM
  const failureNote =
    failures.length > 0 ? `\n\nNote: ${failures.length} lesson(s) had a generation hiccup but are recoverable from the dashboard.` : ''

  const stats = `${course.lessons.length} lessons · ${course.totalWordCount.toLocaleString()} words · ${course.estimatedDuration}${course.lessons.some((l) => l.quiz.length > 0) ? ' · quizzes included' : ''}`

  const message = `Course generated.

📊 ${stats}${failureNote}

Reply "publish at $197" (any price), "publish" for free, or "cancel" to keep as a draft. The full content is on your dashboard at /dashboard/course-builder.`

  await postReplyForSession(sb, session, message)
}

async function runPublish(sessionId: string) {
  const sb = admin()
  const { data: session } = await sb
    .from('course_builder_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return

  const course = session.generated_content as GeneratedCourse | null
  if (!course) return

  const result = await publishCourse({
    locationId: session.location_id as string,
    course,
    priceCents: (session.price_cents as number) ?? 0,
  })

  if (result.ok) {
    await sb
      .from('course_builder_sessions')
      .update({
        published: true,
        published_at: new Date().toISOString(),
        crm_course_id: result.crmCourseId,
        crm_lesson_ids: result.crmLessonIds,
        enrollment_url: result.enrollmentUrl,
        publish_method: result.method,
        publish_attempts: ((session.publish_attempts as number) ?? 0) + 1,
        conversation_state: 'complete',
        publish_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    // Analytics row
    await sb.from('course_builder_analytics').insert({
      session_id: sessionId,
      user_id: session.user_id,
      location_id: session.location_id,
      topic: session.topic,
      lesson_count: course.lessons.length,
      generation_time_seconds:
        session.generation_started_at && session.generation_completed_at
          ? Math.round(
              (new Date(session.generation_completed_at as string).getTime() -
                new Date(session.generation_started_at as string).getTime()) /
                1000
            )
          : null,
      published: true,
      publish_method: result.method,
      price_cents: session.price_cents,
    })

    const enrollLine = result.enrollmentUrl
      ? `\n📎 Enrollment link: ${result.enrollmentUrl}`
      : `\n(Enrollment link will appear in your CRM courses dashboard.)`
    const methodNote =
      result.method === 'video_fallback'
        ? `\n(Note: your CRM uses the video lesson format — content was embedded into each lesson description so students see it.)`
        : ''

    await postReplyForSession(
      sb,
      session,
      `Done — your course is live.${enrollLine}${methodNote}`
    )
  } else {
    await sb
      .from('course_builder_sessions')
      .update({
        publish_error: result.error,
        publish_attempts: ((session.publish_attempts as number) ?? 0) + 1,
        conversation_state: 'failed',
        publish_method: 'local_only',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    await postReplyForSession(
      sb,
      session,
      `The CRM publish step failed (${result.error}). Your full course content is saved — open the dashboard at /dashboard/course-builder to retry the publish.`
    )
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CRM reply helpers
// ──────────────────────────────────────────────────────────────────────────

async function postReply(args: {
  locationId: string
  contactId: string | null
  conversationId: string | null
  channelType: string
  message: string
}): Promise<boolean> {
  if (!args.contactId) return false
  try {
    const body: Record<string, unknown> = {
      type: args.channelType,
      contactId: args.contactId,
      message: args.message,
    }
    if (args.conversationId && !args.conversationId.startsWith('crm:')) {
      body.conversationId = args.conversationId
    }
    const res = await crmPost('/conversations/messages', args.locationId, body)
    return res.ok
  } catch (err) {
    console.error('[course-builder/chat] postReply failed:', err)
    return false
  }
}

async function postReplyForSession(
  sb: ReturnType<typeof admin>,
  session: Record<string, unknown>,
  message: string
) {
  const scrub = scrubResponse(message)
  await postReply({
    locationId: session.location_id as string,
    contactId: null, // we don't track contactId on session; CRM webhook ties on conversation_id
    conversationId: session.conversation_id as string,
    channelType: 'SMS',
    message: scrub.cleaned,
  })
  await sb.from('course_builder_sessions').update({ updated_at: new Date().toISOString() }).eq('id', session.id as string)
}
