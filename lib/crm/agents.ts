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

const AGENTS = '/agent-studio/agents'

export interface AgentSummary {
  id: string
  name: string
  description?: string
  status: string
  locationId?: string
}

export interface AgentSpec {
  name: string
  description?: string
  /** The whole job, in words. This is what makes the agent useful. */
  prompt: string
  temperature?: number
  status?: 'active' | 'inactive' | 'archived'
}

export async function listAgents(locationId: string): Promise<{ agents: AgentSummary[]; error?: string }> {
  try {
    const res = await crmGet(`${AGENTS}?`, locationId)
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
function singleNodeGraph(spec: AgentSpec) {
  return [{
    nodeId: crypto.randomUUID(),
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
  const body = {
    // String, not boolean — the validator is explicit about this.
    isGhl: 'false',
    locationId,
    name: spec.name.trim(),
    description: spec.description?.trim() || spec.name.trim(),
    // Created INACTIVE unless asked otherwise: a generated agent that starts
    // answering real customers before anyone has read its prompt is exactly the
    // kind of surprise this product must not produce.
    status: spec.status ?? 'inactive',
    versionData: {
      versionName,
      description: spec.description?.trim() || versionName,
      state: 'draft',
      isPublished: false,
      version: 1,
      scopes: [],
      nodes: singleNodeGraph(spec),
    },
  }

  try {
    const res = await crmPostRaw(`${AGENTS}?locationId=${encodeURIComponent(locationId)}`, locationId, body)
    const text = await res.text()
    if (!res.ok) {
      console.error(`[crm/agents] create ${res.status}: ${text.slice(0, 300)}`)
      return { ok: false, error: `Could not create the agent (${res.status}).`, detail: text.slice(0, 300) }
    }
    const j = JSON.parse(text) as { agent?: { id?: string; agentId?: string; name?: string } }
    const id = j.agent?.id || j.agent?.agentId || ''
    return { ok: true, agentId: id, name: j.agent?.name ?? spec.name }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not create the agent.' }
  }
}
