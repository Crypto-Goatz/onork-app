/**
 * GET /api/dispatch/ecosystem — list all ecosystem entries
 *
 * Query: ?kind=repo|vercel_project|supabase_project|...
 */
import { NextRequest, NextResponse } from 'next/server'
import { getEcosystem, DISPATCH_CACHE_HEADERS, withDispatchMeta } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind') || undefined
  try {
    const entries = await getEcosystem(kind)
    return NextResponse.json(withDispatchMeta({ entries, count: entries.length }), {
      headers: DISPATCH_CACHE_HEADERS,
    })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: DISPATCH_CACHE_HEADERS })
}
