import crypto from 'node:crypto'

/**
 * The signed plan — what makes "Approve" mean *this* plan.
 *
 * WHY THIS EXISTS. Approve-and-run posts a plan back from the browser. Without
 * a signature, the only thing the server would know is that SOME plan was
 * approved: a page could show the user three harmless steps against one client,
 * then post back forty steps against every client on the account, and the
 * server would have no way to tell. Re-validating capability ids does not help,
 * because it is the TARGETS that would be attacker-chosen.
 *
 * So the plan route signs exactly what it showed, and the run route executes
 * only what was signed. The user approves bytes, not intentions.
 *
 * WHAT IS COVERED: the plan id, the agency, expiry, and every leg's capability,
 * location and params. Anything not in the signature is not trusted at run time
 * — the run route re-derives price from the registry rather than reading it off
 * the wire, so a plan cannot talk its own cost down to zero.
 *
 * DOMAIN-SEPARATED from the session JWT even though both use APP_JWT_SECRET. A
 * signature valid in one context must never be replayable in the other; the
 * prefix is what stops a session token from being presented as a plan.
 */

const PURPOSE = 'burst-plan-v1'
const TTL_SECONDS = 10 * 60

export interface SignedLeg {
  capability: string
  locationId?: string
  params?: Record<string, unknown>
}

export interface PlanPayload {
  planId: string
  companyId: string
  command: string
  legs: SignedLeg[]
  exp: number
}

function secret(): string {
  const s = process.env.APP_JWT_SECRET
  if (!s) throw new Error('APP_JWT_SECRET is not set')
  return s
}

function mac(data: string): string {
  return crypto.createHmac('sha256', secret()).update(`${PURPOSE}.${data}`).digest('base64url')
}

export function signPlan(input: Omit<PlanPayload, 'planId' | 'exp'>): { token: string; planId: string; expiresAt: number } {
  const planId = crypto.randomUUID()
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const payload: PlanPayload = { ...input, planId, exp }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return { token: `${body}.${mac(body)}`, planId, expiresAt: exp }
}

export type PlanVerdict =
  | { ok: true; plan: PlanPayload }
  | { ok: false; error: string }

export function verifyPlan(token: string | undefined | null, companyId: string): PlanVerdict {
  if (!token) return { ok: false, error: 'This plan is no longer available. Ask again and re-approve.' }
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, error: 'This plan could not be read. Ask again and re-approve.' }

  const [body, sig] = parts
  const expected = mac(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    // The interesting case: the plan was edited between showing and approving.
    return { ok: false, error: 'This plan does not match what was approved.' }
  }

  let plan: PlanPayload
  try {
    plan = JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return { ok: false, error: 'This plan could not be read. Ask again and re-approve.' }
  }

  if (!plan.exp || plan.exp * 1000 < Date.now()) {
    // Short expiry matters here: an approval sitting in a tab for an hour is an
    // approval of a client account that may have changed underneath it.
    return { ok: false, error: 'This plan expired. Ask again to get a current one.' }
  }
  // The signature proves the plan is ours; this proves it is YOURS.
  if (plan.companyId !== companyId) {
    return { ok: false, error: 'This plan belongs to a different agency.' }
  }
  if (!Array.isArray(plan.legs) || plan.legs.length === 0) {
    return { ok: false, error: 'There is nothing in this plan to run.' }
  }

  return { ok: true, plan }
}
