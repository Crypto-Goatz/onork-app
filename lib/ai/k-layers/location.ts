/**
 * K-Layer fragment: location (Layer 2).
 *
 * Per-client business profile, brand voice, services, FAQ, competitors —
 * resolved from the ai_agents row. Empty fields are simply omitted so the
 * prompt stays compact during early onboarding.
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

export interface AgentRow {
  agent_name?: string | null
  brand_tone?: string | null
  brand_phrases?: unknown
  brand_avoid?: unknown
  services?: unknown
  pricing?: unknown
  faq?: unknown
  competitors?: unknown
  business_name?: string | null
  business_address?: string | null
  business_phone?: string | null
  business_website?: string | null
  business_hours?: string | null
  booking_url?: string | null
  onboarding_completed?: boolean | null
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v : typeof v === 'object' && v ? JSON.stringify(v) : String(v ?? '')))
    .filter((v) => v.trim().length > 0)
}

function asObjectList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
}

export function locationFragment(agent: AgentRow): string {
  const lines: string[] = []
  const business = agent.business_name?.trim() || 'this business'

  lines.push('[BUSINESS CONTEXT]')
  lines.push(`Business: ${business}`)
  if (agent.business_address) lines.push(`Address: ${agent.business_address}`)
  if (agent.business_phone) lines.push(`Phone: ${agent.business_phone}`)
  if (agent.business_website) lines.push(`Website: ${agent.business_website}`)
  if (agent.business_hours) lines.push(`Hours: ${agent.business_hours}`)
  if (agent.booking_url) lines.push(`Booking link: ${agent.booking_url}`)

  // Services / pricing
  const services = asObjectList(agent.services)
  if (services.length > 0) {
    lines.push('')
    lines.push('Services:')
    for (const s of services) {
      const name = String(s.name ?? '').trim()
      const desc = String(s.description ?? '').trim()
      if (!name) continue
      lines.push(desc ? `- ${name} — ${desc}` : `- ${name}`)
    }
  }

  const pricing = asObjectList(agent.pricing)
  if (pricing.length > 0) {
    lines.push('')
    lines.push('Pricing:')
    for (const p of pricing) {
      const name = String(p.name ?? p.tier ?? '').trim()
      const price = String(p.price ?? p.amount ?? '').trim()
      if (!name) continue
      lines.push(price ? `- ${name}: ${price}` : `- ${name}`)
    }
  }

  // Brand voice
  const tone = agent.brand_tone?.trim()
  const phrases = asStringList(agent.brand_phrases)
  const avoid = asStringList(agent.brand_avoid)
  if (tone || phrases.length || avoid.length) {
    lines.push('')
    lines.push('[BRAND VOICE]')
    if (tone) lines.push(`Tone: ${tone}`)
    if (phrases.length) lines.push(`Key phrases: ${phrases.join(', ')}`)
    if (avoid.length) lines.push(`Never say: ${avoid.join(', ')}`)
  }

  // FAQ
  const faq = asObjectList(agent.faq)
  if (faq.length > 0) {
    lines.push('')
    lines.push('[FAQ — approved answers]')
    for (const item of faq) {
      const q = String(item.question ?? item.q ?? '').trim()
      const a = String(item.answer ?? item.a ?? '').trim()
      if (!q || !a) continue
      lines.push(`Q: ${q}`)
      lines.push(`A: ${a}`)
    }
  }

  // Competitors
  const competitors = asObjectList(agent.competitors)
  if (competitors.length > 0) {
    lines.push('')
    lines.push('[COMPETITORS]')
    for (const c of competitors) {
      const name = String(c.name ?? '').trim()
      const diff = String(c.differentiator ?? c.note ?? '').trim()
      if (!name) continue
      lines.push(diff ? `- ${name} — we differ by: ${diff}` : `- ${name}`)
    }
  }

  if (!agent.onboarding_completed) {
    lines.push('')
    lines.push('[ONBOARDING NOT COMPLETE — keep answers conservative; if data is missing, say "Let me check on that for you" rather than inventing details.]')
  }

  return lines.join('\n')
}
