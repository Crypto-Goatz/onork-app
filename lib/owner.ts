/**
 * Is the person looking at this the account owner?
 *
 * ONE PLACE, because "owner" was already being decided in three: an email
 * literal in agency-billing's freeForeverEmails, another in family-locations,
 * and nothing at all on the marketplace. Three copies of a rule about who may
 * see private things is three chances for one of them to be missed the day the
 * address changes.
 *
 * IT READS THE ENVIRONMENT FIRST. OWNER_EMAIL is already set in production; a
 * hardcoded address is a fallback so a missing variable cannot silently promote
 * everyone or lock the owner out of their own tooling.
 *
 * FALSE IS THE SAFE ANSWER and the default in every failure path — no session,
 * no email, a thrown error. The cost of wrongly returning false is that Mike
 * cannot see an internal listing; the cost of wrongly returning true is that a
 * customer can. Those are not comparable.
 */
import { createClient } from '@/lib/supabase/server'

const FALLBACK_OWNER = 'mike@rocketopp.com'

export function ownerEmails(): string[] {
  const fromEnv = (process.env.OWNER_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return fromEnv.length ? fromEnv : [FALLBACK_OWNER]
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ownerEmails().includes(email.trim().toLowerCase())
}

/**
 * Server-side check for the current request.
 *
 * getSession, never getUser — getUser makes a network call that races the
 * middleware's cookie refresh and signs people out, which is the five-month
 * "click anything and you're logged out" bug this codebase already paid for.
 */
export async function isOwner(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const email = (await supabase.auth.getSession()).data.session?.user?.email
    return isOwnerEmail(email)
  } catch {
    return false
  }
}
