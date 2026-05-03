/**
 * Prompt-pack capability fragments + the action surface each pack unlocks.
 *
 * A pack adds (a) capability lines to the system prompt and (b) action_type
 * names that the chat endpoint will recognise in [ACTION:...] tags. The
 * action set is intentionally small in Phase 1 — Phase 3 wires the actual
 * deploy / schedule / draft handlers per pack.
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

export type PackId =
  | 'campaign_builder'
  | 'content_generator'
  | 'pipeline_coach'
  | 'reputation_manager'
  | 'report_generator'

interface PackDef {
  id: PackId
  display: string
  capabilities: string[]
  actions: string[]
}

export const PACK_DEFS: Record<PackId, PackDef> = {
  campaign_builder: {
    id: 'campaign_builder',
    display: 'Campaign Builder',
    capabilities: [
      'Generate complete marketing campaigns (email + SMS + social + landing page)',
      'Deploy campaigns directly to the CRM workflow system',
    ],
    actions: ['build_campaign', 'deploy_campaign'],
  },
  content_generator: {
    id: 'content_generator',
    display: 'Content Generator',
    capabilities: [
      'Write social media posts, email newsletters, and blog content',
      'Score content with VPIS before publishing',
      'Schedule posts across connected platforms',
    ],
    actions: ['generate_content', 'schedule_post', 'score_content'],
  },
  pipeline_coach: {
    id: 'pipeline_coach',
    display: 'Pipeline Coach',
    capabilities: [
      'Analyze the sales pipeline and prioritize next-best actions',
      'Alert about overdue leads and stale deals',
      'Suggest concrete follow-up moves per contact',
    ],
    actions: ['pipeline_summary', 'create_task', 'tag_priority'],
  },
  reputation_manager: {
    id: 'reputation_manager',
    display: 'Reputation Manager',
    capabilities: [
      'Draft responses to new reviews in brand voice',
      'Send review-request SMS / email sequences',
    ],
    actions: ['draft_review_response', 'send_review_request'],
  },
  report_generator: {
    id: 'report_generator',
    display: 'Report Generator',
    capabilities: [
      'Pull campaign performance and generate plain-English summaries',
      'Compare month-over-month metrics and call out what changed',
    ],
    actions: ['generate_report', 'compare_periods'],
  },
}

export const ALL_PACK_IDS: PackId[] = Object.keys(PACK_DEFS) as PackId[]

export function isPackId(value: string): value is PackId {
  return (ALL_PACK_IDS as string[]).includes(value)
}

/**
 * Build the [CAPABILITIES] block. Always includes the base capabilities,
 * then appends one indented bullet per active pack capability line.
 */
export function capabilitiesFragment(activePacks: PackId[]): string {
  const lines: string[] = []
  lines.push('[CAPABILITIES]')
  lines.push('You can:')
  lines.push('- Answer questions about the business — services, pricing, availability')
  lines.push('- Help visitors book appointments using the booking link')
  lines.push('- Qualify leads by asking concise, useful questions')
  lines.push('- Respond to reviews professionally')

  for (const id of activePacks) {
    const pack = PACK_DEFS[id]
    if (!pack) continue
    for (const cap of pack.capabilities) {
      lines.push(`- ${cap}`)
    }
  }
  return lines.join('\n')
}

/**
 * Combined action surface — base + all unlocked packs. Returned as a Set
 * for O(1) membership checks during action parsing.
 */
export function activeActionSet(activePacks: PackId[]): Set<string> {
  const base = new Set<string>(['create_tag', 'search_contacts', 'add_note'])
  for (const id of activePacks) {
    const pack = PACK_DEFS[id]
    if (!pack) continue
    for (const action of pack.actions) base.add(action)
  }
  return base
}
