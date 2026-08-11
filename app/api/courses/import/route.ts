/**
 * POST /api/courses/import — publish a generated course into a client's CRM.
 *
 * WHY THE TOKEN CHANGED. This used to fall back to `CRM_AGENCY_PIT`, and the
 * courses importer rejects that outright — verified against production on
 * 2026-08-11, `POST /courses/courses-exporter/public/import` with the agency PIT
 * returns 401 "The token is not authorized for this scope". An agency-level
 * credential cannot act inside a sub-account; only a credential scoped to that
 * client can. So generation worked, publishing could not, and the failure only
 * appeared at the last step.
 *
 * Now uses getAuthForLocation() — the same resolver the burst executor uses
 * (OAuth install → mint → stored PIT → env PIT). One resolver for every write
 * means a client that works for one feature works for all of them.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthForLocation } from '@/lib/crm'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const course = body?.course
  if (!course) return NextResponse.json({ error: 'Course data required' }, { status: 400 })

  // Explicit client wins, then the user's active client, then the configured
  // default. Passing it explicitly is what lets one agency publish to any of
  // their clients rather than only the one in an env var.
  const locationId =
    (typeof body?.locationId === 'string' && body.locationId.trim()) ||
    user.user_metadata?.active_location_id ||
    process.env.CRM_LOCATION_ID

  if (!locationId) {
    return NextResponse.json({ error: 'Tell me which client to publish this to.' }, { status: 400 })
  }

  const auth = await getAuthForLocation(locationId)
  const token = auth.token
  if (!token) {
    return NextResponse.json(
      { error: 'That client is not connected yet — connect it at /connect first.' },
      { status: 403 },
    )
  }

  try {
    // Format course for CRM courses importer API
    const crmPayload = {
      locationId,
      products: [{
        title: course.title,
        description: course.description,
        instructorDetails: course.instructor ? {
          name: course.instructor.name || 'AI Generated',
          description: course.instructor.description || '',
        } : undefined,
        categories: course.modules.map((mod: any, i: number) => ({
          title: mod.title,
          visibility: 'published' as const,
          posts: (mod.lessons || []).map((lesson: any, j: number) => ({
            title: typeof lesson === 'string' ? lesson : lesson.title,
            visibility: 'published' as const,
            contentType: 'video' as const,
            description: typeof lesson === 'string' ? lesson : (lesson.description || lesson.title),
          })),
        })),
      }],
    }

    const res = await fetch(`${CRM_BASE}/courses/courses-exporter/public/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(crmPayload),
    })

    if (!res.ok) {
      const err = await res.text()
      // 401 here almost always means an agency-level credential reached a
      // sub-account operation. Say that, rather than echoing a bare status.
      const hint =
        res.status === 401
          ? 'That client\'s credential is not authorised for courses. Reconnect the client at /connect.'
          : null
      return NextResponse.json(
        { error: hint ?? `Could not publish the course (${res.status}).`, details: err.slice(0, 400) },
        { status: res.status },
      )
    }

    const data = await res.json()

    return NextResponse.json({
      success: true,
      courseId: data.id || data.course?.id,
      locationId,
      authSource: auth.source,
      message: `${course.title} published with ${course.modules.length} modules.`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
