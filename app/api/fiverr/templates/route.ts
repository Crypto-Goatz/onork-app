/**
 * /api/fiverr/templates
 *
 * Per docs/fiverr-generator-and-stack-scanner-spec.md §2.6 + §6.1.
 *
 * GET  → list the caller's saved Fiverr templates (most recent first)
 * POST → create a new template row
 *
 * Auth: Bearer 0n_ token (extension). Browser sessions can use the
 * server-side Supabase client; this route prefers the extension path.
 *
 * No AI surface here — pure CRUD against the fiverr_templates table.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'
import { createClient as createServer } from '@/lib/supabase/server'
import { validateSections, type FiverrSections } from '@/lib/fiverr/limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || ''
  const tokenMatch = auth.match(/^Bearer\s+(0n_\S+)/)
  if (tokenMatch) {
    const ctx = await validateToken(tokenMatch[1])
    if (ctx?.userId) return ctx.userId
  }
  try {
    const sb = await createServer()
    const { data } = await sb.auth.getSession()
    return data.session?.user?.id ?? null
  } catch {
    return null
  }
}

interface SaveBody {
  name?: string
  input_state?: Record<string, unknown>
  sections?: FiverrSections
  vpis_score?: { v: number; p: number; i: number; s: number; composite: number }
  source_scan_id?: string | null
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'auth required' }, { status: 401 })
  }
  const sb = admin()
  const { data, error } = await sb
    .from('fiverr_templates')
    .select('id, name, input_state, sections, vpis_score, source_scan_id, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'auth required' }, { status: 401 })
  }

  let body: SaveBody
  try {
    body = (await req.json()) as SaveBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  if (!name) {
    return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 })
  }
  if (!body.sections || typeof body.sections !== 'object') {
    return NextResponse.json({ ok: false, error: 'sections required' }, { status: 400 })
  }
  if (!body.input_state || typeof body.input_state !== 'object') {
    return NextResponse.json({ ok: false, error: 'input_state required' }, { status: 400 })
  }

  // Soft-validate; do not reject on warnings — saving over-limit drafts is allowed.
  const warnings = validateSections(body.sections)

  const sb = admin()
  const { data, error } = await sb
    .from('fiverr_templates')
    .insert({
      user_id: userId,
      name: name.slice(0, 200),
      input_state: body.input_state,
      sections: body.sections,
      vpis_score: body.vpis_score ?? null,
      source_scan_id: body.source_scan_id ?? null,
    })
    .select('id, name, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, template: data, warnings })
}
