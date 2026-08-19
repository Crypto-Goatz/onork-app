/**
 * GET /api/dispatch/version — current dispatch SHA + commit metadata
 *
 * Used by clients to check whether their cache is stale.
 */
import { NextResponse } from 'next/server'
import { getVersion, DISPATCH_CACHE_HEADERS, withDispatchMeta } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET() {
  try {
    const v = await getVersion()
    return NextResponse.json(withDispatchMeta(v ?? { error: 'no commits yet' }), {
      status: v ? 200 : 503,
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
