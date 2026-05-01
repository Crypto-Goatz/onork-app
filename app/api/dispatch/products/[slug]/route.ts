/**
 * GET /api/dispatch/products/[slug] — single product status
 */
import { NextResponse } from 'next/server'
import { getProducts, DISPATCH_CACHE_HEADERS } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  try {
    const row = await getProducts(slug)
    if (!row) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    return NextResponse.json(row, { headers: DISPATCH_CACHE_HEADERS })
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
