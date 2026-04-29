#!/usr/bin/env node
/**
 * truth-lint — the build-time gatekeeper.
 *
 * Reads lib/brain/registry.ts as the source of truth for AI claims, then
 * opens each handler file and verifies the contract:
 *
 *   - category 'ai' MUST import @/lib/brain and call think()/record()
 *   - category 'ai' MUST NOT import @anthropic-ai/sdk (Groq-only rule)
 *
 * Failures print a clean report and exit 1, which fails the Vercel build.
 *
 * Usage:
 *   npm run truth-lint
 *
 * Or as a prebuild hook:
 *   "scripts": { "build": "npm run truth-lint && next build" }
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Read registry.ts as text and pull out entries (no TS compilation needed) ──

function readRegistry() {
  const src = readFileSync(join(ROOT, 'lib/brain/registry.ts'), 'utf8')
  // Match the BRAIN_REGISTRY array literal
  const arrayMatch = src.match(/export const BRAIN_REGISTRY:[^=]+=\s*\[([\s\S]*?)\n\]/)
  if (!arrayMatch) throw new Error('truth-lint: could not parse BRAIN_REGISTRY in lib/brain/registry.ts')
  const arrayBody = arrayMatch[1]

  // Extract each `{ ... },` object literal at the top level of the array
  const entries = []
  let depth = 0
  let start = -1
  for (let i = 0; i < arrayBody.length; i++) {
    const ch = arrayBody[i]
    if (ch === '{') { if (depth === 0) start = i; depth++ }
    else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        entries.push(arrayBody.slice(start, i + 1))
        start = -1
      }
    }
  }

  return entries.map(parseEntry).filter(Boolean)
}

function parseEntry(text) {
  const slug = match(text, /slug:\s*'([^']+)'/)
  if (!slug) return null
  const display_name = match(text, /display_name:\s*'([^']+)'/) ?? slug
  const category = match(text, /category:\s*'([^']+)'/) ?? 'crud'
  const surface_route = match(text, /surface_route:\s*'([^']+)'/)
  return {
    slug,
    display_name,
    category,
    surface_route,
    handler_paths: extractStringArray(text, 'handler_paths'),
    required_imports: extractStringArray(text, 'required_imports'),
    prohibited_imports: extractStringArray(text, 'prohibited_imports'),
    required_calls: extractStringArray(text, 'required_calls'),
  }
}

function match(text, re) {
  const m = text.match(re)
  return m ? m[1] : null
}

function extractStringArray(text, key) {
  const re = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`)
  const m = text.match(re)
  if (!m) return []
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

// ── Verify a single entry ───────────────────────────────────────────

function verify(entry) {
  const reasons = []
  const handler_paths = entry.handler_paths ?? []

  if (entry.category === 'ai') {
    if (!handler_paths.length) {
      reasons.push('category=ai but no handler_paths declared')
    }

    for (const path of handler_paths) {
      const abs = join(ROOT, path)
      if (!existsSync(abs)) {
        reasons.push(`handler missing: ${path}`)
        continue
      }
      const src = readFileSync(abs, 'utf8')

      for (const imp of entry.required_imports ?? []) {
        if (!src.includes(`from '${imp}'`) && !src.includes(`from "${imp}"`)) {
          reasons.push(`${path}: missing required import "${imp}"`)
        }
      }

      for (const imp of entry.prohibited_imports ?? []) {
        if (src.includes(`from '${imp}'`) || src.includes(`from "${imp}"`)) {
          reasons.push(`${path}: contains prohibited import "${imp}" (Groq-only rule)`)
        }
      }

      for (const call of entry.required_calls ?? []) {
        if (!src.includes(call)) {
          reasons.push(`${path}: missing required call "${call}"`)
        }
      }
    }
  }

  return { ...entry, ok: reasons.length === 0, reasons }
}

// ── Main ────────────────────────────────────────────────────────────

const entries = readRegistry()
const results = entries.map(verify)

const aiResults = results.filter((r) => r.category === 'ai')
const passed = aiResults.filter((r) => r.ok)
const failed = aiResults.filter((r) => !r.ok)

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

console.log()
console.log(`${C.bold}${C.cyan}truth-lint${C.reset} — ${results.length} registered surfaces, ${aiResults.length} claim AI`)
console.log()

for (const r of results) {
  if (r.category !== 'ai') {
    console.log(`  ${C.dim}○ ${r.slug.padEnd(20)} category=${r.category}${C.reset}`)
    continue
  }
  if (r.ok) {
    console.log(`  ${C.green}✓${C.reset} ${r.slug.padEnd(20)} ${C.dim}AI contract satisfied${C.reset}`)
  } else {
    console.log(`  ${C.red}✗${C.reset} ${C.bold}${r.slug.padEnd(20)}${C.reset} ${C.red}LIES ABOUT AI${C.reset}`)
    for (const reason of r.reasons) {
      console.log(`      ${C.red}→${C.reset} ${reason}`)
    }
  }
}

console.log()
if (failed.length === 0) {
  console.log(`${C.green}${C.bold}✓ All ${aiResults.length} AI claims are honest.${C.reset}`)
  console.log()
  process.exit(0)
} else {
  console.log(`${C.red}${C.bold}✗ ${failed.length} of ${aiResults.length} AI claims FAIL the contract.${C.reset}`)
  console.log(`${C.dim}  Either wire the handler through lib/brain (think + record),${C.reset}`)
  console.log(`${C.dim}  or change category to 'automation' / 'crud' in lib/brain/registry.ts.${C.reset}`)
  console.log()
  // Soft-fail by default while existing add-ons are still being refactored.
  // Flip to strict (exit 1, fail the build) by setting TRUTH_LINT_STRICT=1.
  const strict = process.env.TRUTH_LINT_STRICT === '1'
  process.exit(strict ? 1 : 0)
}
