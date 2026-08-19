/**
 * GET /api/dispatch/products — list all products
 */
import { NextResponse } from 'next/server'
import { getProducts, DISPATCH_CACHE_HEADERS, withDispatchMeta } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json(withDispatchMeta({ products, count: Array.isArray(products) ? products.length : 0 }), {
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
