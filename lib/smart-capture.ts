// Smart Capture — Detects actionable data in user input and offers to save it
// Used by: chat, forms, task descriptions, email composer, any text input

export interface DetectedData {
  type: 'phone' | 'email' | 'api_key' | 'url' | 'address' | 'company_name' | 'stripe_key' | 'date' | 'price'
  value: string
  label: string
  field: string // which profile/settings field this maps to
  confidence: number // 0-1
}

const PATTERNS: { type: DetectedData['type']; regex: RegExp; label: string; field: string; confidence: number }[] = [
  // Phone numbers
  { type: 'phone', regex: /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, label: 'Phone Number', field: 'phone', confidence: 0.9 },

  // Email addresses
  { type: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'Email Address', field: 'email', confidence: 0.95 },

  // API Keys (common patterns)
  { type: 'api_key', regex: /sk[-_](?:live|test)[-_][a-zA-Z0-9]{20,}/g, label: 'Stripe Secret Key', field: 'stripe_key', confidence: 0.98 },
  { type: 'api_key', regex: /pk[-_](?:live|test)[-_][a-zA-Z0-9]{20,}/g, label: 'Stripe Publishable Key', field: 'stripe_pub_key', confidence: 0.98 },
  { type: 'api_key', regex: /sk-ant-[a-zA-Z0-9-]{40,}/g, label: 'Anthropic API Key', field: 'anthropic_key', confidence: 0.99 },
  { type: 'api_key', regex: /sk-[a-zA-Z0-9]{40,}/g, label: 'OpenAI API Key', field: 'openai_key', confidence: 0.95 },
  { type: 'api_key', regex: /gsk_[a-zA-Z0-9]{40,}/g, label: 'Groq API Key', field: 'groq_key', confidence: 0.98 },
  { type: 'api_key', regex: /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, label: 'Slack Bot Token', field: 'slack_token', confidence: 0.98 },
  { type: 'api_key', regex: /ghp_[a-zA-Z0-9]{36}/g, label: 'GitHub Token', field: 'github_token', confidence: 0.98 },
  { type: 'api_key', regex: /pit-[a-f0-9-]{36}/g, label: 'CRM PIT Token', field: 'crm_pit', confidence: 0.99 },
  { type: 'api_key', regex: /whsec_[a-zA-Z0-9+/=]{20,}/g, label: 'Webhook Secret', field: 'webhook_secret', confidence: 0.95 },
  { type: 'api_key', regex: /eyJhbGciOi[a-zA-Z0-9._-]{50,}/g, label: 'JWT / Supabase Key', field: 'supabase_key', confidence: 0.9 },

  // URLs
  { type: 'url', regex: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g, label: 'Website URL', field: 'website', confidence: 0.8 },

  // Prices
  { type: 'price', regex: /\$[0-9,]+(?:\.[0-9]{2})?/g, label: 'Price', field: 'pricing', confidence: 0.7 },
]

export function detectData(text: string): DetectedData[] {
  const results: DetectedData[] = []
  const seen = new Set<string>()

  for (const pattern of PATTERNS) {
    const matches = text.match(pattern.regex)
    if (matches) {
      for (const match of matches) {
        const key = `${pattern.type}:${match}`
        if (seen.has(key)) continue
        seen.add(key)

        results.push({
          type: pattern.type,
          value: match,
          label: pattern.label,
          field: pattern.field,
          confidence: pattern.confidence,
        })
      }
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence)
}

// Check if a specific type of data has already been saved
export function isNewData(detected: DetectedData, existingProfile: Record<string, unknown>): boolean {
  const existing = existingProfile[detected.field]
  if (!existing) return true
  if (typeof existing === 'string' && existing === detected.value) return false
  return true
}

// Generate the prompt for the AI to ask about saving
export function generateSavePrompt(items: DetectedData[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) {
    const item = items[0]
    return `I noticed you shared a ${item.label}: ${item.value.slice(0, 20)}... Would you like me to save this to your 0nCore account?`
  }
  const types = items.map(i => i.label).join(', ')
  return `I detected ${items.length} pieces of data (${types}). Would you like me to save these to your 0nCore account?`
}
