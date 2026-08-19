// lib/hub-gate.ts
// IKY ("I know you") verification for the 0nVault door. Picks a LOGICAL question
// only the real account owner would easily answer — from their own profile — and
// derives the expected answer for the AI judge. Logical, not "tech-savvy".
import { createHash } from 'crypto'

type Profile = {
  full_name?: string | null
  display_name?: string | null
  username?: string | null
  company?: string | null
  business_name?: string | null
  business_type?: string | null
  website?: string | null
}

const SECRET = process.env.HUB_TRUST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'onvault-dev'

/** A per-user token proving THIS browser was verified. Stored in the 0n_trusted cookie. */
export function hubTrustToken(userId: string): string {
  return createHash('sha256').update(`${userId}::${SECRET}`).digest('hex').slice(0, 40)
}

export interface Challenge { id: string; question: string }

/**
 * The name to call this person by. ONE definition, used by both the greeting and
 * the IKY judge, so the two can never disagree about who the user is.
 *
 * Precedence is deliberate: `display_name` is the only one of these a HUMAN ever
 * typed (the "Your name" field in account settings). `full_name` is written once
 * by the signup trigger from the OAuth provider's profile and never confirmed by
 * anyone — so it carries whatever the provider had, typo, nickname or handle.
 * The person's own answer outranks the machine's copy.
 */
export function preferredName(p: Profile, email = ''): string {
  const pick = [p.display_name, p.full_name, p.username]
    .map((v) => String(v ?? '').trim())
    .find(Boolean)
  return pick || String(email).split('@')[0] || ''
}

/** First name only — what the door greets you with. */
export function preferredFirstName(p: Profile, email = ''): string {
  return preferredName(p, email).split(/\s+/)[0] || 'there'
}

/** Choose the most answerable logical question given what we know about the user. */
export function buildChallenge(p: Profile, services: string[], email: string): Challenge {
  if (p.business_name || p.company) return { id: 'company', question: "To confirm it's really you — what's the name of your business?" }
  if (p.website) return { id: 'website', question: 'What website is on your account?' }
  if (p.business_type) return { id: 'business_type', question: 'What kind of business do you run?' }
  if (services && services.length) return { id: 'connected', question: "Name one app you've connected to your 0n vault." }
  if (email) return { id: 'email', question: 'What email address is this account under?' }
  return { id: 'name', question: "What's your first name?" }
}

/** The private truth the answer is checked against (never sent to the browser). */
export function expectedFor(id: string, p: Profile, services: string[], email: string): string {
  switch (id) {
    case 'company': return String(p.business_name || p.company || '')
    case 'website': return String(p.website || '')
    case 'business_type': return String(p.business_type || '')
    case 'connected': return (services || []).join(', ')
    case 'email': return email || ''
    case 'name': return preferredName(p, email).split(/\s+/)[0] || ''
    default: return ''
  }
}
