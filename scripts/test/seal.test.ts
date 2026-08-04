process.env.APP_JWT_SECRET = 'test-secret'
import { seal, unseal, fingerprint } from '../../lib/vault/seal'

let pass = 0, fail = 0
const t = (n: string, ok: boolean) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`) }

const secret = '0nmcp_key_abcdef123456'
const sealed = seal(secret)
t('round-trips', unseal(sealed) === secret)
t('ciphertext does not contain the plaintext', !sealed.includes(secret))
t('two seals of the same value differ', seal(secret) !== seal(secret))
t('null in, null out', unseal(null) === null)
t('garbage rejected', unseal('not-sealed') === null)

// GCM's whole point: tampering is detected, not decrypted into nonsense.
const [iv, tag, body] = sealed.split('.')
const b = Buffer.from(body, 'base64url'); b[0] ^= 0xff
t('tampered ciphertext rejected', unseal(`${iv}.${tag}.${b.toString('base64url')}`) === null)
const tg = Buffer.from(tag, 'base64url'); tg[0] ^= 0xff
t('tampered tag rejected', unseal(`${iv}.${tg.toString('base64url')}.${body}`) === null)

t('fingerprint reveals only the tail', fingerprint(secret) === '…123456')
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
