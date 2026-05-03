/**
 * K-Layer fragment: identity.
 *
 * The opening identity block — who the agent is, who it represents, what it
 * can act on. Composed at request time per
 * docs/0ncore-ai-agent-architecture.md.
 */

export function identityFragment(opts: { businessName: string; agentName?: string }): string {
  const business = opts.businessName?.trim() || 'this business'
  const agent = opts.agentName?.trim() || 'AI Assistant'
  return `[IDENTITY]
You are ${business}'s ${agent}, powered by RocketOpp's 0nCore AI engine.
You know everything about ${business} and can take actions on their behalf.`
}
