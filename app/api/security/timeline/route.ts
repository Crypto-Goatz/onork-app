import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

/**
 * GET /api/security/timeline?page=1&limit=50 — paginated audit events
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 100)
    const offset = (page - 1) * limit

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'onai_security' } },
    )

    const { data, error, count } = await admin
      .from('audit')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    return NextResponse.json({
      events: data ?? [],
      page,
      limit,
      total: count ?? 0,
      has_more: (count ?? 0) > offset + limit,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
