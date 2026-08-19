/**
 * POST /api/course-builder/courses/:id/publish
 *
 * Retry-publish endpoint for sessions that already have generated_content.
 * Body: { priceCents?: number }
 *
 * ENTITLEMENT-GATED. This one writes a course, a price and an enrolment page
 * into a live CRM, so it is the last route in Course Builder that should have
 * accepted "signed in" as the whole check — and it was.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishCourse } from '@/lib/course-builder/publisher'
import type { GeneratedCourse } from '@/lib/course-builder/types'
import { requireAddonAccess } from '@/lib/addons/guard'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await requireAddonAccess('ai-course-builder')
  if (!access.ok) return access.response
  const user = { id: access.userId }

  const body = await req.json().catch(() => ({}))

  const sb = admin()
  const { data: session } = await sb
    .from('course_builder_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!session.generated_content) {
    return NextResponse.json({ error: 'no content to publish' }, { status: 400 })
  }

  const priceCents =
    typeof body.priceCents === 'number' ? body.priceCents : (session.price_cents as number) ?? 0

  await sb
    .from('course_builder_sessions')
    .update({ conversation_state: 'publishing', price_cents: priceCents })
    .eq('id', id)

  const result = await publishCourse({
    locationId: session.location_id,
    course: session.generated_content as GeneratedCourse,
    priceCents,
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
      })
      .eq('id', id)
    return NextResponse.json({ ...result })
  }

  await sb
    .from('course_builder_sessions')
    .update({
      publish_error: result.error,
      publish_attempts: ((session.publish_attempts as number) ?? 0) + 1,
      conversation_state: 'failed',
    })
    .eq('id', id)

  return NextResponse.json({ ok: false, error: result.error, attempts: result.attempts }, { status: 502 })
}
