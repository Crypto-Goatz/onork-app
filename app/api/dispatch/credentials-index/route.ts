/**
 * GET /api/dispatch/credentials-index
 *
 * Per the dispatch blueprint security policy: this endpoint NEVER returns
 * secret values. Only paths/locations of where secrets live (Vercel project
 * IDs, Supabase refs). Anything that has a value lives in Vercel envs or
 * 1Password — those get accessed by code via env, never by clients via API.
 */
import { NextResponse } from 'next/server'
import { getCredentialsIndex, DISPATCH_CACHE_HEADERS } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET() {
  try {
    const index = await getCredentialsIndex()
    return NextResponse.json(index, { headers: DISPATCH_CACHE_HEADERS })
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
