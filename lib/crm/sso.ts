import crypto from 'node:crypto'

/**
 * Decrypt the Custom Page user context.
 *
 * The platform hands the iframe an encrypted blob over postMessage and the app
 * decrypts it with its SSO shared secret. The wire format is CryptoJS's default,
 * which is OpenSSL's: base64 of "Salted__" + 8 salt bytes + AES-256-CBC
 * ciphertext, with the key and IV derived by EVP_BytesToKey using MD5.
 *
 * IMPLEMENTED ON node:crypto RATHER THAN PULLING CryptoJS. The library is
 * unmaintained, ships its own MD5, and would sit in a dependency tree that
 * handles an identity secret. EVP_BytesToKey is twenty lines and every line is
 * inspectable.
 *
 * MD5 HERE IS NOT A SECURITY CHOICE — it is the format the platform emits, and
 * we do not get a vote. The security comes from the shared secret and from this
 * only ever running server-side.
 *
 * SERVER ONLY. If the SSO key reached a browser, anyone could mint themselves a
 * context for any agency, which is the entire identity guarantee gone.
 */

if (typeof window !== 'undefined') {
  throw new Error('lib/crm/sso is server-only and must never reach the browser.')
}

/** OpenSSL EVP_BytesToKey — MD5, one iteration, 32-byte key + 16-byte IV. */
function deriveKeyAndIv(passphrase: string, salt: Buffer): { key: Buffer; iv: Buffer } {
  const pass = Buffer.from(passphrase, 'binary')
  const blocks: Buffer[] = []
  let prev = Buffer.alloc(0)
  // 48 bytes needed: 32 key + 16 iv.
  while (Buffer.concat(blocks).length < 48) {
    prev = crypto.createHash('md5').update(Buffer.concat([prev, pass, salt])).digest()
    blocks.push(prev)
  }
  const keyIv = Buffer.concat(blocks).subarray(0, 48)
  return { key: keyIv.subarray(0, 32), iv: keyIv.subarray(32, 48) }
}

export interface SsoContext {
  userId?: string
  companyId?: string
  role?: string
  type?: string
  userName?: string
  email?: string
  activeLocation?: string
  [k: string]: unknown
}

export type SsoResult =
  | { ok: true; context: SsoContext }
  | { ok: false; error: string }

export function decryptSsoPayload(payload: string, secret: string): SsoResult {
  if (!payload || typeof payload !== 'string') return { ok: false, error: 'no payload' }
  if (!secret) return { ok: false, error: 'SSO key not configured' }

  let raw: Buffer
  try {
    raw = Buffer.from(payload, 'base64')
  } catch {
    return { ok: false, error: 'payload is not base64' }
  }

  if (raw.length < 17 || raw.subarray(0, 8).toString('utf8') !== 'Salted__') {
    return { ok: false, error: 'payload is not in the expected salted format' }
  }

  try {
    const salt = raw.subarray(8, 16)
    const body = raw.subarray(16)
    const { key, iv } = deriveKeyAndIv(secret, salt)
    const d = crypto.createDecipheriv('aes-256-cbc', key, iv)
    const out = Buffer.concat([d.update(body), d.final()]).toString('utf8')

    const parsed = JSON.parse(out) as SsoContext
    // A wrong key usually throws on the padding check, but not always — it can
    // decrypt to garbage that happens to unpad. Requiring the fields we depend
    // on turns "it decrypted" into "it decrypted to something real".
    if (!parsed || typeof parsed !== 'object' || (!parsed.companyId && !parsed.userId)) {
      return { ok: false, error: 'context missing companyId and userId' }
    }
    return { ok: true, context: parsed }
  } catch {
    // One message for every failure: wrong key, tampered payload and corrupt
    // base64 are indistinguishable to the caller on purpose.
    return { ok: false, error: 'could not decrypt the context' }
  }
}

/** Encrypt in the same format — used by the round-trip test, never in a route. */
export function encryptForTest(obj: unknown, secret: string): string {
  const salt = crypto.randomBytes(8)
  const { key, iv } = deriveKeyAndIv(secret, salt)
  const c = crypto.createCipheriv('aes-256-cbc', key, iv)
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()])
  return Buffer.concat([Buffer.from('Salted__', 'utf8'), salt, body]).toString('base64')
}
