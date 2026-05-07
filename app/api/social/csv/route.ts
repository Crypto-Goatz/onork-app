import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

// GET /api/social/csv — Download CSV template or export existing posts
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ error: 'No CRM location' }, { status: 400 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'template'

  // Export existing posts as CSV
  if (action === 'export') {
    try {
      const res = await fetch(
        `${CRM_API}/social-media-posting/csv?locationId=${locationId}`,
        { headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION } }
      )
      if (!res.ok) {
        return NextResponse.json({ error: `Export failed: ${res.status}` }, { status: res.status })
      }
      const csvText = await res.text()
      return new NextResponse(csvText, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="social-posts-export-${Date.now()}.csv"`,
        },
      })
    } catch (err) {
      return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }
  }

  // Return blank CSV template
  const template = `summary,scheduleDate,accountIds,mediaUrl,mediaType,followUpComment,status
"Your post content here","2026-05-01T10:00:00Z","account_id_1,account_id_2","https://example.com/image.jpg","image/jpeg","Follow-up comment text","scheduled"
"Another awesome post","2026-05-02T14:00:00Z","account_id_1","","","","scheduled"
"Post with no media","2026-05-03T09:00:00Z","account_id_1,account_id_3","","","Check this out!","scheduled"`

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="social-posts-template.csv"',
    },
  })
}

// POST /api/social/csv — Bulk import posts from CSV
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ error: 'No CRM location' }, { status: 400 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const contentType = req.headers.get('content-type') || ''

  // Handle raw CSV upload
  if (contentType.includes('text/csv') || contentType.includes('multipart/form-data')) {
    let csvContent = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      csvContent = await file.text()
    } else {
      csvContent = await req.text()
    }

    // Forward CSV to CRM
    try {
      const res = await fetch(`${CRM_API}/social-media-posting/csv?locationId=${locationId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: CRM_VERSION,
          'Content-Type': 'text/csv',
        },
        body: csvContent,
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('[social/csv] CRM import failed:', res.status, err)
        return NextResponse.json({
          error: `CRM import failed: ${res.status}`,
          details: err.slice(0, 500),
        }, { status: res.status })
      }

      const data = await res.json()
      return NextResponse.json({
        success: true,
        imported: data.imported || data.count || 0,
        failed: data.failed || 0,
        message: data.message || `Successfully imported posts`,
        data,
      })
    } catch (err) {
      return NextResponse.json({
        error: `Import failed: ${err instanceof Error ? err.message : 'Unknown'}`,
      }, { status: 500 })
    }
  }

  // Handle JSON body with posts array (AI-generated bulk)
  const body = await req.json()
  const { posts } = body

  if (!posts?.length) {
    return NextResponse.json({ error: 'posts array is required' }, { status: 400 })
  }

  // Fetch connected accounts
  let accounts: { id: string; type: string; name: string }[] = []
  try {
    const accRes = await fetch(`${CRM_API}/social-media-posting/${locationId}/accounts`, {
      headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
    })
    if (accRes.ok) {
      const accData = await accRes.json()
      accounts = accData.accounts || accData || []
    }
  } catch {}

  const accountIds = accounts.map(a => a.id)
  if (accountIds.length === 0) {
    return NextResponse.json({ error: 'No connected social accounts. Connect accounts first.' }, { status: 400 })
  }

  // Create each post
  const results: { index: number; success: boolean; message: string; postId?: string }[] = []

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    try {
      const postBody: Record<string, unknown> = {
        accountIds: post.accountIds || accountIds,
        summary: post.content || post.summary || '',
        type: 'post',
        status: post.scheduleDate ? 'scheduled' : 'draft',
      }

      if (post.scheduleDate) {
        postBody.scheduleDate = post.scheduleDate
      }

      if (post.media?.length) {
        postBody.media = post.media
      }

      if (post.followUpComment) {
        postBody.followUpComment = post.followUpComment
      }

      if (post.facebookPostDetails) postBody.facebookPostDetails = post.facebookPostDetails
      if (post.instagramPostDetails) postBody.instagramPostDetails = post.instagramPostDetails

      const res = await fetch(`${CRM_API}/social-media-posting/${locationId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      })

      if (!res.ok) {
        const err = await res.text()
        results.push({ index: i, success: false, message: `CRM error: ${res.status} — ${err.slice(0, 200)}` })
      } else {
        const data = await res.json()
        results.push({ index: i, success: true, message: 'Created', postId: data.id || data.postId })
      }
    } catch (err) {
      results.push({ index: i, success: false, message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` })
    }

    // Rate limit: 100ms between posts to avoid throttling
    if (i < posts.length - 1) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  // Log to Supabase
  try {
    for (const r of results) {
      if (r.success) {
        const post = posts[r.index]
        await supabase.from('social_posts').insert({
          user_id: user.id,
          platform: 'bulk',
          content: post.content || post.summary || '',
          status: post.scheduleDate ? 'scheduled' : 'posted',
          crm_post_id: r.postId || null,
          scheduled_at: post.scheduleDate || null,
          posted_at: !post.scheduleDate ? new Date().toISOString() : null,
        })
      }
    }
  } catch {}

  return NextResponse.json({
    total: posts.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  })
}
