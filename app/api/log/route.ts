import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { collectLog } from '@/lib/log/collect'

/** GET /api/log — everything 0nCORE did, newest first, scoped to the JWT. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const entries = await collectLog(session.claims.companyId, 150)
  return NextResponse.json({
    ok: true,
    entries,
    counts: {
      failed: entries.filter((e) => e.result === 'failed').length,
      refused: entries.filter((e) => e.result === 'refused').length,
      waiting: entries.filter((e) => e.result === 'waiting').length,
    },
  })
}
