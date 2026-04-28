/**
 * Generates a .0n marketplace app + UCP product from the service.
 * The .0n app's workflow is a thin shape — primary value is the manifest
 * itself appearing in the marketplace catalog.
 */

import { groqJSON } from '../groq'
import type { IngestResult, OnApp, UCPProduct } from '../types'

const SYSTEM = `You design .0n marketplace apps. Each app wraps an automation that delivers a service. Prefer simple workflows: one trigger, 1-3 steps that call existing 0nMCP tools.`

interface MarketplaceOutput {
  on_app: OnApp
  ucp_product: UCPProduct
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

export async function generateMarketplaceApp(input: IngestResult): Promise<MarketplaceOutput> {
  const slug = slugify(input.service_name)
  const userPrompt = `Generate a marketplace listing as JSON with two fields: on_app and ucp_product.

{
  "on_app": {
    "name": "${input.service_name}",
    "slug": "${slug}",
    "description": "${input.service_description}",
    "category": "${input.category}",
    "version": "1.0.0",
    "workflow": {
      "trigger": { "type": "manual" },
      "steps": [
        { "id": "step1", "type": "<webhook|crm_action|ai>", "config": { /* shape per type */ } }
      ]
    }
  },
  "ucp_product": {
    "name": "${input.service_name}",
    "slug": "${slug}",
    "description": "${input.service_description}",
    "category": "${input.category}",
    "price_cents": ${input.price_anchor_cents},
    "fulfillment_type": "automated"
  }
}

Service deliverable: ${input.primary_deliverable}
Audience: ${input.target_audience}
Time: ${input.delivery_time}

Design the workflow steps to actually deliver this service when triggered. Use realistic step configs. Return ONLY valid JSON.`

  return groqJSON<MarketplaceOutput>(SYSTEM, userPrompt, { maxTokens: 2048 })
}
