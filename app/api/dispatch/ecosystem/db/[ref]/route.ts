/**
 * GET /api/dispatch/ecosystem/db/[ref] — Supabase project lookup by ref
 *
 * Returns: { name, used_by: [...], meta: {...} }
 */
import { NextResponse } from 'next/server'
import { getDbByRef, DISPATCH_CACHE_HEADERS, withDispatchMeta } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params
  try {
    const row = await getDbByRef(ref)
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
