/**
 * 3-layer prompt assembly.
 *
 *   Layer 1: RocketOpp K-Layers   → identity + rocketopp + (later) capabilities
 *   Layer 2: Location K-Layers    → business profile, brand voice, FAQ, competitors
 *   Layer 3: Trained Llama        → operational rules + capabilities (pack-driven)
 *
 * Resolution order (mirrors 0n-spec):
 *   system → location → onboarding → pack_overrides
 * Nothing overrides [OPERATIONAL RULES].
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

import { identityFragment } from './k-layers/identity'
import { rocketOppFragment } from './k-layers/rocketopp'
import { locationFragment, type AgentRow } from './k-layers/location'
import { rulesFragment } from './k-layers/rules'
import { capabilitiesFragment, type PackId } from './k-layers/packs'

export interface BuildPromptOpts {
  agent: AgentRow
  activePacks: PackId[]
}

export function buildSystemPrompt({ agent, activePacks }: BuildPromptOpts): string {
  const businessName = agent.business_name?.trim() || 'this business'
  const bookingUrl = agent.booking_url?.trim() || undefined

  const sections = [
    identityFragment({ businessName, agentName: agent.agent_name ?? undefined }),
    rocketOppFragment(),
    locationFragment(agent),
    capabilitiesFragment(activePacks),
    rulesFragment({ businessName, bookingUrl }),
  ]

  return sections.filter(Boolean).join('\n\n')
}
