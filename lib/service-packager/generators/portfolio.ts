/**
 * Portfolio item generator. Output goes to portfolio_items + the public
 * portfolio page on the user's profile.
 */

import { groqJSON } from '../groq'
import type { IngestResult, PortfolioItem } from '../types'

const SYSTEM = `You write portfolio copy that converts. Benefit-led. No fluff. Lead with the outcome the buyer gets, not the process.`

export async function generatePortfolioItem(input: IngestResult): Promise<PortfolioItem> {
  const userPrompt = `Generate a portfolio item for this service. Return ONLY valid JSON:

{
  "title": "Short outcome-focused title",
  "subtitle": "One-line value prop",
  "description": "200-400 word benefit-focused description",
  "features": ["5 to 8 bullet points covering what's included"],
  "pricing_display": "Starting at $XXX or From $XX/month",
  "delivery_display": "Delivered in <time>",
  "target_audience": "One sentence describing who this is for",
  "case_study_hook": "One-sentence transformation story (e.g. 'See how Company X saved $12K...')",
  "cta_text": "Get Started | Order Now | Book Strategy Call",
  "cta_url": "https://0ncore.com/signup",
  "cover_image": { "url": "${input.images[0] ?? ''}", "alt": "..." },
  "tags": ["3 to 6 lowercase tags"]
}

Service:
- Name: ${input.service_name}
- Description: ${input.service_description}
- Audience: ${input.target_audience}
- Deliverable: ${input.primary_deliverable}
- Time: ${input.delivery_time}
- Price anchor: $${(input.price_anchor_cents / 100).toFixed(0)}
- Keywords: ${input.keywords.join(', ')}
- Category: ${input.category}`

  return groqJSON<PortfolioItem>(SYSTEM, userPrompt, { maxTokens: 2048 })
}
