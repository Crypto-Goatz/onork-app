/**
 * Dynamic SVG Hero Image for Blog Posts
 * GET /api/og/blog/[slug] → returns SVG image
 *
 * Each category gets unique visual elements:
 * - ai-automation: circuit/neural network nodes
 * - crm-strategy: pipeline flow nodes
 * - seo-sxo: ranking graph lines
 * - hipaa-compliance: shield + scan lines
 * - saas-building: code brackets + layers
 * - agency-growth: connected nodes network
 * - mcp-ecosystem: hub + spoke diagram
 * - product-updates: release/rocket path
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORY_VISUALS: Record<string, { color: string; accent: string; elements: string }> = {
  'ai-automation': {
    color: '#6EE05A',
    accent: '#00B4FF',
    elements: `
      <!-- Neural network nodes -->
      <circle cx="120" cy="100" r="4" fill="#6EE05A" opacity="0.6"><animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="200" cy="160" r="3" fill="#00B4FF" opacity="0.5"/>
      <circle cx="80" cy="200" r="3.5" fill="#6EE05A" opacity="0.4"/>
      <circle cx="160" cy="60" r="2.5" fill="#00B4FF" opacity="0.5"/>
      <circle cx="1000" cy="120" r="4" fill="#6EE05A" opacity="0.5"><animate attributeName="r" values="3;5;3" dur="4s" repeatCount="indefinite"/></circle>
      <circle cx="1080" cy="200" r="3" fill="#00B4FF" opacity="0.4"/>
      <circle cx="940" cy="80" r="3" fill="#6EE05A" opacity="0.3"/>
      <line x1="120" y1="100" x2="200" y2="160" stroke="#6EE05A" stroke-width="0.5" opacity="0.2"/>
      <line x1="200" y1="160" x2="80" y2="200" stroke="#00B4FF" stroke-width="0.5" opacity="0.15"/>
      <line x1="120" y1="100" x2="160" y2="60" stroke="#6EE05A" stroke-width="0.5" opacity="0.2"/>
      <line x1="1000" y1="120" x2="1080" y2="200" stroke="#6EE05A" stroke-width="0.5" opacity="0.2"/>
      <line x1="1000" y1="120" x2="940" y2="80" stroke="#00B4FF" stroke-width="0.5" opacity="0.15"/>
      <!-- Pulse rings -->
      <circle cx="600" cy="160" r="60" fill="none" stroke="#6EE05A" stroke-width="0.5" opacity="0.1"><animate attributeName="r" values="50;80;50" dur="6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.15;0.05;0.15" dur="6s" repeatCount="indefinite"/></circle>
      <circle cx="600" cy="160" r="100" fill="none" stroke="#00B4FF" stroke-width="0.3" opacity="0.08"><animate attributeName="r" values="90;120;90" dur="8s" repeatCount="indefinite"/></circle>
    `,
  },
  'crm-strategy': {
    color: '#00B4FF',
    accent: '#6EE05A',
    elements: `
      <!-- Pipeline flow -->
      <rect x="80" y="140" width="60" height="30" rx="6" fill="none" stroke="#00B4FF" stroke-width="1" opacity="0.3"/>
      <rect x="180" y="140" width="60" height="30" rx="6" fill="none" stroke="#00B4FF" stroke-width="1" opacity="0.4"/>
      <rect x="280" y="140" width="60" height="30" rx="6" fill="none" stroke="#6EE05A" stroke-width="1" opacity="0.3"/>
      <line x1="140" y1="155" x2="180" y2="155" stroke="#00B4FF" stroke-width="0.8" opacity="0.25" stroke-dasharray="4 3"/>
      <line x1="240" y1="155" x2="280" y2="155" stroke="#6EE05A" stroke-width="0.8" opacity="0.25" stroke-dasharray="4 3"/>
      <rect x="860" y="130" width="60" height="30" rx="6" fill="none" stroke="#00B4FF" stroke-width="1" opacity="0.3"/>
      <rect x="960" y="130" width="60" height="30" rx="6" fill="none" stroke="#6EE05A" stroke-width="1" opacity="0.4"/>
      <line x1="920" y1="145" x2="960" y2="145" stroke="#00B4FF" stroke-width="0.8" opacity="0.25" stroke-dasharray="4 3"/>
      <circle cx="600" cy="155" r="40" fill="none" stroke="#00B4FF" stroke-width="0.5" opacity="0.1"><animate attributeName="r" values="35;50;35" dur="5s" repeatCount="indefinite"/></circle>
    `,
  },
  'seo-sxo': {
    color: '#8b5cf6',
    accent: '#6EE05A',
    elements: `
      <!-- Ranking graph -->
      <polyline points="60,220 120,180 200,200 280,140 360,160 440,100 520,120" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>
      <polyline points="60,200 120,210 200,170 280,180 360,130 440,140 520,90" fill="none" stroke="#6EE05A" stroke-width="1" opacity="0.25" stroke-linecap="round" stroke-dasharray="6 4"/>
      <circle cx="440" cy="100" r="3" fill="#8b5cf6" opacity="0.5"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/></circle>
      <polyline points="680,200 760,170 840,190 920,130 1000,150 1080,80" fill="none" stroke="#8b5cf6" stroke-width="1" opacity="0.2" stroke-linecap="round"/>
      <circle cx="1080" cy="80" r="3" fill="#6EE05A" opacity="0.4"><animate attributeName="r" values="2;4;2" dur="3s" repeatCount="indefinite"/></circle>
    `,
  },
  'hipaa-compliance': {
    color: '#ef4444',
    accent: '#6EE05A',
    elements: `
      <!-- Shield -->
      <path d="M110 80L80 100v30c0 20 12 36 30 44 18-8 30-24 30-44V100L110 80z" fill="none" stroke="#ef4444" stroke-width="1.5" opacity="0.3"/>
      <path d="M100 115l7 7 16-16" fill="none" stroke="#6EE05A" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
      <!-- Scan lines -->
      <line x1="180" y1="90" x2="350" y2="90" stroke="#ef4444" stroke-width="0.5" opacity="0.15" stroke-dasharray="8 6"/>
      <line x1="180" y1="120" x2="320" y2="120" stroke="#ef4444" stroke-width="0.5" opacity="0.12" stroke-dasharray="8 6"/>
      <line x1="180" y1="150" x2="340" y2="150" stroke="#ef4444" stroke-width="0.5" opacity="0.1" stroke-dasharray="8 6"/>
      <path d="M990 80L960 100v30c0 20 12 36 30 44 18-8 30-24 30-44V100L990 80z" fill="none" stroke="#ef4444" stroke-width="1" opacity="0.2"/>
      <circle cx="600" cy="155" r="50" fill="none" stroke="#ef4444" stroke-width="0.3" opacity="0.1"><animate attributeName="r" values="45;60;45" dur="4s" repeatCount="indefinite"/></circle>
    `,
  },
  'saas-building': {
    color: '#f59e0b',
    accent: '#6EE05A',
    elements: `
      <!-- Code brackets + layers -->
      <text x="80" y="130" fill="#f59e0b" font-family="monospace" font-size="28" opacity="0.2">&lt;/&gt;</text>
      <rect x="80" y="160" width="100" height="8" rx="2" fill="#f59e0b" opacity="0.1"/>
      <rect x="80" y="175" width="70" height="8" rx="2" fill="#6EE05A" opacity="0.08"/>
      <rect x="80" y="190" width="90" height="8" rx="2" fill="#f59e0b" opacity="0.06"/>
      <text x="980" y="130" fill="#f59e0b" font-family="monospace" font-size="28" opacity="0.15">{}</text>
      <rect x="960" y="160" width="80" height="8" rx="2" fill="#6EE05A" opacity="0.1"/>
      <rect x="960" y="175" width="100" height="8" rx="2" fill="#f59e0b" opacity="0.08"/>
      <circle cx="600" cy="155" r="45" fill="none" stroke="#f59e0b" stroke-width="0.5" opacity="0.1"><animate attributeName="r" values="40;55;40" dur="5s" repeatCount="indefinite"/></circle>
    `,
  },
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim())
      current = word
    } else {
      current = (current + ' ' + word).trim()
    }
  }
  if (current) lines.push(current.trim())
  return lines
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: post } = await admin
    .from('blog_posts')
    .select('title, category_slug, subtitle, author_name, reading_time, published_at')
    .eq('slug', slug)
    .single()

  if (!post) {
    return new NextResponse('Not found', { status: 404 })
  }

  const visual = CATEGORY_VISUALS[post.category_slug] || CATEGORY_VISUALS['ai-automation']!
  const titleLines = wrapText(post.title, 32)
  const lineHeight = 38
  const titleBlockHeight = titleLines.length * lineHeight + 60
  const titleY = (310 - titleBlockHeight) / 2 + 30

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="310" viewBox="0 0 1200 310">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#020810"/>
    </linearGradient>
    <linearGradient id="title-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${visual.color}"/>
      <stop offset="100%" stop-color="${visual.accent}"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="310" fill="url(#bg)"/>

  <!-- Grid -->
  ${Array.from({ length: 24 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="310" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>`).join('')}
  ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="1200" y2="${i * 50}" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>`).join('')}

  <!-- Category-specific visuals -->
  ${visual.elements}

  <!-- Glass card for title -->
  <rect x="200" y="${titleY - 20}" width="800" height="${titleBlockHeight}" rx="16" fill="rgba(13,17,23,0.85)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <rect x="200" y="${titleY - 20}" width="800" height="${titleBlockHeight}" rx="16" fill="rgba(${visual.color === '#6EE05A' ? '110,224,90' : visual.color === '#00B4FF' ? '0,180,255' : visual.color === '#8b5cf6' ? '139,92,246' : visual.color === '#ef4444' ? '239,68,68' : '245,158,11'},0.03)"/>

  <!-- Category badge -->
  <rect x="530" y="${titleY - 4}" width="${post.category_slug.replace(/-/g, ' ').length * 7 + 24}" height="20" rx="10" fill="${visual.color}" fill-opacity="0.12" stroke="${visual.color}" stroke-width="0.5" stroke-opacity="0.3"/>
  <text x="600" y="${titleY + 10}" text-anchor="middle" fill="${visual.color}" font-family="Inter,system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="1.5" text-transform="uppercase">${post.category_slug.replace(/-/g, ' ').toUpperCase()}</text>

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="600" y="${titleY + 40 + i * lineHeight}" text-anchor="middle" fill="#f0f4f8" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="800" letter-spacing="-0.5">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`).join('\n  ')}

  <!-- Meta line -->
  <text x="600" y="${titleY + titleBlockHeight - 24}" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-family="Inter,system-ui,sans-serif" font-size="11">${post.author_name || 'RocketOpp'} · ${post.reading_time || 5} min read · ${new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</text>

  <!-- 0nCore logo text -->
  <text x="1160" y="290" text-anchor="end" fill="rgba(255,255,255,0.1)" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="700">0nCore</text>

  <!-- Corner accents -->
  <line x1="40" y1="40" x2="80" y2="40" stroke="${visual.color}" stroke-width="1" opacity="0.2"/>
  <line x1="40" y1="40" x2="40" y2="80" stroke="${visual.color}" stroke-width="1" opacity="0.2"/>
  <line x1="1120" y1="270" x2="1160" y2="270" stroke="${visual.accent}" stroke-width="1" opacity="0.2"/>
  <line x1="1160" y1="230" x2="1160" y2="270" stroke="${visual.accent}" stroke-width="1" opacity="0.2"/>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  })
}
