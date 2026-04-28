/**
 * GET    /api/mcp/servers/[id]              — full record (no env_vars / bearer)
 * PUT    /api/mcp/servers/[id]              — update status / env / bearer / etc
 * DELETE /api/mcp/servers/[id]              — disconnect (delete the row)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const EDITABLE = new Set(['name', 'description', 'url', 'env_vars', 'bearer_token', 'status'])

async function checkOwner(id: string, userId: string): Promise<boolean> {
  const { data } = await admin()
    .from('user_mcp_servers')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await checkOwner(id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data } = await admin()
    .from('user_mcp_servers')
    .select('id, slug, name, description, transport, url, status, tools, tools_listed_at, last_used_at, use_count, last_error, created_at, updated_at')
    .eq('id', id)
    .single()

  return NextResponse.json({ server: data })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await checkOwner(id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of Object.keys(body)) {
    if (EDITABLE.has(k)) update[k] = body[k]
  }

  const { error } = await admin().from('user_mcp_servers').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await checkOwner(id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await admin().from('user_mcp_servers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
