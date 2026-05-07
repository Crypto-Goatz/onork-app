/**
 * POST /api/notes/think
 *
 * Body: { input: string }
 *
 * The AI-first Notes loop:
 *   1. think()    — Groq decides which tool to fire (flowchart? mindmap? doc? note?)
 *   2. execute    — persist the artifact (mermaid string for diagrams, markdown for docs)
 *   3. record()   — write outcome back to the brain
 *   4. return the saved row to the client
 *
 * Whimsical was removed 2026-05-03. All artifacts now render natively inside
 * 0nCore via @xyflow/react + mermaid.js — no third-party MCP, no external URLs.
 *
 * If the brain says "ask_clarification", we return the question and don't
 * persist anything yet — the client re-calls /think with the answer appended.
 *
 * Auth: Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { think, record, type Decision } from '@/lib/brain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const APP_SLUG = 'notes'

interface Body {
  input: string
  feedback?: string
  previous_outcome_id?: string
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const TOOL_TO_TYPE: Record<string, 'flowchart' | 'mindmap' | 'diagram' | 'doc'> = {
  create_flowchart: 'flowchart',
  create_mindmap: 'mindmap',
  create_diagram: 'diagram',
  create_doc: 'doc',
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = /* TODO_GETUSER_MANUAL: review this call — getSession() preferred per Rule 10a */ await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.input?.trim()) {
    return NextResponse.json({ error: 'input required' }, { status: 400 })
  }

  if (body.feedback && body.previous_outcome_id) {
    await admin()
      .from('brain_outcomes')
      .update({ user_feedback: body.feedback })
      .eq('id', body.previous_outcome_id)
      .eq('user_id', user.id)
  }

  const start = Date.now()

  let decision: Decision
  try {
    const out = await think(user.id, APP_SLUG, body.input)
    decision = out.decision
  } catch (err) {
    return NextResponse.json(
      { error: `think failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }

  let success = false
  let output: Record<string, unknown> = {}
  let savedNoteId: string | null = null

  try {
    if (decision.tool === 'ask_clarification') {
      output = { question: (decision.params.question as string) ?? 'Can you tell me more?' }
      success = true
    } else if (decision.tool === 'store_note') {
      const title = (decision.params.title as string) ?? body.input.slice(0, 60)
      const tags = (decision.params.tags as string[]) ?? []
      const { data, error } = await admin()
        .from('notes')
        .insert({
          user_id: user.id,
          title,
          body: body.input,
          artifact_type: 'note',
          tags,
          brain_decision: decision,
        })
        .select('id, title, body, artifact_type, tags, created_at')
        .single()
      if (error) throw new Error(error.message)
      savedNoteId = data.id
      output = { saved: true, note: data }
      success = true
    } else if (TOOL_TO_TYPE[decision.tool]) {
      const artifactType = TOOL_TO_TYPE[decision.tool]
      const title = (decision.params.title as string) ?? body.input.slice(0, 60)
      const tags = (decision.params.tags as string[]) ?? []
      const mermaid = artifactType === 'doc' ? null : ((decision.params.mermaid as string) ?? null)
      const markdown = artifactType === 'doc' ? ((decision.params.markdown as string) ?? null) : null

      if (artifactType !== 'doc' && !mermaid) {
        throw new Error('brain returned diagram tool without mermaid params')
      }
      if (artifactType === 'doc' && !markdown) {
        throw new Error('brain returned create_doc without markdown params')
      }

      const { data, error } = await admin()
        .from('notes')
        .insert({
          user_id: user.id,
          title,
          body: body.input,
          artifact_type: artifactType,
          mermaid,
          markdown,
          tags,
          brain_decision: decision,
        })
        .select('id, title, body, artifact_type, mermaid, markdown, tags, created_at')
        .single()
      if (error) throw new Error(error.message)
      savedNoteId = data.id
      output = { saved: true, note: data }
      success = true
    } else {
      output = { error: `unknown tool: ${decision.tool}` }
      success = false
    }
  } catch (err) {
    output = { error: err instanceof Error ? err.message : 'execution failed' }
    success = false
  }

  await record({
    userId: user.id,
    appSlug: APP_SLUG,
    action: decision.tool,
    input: { input: body.input },
    decision,
    output,
    success,
    durationMs: Date.now() - start,
  })

  const { data: lastOutcome } = await admin()
    .from('brain_outcomes')
    .select('id')
    .eq('user_id', user.id)
    .eq('app_slug', APP_SLUG)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    decision,
    output,
    success,
    note_id: savedNoteId,
    outcome_id: lastOutcome?.id ?? null,
  })
}
