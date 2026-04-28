/**
 * Generates a productized CRM service: pipeline, custom fields, email
 * templates, and tags. The output drops cleanly into a sub-account snapshot
 * deploy when the user sells the service to a customer.
 */

import { groqJSON } from '../groq'
import type { CRMService, IngestResult } from '../types'

const SYSTEM = `You design CRM productized services. Output realistic pipelines, custom fields, and on-brand email templates that move the buyer from interest → delivery → upsell.`

export async function generateCRMService(input: IngestResult): Promise<CRMService> {
  const userPrompt = `Generate a CRM productized service as JSON for: ${input.service_name}.

Return ONLY:

{
  "pipeline": {
    "name": "${input.service_name} pipeline",
    "stages": ["Lead", "Discovery", "Proposal", "Won", "In Delivery", "Delivered", "Upsell"]
  },
  "custom_fields": [
    { "name": "Source URL", "key": "source_url", "type": "text" },
    { "name": "Deliverable Status", "key": "deliverable_status", "type": "single_select" }
  ],
  "email_templates": [
    { "name": "Discovery — initial reach", "subject": "...", "body": "..." },
    { "name": "Proposal — scope confirmation", "subject": "...", "body": "..." },
    { "name": "Onboarding — kickoff", "subject": "...", "body": "..." },
    { "name": "Delivery — handoff", "subject": "...", "body": "..." },
    { "name": "Upsell — retainer offer", "subject": "...", "body": "..." }
  ],
  "tags": ["new-${input.category.toLowerCase().replace(/\s+/g, '-')}-lead", "qualified", "delivered"]
}

Service:
- ${input.service_name}: ${input.service_description}
- Audience: ${input.target_audience}
- Deliverable: ${input.primary_deliverable}
- Time: ${input.delivery_time}
- Anchor price: $${(input.price_anchor_cents / 100).toFixed(0)}

Email bodies should be 80-200 words, plain text with placeholder variables like {{first_name}}.`

  return groqJSON<CRMService>(SYSTEM, userPrompt, { maxTokens: 3072 })
}
