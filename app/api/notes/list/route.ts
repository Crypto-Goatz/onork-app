/**
 * GET    /api/notes/list           — list AI-generated notes for current user
 * DELETE /api/notes/list?id=…      — delete a note
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const tag = url.searchParams.get('tag')
  const search = url.searchParams.get('q')?.trim()
  const type = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)

  let q = supabase
    .from('notes')
    .select('id, title, body, artifact_type, artifact_url, mermaid, markdown, tags, brain_decision, feedback, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tag) q = q.contains('tags', [tag])
  if (type) q = q.eq('artifact_type', type)
  if (search) q = q.ilike('title', `%${search}%`)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
