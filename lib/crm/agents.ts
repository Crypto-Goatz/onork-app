import { crmGet, crmPostRaw } from '@/lib/crm'

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
 * Build the node graph for a single-LLM agent.
 *
 * One node that is both start and end — the simplest agent that actually does
 * something. Kept as its own function because multi-node graphs are the obvious
 * next step and only this needs to change.
 */
function singleNodeGraph(spec: AgentSpec, nodeId: string) {
  return [{
    nodeId,
    nodeName: 'ai_agent_node',
    nodeDisplayName: 'AI Agent',
    isStartNode: true,
    isEndNode: true,
    nodeType: 'llmNode',
    nodeConfig: {
      output: 'message',
      prompt: spec.prompt,
      // Deterministic by default. An agent talking to a real customer should
      // not paraphrase itself differently every time.
      temperature: spec.temperature ?? 0,
      streaming: true,
    },
  }]
}

export type CreateResult =
  | { ok: true; agentId: string; name: string }
  | { ok: false; error: string; detail?: string }

export async function createAgent(locationId: string, spec: AgentSpec): Promise<CreateResult> {
  if (!spec.name?.trim()) return { ok: false, error: 'An agent needs a name.' }
  if (!spec.prompt?.trim()) return { ok: false, error: 'An agent needs instructions.' }

  const versionName = spec.name.trim()
  const nodeId = crypto.randomUUID()

  /**
   * The documented v3 body. Only locationId, status and version are required —
   * every array is sent explicitly because the API's own example sends them
   * empty rather than omitting them.
   */
  const body = {
    locationId,
    // The docs mark agencyId optional; the implementation does not — omitting
    // it returns a Firestore 500 naming the field. Documented-optional is not
    // the same as actually-optional, and only a live call tells you which.
    ...(spec.agencyId ? { agencyId: spec.agencyId } : {}),
    // Attribution has to be SOMETHING — the row records who made the agent, and
    // an agent with no author is one nobody can be asked about later.
    authorId: spec.authorId || '0ncore',
    authorName: spec.authorName || '0nCORE',
    authorEmail: spec.authorEmail || 'noreply@0ncore.com',
    name: spec.name.trim(),
    description: spec.description?.trim() || spec.name.trim(),
    // Created INACTIVE unless asked otherwise: a generated agent that starts
    // answering real customers before anyone has read its prompt is exactly the
    // kind of surprise this product must not produce.
    status: spec.status ?? 'inactive',
    version: {
      versionName,
      description: spec.description?.trim() || versionName,
      nodes: singleNodeGraph(spec, nodeId),
      edges: [],
      /**
       * graphMetadata is NOT derived from nodes — the server reads the model
       * and provider straight out of it, and a node alone leaves them
       * undefined. `llms[].id` must be the node's own id, which is what ties
       * the model choice to the node that uses it.
       */
      graphMetadata: {
        llms: [{
          id: nodeId,
          name: 'AI Agent',
          model: spec.model ?? 'gpt-4.1',
          provider: spec.provider ?? 'openai',
          conversational: true,
          toolIds: [],
        }],
        standardNodes: [],
        tools: [],
      },
      uiNodes: [],
      uiEdges: [],
      globalVariables: [],
      inputVariables: [],
      runtimeVariables: [],
      scopes: [],
    },
  }

  try {
    const res = await crmPostRaw(`${AGENT}?locationId=${encodeURIComponent(locationId)}`, locationId, body)
    const text = await res.text()
    if (!res.ok) {
      console.error(`[crm/agents] create ${res.status}: ${text.slice(0, 300)}`)
      const scopeIssue = res.status === 401 || /scope/i.test(text)
      return {
        ok: false,
        error: scopeIssue
          ? 'Agent creation needs the agent-studio scopes, which this install does not have yet.'
          : `Could not create the agent (${res.status}).`,
        detail: text.slice(0, 300),
      }
    }
    const j = JSON.parse(text) as { agent?: { id?: string; agentId?: string; name?: string } }
    return { ok: true, agentId: j.agent?.id || j.agent?.agentId || '', name: j.agent?.name ?? spec.name }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not create the agent.' }
  }
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
