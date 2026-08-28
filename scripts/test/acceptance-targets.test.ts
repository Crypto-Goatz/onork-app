/**
 * /api/burst/acceptance — the guard against writing real contacts by list order.
 *
 * Incident (measured 2026-08-28, live agency bknfhTkdDLapbwfZqQNi):
 * the route selected its two targets with
 *
 *     const locA = (wantA && locations.find(l => l.name.toLowerCase().includes(wantA))) || locations[0]
 *     const locB = (wantB && locations.find(...)) || locations.find(l => l.id !== locA.id)
 *
 * so a call with no body wrote real CRM contacts into whichever two of the
 * agency's 105 sub-accounts the platform listed first. Index 0 that day was
 * `PS96ZP0Hx7zmFsm8lPI9` — "0n Template — DO NOT USE", the account snapshots
 * are cut from. It had already fired: three `*@0ncore-test.com` contacts dated
 * 2026-08-11 survive in `0ncore` (2) and `RocketOpp Lead Generation Services` (1).
 *
 * The fixture below is the live list order, head and tail, not an invented one.
 *
 * Both directions are asserted. A picker that refused everything would be the
 * same defect in the opposite costume, so the positive controls pin that a
 * caller who names two distinct accounts still gets them.
 */
import { pickAcceptanceTargets } from '../../lib/crm/acceptance-targets'
import type { AgencyLocation } from '../../lib/crm/locations'

let pass = 0, fail = 0
const t = (n: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  — got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

// The real head of locations/search on 2026-08-28, plus two customer-shaped rows.
const LOCS: AgencyLocation[] = [
  { id: 'PS96ZP0Hx7zmFsm8lPI9', name: '0n Template — DO NOT USE' },
  { id: 'nphConTwfHcVE1oA0uep', name: '0ncore' },
  { id: 'APVfk4VNYehSJUe4KeK3', name: '0nMCP' },
  { id: 'Ev1Bzj84a2vljzCkfBEM', name: '0nMCP' },
  { id: 'SYkCjIXJyOPk8y6fRb1q', name: '0nork' },
  { id: '6MSqx0trfxgLxeHBJE1k', name: 'RocketOpp Lead Generation Services | Next Gen AI' },
  { id: 'cust0001', name: 'Northside Dental' },
  { id: 'cust0002', name: 'Harbor Dental' },
]

const refusal = (a: unknown, b: unknown) => {
  const r = pickAcceptanceTargets(a, b, LOCS)
  return r.ok ? 'WROTE' : r.refusal.kind
}
const ids = (a: unknown, b: unknown) => {
  const r = pickAcceptanceTargets(a, b, LOCS)
  return r.ok ? [r.locA.id, r.locB.id] : ['REFUSED', r.refusal.kind]
}

// ---------------------------------------------------------------------------
// THE CONTROL. Reinstating the index-0 fallback must make this file fail.
// Every one of these was a live write before 2026-08-28.
// ---------------------------------------------------------------------------
t('no body at all', refusal(undefined, undefined), 'unnamed')
t('empty object', refusal('', ''), 'unnamed')
t('whitespace is not a name', refusal('   ', '   '), 'unnamed')
t('only A named — B must not be inferred', refusal('0ncore', undefined), 'unnamed')
t('only B named — A must not default to index 0', refusal(undefined, '0ncore'), 'unnamed')
t('non-strings are not names', refusal(0, { name: '0ncore' }), 'unnamed')

// ---------------------------------------------------------------------------
// Ambiguity refuses instead of taking the first match — the same rule the
// planner already enforced, now shared rather than reimplemented.
// ---------------------------------------------------------------------------
t('two accounts named 0nMCP ⇒ refuse, do not take the first', refusal('0nMCP', '0ncore'), 'unresolved')
t('"dental" matches two customers ⇒ refuse', refusal('dental', '0ncore'), 'unresolved')
t('a name matching nothing ⇒ refuse', refusal('no such client', '0ncore'), 'unresolved')
t('both sides unresolved are both reported', (() => {
  const r = pickAcceptanceTargets('dental', 'nope', LOCS)
  return r.ok ? [] : (r.refusal.kind === 'unresolved' ? r.refusal.unresolved.map((u) => u.field) : [])
})(), ['locationA', 'locationB'])
t('an ambiguous name names its candidates', (() => {
  const r = pickAcceptanceTargets('dental', '0ncore', LOCS)
  return r.ok ? null : (r.refusal.kind === 'unresolved' ? r.refusal.unresolved[0].ambiguous : null)
})(), ['Northside Dental', 'Harbor Dental'])

// ---------------------------------------------------------------------------
// Two names, one account is not a two-client test.
// ---------------------------------------------------------------------------
t('same account twice ⇒ refuse', refusal('0ncore', '0ncore'), 'same')
t('same account by different spellings ⇒ refuse', refusal('0ncore', '0ncor'), 'same')

// ---------------------------------------------------------------------------
// Positive controls — the route must still be usable.
// ---------------------------------------------------------------------------
t('two exact distinct names resolve', ids('0ncore', 'Northside Dental'), ['nphConTwfHcVE1oA0uep', 'cust0001'])
t('exact beats the prefix it collides with', ids('0nork', 'Harbor Dental'), ['SYkCjIXJyOPk8y6fRb1q', 'cust0002'])
t('a unique substring resolves', ids('Northside', 'Harbor'), ['cust0001', 'cust0002'])
t('surrounding whitespace is trimmed, not fatal', ids('  0ncore  ', ' Harbor Dental '), ['nphConTwfHcVE1oA0uep', 'cust0002'])

// ---------------------------------------------------------------------------
// The template account is reachable ONLY when someone types its name.
// ---------------------------------------------------------------------------
t('the DO-NOT-USE template is never a default', ids('Northside Dental', 'Harbor Dental').includes('PS96ZP0Hx7zmFsm8lPI9'), false)
t('...but naming it exactly still works — this is a refusal to guess, not a blocklist',
  ids('0n Template — DO NOT USE', '0ncore'), ['PS96ZP0Hx7zmFsm8lPI9', 'nphConTwfHcVE1oA0uep'])

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'}  ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
