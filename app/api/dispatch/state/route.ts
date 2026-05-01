/**
 * GET /api/dispatch/state — list all state/* sections (markdown bodies included)
 */
import { NextResponse } from 'next/server'
import { getState, DISPATCH_CACHE_HEADERS } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET() {
  try {
    const sections = await getState()
    return NextResponse.json({ sections }, { headers: DISPATCH_CACHE_HEADERS })
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
