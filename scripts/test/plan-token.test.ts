process.env.APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'test-secret-for-plan-token'
import { signPlan, verifyPlan } from '../../lib/burst/plan-token'
import { issueAppJwt } from '../../lib/auth/app-jwt'

let pass = 0, fail = 0
const t = (name: string, ok: boolean, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`) }

const CO = 'company_A'
const legs = [{ capability: 'contact.tag', locationId: 'loc_1', params: { tag: 'September', contactQuery: 'Jane' } }]
const { token } = signPlan({ companyId: CO, command: 'tag jane', legs })

const good = verifyPlan(token, CO)
t('a signed plan verifies', good.ok)
t('legs survive intact', good.ok && good.plan.legs[0].locationId === 'loc_1')

t('another agency cannot run it', !verifyPlan(token, 'company_B').ok)
t('missing token rejected', !verifyPlan(null, CO).ok)
t('garbage rejected', !verifyPlan('not-a-token', CO).ok)

// THE attack this exists for: swap the target location after approval.
const [body, sig] = token.split('.')
const decoded = JSON.parse(Buffer.from(body, 'base64url').toString())
decoded.legs[0].locationId = 'loc_someone_else'
const swapped = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`
t('re-targeted plan rejected', !verifyPlan(swapped, CO).ok, verifyPlan(swapped, CO).ok ? '' : (verifyPlan(swapped, CO) as { error: string }).error)

// Add legs the user never saw.
decoded.legs.push({ capability: 'contact.tag', locationId: 'loc_2', params: { tag: 'x' } })
const padded = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`
t('extra legs rejected', !verifyPlan(padded, CO).ok)

// Expiry.
const expired = signPlan({ companyId: CO, command: 'x', legs })
const eb = JSON.parse(Buffer.from(expired.token.split('.')[0], 'base64url').toString())
eb.exp = Math.floor(Date.now() / 1000) - 10
t('expired plan rejected', !verifyPlan(`${Buffer.from(JSON.stringify(eb)).toString('base64url')}.${expired.token.split('.')[1]}`, CO).ok)

// Domain separation: a session token must not work as a plan.
t('session JWT is not a plan token', !verifyPlan(issueAppJwt({ sub: 'u', companyId: CO }), CO).ok)

// Empty plan.
const empty = signPlan({ companyId: CO, command: 'x', legs: [] })
t('empty plan rejected', !verifyPlan(empty.token, CO).ok)

// Two signings differ (unique plan ids => replay guard has something to key on).
const a = signPlan({ companyId: CO, command: 'x', legs })
const b = signPlan({ companyId: CO, command: 'x', legs })
t('each plan gets a unique id', a.planId !== b.planId)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
