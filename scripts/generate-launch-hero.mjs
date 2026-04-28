#!/usr/bin/env node
/**
 * Generates 8 launch hero SVGs for the v4.10.0 announcement blog posts.
 * Run: node scripts/generate-launch-hero.mjs
 * Output: public/blog/launch-v4-10/<slug>.svg
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'blog', 'launch-v4-10')

mkdirSync(OUT_DIR, { recursive: true })

const POSTS = [
  { slug: 'announcing-0nmcp-v4-10-0', tag: 'ANNOUNCEMENT', title: '0nMCP v4.10.0', sub: 'UCP, Marketplace, Course Builder + 7 new services', accent: '#10b981' },
  { slug: 'introducing-ucp', tag: 'COMMERCE', title: 'Universal Commerce Protocol', sub: 'One protocol, every store', accent: '#06b6d4' },
  { slug: 'the-0n-app-marketplace', tag: 'MARKETPLACE', title: 'The .0n Marketplace', sub: 'Browse, install, run — anywhere AI runs', accent: '#a855f7' },
  { slug: 'ai-course-builder', tag: 'AI BUILDER', title: 'AI Course Builder', sub: 'A full course from one conversation', accent: '#f97316' },
  { slug: 'lead-magnet-loop', tag: 'GROWTH', title: 'The Lead Magnet Loop', sub: 'Every funnel grows the platform', accent: '#ef4444' },
  { slug: 'automation-builder', tag: 'AI BUILDER', title: 'Automation Builder', sub: 'Generate. Test. Run. Schedule.', accent: '#3b82f6' },
  { slug: 'saas-factory', tag: 'AI BUILDER', title: 'The SaaS Factory', sub: 'A full SaaS in one shot', accent: '#eab308' },
  { slug: 'agentic-automation-generator', tag: 'AGENTIC AI', title: 'Agentic Generator', sub: 'Tell it what you want done', accent: '#ec4899' },
]

// 1200×630 — open graph standard
function makeSvg({ tag, title, sub, accent }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#1a1f2c"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  <!-- Grid overlay -->
  <g stroke="#ffffff" stroke-opacity="0.04" stroke-width="1">
    ${Array.from({ length: 13 })
      .map((_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="630"/>`)
      .join('\n    ')}
    ${Array.from({ length: 7 })
      .map((_, i) => `<line x1="0" y1="${i * 105}" x2="1200" y2="${i * 105}"/>`)
      .join('\n    ')}
  </g>
  <!-- Tag pill -->
  <g transform="translate(80, 100)">
    <rect width="180" height="34" rx="17" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-opacity="0.4"/>
    <circle cx="20" cy="17" r="3.5" fill="${accent}"/>
    <text x="32" y="22" font-family="ui-monospace, 'SF Mono', Menlo, monospace" font-size="13" font-weight="700" fill="${accent}" letter-spacing="2">${tag}</text>
  </g>
  <!-- Title -->
  <text x="80" y="280" font-family="Inter, system-ui, sans-serif" font-size="76" font-weight="800" fill="#ffffff" letter-spacing="-2">${escapeXml(title)}</text>
  <!-- Subtitle -->
  <text x="80" y="350" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="500" fill="#9ca3af">${escapeXml(sub)}</text>
  <!-- Footer brand -->
  <g transform="translate(80, 540)">
    <text x="0" y="20" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700" fill="#ffffff">0n<tspan fill="${accent}">MCP</tspan></text>
    <text x="60" y="20" font-family="ui-monospace, 'SF Mono', Menlo, monospace" font-size="14" font-weight="500" fill="#6b7280">v4.10.0  ·  Public launch May 1, 2026</text>
  </g>
</svg>`
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

for (const post of POSTS) {
  const svg = makeSvg(post)
  const path = join(OUT_DIR, `${post.slug}.svg`)
  writeFileSync(path, svg, 'utf8')
  console.log('wrote', path)
}

console.log(`\n✓ Generated ${POSTS.length} hero images at /public/blog/launch-v4-10/`)
