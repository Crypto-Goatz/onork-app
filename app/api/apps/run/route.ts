/**
 * POST /api/apps/run
 *
 * Generic capability runner used by spawned App Factory apps.
 * Body: { capability: string, prompt: string }
 *
 * Routes the prompt to the capability's brain `think` endpoint, which
 * already implements the Groq-backed brain pattern. Public — no auth
 * required so spawned apps work for anonymous traffic. Per-capability
 * rate limits + cost controls live in the underlying think handler.
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROUTE_BY_CAPABILITY: Record<string, string> = {
  notes: '/api/notes/think',
  service_packager: '/api/service-packager/think',
  course_builder: '/api/courses/think',
  hipaa_scanner: '/api/hipaa/think',
  cro9_engine: '/api/cro9/think',
  brand_builder: '/api/brand/think',
  voice_ai: '/api/voice/think',
  email_paste: '/api/tools/email-paste/think',
  '0nexec': '/api/exec/think',
  report_builder: '/api/scan',
}

const VALID = new Set(Object.keys(ROUTE_BY_CAPABILITY))

export async function POST(req: NextRequest) {
  let body: { capability?: string; prompt?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }
  const capability = (body.capability || '').trim()
  const prompt = (body.prompt || '').trim()
  if (!capability || !VALID.has(capability)) {
    return NextResponse.json(
      { ok: false, error: `unknown capability: ${capability}` },
      { status: 400 },
    )
  }
  if (!prompt) {
    return NextResponse.json({ ok: false, error: 'prompt is required' }, { status: 400 })
  }

  // Forward to the capability's think route, same origin.
  const origin = new URL(req.url).origin
  const targetPath = ROUTE_BY_CAPABILITY[capability]
  const targetUrl = `${origin}${targetPath}`

  // For most brain-pattern routes the body shape is { prompt }. Report builder
  // takes a different shape.
  const targetBody =
    capability === 'report_builder'
      ? { url: prompt, scanners: ['crm_stack', 'sxo_living_dom', 'ai_readiness'] }
      : { prompt }

  try {
    const r = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(targetBody),
    })
    const text = await r.text()
    let payload: unknown
    try { payload = JSON.parse(text) } catch { payload = text }

    if (!r.ok) {
      const errMessage =
        (payload as Record<string, unknown>)?.error ?? `Capability returned ${r.status}`
      return NextResponse.json(
        { ok: false, error: String(errMessage), capability },
        { status: 502 },
      )
    }

    // Brain-pattern routes return { decision, output, success }. Older surfaces
    // may return the result directly. Normalize.
    const out =
      typeof payload === 'object' && payload !== null && 'output' in payload
        ? (payload as Record<string, unknown>).output
        : payload

    return NextResponse.json({
      ok: true,
      capability,
      output: out,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, capability },
      { status: 502 },
    )
  }
}
