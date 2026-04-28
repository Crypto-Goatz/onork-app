/**
 * Landing page copy generator. Output is a complete page-shape that can
 * be rendered by /lead/[funnel] / /pricing-style templates or a future
 * generated-site engine.
 */

import { groqJSON } from '../groq'
import type { IngestResult, LandingPage } from '../types'

const SYSTEM = `You write high-conversion landing pages. Lead with the outcome. Anchor on a specific transformation. Prove with what's inside. Close with one unmistakable CTA.`

export async function generateLandingPage(input: IngestResult): Promise<LandingPage> {
  const userPrompt = `Generate a landing page as JSON for: ${input.service_name}.

Return ONLY valid JSON matching this exact shape:

{
  "headline": "Magnetic 5-9 word headline",
  "subheadline": "One-line outcome promise",
  "hero_cta": "Get Started | Book a Call | etc.",
  "problem_section": "100-200 words on the pain",
  "solution_section": "100-200 words on the fix",
  "features": [
    { "title": "...", "description": "30-60 words", "icon": "Lucide icon name e.g. 'Zap'" }
  ],
  "pricing_section": {
    "tiers": [
      { "name": "Tier name", "price": "$X / month or $X one-time", "features": ["..."], "cta": "Choose this" }
    ]
  },
  "social_proof": "One-line testimonial OR a hard stat",
  "faq": [{ "q": "...", "a": "..." }],
  "final_cta": { "headline": "...", "subtext": "...", "button": "..." },
  "meta_title": "≤60 chars SEO title",
  "meta_description": "≤155 chars",
  "og_title": "Same as meta_title or punchier",
  "og_description": "Same as meta_description"
}

Rules:
- 4-6 features
- 1-3 pricing tiers
- 4-6 FAQ items
- Use Lucide icon names that actually exist (Zap, Bot, Cpu, Globe, Layers, MessageSquare, ShieldCheck, Sparkles, Target, Workflow)

Service:
- ${input.service_name}: ${input.service_description}
- Audience: ${input.target_audience}
- Deliverable: ${input.primary_deliverable}
- Time: ${input.delivery_time}
- Price anchor: $${(input.price_anchor_cents / 100).toFixed(0)}
- Keywords: ${input.keywords.join(', ')}`

  return groqJSON<LandingPage>(SYSTEM, userPrompt, { maxTokens: 4096 })
}
