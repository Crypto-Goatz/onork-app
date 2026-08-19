/**
 * GET /api/dispatch/state/[section] — single state section
 */
import { NextResponse } from 'next/server'
import { getState, DISPATCH_CACHE_HEADERS, withDispatchMeta } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params
  try {
    const row = await getState(section)
    if (!row) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    return NextResponse.json(withDispatchMeta(row), { headers: DISPATCH_CACHE_HEADERS })
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
