import crypto from 'node:crypto'

/**
 * Sealed values — AES-256-GCM at rest for anything we store that is a credential.
 *
 * WHY NOT PLAINTEXT COLUMNS. A scoped 0nMCP key in a table is a key that leaks
 * with the table: a bad RLS policy, a support export, a stray service-role query
 * in a log. Sealing means the row alone is not enough.
 *
 * GCM, not CBC — this is our format, so unlike the platform's SSO payload we get
 * to choose, and an unauthenticated cipher lets an attacker who can write the
 * column flip bits in a key we will later hand out.
 *
 * KEY SOURCE: VAULT_KEY if set, otherwise derived from APP_JWT_SECRET via
 * scrypt. The derivation exists so this works the moment it ships rather than
 * failing on a missing env — but a DEDICATED VAULT_KEY is better and should be
 * set, because rotating the JWT secret would otherwise strand every sealed value.
 */

if (typeof window !== 'undefined') {
  throw new Error('lib/vault/seal is server-only and must never reach the browser.')
}

const SALT = '0ncore.vault.v1'

function key(): Buffer {
  const explicit = process.env.VAULT_KEY
  if (explicit) {
    // Accept hex or raw; hash anything that is not exactly 32 bytes of hex.
    if (/^[0-9a-f]{64}$/i.test(explicit)) return Buffer.from(explicit, 'hex')
    return crypto.createHash('sha256').update(explicit).digest()
  }
  const fallback = process.env.APP_JWT_SECRET
  if (!fallback) throw new Error('Neither VAULT_KEY nor APP_JWT_SECRET is set')
  return crypto.scryptSync(fallback, SALT, 32)
}

/** iv.tag.ciphertext, all base64url. */
export function seal(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([c.update(plaintext, 'utf8'), c.final()])
  return [iv.toString('base64url'), c.getAuthTag().toString('base64url'), body.toString('base64url')].join('.')
}

/** null on anything wrong — a tampered or stale value must never half-open. */
export function unseal(sealed: string | null | undefined): string | null {
  if (!sealed) return null
  const parts = sealed.split('.')
  if (parts.length !== 3) return null
  try {
    const [iv, tag, body] = parts.map((p) => Buffer.from(p, 'base64url'))
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(body), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

/** Show enough to recognise a key, never enough to use it. */
export function fingerprint(value: string): string {
  return `…${value.slice(-6)}`
}
