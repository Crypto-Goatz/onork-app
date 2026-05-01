/**
 * GET /api/dispatch/.0n/[section] — signed .0n export
 *
 * Returns the most recent signed .0n file for the requested section.
 * Verifiers fetch /.well-known/dispatch.pub to validate the signature.
 *
 * Sections produced by the GitHub Action:
 *   state, rules, ecosystem, products:<slug>, bundle
 */
import { NextResponse } from 'next/server'
import { getDotOnFile, DISPATCH_CACHE_HEADERS } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params
  try {
    const row = await getDotOnFile(section)
    if (!row) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    return new NextResponse(row.content, {
      headers: {
        ...DISPATCH_CACHE_HEADERS,
        'content-type': 'text/plain; charset=utf-8',
        'x-dispatch-section': row.section,
        'x-dispatch-sha': row.sha,
        'x-dispatch-key-id': row.signing_key_id,
        'x-dispatch-size': String(row.size_bytes ?? 0),
      },
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
