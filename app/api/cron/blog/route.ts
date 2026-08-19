/**
 * Daily Blog Generator — Cron Job
 * GET /api/cron/blog — generates 1 SXO blog post per day using Groq
 * Schedule: 6:00 AM UTC daily
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndStoreFeaturedImage } from '@/lib/blog/featured-image'

export const maxDuration = 60

const GROQ_KEY = process.env.GROQ_API_KEY
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const BLOG_TOPICS = [
  { category: 'ai-automation', topic: 'How multi-model AI councils make better decisions than single LLMs' },
  { category: 'ai-automation', topic: 'Building AI agents that actually execute — not just chat' },
  { category: 'ai-automation', topic: 'The K-layer system: teaching AI your brand voice' },
  { category: 'ai-automation', topic: 'Why Groq is replacing OpenAI for real-time AI applications' },
  { category: 'crm-strategy', topic: 'Pipeline velocity: the metric your CRM should optimize for' },
  { category: 'crm-strategy', topic: 'Contact scoring with AI: beyond lead magnets and form fills' },
  { category: 'crm-strategy', topic: 'Two-way CRM sync: why brand data should flow both directions' },
  { category: 'crm-strategy', topic: 'Sub-location architecture for multi-client agency management' },
  { category: 'seo-sxo', topic: 'SXO vs SEO: why search experience optimization wins in 2026' },
  { category: 'seo-sxo', topic: 'Adaptive SEO scoring with Thompson Sampling' },
  { category: 'seo-sxo', topic: 'The 6 action buckets: how CRO9 classifies every ranking opportunity' },
  { category: 'seo-sxo', topic: 'Programmatic SEO pages: generating 100+ indexed pages automatically' },
  { category: 'hipaa-compliance', topic: 'The 2026 HIPAA NPRM: what changes and when' },
  { category: 'hipaa-compliance', topic: 'HIPAA compliance scanning: 63 checks your healthcare site needs' },
  { category: 'hipaa-compliance', topic: 'Google Analytics on healthcare sites: the BAA problem nobody talks about' },
  { category: 'hipaa-compliance', topic: 'End-of-life software on medical portals: a HIPAA time bomb' },
  { category: 'saas-building', topic: 'Auto-provisioning: sign up to fully configured in 30 seconds' },
  { category: 'saas-building', topic: 'Embeddable form builders: how to collect data on any website' },
  { category: 'saas-building', topic: 'Stripe Connect for SaaS platforms: revenue sharing done right' },
  { category: 'saas-building', topic: 'The SaaS Factory pattern: white-label an entire platform' },
  { category: 'agency-growth', topic: 'Client onboarding automation: agreement to CRM in 30 seconds' },
  { category: 'agency-growth', topic: 'White-labeling for agencies: your brand, our infrastructure' },
  { category: 'agency-growth', topic: 'Scaling from 5 to 50 clients without hiring' },
  { category: 'agency-growth', topic: 'The agency dashboard: managing 20 sub-locations from one view' },
  { category: 'mcp-ecosystem', topic: 'What is MCP and why every AI tool will support it by 2027' },
  { category: 'mcp-ecosystem', topic: '0nMCP: how 1,554 tools work through a single protocol' },
  { category: 'mcp-ecosystem', topic: 'The .0n file standard: portable AI workflow configuration' },
  { category: 'mcp-ecosystem', topic: 'Building MCP servers: a developer guide' },
  { category: 'product-updates', topic: '0nCore v4.5: form builder, HIPAA scanner v2, and SaaS Factory' },
  { category: 'product-updates', topic: 'Introducing the 0n-ui design system: 8 onboarding patterns' },
  { category: 'ai-automation', topic: 'Voice AI agents: replacing IVR with conversational intelligence' },
  { category: 'crm-strategy', topic: 'Google OAuth integration: one click to connect 8 services' },
  { category: 'seo-sxo', topic: 'Daily content generation: how AI writes SEO articles at scale' },
  { category: 'saas-building', topic: 'From CRM to platform: the evolution of business software' },
  { category: 'agency-growth', topic: 'HIPAA scanning as a service: selling compliance audits to healthcare clients' },
  { category: 'mcp-ecosystem', topic: 'The 0nVault container system: encrypted portable AI brains' },
]

// LLM JSON often contains raw newlines inside string values (illegal in JSON).
// Parse directly first; on failure, escape control chars *inside string literals only*.
function parseLooseJson(text: string): any {
  try { return JSON.parse(text) } catch { /* fall through to repair */ }
  let out = ''
  let inStr = false
  let esc = false
  for (const ch of text) {
    if (esc) { out += ch; esc = false; continue }
    if (ch === '\\') { out += ch; esc = true; continue }
    if (ch === '"') { inStr = !inStr; out += ch; continue }
    if (inStr) {
      if (ch === '\n') { out += '\\n'; continue }
      if (ch === '\r') { out += '\\r'; continue }
      if (ch === '\t') { out += '\\t'; continue }
      const code = ch.charCodeAt(0)
      if (code < 0x20) { out += '\\u' + code.toString(16).padStart(4, '0'); continue }
    }
    out += ch
  }
  return JSON.parse(out)
}

export async function GET() {
  if (!GROQ_KEY) return NextResponse.json({ error: 'GROQ_API_KEY missing' }, { status: 500 })

  try {
    const { data: existing } = await admin.from('blog_posts').select('slug')
    const existingSlugs = new Set((existing || []).map(e => e.slug))

    const unused = BLOG_TOPICS.filter(t => {
      const slug = t.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
      return !existingSlugs.has(slug)
    })

    if (unused.length === 0) return NextResponse.json({ message: 'All topics generated' })

    const topic = unused[Math.floor(Math.random() * Math.min(5, unused.length))]

    const prompt = `You are an expert SXO (Search Experience Optimization) content writer for 0nCore, an AI-powered CRM platform with 1,554 tools.

Write a blog post about: "${topic.topic}"
Category: ${topic.category}

Return ONLY raw JSON (no markdown fences):
{
  "title": "compelling title under 65 chars",
  "subtitle": "one-line hook under 120 chars",
  "excerpt": "2-3 sentence teaser under 250 chars",
  "content": "full article in markdown format. Use ## for sections, **bold** for emphasis, | tables, numbered/bulleted lists, code blocks with backticks. Minimum 1200 words. Include specific 0nCore features: K-layers, 0nMCP, CRO9, form builder, HIPAA scanner, auto-provisioning, CRM sub-locations. Use real numbers and data where possible. End with a CTA.",
  "meta_title": "SEO title under 60 chars",
  "meta_description": "SEO description under 155 chars",
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "reading_time": number_of_minutes
}

SXO rules: BLUF (bottom line up front), Table Trap (include a comparison table), Information Gain (say something competitors don't). No fluff. Every paragraph earns its place.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      // Re-pinning the model was not enough to revive this cron. The prompt
      // asks for 1200+ words of markdown inside a JSON string, and GPT-OSS
      // spends reasoning tokens out of the same max_tokens before it writes a
      // character. At 4000 it ran out mid-document and Groq rejected the whole
      // response with `400 json_validate_failed: max completion tokens reached
      // before generating a valid document` — so this would have gone on
      // failing daily, just with a new error code.
      //
      // `reasoning_effort: 'low'` is what makes it fit. The budget stays at
      // 4000 because `x-ratelimit-limit-tokens` on this key is 8000 per minute,
      // not the 12000 quoted in lib/course-builder/generator.ts — and Groq
      // counts max_tokens toward that ceiling when it admits the request. An
      // 8000-token ask plus the prompt is therefore over the line before it
      // starts, and 413s on an empty bucket; 4000 leaves room for whatever else
      // is calling Groq in the same minute, which on a shared key is the case
      // that actually matters for an unattended 6am cron.
      body: JSON.stringify({ model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], temperature: 0.7, reasoning_effort: 'low', max_tokens: 4000, response_format: { type: 'json_object' } }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Blog Cron] Groq error: ${res.status}`)
      return NextResponse.json({ error: `Groq ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Parse failed' }, { status: 422 })

    const post = parseLooseJson(match[0])
    const slug = (post.title || topic.topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

    const wordCount = String(post.content || '').split(/\s+/).filter(Boolean).length

    // Generate + store a featured image (best-effort; null is fine).
    const image = await generateAndStoreFeaturedImage(slug, post.title, topic.category)

    const { error: insertError } = await admin.from('blog_posts').insert({
      slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      body: post.content,
      meta_description: post.meta_description,
      category: topic.category,
      tags: post.keywords,
      image,
      author: 'RocketOpp',
      author_title: 'AI Content Engine',
      word_count: wordCount,
      status: 'published',
      source: 'groq-cron',
      published_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[Blog Cron] Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`[Blog Cron] Published: "${post.title}" → /blog/${topic.category}/${slug}`)

    return NextResponse.json({
      success: true,
      post: { slug, title: post.title, category: topic.category },
      remaining: unused.length - 1,
    })
  } catch (error) {
    console.error('[Blog Cron] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
