process.env.APP_JWT_SECRET = 'test-secret-do-not-use-in-prod'
import { issueAppJwt, verifyAppJwt } from '../../lib/auth/app-jwt'

let pass = 0, fail = 0
const t = (name: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const good = issueAppJwt({ sub: 'u1', companyId: 'c1', role: 'admin' })
const v = verifyAppJwt(good)
t('valid token verifies', v.ok)
t('claims survive round-trip', v.ok && v.claims.companyId === 'c1' && v.claims.sub === 'u1')

t('missing token rejected', !verifyAppJwt(null).ok)
t('garbage rejected', !verifyAppJwt('not.a.token').ok)
t('two-part token rejected', !verifyAppJwt('a.b').ok)

// tampered payload
const [h, p, s] = good.split('.')
const evil = Buffer.from(JSON.stringify({ sub: 'u1', companyId: 'SOMEONE-ELSE', iat: 1, exp: 99999999999 })).toString('base64url')
t('tampered payload rejected', !verifyAppJwt(`${h}.${evil}.${s}`).ok)

// alg:none — the classic hole
const noneHead = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
t('alg:none rejected', !verifyAppJwt(`${noneHead}.${p}.`).ok)

// expired
const expired = issueAppJwt({ sub: 'u1', companyId: 'c1' }, -10)
t('expired token rejected', !verifyAppJwt(expired).ok, verifyAppJwt(expired).ok ? '' : (verifyAppJwt(expired) as {error:string}).error)

// wrong secret
const other = issueAppJwt({ sub: 'u1', companyId: 'c1' })
process.env.APP_JWT_SECRET = 'a-different-secret'
t('token signed with another secret rejected', !verifyAppJwt(other).ok)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
