/**
 * Daily Blog Generator — Cron Job
 * GET /api/cron/blog — generates 1 SXO blog post per day using Groq
 * Schedule: 6:00 AM UTC daily
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4000 }),
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

    const post = JSON.parse(match[0])
    const slug = (post.title || topic.topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

    // Get category ID
    const { data: cat } = await admin.from('blog_categories').select('id').eq('slug', topic.category).single()

    const { error: insertError } = await admin.from('blog_posts').insert({
      slug,
      title: post.title,
      subtitle: post.subtitle,
      category_id: cat?.id,
      category_slug: topic.category,
      excerpt: post.excerpt,
      content: post.content,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      keywords: post.keywords,
      author_name: 'RocketOpp',
      reading_time: post.reading_time || 6,
      status: 'published',
      generated_by: 'groq-cron',
      published_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[Blog Cron] Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update category post count
    if (cat?.id) {
      const { count } = await admin.from('blog_posts').select('id', { count: 'exact', head: true }).eq('category_slug', topic.category).eq('status', 'published')
      await admin.from('blog_categories').update({ post_count: count || 0 }).eq('id', cat.id)
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
