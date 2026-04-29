/**
 * GET    /api/canvas/flows         — list current user's canvases
 * POST   /api/canvas/flows         — create a new canvas (optionally seeded from a template)
 *                                    body: { name?, description?, template?, blocks?, edges? }
 * PATCH  /api/canvas/flows?id=…    — update blocks/edges/viewport/name (autosave)
 * DELETE /api/canvas/flows?id=…    — delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PATCHABLE = new Set(['name', 'description', 'blocks', 'edges', 'viewport', 'is_active'])

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('canvas_flows')
    .select('id, name, description, blocks, edges, viewport, is_active, last_executed_at, execution_count, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flows: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; description?: string; template?: string; blocks?: unknown[]; edges?: unknown[] }
  try { body = await req.json() } catch { body = {} }

  let blocks = body.blocks ?? []
  let edges = body.edges ?? []
  let name = body.name ?? 'Untitled canvas'

  if (body.template) {
    const { data: tpl } = await supabase
      .from('canvas_templates')
      .select('name, blocks, edges')
      .eq('slug', body.template)
      .maybeSingle()
    if (tpl) {
      blocks = tpl.blocks ?? []
      edges = tpl.edges ?? []
      name = body.name ?? tpl.name ?? name
    }
  }

  const { data, error } = await supabase
    .from('canvas_flows')
    .insert({
      user_id: user.id,
      name,
      description: body.description ?? null,
      blocks,
      edges,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flow: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await req.json() as Record<string, unknown> } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) if (PATCHABLE.has(k)) update[k] = v

  const { data, error } = await supabase
    .from('canvas_flows')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flow: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('canvas_flows').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
