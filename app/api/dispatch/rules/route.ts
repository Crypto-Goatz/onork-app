/**
 * GET /api/dispatch/rules — list all active rules
 *
 * Query: ?category=code|database|product|productization|communication
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRules, DISPATCH_CACHE_HEADERS } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || undefined
  try {
    const rules = await getRules(category)
    return NextResponse.json({ rules, count: rules.length }, {
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
