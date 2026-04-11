/**
 * 0nStack Domain Parser
 * Extracts business domains from email addresses, skipping
 * consumer/freemail providers.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedContact {
  email: string
  domain: string | null
  isFreeMail: boolean
  localPart: string
  provider: string | null
}

// ---------------------------------------------------------------------------
// Consumer email domains to skip (never scan these)
// ---------------------------------------------------------------------------

const SKIP_DOMAINS: Set<string> = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'ymail.com',
  'live.com',
  'msn.com',
  'me.com',
  'googlemail.com',
  // Extended freemail list
  'yahoo.co.uk',
  'yahoo.ca',
  'yahoo.co.in',
  'hotmail.co.uk',
  'hotmail.fr',
  'outlook.co.uk',
  'proton.me',
  'pm.me',
  'zohomail.com',
  'fastmail.com',
  'tutanota.com',
  'gmx.com',
  'gmx.net',
  'web.de',
  'mail.ru',
  'yandex.com',
  'yandex.ru',
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'bellsouth.net',
  'cox.net',
  'charter.net',
  'earthlink.net',
  'juno.com',
  'netzero.com',
  'aim.com',
  'inbox.com',
  'rocketmail.com',
  'mac.com',
  'icloud.com',
])

// Map freemail domains to their provider name
const PROVIDER_MAP: Record<string, string> = {
  'gmail.com': 'Google',
  'googlemail.com': 'Google',
  'yahoo.com': 'Yahoo',
  'yahoo.co.uk': 'Yahoo',
  'yahoo.ca': 'Yahoo',
  'yahoo.co.in': 'Yahoo',
  'ymail.com': 'Yahoo',
  'rocketmail.com': 'Yahoo',
  'hotmail.com': 'Microsoft',
  'hotmail.co.uk': 'Microsoft',
  'hotmail.fr': 'Microsoft',
  'outlook.com': 'Microsoft',
  'outlook.co.uk': 'Microsoft',
  'live.com': 'Microsoft',
  'msn.com': 'Microsoft',
  'icloud.com': 'Apple',
  'me.com': 'Apple',
  'mac.com': 'Apple',
  'aol.com': 'AOL',
  'aim.com': 'AOL',
  'protonmail.com': 'Proton',
  'proton.me': 'Proton',
  'pm.me': 'Proton',
  'mail.com': 'Mail.com',
  'inbox.com': 'Mail.com',
  'zohomail.com': 'Zoho',
  'fastmail.com': 'Fastmail',
  'tutanota.com': 'Tutanota',
  'gmx.com': 'GMX',
  'gmx.net': 'GMX',
  'web.de': 'Web.de',
  'mail.ru': 'Mail.ru',
  'yandex.com': 'Yandex',
  'yandex.ru': 'Yandex',
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an email address into its parts. Returns the business domain
 * if it is not a consumer freemail provider; otherwise domain is null.
 */
export function parseContact(email: string): ParsedContact {
  const trimmed = email.trim().toLowerCase()

  // Validate basic email shape
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return {
      email: trimmed,
      domain: null,
      isFreeMail: false,
      localPart: trimmed,
      provider: null,
    }
  }

  const localPart = trimmed.slice(0, atIndex)
  const domainPart = trimmed.slice(atIndex + 1)

  // Check if it is a freemail domain
  const isFreeMail = SKIP_DOMAINS.has(domainPart)
  const provider = PROVIDER_MAP[domainPart] ?? null

  return {
    email: trimmed,
    domain: isFreeMail ? null : domainPart,
    isFreeMail,
    localPart,
    provider,
  }
}

/**
 * Batch parse contacts and return only those with scannable business domains.
 * Deduplicates by domain.
 */
export function parseContacts(emails: string[]): {
  contacts: ParsedContact[]
  uniqueDomains: string[]
  skippedFreeMail: number
  skippedInvalid: number
} {
  const contacts: ParsedContact[] = []
  const domainSet = new Set<string>()
  let skippedFreeMail = 0
  let skippedInvalid = 0

  for (const email of emails) {
    const parsed = parseContact(email)
    contacts.push(parsed)

    if (parsed.isFreeMail) {
      skippedFreeMail++
    } else if (!parsed.domain) {
      skippedInvalid++
    } else {
      domainSet.add(parsed.domain)
    }
  }

  return {
    contacts,
    uniqueDomains: Array.from(domainSet),
    skippedFreeMail,
    skippedInvalid,
  }
}
