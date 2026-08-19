/**
 * Daily Use Case Generator — Cron Job
 * GET /api/cron/use-cases
 *
 * Generates 1 new SXO-optimized use case per day using Groq (FREE).
 * Triggered by Vercel Cron or manual call.
 *
 * Categories rotate through: Platform, Marketing, Healthcare, Agency,
 * E-Commerce, Real Estate, Legal, SaaS, Education, Finance, Automation, AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GROQ_KEY = process.env.GROQ_API_KEY
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const CATEGORIES = [
  'Platform', 'Marketing', 'Healthcare', 'Agency', 'E-Commerce',
  'Real Estate', 'Legal', 'SaaS', 'Education', 'Finance', 'Automation', 'AI',
]

const TOPICS = [
  { category: 'Healthcare', topic: 'HIPAA compliance automation for medical practices' },
  { category: 'Marketing', topic: 'AI-powered content distribution across 10 channels' },
  { category: 'Agency', topic: 'Client onboarding automation — agreement to CRM in 30 seconds' },
  { category: 'E-Commerce', topic: 'Abandoned cart recovery with AI voice agents' },
  { category: 'Real Estate', topic: 'Automated property listing syndication with CRM pipeline' },
  { category: 'Legal', topic: 'Client intake forms with compliance-aware document generation' },
  { category: 'SaaS', topic: 'Usage-based billing with metered API execution tracking' },
  { category: 'Education', topic: 'AI course generation from knowledge base documents' },
  { category: 'Finance', topic: 'Invoice automation with payment reminders and collections' },
  { category: 'Automation', topic: 'Multi-step workflow builder with conditional branching' },
  { category: 'AI', topic: 'Multi-model AI council — GPT vs Claude vs Gemini for best results' },
  { category: 'Platform', topic: 'Embeddable form builder with CRM auto-sync for any website' },
  { category: 'Healthcare', topic: 'Patient portal with voice AI intake and appointment booking' },
  { category: 'Marketing', topic: 'SEO ranking optimization with adaptive AI scoring' },
  { category: 'Agency', topic: 'White-label CRM dashboard for agency clients' },
  { category: 'AI', topic: 'K-layer knowledge system — AI that learns your business' },
  { category: 'Platform', topic: 'Auto-provisioning API — sign up to fully configured in 30 seconds' },
  { category: 'Marketing', topic: 'Blog-to-social pipeline — write once, publish everywhere' },
  { category: 'E-Commerce', topic: 'Product catalog with AI-generated descriptions and SEO' },
  { category: 'Finance', topic: 'Stripe Connect revenue sharing for marketplace platforms' },
]

export async function GET(req: NextRequest) {
  // Verify cron secret or allow manual trigger
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow without auth for manual testing
  }

  if (!GROQ_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  try {
    // 1. What has already been generated
    const { data: existing } = await admin.from('use_cases').select('category, generation_prompt')
    const existingCategories = (existing || []).map(e => e.category)

    // 2. Pick a topic that hasn't been generated yet.
    //
    // This used to slugify the TOPIC and look for that slug in the table — but
    // the row's slug is derived from the model's generated TITLE, which is never
    // the topic string. So nothing ever matched, `remainingTopics` sat at 19
    // forever, and the same topics would have been rewritten under new titles
    // until /use-cases was a wall of near-duplicates. `generation_prompt` stores
    // the topic verbatim on insert; that is the thing to compare.
    const usedTopics = new Set((existing || []).map(e => e.generation_prompt).filter(Boolean))
    const unused = TOPICS.filter(t => !usedTopics.has(t.topic))

    // Prefer categories that are underrepresented
    const catCounts = existingCategories.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc }, {} as Record<string, number>)
    unused.sort((a, b) => (catCounts[a.category] || 0) - (catCounts[b.category] || 0))

    const topic = unused[0]
    if (!topic) {
      return NextResponse.json({ message: 'All predefined topics generated. Add more topics.' })
    }

    // 3. Generate use case with Groq
    const prompt = `You are an SXO (Search Experience Optimization) content writer for 0nCore, an AI-powered CRM platform with 1,554 tools across 96 services.

Generate a use case article for: "${topic.topic}" in the "${topic.category}" category.

Return ONLY raw JSON (no markdown fences) with these exact fields:
{
  "title": "compelling title under 60 chars",
  "subtitle": "one-line value prop under 100 chars",
  "description": "2-3 sentence overview under 200 chars",
  "problem": "the business problem this solves (2-3 sentences)",
  "solution": "how 0nCore solves it (2-3 sentences, mention specific features)",
  "how_it_works": [
    {"step": 1, "title": "step title", "description": "what happens"},
    {"step": 2, "title": "step title", "description": "what happens"},
    {"step": 3, "title": "step title", "description": "what happens"},
    {"step": 4, "title": "step title", "description": "what happens"}
  ],
  "features": [
    {"title": "feature name", "description": "one sentence explanation"},
    {"title": "feature name", "description": "one sentence explanation"},
    {"title": "feature name", "description": "one sentence explanation"},
    {"title": "feature name", "description": "one sentence explanation"}
  ],
  "metrics": [
    {"value": "number or stat", "label": "what it measures"},
    {"value": "number or stat", "label": "what it measures"},
    {"value": "number or stat", "label": "what it measures"}
  ],
  "meta_title": "SEO title under 60 chars with primary keyword",
  "meta_description": "SEO description under 155 chars",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "cta_text": "action button text"
}

Be specific about 0nCore features: K-layers, CRM sub-locations, 0nMCP, form builder, embed scripts, AI engine, HIPAA scanner, CRO9 Neuro Engine, voice AI, auto-provisioning. Use real numbers where possible.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        // openai/gpt-oss-120b was decommissioned by Groq; GET
        // /openai/v1/models on our key no longer lists it and chat/completions
        // answers 404, which is what this cron had been failing on. Re-pinned to
        // a model the key can actually reach, via GROQ_MODEL so the fleet-wide
        // re-pin can move it again without touching this file.
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
        // Without this the model returns prose-with-JSON often enough to matter:
        // the first run after the dedup fix died on `Expected ',' or ']' after
        // array element`, because the only guard was a greedy /\{[\s\S]*\}/ and
        // then a bare JSON.parse. /api/cron/blog has asked for json_object since
        // it was written; this is the same ask, and the regex stays as the belt.
        response_format: { type: 'json_object' },
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error(`[Use Case Cron] Groq error: ${groqRes.status} — ${errText.substring(0, 200)}`)
      return NextResponse.json({ error: `AI generation failed: ${groqRes.status}` }, { status: 502 })
    }

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Use Case Cron] Could not parse JSON from Groq response')
      return NextResponse.json({ error: 'AI output not parseable' }, { status: 422 })
    }

    const generated = JSON.parse(jsonMatch[0])
    const slug = (generated.title || topic.topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

    // 4. Insert into database
    const { data: inserted, error } = await admin.from('use_cases').insert({
      slug,
      title: generated.title,
      subtitle: generated.subtitle,
      category: topic.category,
      description: generated.description,
      problem: generated.problem,
      solution: generated.solution,
      how_it_works: generated.how_it_works,
      features: generated.features,
      metrics: generated.metrics,
      meta_title: generated.meta_title,
      meta_description: generated.meta_description,
      keywords: generated.keywords,
      cta_text: generated.cta_text || 'Get Started',
      cta_url: '/login',
      status: 'published',
      generated_by: 'groq-cron',
      generation_prompt: topic.topic,
    }).select().single()

    if (error) {
      console.error('[Use Case Cron] DB insert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Use Case Cron] Generated: "${generated.title}" (${topic.category}) → /use-cases/${slug}`)

    return NextResponse.json({
      success: true,
      useCase: { slug, title: generated.title, category: topic.category },
      totalUseCases: (existing?.length || 0) + 1,
      remainingTopics: unused.length - 1,
    })
  } catch (error) {
    console.error('[Use Case Cron] Fatal error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Generation failed' }, { status: 500 })
  }
}
