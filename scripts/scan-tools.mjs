import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Build the tool inventory FROM THE CODE.
 *
 * A hand-written feature list is a promise nobody keeps: it drifts the first
 * time a page changes, and drift here means telling an agency something works
 * when it does not. So status is DERIVED — what does the page call, and do
 * those endpoints exist?
 *
 * The signals, in order of how much they prove:
 *   missing endpoints   the page calls /api/x and no route.ts exists  -> broken
 *   stub markers        "coming soon" / TODO in the page              -> partial
 *   no data calls       a page that fetches nothing                   -> static
 *   otherwise           page + every endpoint present                 -> ready
 *
 * This cannot prove a page WORKS — only that its wiring is present. It is a
 * lower bound on brokenness, and it says so rather than implying certainty.
 */

/**
 * Usage: node scripts/scan-tools.mjs [repoPath] [appDir] [urlBase] [outFile]
 * Defaults scan this repo's own /app against www.0ncore.com.
 *
 * Parameterised because the ecosystem has more than one dashboard, and a second
 * copy of this script would drift from the first — which is the same failure
 * the inventory itself exists to prevent.
 */
const REPO = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()
const APP_DIR = process.argv[3] || 'app'
const URL_BASE = process.argv[4] || 'https://www.0ncore.com/dashboard'
const OUT = process.argv[5] || 'lib/tools/dashboard-inventory.json'
const ROOT = process.cwd()
const APP = path.join(REPO, APP_DIR)

const listDirs = (p) => existsSync(p) ? readdirSync(p).filter((d) => statSync(path.join(p, d)).isDirectory()) : []

/** Every /api route that exists, as a set of paths. */
function apiRoutes() {
  const found = new Set()
  const walk = (dir, prefix) => {
    for (const d of listDirs(dir)) {
      const next = path.join(dir, d)
      // A (group) folder is organisational and contributes NO url segment —
      // treating it as one made every route inside it look missing.
      if (/^\(.*\)$/.test(d)) { walk(next, prefix); continue }
      const seg = d.startsWith('[') ? ':param' : d
      if (existsSync(path.join(next, 'route.ts')) || existsSync(path.join(next, 'route.js'))) {
        found.add(`${prefix}/${seg}`)
      }
      walk(next, `${prefix}/${seg}`)
    }
  }
  walk(path.join(APP, 'api'), '/api')
  return found
}

const ROUTES = apiRoutes()

/** Normalise a fetched URL to the same shape as the route set. */
const norm = (u) => '/' + u.split('?')[0].split('#')[0].replace(/^\/+/, '')
  .split('/').map((s) => (s.startsWith('$') || s.startsWith('{') ? ':param' : s)).join('/')

function analyse(pageDir, name) {
  const file = path.join(pageDir, 'page.tsx')
  if (!existsSync(file)) return null
  const src = readFileSync(file, 'utf8')

  // Sibling components a page pulls in often hold the real calls.
  let all = src
  for (const f of readdirSync(pageDir)) {
    if (f.endsWith('.tsx') && f !== 'page.tsx') {
      try { all += readFileSync(path.join(pageDir, f), 'utf8') } catch {}
    }
  }

  // A template literal like `/api/kb${params}` yields a PREFIX, not a path —
  // treating it as a whole route reported a working endpoint as missing. Drop
  // any match whose source is immediately followed by an interpolation.
  const calls = [...new Set(
    [...all.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"\s?]+)/g)]
      .filter((m) => !all.slice(m.index, m.index + m[0].length + 2).includes('${'))
      .map((m) => norm(m[1])),
  )]
  const missing = calls.filter((c) => {
    if (ROUTES.has(c)) return false
    // A dynamic segment in the real route matches a literal in the call.
    const parts = c.split('/')
    for (const r of ROUTES) {
      const rp = r.split('/')
      if (rp.length !== parts.length) continue
      if (rp.every((s, i) => s === parts[i] || s === ':param')) return false
    }
    return true
  })

  const stub = /coming soon|not implemented|placeholder|TODO:|under construction/i.test(src)
  const crmVersion = (all.match(/Version['"]?\s*:\s*['"](\d{4}-\d{2}-\d{2})['"]/) || [])[1]
  const usesCrm = /leadconnectorhq|\/api\/crm/i.test(all)
  const usesSupabase = /supabase/i.test(all)
  const usesGroq = /groq/i.test(all)

  let state = 'ready'
  let reason
  if (missing.length) { state = 'broken'; reason = `Calls ${missing.length} endpoint${missing.length === 1 ? '' : 's'} that do not exist: ${missing.slice(0, 3).join(', ')}` }
  else if (stub) { state = 'partial'; reason = 'The page still contains placeholder or "coming soon" content.' }
  // Said as what was MEASURED, not as a conclusion: the scan reads this page's
  // own files, so a screen fetching through a shared lib looks the same as one
  // fetching nothing. Overstating that would make the whole page untrustworthy.
  else if (calls.length === 0) { state = 'partial'; reason = 'No direct data calls found in this screen\'s own files — it may load through a shared library, or may not be wired yet.' }

  const api = crmVersion ? `CRM ${crmVersion}` : usesCrm ? 'CRM' : usesGroq ? 'Groq' : usesSupabase ? 'Supabase' : 'none'

  return {
    key: `dash_${name}`,
    name: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    slug: name,
    href: `https://www.0ncore.com/dashboard/${name}`,
    calls: calls.length,
    missing,
    api,
    state,
    reason,
  }
}

/** Dashboard roots to walk — plain folders and any (group) that holds one. */
function dashboardRoots() {
  const roots = []
  if (existsSync(path.join(APP, 'dashboard'))) roots.push({ dir: path.join(APP, 'dashboard'), prefix: '' })
  for (const d of listDirs(APP)) {
    if (!/^\(.*\)$/.test(d)) continue
    for (const inner of listDirs(path.join(APP, d))) {
      roots.push({ dir: path.join(APP, d, inner), prefix: inner })
    }
  }
  return roots
}

const out = []
const seenKeys = new Set()
for (const { dir, prefix } of dashboardRoots()) {
  // The root screen of this area.
  const rootTool = analyse(dir, prefix || 'home')
  if (rootTool && !seenKeys.has(rootTool.key)) {
    seenKeys.add(rootTool.key)
    out.push({ ...rootTool, href: prefix ? `${URL_BASE}/${prefix}` : URL_BASE })
  }
  for (const name of listDirs(dir)) {
    const t = analyse(path.join(dir, name), name)
    if (!t || seenKeys.has(t.key)) continue
    seenKeys.add(t.key)
    out.push({ ...t, href: prefix ? `${URL_BASE}/${prefix}/${name}` : `${URL_BASE}/${name}` })
  }
}

out.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(path.join(ROOT, OUT), JSON.stringify(out, null, 2))

const by = (s) => out.filter((t) => t.state === s).length
console.log(`${out.length} tools scanned from ${APP_DIR} in ${path.basename(REPO)} -> ${OUT}`)
console.log(`  ready ${by('ready')} · partial ${by('partial')} · broken ${by('broken')}`)
console.log(`  API endpoints known: ${ROUTES.size}`)
for (const t of out.filter((x) => x.state === 'broken').slice(0, 8)) console.log(`   BROKEN  ${t.name}: ${t.reason}`)
