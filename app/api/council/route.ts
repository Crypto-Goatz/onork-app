/**
 * POST /api/council — put a claim in front of an adversarial panel.
 *
 * For anyone who has to sign off on an AI answer. It returns a verdict, the
 * dissent, and what would settle it — rather than one fluent paragraph with no
 * indication of whether it is true.
 *
 * The stub this replaces pointed at command.0nmcp.com/api/ai/council, which
 * returns 404.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { runCouncil, recordCouncil } from '@/lib/council'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const question = String(body?.question ?? '').trim()
  const context = String(body?.context ?? '')
  const domain = String(body?.domain ?? 'general').slice(0, 60)
  if (!question) return NextResponse.json({ error: 'What should the council review?' }, { status: 400 })

  try {
    const result = await runCouncil(question, { context, domain })
    // Recorded but never awaited into the response — a storage hiccup must not
    // cost the caller their answer.
    void recordCouncil(result, domain)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/council]', err)
    return NextResponse.json({ error: 'The council could not be convened.' }, { status: 502 })
  }
}
