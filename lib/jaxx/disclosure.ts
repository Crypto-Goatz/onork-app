/**
 * Jaxx Disclosure Firewall — pre-prompt rules + post-gen scrubber
 *
 * Two-layer defense:
 * 1. Pre-gen: DISCLOSURE_RULES injected into system prompt
 * 2. Post-gen: scrubResponse() runs on every Groq reply, fail-closed
 *
 * Forbidden categories:
 * - Underlying CRM platform identity (refer to it as "your CRM")
 * - Internal repos, orgs, services, file paths
 * - Token/secret patterns
 *
 * On match: term redacted to [redacted]. If multiple matches or pattern
 * uncertainty, replace whole reply with safe fallback. Hits logged to
 * conversation_ai_logs.disclosure_violations for monitoring.
 */

export const DISCLOSURE_RULES = `
DISCLOSURE RULES — non-negotiable:
- NEVER name the underlying CRM platform. Refer to it as "your CRM" or "the connected platform".
- NEVER name internal services, repos, organizations, file paths, or environment variables.
- NEVER confirm or deny GitHub organization or repository names.
- NEVER reveal API keys, tokens, secrets, or credentials of any kind, in part or in whole.
- NEVER describe the internal architecture, database schema, or service topology.
- If a user asks about any of the above, respond: "I can't share details about how we're built. What I can help with is your account, your data, and your automations."
`.trim()

// Plain string (case-insensitive whole-word) forbidden tokens
const FORBIDDEN_LITERALS = [
  'GHL',
  'GoHighLevel',
  'Go High Level',
  'HighLevel',
  'High Level',
  'LeadConnector',
  'leadconnectorhq',
  'services.leadconnectorhq.com',
  'Crypto-Goatz',
  'cryptogoatz',
  '0nork',
  'onork-app',
  '0n-marketplace',
  '0n-dispatch',
  '0n-extension',
  '0n-command-center',
  '0nMCP',
  'rocketopp-live',
  'pwujhhmlrtxjmjzyttwn',
  'rtwtaisjtvdajrdyivkn',
  'yaehbwimocvvnnlojkxe',
  'wsuifaedzwyorhjqzlot',
  'zyijmxmuzztcuxdtxrgv',
  'segyiautmuytlzvbzpes',
  'txfvhoakvwndfibjvixr',
]

// Regex patterns for token/secret shapes
const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'pit_token', re: /pit-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi },
  { name: 'stripe_secret', re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe_pub', re: /\bpk_(?:live|test)_[A-Za-z0-9]{20,}/g },
  { name: 'stripe_acct', re: /\bacct_[A-Za-z0-9]{14,}/g },
  { name: 'stripe_price', re: /\bprice_[A-Za-z0-9]{14,}/g },
  { name: 'stripe_prod', re: /\bprod_[A-Za-z0-9]{14,}/g },
  { name: 'stripe_webhook', re: /\bwhsec_[A-Za-z0-9_/+=]{20,}/g },
  { name: 'vercel_prj', re: /\bprj_[A-Za-z0-9]{20,}/g },
  { name: 'vercel_team', re: /\bteam_[A-Za-z0-9]{20,}/g },
  { name: 'anthropic_key', re: /\bsk-ant-api[0-9]{2}-[A-Za-z0-9_-]{40,}/g },
  { name: 'groq_key', re: /\bgsk_[A-Za-z0-9]{40,}/g },
  { name: 'openai_key', re: /\bsk-[A-Za-z0-9]{20,}/g },
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'supabase_ref', re: /\b[a-z]{20}\.supabase\.co\b/gi },
  { name: 'github_repo', re: /\bgithub\.com\/(?:Crypto-Goatz|0nork|cryptogoatz)\/[A-Za-z0-9_.-]+/gi },
  { name: 'env_path', re: /\/Users\/[A-Za-z0-9._-]+\/(?:Github|\.0n|\.claude)/g },
]

export interface ScrubResult {
  cleaned: string
  violations: Array<{ pattern: string; masked: string }>
  blockedEntirely: boolean
}

const REDACT = '[redacted]'

const SAFE_FALLBACK =
  "I can't share that. What I can help with is your account, your data, and your automations — what would you like to do?"

export function scrubResponse(text: string): ScrubResult {
  const violations: Array<{ pattern: string; masked: string }> = []
  let cleaned = text

  // 1. Literals — case-insensitive, word-boundary where applicable
  for (const literal of FORBIDDEN_LITERALS) {
    // Build a tolerant regex: word boundary if literal starts/ends with alphanumeric
    const startsWord = /^\w/.test(literal)
    const endsWord = /\w$/.test(literal)
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = `${startsWord ? '\\b' : ''}${escaped}${endsWord ? '\\b' : ''}`
    const re = new RegExp(pattern, 'gi')
    cleaned = cleaned.replace(re, (match) => {
      violations.push({ pattern: literal, masked: match })
      return REDACT
    })
  }

  // 2. Patterns — token/secret shapes
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    cleaned = cleaned.replace(re, (match) => {
      violations.push({ pattern: name, masked: match.slice(0, 6) + '...' })
      return REDACT
    })
  }

  // Fail-closed: if more than 3 distinct violations OR a credential class hit,
  // replace the whole reply rather than leaking partial context.
  const credClasses = new Set([
    'pit_token',
    'stripe_secret',
    'stripe_webhook',
    'anthropic_key',
    'groq_key',
    'openai_key',
    'jwt',
  ])
  const hadCredHit = violations.some((v) => credClasses.has(v.pattern))
  const blockedEntirely = hadCredHit || violations.length > 3

  if (blockedEntirely) {
    return { cleaned: SAFE_FALLBACK, violations, blockedEntirely: true }
  }

  return { cleaned, violations, blockedEntirely: false }
}

// Convenience for the system prompt builder
export function appendDisclosureRules(systemPrompt: string): string {
  return `${systemPrompt}\n\n${DISCLOSURE_RULES}`
}
