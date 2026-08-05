import crypto from 'node:crypto'

/**
 * Member identity for the portal widgets.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE OBVIOUS DESIGN IS A SECURITY HOLE, so it is not used here.
 *
 * The tempting approach is the one every other embed uses: put
 * `contact={{contact.id}}` in the embed tag and let the page tell us who the
 * visitor is. That works — and it means anyone can edit the id in the URL and
 * read, or rewrite, a stranger's profile. On a MEMBERSHIP portal that is names,
 * emails, phone numbers and whatever custom fields the agency collects.
 *
 * So a contact id alone is never accepted. The widget requires a token we
 * signed, tying a contact to a location with an expiry. The link is minted
 * server-side — from a workflow action, an email, or a login — and cannot be
 * forged by changing a URL.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Two lifetimes, deliberately:
 *   LINK    long enough to survive an email sitting unread (14 days)
 *   SESSION short, issued once the link is used (2 hours)
 * A link that lives in an inbox forever is a permanent key to that profile;
 * trading it for a short session limits what a forwarded email gives away.
 */

const PURPOSE_LINK = 'member-link-v1'
const PURPOSE_SESSION = 'member-session-v1'
const LINK_TTL = 14 * 24 * 3600
const SESSION_TTL = 2 * 3600

function secret(): string {
  const s = process.env.APP_JWT_SECRET
  if (!s) throw new Error('APP_JWT_SECRET is not set')
  return s
}

const mac = (purpose: string, data: string) =>
  crypto.createHmac('sha256', secret()).update(`${purpose}.${data}`).digest('base64url')

export interface MemberClaims {
  contactId: string
  locationId: string
  exp: number
}

function sign(purpose: string, claims: MemberClaims): string {
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${body}.${mac(purpose, body)}`
}

function verify(purpose: string, token: string | null | undefined): MemberClaims | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = mac(purpose, body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as MemberClaims
    if (!claims.contactId || !claims.locationId) return null
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null
    return claims
  } catch {
    return null
  }
}

/** A link you can put in an email. Server-side only — never mint from a browser. */
export function mintMemberLink(contactId: string, locationId: string, ttl = LINK_TTL): string {
  return sign(PURPOSE_LINK, { contactId, locationId, exp: Math.floor(Date.now() / 1000) + ttl })
}
export const readMemberLink = (t?: string | null) => verify(PURPOSE_LINK, t)

/** The short-lived thing the widget actually carries. */
export function mintMemberSession(contactId: string, locationId: string): string {
  return sign(PURPOSE_SESSION, { contactId, locationId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL })
}
export const readMemberSession = (t?: string | null) => verify(PURPOSE_SESSION, t)

/**
 * Which fields a member may change about themselves.
 *
 * An allowlist, not a denylist. A denylist means every new CRM field is
 * editable by default, and the first one somebody regrets is the one that
 * decides what a member is entitled to.
 */
export const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'postalCode', 'companyName', 'website'] as const
export type EditableField = typeof EDITABLE_FIELDS[number]
