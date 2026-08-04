import { decryptSsoPayload, encryptForTest } from '../../lib/crm/sso'

let pass = 0, fail = 0
const t = (name: string, ok: boolean, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`) }

const SECRET = 'test-shared-secret-0000'
const ctx = { userId: 'u_1', companyId: 'c_1', role: 'admin', type: 'agency', email: 'a@b.com' }

const blob = encryptForTest(ctx, SECRET)
const ok = decryptSsoPayload(blob, SECRET)
t('valid payload decrypts', ok.ok)
t('claims survive round-trip', ok.ok && ok.context.companyId === 'c_1' && ok.context.userId === 'u_1')

t('wrong secret rejected', !decryptSsoPayload(blob, 'a-different-secret').ok)
t('empty payload rejected', !decryptSsoPayload('', SECRET).ok)
t('no secret rejected', !decryptSsoPayload(blob, '').ok)
t('non-salted base64 rejected', !decryptSsoPayload(Buffer.from('hello world hello').toString('base64'), SECRET).ok)
t('garbage rejected', !decryptSsoPayload('!!!not-base64!!!', SECRET).ok)

// tampered ciphertext
const bytes = Buffer.from(blob, 'base64'); bytes[bytes.length - 3] ^= 0xff
t('tampered ciphertext rejected', !decryptSsoPayload(bytes.toString('base64'), SECRET).ok)

// decrypts but has no identity
const empty = encryptForTest({ hello: 'world' }, SECRET)
t('context without companyId/userId rejected', !decryptSsoPayload(empty, SECRET).ok)

// failure messages must not distinguish wrong-key from tampering
const a = decryptSsoPayload(blob, 'wrong-key-entirely')
const b = decryptSsoPayload(bytes.toString('base64'), SECRET)
t('failures are indistinguishable', !a.ok && !b.ok && a.error === b.error, a.ok ? '' : a.error)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
