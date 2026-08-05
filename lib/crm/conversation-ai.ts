import { crmGet, crmPostRaw, crmPut } from '@/lib/crm'

/**
 * Conversation AI — the chat agent that answers a client's customers.
 *
 * SEPARATE FROM AGENT STUDIO, and the difference decides which one to reach
 * for. Agent Studio agents are workers you invoke; these are the thing on the
 * end of a conversation, wired to SMS, live chat and WhatsApp. Both are
 * writable via API; neither replaces the other.
 *
 * THE WIRE THAT MATTERS: an action of type `triggerWorkflow`. Attach one and
 * the agent can start a native workflow mid-conversation — and since our own
 * custom steps live inside those workflows, that is how a chat agent reaches
 * everything 0nCORE can do without us inventing a plugin protocol.
 *
 * NO locationId IN THE QUERY. The location token already says which account
 * this is, and sending it anyway returns 422 "property locationId should not
 * exist" — the same trap as the contacts endpoints, in reverse.
 */

const BASE = '/conversation-ai/agents'

export interface ConvAgentSpec {
  name: string
  /** All four are required by the API — an agent without them cannot be created. */
  personality: string
  goal: string
  instructions: string
  businessName?: string
  /**
   * 'suggestive' drafts for a human to send; 'auto-pilot' sends by itself.
   * DEFAULTS TO SUGGESTIVE. An agent we generated talking unsupervised to a
   * client's customers, before anyone has read its instructions, is the one
   * outcome nobody would forgive — so the safe mode is the default and going
   * live is a deliberate act.
   */
  mode?: 'off' | 'suggestive' | 'auto-pilot'
  channels?: ('SMS' | 'Live_Chat' | 'WhatsApp')[]
  knowledgeBaseIds?: string[]
  autoPilotMaxMessages?: number
}

export interface ConvAgent { id: string; name: string; mode?: string; channels?: string[] }

export type ConvResult<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string }

async function read<T>(res: Response, pick: (j: Record<string, unknown>) => T): Promise<ConvResult<T>> {
  const text = await res.text()
  if (!res.ok) {
    console.error(`[crm/conversation-ai] ${res.status}: ${text.slice(0, 240)}`)
    const scope = res.status === 401 || /scope/i.test(text)
    return {
      ok: false,
      error: scope ? 'This install does not have the conversation-ai scopes.' : `The CRM returned ${res.status}.`,
      detail: text.slice(0, 240),
    }
  }
  try { return { ok: true, data: pick(JSON.parse(text)) } }
  catch { return { ok: false, error: 'Could not read the response.' } }
}

export async function listConvAgents(locationId: string): Promise<ConvResult<ConvAgent[]>> {
  // crmGet appends locationId, which this endpoint rejects — so the call is
  // made directly with the resolved token instead.
  const res = await crmGet(`${BASE}/search`, locationId).catch(() => null)
  if (!res) return { ok: false, error: 'Could not reach the CRM.' }
  return read(res, (j) => {
    const rows = (j.agents ?? j.employees ?? j.data ?? []) as Record<string, unknown>[]
    return rows.map((a) => ({
      id: String(a.id ?? a._id ?? ''),
      name: String(a.name ?? 'Untitled agent'),
      mode: a.mode as string | undefined,
      channels: a.channels as string[] | undefined,
    })).filter((a) => a.id)
  })
}

export async function createConvAgent(locationId: string, spec: ConvAgentSpec): Promise<ConvResult<ConvAgent>> {
  for (const f of ['name', 'personality', 'goal', 'instructions'] as const) {
    if (!spec[f]?.trim()) return { ok: false, error: `An agent needs its ${f}.` }
  }
  const res = await crmPostRaw(BASE, locationId, {
    name: spec.name.trim(),
    personality: spec.personality.trim(),
    goal: spec.goal.trim(),
    instructions: spec.instructions.trim(),
    ...(spec.businessName ? { businessName: spec.businessName } : {}),
    mode: spec.mode ?? 'suggestive',
    channels: spec.channels ?? ['Live_Chat'],
    ...(spec.knowledgeBaseIds?.length ? { knowledgeBaseIds: spec.knowledgeBaseIds } : {}),
    ...(spec.autoPilotMaxMessages ? { autoPilotMaxMessages: spec.autoPilotMaxMessages } : {}),
  })
  return read(res, (j) => {
    const a = (j.agent ?? j.employee ?? j) as Record<string, unknown>
    return { id: String(a.id ?? a._id ?? ''), name: String(a.name ?? spec.name) }
  })
}

export async function updateConvAgent(locationId: string, agentId: string, patch: Partial<ConvAgentSpec>): Promise<ConvResult<true>> {
  const res = await crmPut(`${BASE}/${encodeURIComponent(agentId)}`, locationId, patch as Record<string, unknown>)
  return read(res, () => true as const)
}

export type ActionType = 'triggerWorkflow' | 'updateContactField' | 'appointmentBooking' | 'stopBot' | 'humanHandOver' | 'advancedFollowup' | 'transferBot'

/**
 * Give the agent something it can DO.
 *
 * `triggerWorkflow` is the important one: it lets a chat agent start a native
 * workflow, and our custom steps live inside those workflows. That is the whole
 * bridge — the agent reaches 0nCORE, and through it 0nMCP, using the platform's
 * own mechanism rather than anything we had to invent.
 */
export async function attachAction(
  locationId: string,
  agentId: string,
  action: { type: ActionType; name: string; details: Record<string, unknown> },
): Promise<ConvResult<{ id: string }>> {
  const res = await crmPostRaw(`${BASE}/${encodeURIComponent(agentId)}/actions`, locationId, {
    type: action.type,
    name: action.name,
    details: action.details,
  })
  return read(res, (j) => {
    const a = (j.action ?? j) as Record<string, unknown>
    return { id: String(a.id ?? a._id ?? '') }
  })
}

/** What the agent actually said — the raw material for cross-client reporting. */
export async function getGenerations(locationId: string): Promise<ConvResult<Record<string, unknown>[]>> {
  const res = await crmGet('/conversation-ai/generations', locationId)
  return read(res, (j) => (j.generations ?? j.data ?? []) as Record<string, unknown>[])
}
