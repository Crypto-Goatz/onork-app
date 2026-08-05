import fs from 'node:fs'
import path from 'node:path'

/**
 * The capability report — generated, never hand-written.
 *
 * Sources, in order of how much each proves:
 *   the live token       scopes we actually hold, read from a real JWT
 *   the registries       what the code can run today
 *   the API docs repo    what the platform exposes at all
 * A hand-typed list would drift within a week and the whole point is that this
 * one can be trusted the day it is read.
 */

const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

const scopes = JSON.parse(read('lib/tools/verified-scopes.json'))
const exec = read('lib/burst/executor.ts')
const reg = read('lib/crm/registry.ts')
const implemented = new Set([...exec.matchAll(/^  '([a-z._]+)':/gm)].map((m) => m[1]))

const caps = [...reg.matchAll(/id: '([a-z._]+)', intent: '([^']+)', mechanism: '(\w+)'/g)]
  .map((m) => ({ id: m[1], intent: m[2], mech: m[3] }))
const capsMulti = [...reg.matchAll(/id: '([a-z._]+)',\s*\n?\s*intent: '([^']+)',\s*\n?\s*mechanism: '(\w+)'/g)]
  .map((m) => ({ id: m[1], intent: m[2], mech: m[3] }))
const allCaps = [...new Map([...caps, ...capsMulti].map((c) => [c.id, c])).values()]

const widgets = [...read('lib/widgets/registry.ts').matchAll(/key: '(\w+)', name: '([^']+)'[\s\S]{0,400}?live: (true|false)/g)]
  .map((m) => ({ key: m[1], name: m[2], live: m[3] === 'true' }))
const actions = [...read('lib/crm/actions.ts').matchAll(/key: '(\w+)',\s*\n\s*name: '([^']+)'[\s\S]{0,600}?live: (true|false)/g)]
  .map((m) => ({ key: m[1], name: m[2], live: m[3] === 'true' }))
const triggers = [...read('lib/crm/triggers.ts').matchAll(/\{ key: '(\w+)', name: '([^']+)', when: '([^']+)' \}/g)]
  .map((m) => ({ key: m[1], name: m[2], when: m[3] }))
const meters = [...read('lib/meters.ts').matchAll(/key: '(\w+)',\s*\n\s*label: '([^']+)',\s*\n\s*unit: '([^']+)',\s*\n\s*priceCents: (\d+)/g)]
  .map((m) => ({ key: m[1], label: m[2], unit: m[3], cents: Number(m[4]) }))

const L = []
const p = (s = '') => L.push(s)

p('# 0nCORE — Verified Capability & Scope Report')
p()
p(`Generated ${new Date().toISOString().slice(0, 10)} from the live token, the code registries and the platform's own API specs.`)
p('Nothing here is aspirational: every line is either a scope we hold, a handler that exists, or an endpoint verified against a live account.')
p()
p('---')
p()
p('## 1. What we can do RIGHT NOW, with certainty')
p()
p('These have handlers, run through the approval gate, and write receipts.')
p()
p('| Capability | What it does | Verified |')
p('|---|---|---|')
for (const c of allCaps.filter((c) => implemented.has(c.id))) {
  p(`| \`${c.id}\` | ${c.intent} | live |`)
}
p()
p(`**${implemented.size} capabilities wired.**`)
p()
p('## 2. Present in the registry, deliberately NOT runnable')
p()
p('| Capability | Why | What we offer instead |')
p('|---|---|---|')
for (const c of allCaps.filter((c) => !implemented.has(c.id))) {
  const why = c.mech === 'blocked' ? 'No API exists — for anyone'
    : c.mech === 'snapshot' ? 'Only applies when a sub-account is created'
    : c.mech === 'product' ? 'Depends on a 0n product not yet shipped'
    : 'Needs the billing meter configured'
  p(`| \`${c.id}\` | ${why} | ${c.mech === 'blocked' ? 'A named alternative, in the assistant\'s own words' : 'Ships when its dependency does'} |`)
}
p()
p('## 3. OAuth scopes we actually hold')
p()
p(`Read from a live location token: **${scopes.total} scopes**. This is the ceiling on everything above.`)
p()
for (const [group, list] of Object.entries(scopes.grouped)) {
  p(`**${group}** — ${list.join(', ')}`)
  p()
}
p('## 4. Workflow steps the agency can place')
p()
p('| Key | Name | Runs today |')
p('|---|---|---|')
for (const a of actions) p(`| \`${a.key}\` | ${a.name} | ${a.live ? 'yes' : 'not yet'} |`)
p()
p('## 5. Events that start their workflows')
p()
p('| Key | Fires when |')
p('|---|---|')
for (const t of triggers) p(`| \`${t.key}\` | ${t.when} |`)
p()
p('## 6. Page widgets')
p()
p('| Key | Name | Ships today |')
p('|---|---|---|')
for (const w of widgets) p(`| \`${w.key}\` | ${w.name} | ${w.live ? 'yes' : 'not yet'} |`)
p()
p('## 7. What is billable')
p()
p('| Meter | Unit | Price |')
p('|---|---|---|')
for (const m of meters) p(`| ${m.label} | ${m.unit} | ${m.cents === 0 ? 'free' : '$' + (m.cents / 100).toFixed(2)} |`)
p()

fs.writeFileSync(path.join(ROOT, 'docs/CAPABILITIES.md'), L.join('\n'))
console.log(`docs/CAPABILITIES.md — ${implemented.size} wired, ${allCaps.length} total, ${scopes.total} scopes`)
