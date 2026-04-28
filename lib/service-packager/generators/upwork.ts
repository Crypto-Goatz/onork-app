import { groqJSON } from '../groq'
import type { IngestResult, UpworkListing } from '../types'

const SYSTEM = `You write Upwork profile/proposal copy. First-person, professional, results-focused. No buzzwords.`

export async function generateUpworkListing(input: IngestResult): Promise<UpworkListing> {
  const userPrompt = `Generate an Upwork listing as JSON. Return ONLY valid JSON:

{
  "title": "≤100 char title",
  "overview": "500-2000 char first-person overview describing what I deliver",
  "skills": ["10-20 Upwork skill tags relevant to this service"],
  "hourly_rate_range": { "min": 50, "max": 150 },
  "fixed_price_range": { "min": 200, "max": 2000 },
  "portfolio_description": "Per-project portfolio description (≤300 words)",
  "proposal_template": "Pre-written proposal template I can paste when bidding on relevant jobs (300-500 chars)"
}

Service:
- ${input.service_name}: ${input.service_description}
- Audience: ${input.target_audience}
- Deliverable: ${input.primary_deliverable}
- Anchor price: $${(input.price_anchor_cents / 100).toFixed(0)}
- Category: ${input.category}
- Keywords: ${input.keywords.join(', ')}`

  return groqJSON<UpworkListing>(SYSTEM, userPrompt, { maxTokens: 2048 })
}
