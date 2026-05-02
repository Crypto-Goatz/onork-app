/**
 * Family-location matcher.
 *
 * When a user signs up with an email whose domain matches a known 0n-family
 * sub-account, we LINK them to that existing sub-location instead of
 * provisioning a new one. This keeps every In2sight employee on
 * AeY8M0GNOuJPNkLQ7AAC (one shared CRM brain) instead of fragmenting into
 * one CRM-sub per team member.
 *
 * Adding a new family member = add one row here.
 */

export interface FamilyLocation {
  /** CRM sub-location id. */
  locationId: string
  /** Human-readable name. */
  name: string
  /** Email DOMAINS that auto-link to this location (lowercase, no @). */
  domains: string[]
  /** Specific full emails that auto-link (lowercase). Beats domain match. */
  emails: string[]
  /** Optional default tier for users matching this family. Defaults to 'free'. */
  defaultPlan?: string
  /** Optional VIP flag — assigns VIP permissions instead of free defaults. */
  vip?: boolean
}

export const FAMILY_LOCATIONS: FamilyLocation[] = [
  {
    locationId: 'AeY8M0GNOuJPNkLQ7AAC',
    name: 'In2sight LLC',
    domains: ['in2sight.net', 'in2sight.com'],
    emails: ['hello@in2sight.net'],
  },
  {
    locationId: '6MSqx0trfxgLxeHBJE1k',
    name: 'RocketOpp',
    domains: ['rocketopp.com'],
    emails: ['mike@rocketopp.com'],
    vip: true,
  },
  {
    locationId: 'nphConTwfHcVE1oA0uep',
    name: '0nCore',
    domains: ['0ncore.com'],
    emails: ['ai@0ncore.com'],
    vip: true,
  },
  {
    locationId: 'Ev1Bzj84a2vljzCkfBEM',
    name: '0nMCP',
    domains: ['0nmcp.com'],
    emails: ['mike+0nmcp@rocketopp.com'],
    vip: true,
  },
  {
    locationId: 'F76MNKOMQCMruMrumtdf',
    name: 'Spa Ligonier',
    domains: ['spaligonier.com'],
    emails: [],
  },
]

export interface FamilyMatch {
  location: FamilyLocation
  matchedBy: 'email' | 'domain'
}

export function findFamilyMatch(email: string): FamilyMatch | null {
  if (!email) return null
  const lower = email.trim().toLowerCase()
  const at = lower.lastIndexOf('@')
  if (at < 0) return null
  const domain = lower.slice(at + 1)

  // 1. Exact email match wins
  for (const loc of FAMILY_LOCATIONS) {
    if (loc.emails.some((e) => e.toLowerCase() === lower)) {
      return { location: loc, matchedBy: 'email' }
    }
  }

  // 2. Domain match
  for (const loc of FAMILY_LOCATIONS) {
    if (loc.domains.some((d) => d.toLowerCase() === domain)) {
      return { location: loc, matchedBy: 'domain' }
    }
  }

  return null
}
