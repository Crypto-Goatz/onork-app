import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { course } = await req.json()
  if (!course) return NextResponse.json({ error: 'Course data required' }, { status: 400 })

  const locationId = user.user_metadata?.active_location_id || process.env.CRM_LOCATION_ID
  // Use OAuth token from user metadata, fall back to PIT
  const token = user.user_metadata?.crm_access_token || process.env.CRM_AGENCY_PIT

  if (!token || !locationId) {
    return NextResponse.json({ error: 'CRM not connected' }, { status: 500 })
  }

  try {
    // Format course for CRM courses API
    const crmCourse = {
      locationId,
      title: course.title,
      description: course.description,
      categories: course.modules.map((mod: any, i: number) => ({
        title: mod.title,
        position: i,
        posts: mod.lessons.map((lesson: string, j: number) => ({
          title: lesson,
          contentType: 'text',
          position: j,
        })),
      })),
    }

    const res = await fetch(`${CRM_BASE}/courses/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(crmCourse),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `CRM import failed: ${res.status}`, details: err }, { status: res.status })
    }

    const data = await res.json()

    return NextResponse.json({
      success: true,
      courseId: data.id || data.course?.id,
      message: `${course.title} imported with ${course.modules.length} modules`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
