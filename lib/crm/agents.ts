import { crmGet, crmPostRaw, crmPatchRaw } from '@/lib/crm'

/**
 * Agent Studio — the ONE authoring surface the platform leaves open to us.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS MATTERS MORE THAN IT LOOKS. Workflows cannot be created via API.
 * Funnels cannot. Snapshots cannot. Every "AI builds it for you" idea has run
 * into the same wall — until here. Agents ARE writable:
 *
 *   GET  /agent-studio/agents?locationId=      200, full definitions
 *   POST /agent-studio/agents?locationId=      422 listing its required fields
 *
 * So the honest product line changes: we do not generate native workflows, and
 * we DO generate native agents. An agent that can be given a prompt and tools
 * is a general-purpose worker — which is most of what "build me an automation
 * that does X" actually means.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SHAPE, read off a real agent rather than guessed:
 *   agent   { name, description, isGhl, locationId, status, versions[] }
 *   version { versionName, description, state, isPublished, version, scopes[],
 *             nodes[] }
 *   node    { nodeId, nodeName, nodeDisplayName, isStartNode, isEndNode,
 *             nodeType: 'llmNode', nodeConfig: { prompt, temperature,
 *             streaming, output, humanFallback… } }
 *
 * `isGhl` is a STRING "true"/"false", not a boolean — the validator says so
 * explicitly, and sending a boolean fails a call that otherwise looks correct.
 */

/**
 * SINGULAR. The path is /agent-studio/agent, not /agent-studio/agents.
 *
 * The plural path also answers — it is the older internal surface, and it is
 * why probing produced Firestore 500s demanding isGhl, productSlug and
 * agencyId. Those fields belong to that endpoint, not this one. The documented
 * v3 contract needs none of them.
 */
const AGENT = '/agent-studio/agent'

/**
 * REQUIRED SCOPE: agent-studio.write (agent-studio.readonly to list).
 *
 * The sub-account app's twenty scopes do NOT include either, so agent
 * creation is blocked on adding them — and scopes cannot be added to an
 * existing install, so it needs a fresh one. Everything below is correct and
 * will start working the moment that install lands.
 */
export const AGENT_SCOPES = ['agent-studio.readonly', 'agent-studio.write'] as const

export interface AgentSummary {
  id: string
  name: string
  description?: string
  status: string
  locationId?: string
}

export interface AgentSpec {
  /**
   * Marked optional in the spec, required by the implementation. Same for the
   * author fields — the Firestore write names each one in turn until all are
   * present, so "optional" here means "the validator will not stop you, the
   * database will".
   */
  agencyId?: string
  authorId?: string
  authorName?: string
  authorEmail?: string
  /** Defaults match what the platform's own agents use. */
  model?: string
  provider?: string
  name: string
  description?: string
  /** The whole job, in words. This is what makes the agent useful. */
  prompt: string
  temperature?: number
  status?: 'active' | 'inactive' | 'archived'
}

export async function listAgents(locationId: string): Promise<{ agents: AgentSummary[]; error?: string }> {
  try {
    const res = await crmGet(`${AGENT}?`, locationId)
    if (!res.ok) return { agents: [], error: `Could not read agents (${res.status}).` }
    const j = (await res.json()) as { agents?: Record<string, unknown>[] }
    return {
      agents: (j.agents ?? []).map((a) => ({
        id: String(a.id ?? a.agentId ?? ''),
        name: String(a.name ?? 'Untitled agent'),
        description: typeof a.description === 'string' ? a.description : undefined,
        status: String(a.status ?? 'unknown'),
        locationId: typeof a.locationId === 'string' ? a.locationId : undefined,
      })).filter((a) => a.id),
    }
  } catch (err) {
    console.error('[crm/agents] list threw:', err)
    return { agents: [], error: 'Could not reach the CRM.' }
  }
}

/**
 * CREATE IS THREE CALLS, NOT ONE — and that is why every single-call attempt
 * failed with `graphMetadata.llms[0].model` undefined.
 *
 *   1. POST   /agent-studio/agent                       shell, nodes: []
 *   2. PATCH  /agent-studio/agent/versions/{versionId}  the graph and prompt
 *   3. POST   /agent-studio/agent/versions/{id}/publish promote it
 *
 * The documented create example sends EMPTY nodes. Sending a populated node
 * made the server derive graphMetadata it had no model for; with no nodes there
 * is nothing to derive, and the graph arrives in step 2 where the shape is
 * actually documented.
 *
 * NOTE the node shape differs between the two calls: create/read use
 * `nodeType`, the patch example uses `type`. Both are sent — a field the server
 * ignores costs nothing, and guessing wrong costs another 500.
 */
function llmNode(spec: AgentSpec, nodeId: string) {
  return {
    nodeId,
    nodeName: 'AI Agent',
    nodeDisplayName: 'AI Agent',
    type: 'llm',
    nodeType: 'llmNode',
    isStartNode: true,
    isEndNode: true,
    nodeConfig: {
      output: 'message',
      prompt: spec.prompt,
      model: spec.model ?? 'gpt-4.1',
      provider: spec.provider ?? 'openai',
      // Deterministic by default. An agent talking to a real customer should
      // not paraphrase itself differently every time.
      temperature: spec.temperature ?? 0,
      streaming: true,
    },
  }
}

export type CreateResult =
  | { ok: true; agentId: string; versionId: string; name: string; published: boolean }
  | { ok: false; error: string; detail?: string; stage?: 'create' | 'patch' | 'publish' }

export async function createAgent(locationId: string, spec: AgentSpec): Promise<CreateResult> {
  if (!spec.name?.trim()) return { ok: false, error: 'An agent needs a name.' }
  if (!spec.prompt?.trim()) return { ok: false, error: 'An agent needs instructions.' }

  const name = spec.name.trim()
  const description = spec.description?.trim() || name

  // ── 1. the shell ──────────────────────────────────────────────────────
  let agentId = ''
  let versionId = ''
  try {
    const res = await crmPostRaw(`${AGENT}?locationId=${encodeURIComponent(locationId)}`, locationId, {
      locationId,
      name,
      description,
      ...(spec.agencyId ? { agencyId: spec.agencyId } : {}),
      authorId: spec.authorId || '0ncore',
      authorName: spec.authorName || '0nCORE',
      authorEmail: spec.authorEmail || 'noreply@0ncore.com',
      // Created INACTIVE unless asked otherwise: a generated agent that starts
      // answering real customers before anyone has read its prompt is exactly
      // the kind of surprise this product must not produce.
      status: spec.status ?? 'inactive',
      version: {
        versionName: name,
        description,
        nodes: [], edges: [], uiNodes: [], uiEdges: [],
        globalVariables: [], inputVariables: [], runtimeVariables: [], scopes: [],
      },
    })
    const text = await res.text()
    if (!res.ok) {
      console.error(`[crm/agents] create ${res.status}: ${text.slice(0, 260)}`)
      return { ok: false, stage: 'create', error: `Could not create the agent (${res.status}).`, detail: text.slice(0, 260) }
    }
    const j = JSON.parse(text) as { agent?: { agentId?: string; id?: string }; versions?: { versionId?: string; id?: string }[] }
    agentId = j.agent?.agentId || j.agent?.id || ''
    versionId = j.versions?.[0]?.versionId || j.versions?.[0]?.id || ''
  } catch (err) {
    return { ok: false, stage: 'create', error: err instanceof Error ? err.message : 'Could not create the agent.' }
  }

  if (!agentId || !versionId) {
    return { ok: false, stage: 'create', error: 'The agent was created but returned no version to configure.' }
  }

  // ── 2. the graph and the prompt ───────────────────────────────────────
  const nodeId = crypto.randomUUID()
  try {
    const res = await crmPatchRaw(
      `${AGENT}/versions/${encodeURIComponent(versionId)}?locationId=${encodeURIComponent(locationId)}`,
      locationId,
      {
        locationId,
        versionName: name,
        description,
        nodes: [llmNode(spec, nodeId)],
        edges: [],
        globalVariables: [], inputVariables: [], runtimeVariables: [],
        // Where the system prompt actually lives — confirmed against a real
        // agent, not inferred.
        globalConfig: { globalPrompt: { currentPrompt: spec.prompt, history: [] } },
      },
    )
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      console.error(`[crm/agents] patch ${res.status}: ${t.slice(0, 260)}`)
      // The shell exists and is inactive — harmless, and left in place so it
      // can be inspected rather than silently deleted.
      return { ok: false, stage: 'patch', error: `Created the agent but could not configure it (${res.status}).`, detail: t.slice(0, 260) }
    }
  } catch (err) {
    return { ok: false, stage: 'patch', error: err instanceof Error ? err.message : 'Could not configure the agent.' }
  }

  // ── 3. promote ────────────────────────────────────────────────────────
  let published = false
  try {
    const res = await crmPostRaw(
      `${AGENT}/versions/${encodeURIComponent(versionId)}/publish?locationId=${encodeURIComponent(locationId)}`,
      locationId,
      { locationId, userId: spec.authorId || '0ncore', userName: spec.authorName || '0nCORE', userEmail: spec.authorEmail || 'noreply@0ncore.com' },
    )
    published = res.ok
    if (!res.ok) console.warn(`[crm/agents] publish ${res.status}`)
  } catch { /* an unpublished agent is still a real agent */ }

  return { ok: true, agentId, versionId, name, published }
}

export interface ExecuteResult { ok: boolean; reply?: string; error?: string }

/**
 * Run an agent and get its answer back.
 *
 * THIS IS THE PART THAT MAKES AGENTS A PRODUCT RATHER THAN A SETTING. A
 * generated agent we can also CALL means 0nCORE can build a worker for a client
 * and then put it to work — from a command, a workflow action, or a widget —
 * without a human opening Agent Studio at all.
 */
export async function executeAgent(args: {
  locationId: string
  agentId: string
  message: string
  contactId?: string
  inputVariables?: Record<string, string>
}): Promise<ExecuteResult> {
  try {
    const res = await crmPostRaw(
      `${AGENT}/${encodeURIComponent(args.agentId)}/execute?locationId=${encodeURIComponent(args.locationId)}`,
      args.locationId,
      {
        message: args.message,
        locationId: args.locationId,
        ...(args.contactId ? { contactId: args.contactId } : {}),
        ...(args.inputVariables ? { inputVariables: args.inputVariables } : {}),
      },
    )
    const text = await res.text()
    if (!res.ok) return { ok: false, error: `Agent did not run (${res.status}).` }
    const j = JSON.parse(text) as { response?: string; message?: string; output?: string }
    return { ok: true, reply: j.response ?? j.message ?? j.output ?? '' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Agent did not run.' }
  }
}
