/**
 * What one crm_installations row can actually DO — in one place, for everyone.
 *
 * WHY THIS IS ITS OWN FILE. The taxonomy below was written inside
 * /api/mkt/installs, where it answered an operator's question ("which installs
 * are broken"). The re-consent prompt asks a customer's question ("can this app
 * work for me right now") and it is the SAME question about the same seven
 * states. Copying the ladder into a second file is how one surface starts
 * calling a row dying while another still calls it live — this codebase has
 * already paid for three catalogues that disagreed about what exists, and a
 * second disagreeing health ladder would be the same mistake in a new column.
 *
 * A ROW AT REST CANNOT TELL YOU IT WAS REVOKED. Two installs here held long,
 * well-formed refresh tokens issued by the client we present, against
 * credentials proven valid — and the CRM rejected both, because it had revoked
 * the authorization. Only an ATTEMPT discovers that, so the refresh worker
 * writes its finding to health_status and this trusts it over the optimistic
 * read of the columns.
 */

export type InstallVerdict =
  | 'live'                 // token present and in date — this one works
  | 'expiring'             // in date, but inside the hour
  | 'expired-refreshable'  // expired; the worker can still recover it
  | 'expired-dead'         // expired AND unrecoverable: only a reinstall fixes it
  | 'no-token'             // the row exists and the exchange never produced a token
  | 'dying'                // works today, cannot survive expiry — no refresh token
  | 'unknown-expiry'

/** The columns a verdict is derived from. Deliberately never includes a token value. */
export interface InstallVerdictRow {
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  /** What the refresh worker LEARNED by attempting, vs what the row looks like at rest. */
  health_status: string | null
}

/**
 * Terminal states. Retrying cannot move these; a human has to re-authorize.
 * Everything else either works or can be recovered by the refresh worker.
 */
const TERMINAL: ReadonlySet<InstallVerdict> = new Set<InstallVerdict>([
  'expired-dead',
  'no-token',
])

/** True when no amount of retrying will restore this install. */
export function isTerminal(v: InstallVerdict): boolean {
  return TERMINAL.has(v)
}

/**
 * True when the install can serve a call RIGHT NOW.
 * 'dying' is usable and not safe — those are different questions, and the
 * caller is expected to care about both.
 */
export function isUsable(v: InstallVerdict): boolean {
  return v === 'live' || v === 'expiring' || v === 'dying'
}

export function verdictFor(r: InstallVerdictRow, now: number = Date.now()): {
  verdict: InstallVerdict
  why: string
} {
  if (!r.access_token) {
    return {
      verdict: 'no-token',
      why: 'The install completed but the code was never exchanged for a token. This account cannot be written to.',
    }
  }
  if (!r.expires_at) {
    return {
      verdict: 'unknown-expiry',
      why: 'No expiry recorded, so this token cannot be trusted or refreshed on schedule.',
    }
  }

  const ms = new Date(r.expires_at).getTime() - now

  // Caught BEFORE it dies. An install with no refresh token works perfectly
  // today and is unrecoverable tomorrow — waiting for expiry to report it is
  // how 26 of these went unnoticed until a customer complained.
  if (ms > 0 && !r.refresh_token) {
    return {
      verdict: 'dying',
      why: 'Works now, but no refresh token was ever stored — this stops at expiry and needs a reinstall. Catch it before then.',
    }
  }

  if (ms > 60 * 60 * 1000) return { verdict: 'live', why: 'Token present and in date.' }
  if (ms > 0) return { verdict: 'expiring', why: 'Token expires within the hour.' }

  // The distinction that matters most. One of these is a background job's
  // problem; the other needs the customer to re-authorize, and telling them
  // apart is the difference between a fix and a support queue.
  if (r.health_status === 'revoked') {
    return {
      verdict: 'expired-dead',
      why: 'The CRM has revoked this authorization — the refresh was attempted and rejected. Credentials are valid; only a reinstall restores it.',
    }
  }

  // The worker's own verdict for "no refresh token on file", written every time
  // it passes such a row. Same terminal outcome, and it beats guessing.
  if (r.health_status === 'unrecoverable') {
    return {
      verdict: 'expired-dead',
      why: 'Expired with nothing left to refresh with. The refresh worker has already recorded this as unrecoverable; the account must reinstall.',
    }
  }

  return r.refresh_token
    ? {
        verdict: 'expired-refreshable',
        why: 'Expired, but a refresh token is on file and has not been rejected — the refresh worker can recover this.',
      }
    : {
        verdict: 'expired-dead',
        why: 'Expired with NO refresh token on file. Nothing can recover this; the account must reinstall.',
      }
}
