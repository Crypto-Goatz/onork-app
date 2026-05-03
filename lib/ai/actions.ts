/**
 * Action parsing + execution for the AI Agent engine.
 *
 * The model is instructed to declare actions in a strict format on its own
 * line at the START of the reply:
 *
 *     [ACTION:snake_case_name] {"key":"value"}
 *
 * Multiple actions may appear (one per leading line). Anything after the
 * action lines is the human-facing reply. Action identifiers are
 * snake_case (Critical Rule #2). Only actions in the active surface are
 * accepted — invented names are dropped.
 *
 * Phase 1 ships a small surface; Phase 3 wires concrete handlers per pack.
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

export interface ParsedAction {
  action_type: string
  action_params: Record<string, unknown>
}

export interface ExecutedAction extends ParsedAction {
  result: unknown
  success: boolean
}

const ACTION_LINE = /^\s*\[ACTION:([a-z][a-z0-9_]*)\]\s*(\{[^\n]*\})?\s*$/i

/**
 * Strip the leading [ACTION:...] declarations from raw model output. Returns
 * the actions found and the remaining (human-facing) reply.
 */
export function parseActions(raw: string, allowed: Set<string>): { actions: ParsedAction[]; reply: string } {
  const lines = raw.split('\n')
  const actions: ParsedAction[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(ACTION_LINE)
    if (!match) break
    const name = match[1].toLowerCase()
    let params: Record<string, unknown> = {}
    if (match[2]) {
      try {
        const parsed = JSON.parse(match[2])
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          params = parsed as Record<string, unknown>
        }
      } catch {
        // Bad JSON — keep params empty rather than failing the whole turn.
      }
    }
    if (allowed.has(name)) {
      actions.push({ action_type: name, action_params: params })
    }
    i++
  }
  const reply = lines.slice(i).join('\n').trim()
  return { actions, reply }
}

/**
 * Execute parsed actions. Phase 1 records every action to ai_action_log
 * with success=true and a stub result. Phase 3 will route by action_type
 * to concrete handlers (campaign deploy, content scheduling, etc.).
 *
 * Each execute call is independent; a failure in one does not block
 * others.
 */
export async function executeActions(
  actions: ParsedAction[],
  ctx: { locationId: string; conversationId: string | null; logger: ActionLogger },
): Promise<ExecutedAction[]> {
  const out: ExecutedAction[] = []
  for (const action of actions) {
    let result: unknown = { status: 'queued', note: 'Phase 1 stub — action recorded for later execution.' }
    let success = true
    try {
      // Phase 3 will dispatch by action_type. Until then we just log.
      // Reserved for: build_campaign, deploy_campaign, generate_content,
      // schedule_post, score_content, pipeline_summary, create_task,
      // tag_priority, draft_review_response, send_review_request,
      // generate_report, compare_periods, create_tag, search_contacts,
      // add_note.
      await ctx.logger({
        location_id: ctx.locationId,
        conversation_id: ctx.conversationId,
        action_type: action.action_type,
        action_params: action.action_params,
        result,
        success,
      })
    } catch (err) {
      success = false
      result = { error: err instanceof Error ? err.message : 'unknown error' }
    }
    out.push({ ...action, result, success })
  }
  return out
}

export type ActionLogger = (row: {
  location_id: string
  conversation_id: string | null
  action_type: string
  action_params: Record<string, unknown>
  result: unknown
  success: boolean
}) => Promise<void>
