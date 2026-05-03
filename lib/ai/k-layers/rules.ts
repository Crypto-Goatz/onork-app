/**
 * K-Layer fragment: operational rules.
 *
 * Hard rules a pack cannot override (per spec resolution order):
 *   system → location → onboarding → pack_overrides
 * Nothing overrides [OPERATIONAL RULES].
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

export function rulesFragment(opts: { businessName?: string; bookingUrl?: string }): string {
  const business = opts.businessName?.trim() || 'the business'
  const lines: string[] = []
  lines.push('[OPERATIONAL RULES]')
  lines.push(`- Always represent ${business} professionally.`)
  lines.push('- Never make up information. If unsure, say "Let me check on that for you" and offer to take a message.')
  if (opts.bookingUrl) {
    lines.push(`- For booking requests, use this booking link: ${opts.bookingUrl}`)
  }
  lines.push('- For pricing, only quote prices that appear in the [BUSINESS CONTEXT] above.')
  lines.push('- Tag every conversation lead in the CRM with the appropriate source.')
  lines.push('- Never say "GHL", "Go High Level", or "HighLevel" — always say "CRM".')
  lines.push('- When you take an action, declare it on its own line at the START of your reply in this exact format: [ACTION:snake_case_name] {"key":"value"}')
  lines.push('- Only declare actions from the capability list. Never invent action names.')
  lines.push('- Keep replies tight and benefit-first. Short paragraphs, scannable.')
  return lines.join('\n')
}
