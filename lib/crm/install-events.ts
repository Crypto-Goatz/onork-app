/**
 * A DURABLE RECORD OF EVERY INSTALL OUTCOME.
 *
 * `crm_install_events` has existed for months, held 0 rows, and nothing in the
 * codebase referenced it. Every install outcome — success, credential
 * rejection, a spent code, or a token exchange that worked followed by an
 * upsert that did not — existed only as a console line in Vercel function logs,
 * which are not retained. That is why 42 installs of one app and every install
 * of another went unexplained for weeks: by the time anyone asked, the evidence
 * had already expired.
 *
 * Three rules this file exists to hold:
 *
 * 1. RECORDING A FAILURE MUST NEVER CAUSE ONE. Every write is fire-and-forget
 *    and swallows its own error. An install that would otherwise have completed
 *    must not break because the audit insert hit a constraint, and a failed
 *    install must not turn into a 500 on the way to reporting itself.
 *
 * 2. `location_id` IS NOT NULL, and a failed exchange never yields one — that
 *    is the whole point of the failure. So failures are filed under a sentinel
 *    rather than being dropped by the constraint. A row under `(none)` is a
 *    record; a row that was never written is nothing.
 *
 * 3. NEVER STORE THE AUTHORIZATION CODE. A short prefix is enough to correlate
 *    a redirect with a row, and a whole code in a table is a credential in a
 *    table.
 */
import { createClient } from '@supabase/supabase-js'

/** Failed exchanges have no location. Filed, not dropped. */
export const NO_LOCATION = '(none)'

export type InstallEventType =
  | 'install_succeeded'
  | 'install_failed'
  | 'install_upsert_failed'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/** A code prefix long enough to correlate, short enough to be useless. */
export function codeFingerprint(code: string | null | undefined): string {
  const c = String(code || '')
  return c ? `${c.slice(0, 6)}…(${c.length})` : '(no code)'
}

/**
 * Write one install event. Never throws, never rejects, never blocks the
 * caller's happy path — await it or do not, the outcome for the install is the
 * same.
 */
export function recordInstallEvent(
  eventType: InstallEventType,
  locationId: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  const run = async () => {
    try {
      const db = admin()
      if (!db) {
        console.warn('[install-events] no service-role credentials; event not recorded:', eventType)
        return
      }
      const { error } = await db.from('crm_install_events').insert({
        location_id: locationId || NO_LOCATION,
        event_type: eventType,
        payload,
      })
      if (error) console.warn('[install-events] insert failed:', error.message)
    } catch (e) {
      console.warn('[install-events] insert threw:', (e as Error)?.message)
    }
  }
  // Deliberately not returned to the caller as a rejectable promise.
  return run().catch(() => undefined)
}
