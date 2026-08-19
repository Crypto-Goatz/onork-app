#!/usr/bin/env node
/**
 * gen-content-lastmod — the per-URL `lastmod` the sitemap reports.
 *
 * The sitemap used to stamp every URL with `new Date()`, so all 18 entries carried
 * the same build timestamp and it changed on every deploy. A lastmod that moves
 * when nothing changed is a lastmod crawlers learn to ignore, which costs the
 * signal on the pages that genuinely did change.
 *
 * Truth for a static page is "when was this file last committed". `mtime` cannot
 * answer that — a CI checkout stamps every file with the checkout time, which is
 * the build-timestamp bug again with extra steps. Git history can.
 *
 * One `git log` walk over the whole history, newest commit first; the first time a
 * path appears is its last-modified date. Output is committed as
 * lib/content-lastmod.json so the sitemap has real dates even where history is not
 * available at build time.
 *
 * Vercel checks out with limited depth, so on that build the walk sees only recent
 * commits. Paths it cannot date KEEP the committed value rather than being reset —
 * and the run prints how many of each, because a fallback nobody can see is how a
 * stale sitemap goes unnoticed for a year.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const OUT = join(ROOT, 'lib', 'content-lastmod.json')
const PREFIX = '[content-lastmod]'

/** Everything the sitemap can cite as a source of truth for a URL's content. */
function trackedFiles() {
  const files = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === 'page.tsx' || entry.name.endsWith('.md')) files.push(relative(ROOT, full))
    }
  }
  walk(join(ROOT, 'app'))
  walk(join(ROOT, 'content', 'guides'))
  for (const f of ['lib/marketplace-data.ts', 'lib/compare-data.ts', 'lib/guides/registry.ts']) {
    if (existsSync(join(ROOT, f))) files.push(f)
  }
  return files
}

/** path -> ISO date of the newest commit that touched it, from one history walk. */
function gitLastModified() {
  const dates = new Map()
  let out
  try {
    out = execFileSync(
      'git',
      ['log', '--pretty=format:@%cI', '--name-only', '--diff-filter=ACMRT', '--', 'app', 'content', 'lib'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
    )
  } catch (err) {
    // The platform's own words, not a generic "git failed".
    console.warn(PREFIX, 'git log unavailable —', err.message.split('\n')[0])
    return dates
  }

  let current = null
  for (const line of out.split('\n')) {
    if (line.startsWith('@')) { current = line.slice(1); continue }
    const path = line.trim()
    if (!path || !current) continue
    if (!dates.has(path)) dates.set(path, current) // newest commit wins; history is newest-first
  }
  return dates
}

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const fromGit = gitLastModified()

const manifest = {}
let dated = 0
let kept = 0
let missing = []

for (const file of trackedFiles().sort()) {
  const git = fromGit.get(file)
  if (git) { manifest[file] = new Date(git).toISOString(); dated++ }
  else if (previous[file]) { manifest[file] = previous[file]; kept++ }
  else missing.push(file)
}

writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n')

console.log(PREFIX, `${dated} dated from git, ${kept} kept from the committed manifest, ${missing.length} undated`)
if (kept > 0) console.log(PREFIX, 'kept values mean this checkout lacks the history for those paths (shallow clone).')
if (missing.length > 0) {
  console.log(PREFIX, 'undated (sitemap will fall back to the build date):')
  for (const f of missing.slice(0, 20)) console.log(PREFIX, '  -', f)
  if (missing.length > 20) console.log(PREFIX, `  … and ${missing.length - 20} more`)
}
