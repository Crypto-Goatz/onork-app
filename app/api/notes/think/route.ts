/**
 * POST /api/notes/think
 *
 * Body: { input: string }
 *
 * The AI-first Notes loop:
 *   1. think()    — Groq decides which tool to fire (flowchart? mindmap? store?)
 *   2. execute    — invoke the chosen tool (Whimsical MCP, store_note, ask)
 *   3. record()   — write outcome back to the brain
 *   4. return the artifact (URL or note row) to the client
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
  feedback?: string  // optional — tag the previous outcome before this one
  previous_outcome_id?: string
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  // If the user is rating the prior outcome, write that back first
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
      { status: 500 }
    )
  }

  // ── Execute the chosen tool ────────────────────────────────────────
  let success = false
  let output: Record<string, unknown> = {}
  let savedNoteId: string | null = null

  try {
    if (decision.tool === 'ask_clarification') {
      // Don't save anything — return the question for the client to display
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
        .select('id, title, body, tags, created_at')
        .single()
      if (error) throw new Error(error.message)
      savedNoteId = data.id
      output = { saved: true, note: data }
      success = true
    } else if (
      decision.tool === 'whimsical.create_from_text' ||
      decision.tool === 'whimsical.create_from_mermaid' ||
      decision.tool === 'whimsical.create_doc'
    ) {
      // Look up the user's Whimsical MCP server connection
      const { data: server } = await admin()
        .from('user_mcp_servers')
        .select('id, status, url, bearer_token')
        .eq('user_id', user.id)
        .eq('slug', 'whimsical')
        .maybeSingle()

      if (!server) {
        output = {
          needs_connection: true,
          message: 'Connect your Whimsical workspace first.',
          connect_url: '/dashboard/mcp-store?server=whimsical',
        }
        success = false
      } else if (server.status !== 'active' && server.status !== 'connected') {
        output = {
          needs_connection: true,
          message: 'Whimsical needs to authenticate. Click connect in the MCP store.',
          connect_url: `/dashboard/mcp-store?server=${server.id}`,
        }
        success = false
      } else {
        // Forward to /api/mcp/execute — the existing MCP bridge
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
        const toolName = decision.tool.replace('whimsical.', '')
        const r = await fetch(`${baseUrl}/api/mcp/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.INTERNAL_DISPATCH_SECRET
              ? { 'x-internal-secret': process.env.INTERNAL_DISPATCH_SECRET }
              : {}),
          },
          body: JSON.stringify({
            serverId: server.id,
            tool: toolName,
            args: decision.params,
          }),
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data?.error ?? `mcp/execute ${r.status}`)

        // Save the artifact reference
        const artifactType =
          decision.tool === 'whimsical.create_doc' ? 'doc'
          : decision.tool === 'whimsical.create_from_mermaid' ? 'diagram'
          : ((decision.params.type as string) ?? 'flowchart')

        const artifactUrl = (data.url as string) ?? (data.boardUrl as string) ?? null
        const artifactId = (data.id as string) ?? (data.boardId as string) ?? null

        const title = (decision.params.title as string)
          ?? (decision.params.name as string)
          ?? body.input.slice(0, 60)
        const tags = (decision.params.tags as string[]) ?? []

        const { data: noteRow, error } = await admin()
          .from('notes')
          .insert({
            user_id: user.id,
            title,
            body: body.input,
            artifact_type: artifactType,
            artifact_url: artifactUrl,
            artifact_id: artifactId,
            tags,
            brain_decision: decision,
          })
          .select('id, title, artifact_type, artifact_url, tags, created_at')
          .single()
        if (error) throw new Error(error.message)
        savedNoteId = noteRow.id
        output = { saved: true, note: noteRow, raw: data }
        success = true
      }
    } else {
      output = { error: `unknown tool: ${decision.tool}` }
      success = false
    }
  } catch (err) {
    output = { error: err instanceof Error ? err.message : 'execution failed' }
    success = false
  }

  // ── Record outcome (closes the loop) ───────────────────────────────
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

  // Get the outcome id back so the client can attach feedback to it later
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
