/**
 * POST /api/automations/suggest
 *
 * Generates contextual AI-powered automation suggestions for the visual builder's
 * left panel. Uses Groq (openai/gpt-oss-120b) with the user's K1 layer for
 * industry/business context. Returns 3–5 capability suggestions with reasons and
 * priority scores based on what's missing from the current workflow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { CAPABILITIES } from '@/components/automations/capabilities'

// ── Types ────────────────────────────────────────────────────────────────────

interface SuggestRequest {
  currentNodes: Array<{ data: { capabilityId?: string; category?: string; name?: string } }>
  industry?: string
  services?: string[]
  connectedServices?: string[]
}

interface RawSuggestion {
  capabilityId: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

interface Suggestion extends RawSuggestion {
  capabilityId: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

// ── Capability list for the prompt ───────────────────────────────────────────

const CAPABILITY_LIST = CAPABILITIES.map(c =>
  `- ${c.id} | ${c.name} | ${c.description} | category: ${c.category}`
).join('\n')

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth ──
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ──
  let body: SuggestRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { currentNodes = [], industry: bodyIndustry, services: bodyServices, connectedServices = [] } = body

  // ── Load K1 layer from kb_content_queue ──
  const { data: k1Row } = await supabase
    .from('kb_content_queue')
    .select('content')
    .eq('user_id', user.id)
    .eq('layer', 'K1')
    .eq('status', 'active')
    .maybeSingle()

  const k1 = (k1Row?.content as Record<string, string> | null) ?? {}

  // Resolve industry and business context — body params take priority, K1 is fallback
  const industry = bodyIndustry || k1.industry || 'general business'
  const businessName = k1.business_name || 'your business'
  const services: string[] = bodyServices?.length
    ? bodyServices
    : k1.services
      ? (Array.isArray(k1.services) ? k1.services : [k1.services])
      : []

  // ── Build current workflow summary ──
  const usedCapabilityIds = currentNodes
    .map(n => n.data.capabilityId)
    .filter(Boolean) as string[]

  const nodeCount = currentNodes.length
  const nodeList = usedCapabilityIds.length
    ? usedCapabilityIds
        .map(id => {
          const cap = CAPABILITIES.find(c => c.id === id)
          return cap ? `${cap.name} (${cap.category})` : id
        })
        .join(', ')
    : 'none yet'

  // ── Build Groq prompt ──
  const systemPrompt = `You are an automation advisor for a ${industry} business called ${businessName}.
They currently have ${nodeCount} step${nodeCount === 1 ? '' : 's'} in their workflow: ${nodeList}.
${services.length ? `Their core services include: ${services.join(', ')}.` : ''}
${connectedServices.length ? `Connected integrations: ${connectedServices.join(', ')}.` : ''}

Suggest 3-5 automation capabilities they should add next. Focus on:
- What's missing from their current workflow
- Industry-specific automations for ${industry}
- High-impact, easy-to-configure actions
- Logical next steps given what's already in the workflow

Return ONLY a JSON array — no markdown, no explanation, no code fences:
[
  { "capabilityId": "exact_id_from_list", "reason": "why this helps their business", "priority": "high|medium|low" }
]

Available capabilities (id | name | description | category):
${CAPABILITY_LIST}`

  const userMessage = `Current workflow has ${nodeCount} step${nodeCount === 1 ? '' : 's'}: [${nodeList}].
Industry: ${industry}. Business: ${businessName}.
What 3-5 capabilities should they add next?`

  // ── Call Groq ──
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS?.split(',')[0]
  if (!groqKey) {
    return NextResponse.json(
      { error: 'AI service not configured', suggestions: getFallbackSuggestions(usedCapabilityIds) },
      { status: 200 }
    )
  }

  let rawSuggestions: RawSuggestion[] = []

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        max_tokens: 1024,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '')
      console.error('[suggest] Groq error:', groqRes.status, errText)
      return NextResponse.json({
        suggestions: getFallbackSuggestions(usedCapabilityIds),
        source: 'fallback',
      })
    }

    const groqData = await groqRes.json()
    const content: string = groqData.choices?.[0]?.message?.content || ''

    // Parse the JSON array from the response — handle extra text around it
    let parsed: unknown
    try {
      parsed = JSON.parse(content.trim())
    } catch {
      const match = content.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch {
          parsed = null
        }
      }
    }

    if (Array.isArray(parsed)) {
      rawSuggestions = parsed as RawSuggestion[]
    }
  } catch (err) {
    console.error('[suggest] Groq fetch failed:', err)
    return NextResponse.json({
      suggestions: getFallbackSuggestions(usedCapabilityIds),
      source: 'fallback',
    })
  }

  // ── Validate capability IDs and normalise ──
  const validCapabilityIds = new Set(CAPABILITIES.map(c => c.id))
  const usedSet = new Set(usedCapabilityIds)

  const suggestions: Suggestion[] = rawSuggestions
    .filter((s): s is RawSuggestion =>
      typeof s === 'object' &&
      s !== null &&
      typeof s.capabilityId === 'string' &&
      validCapabilityIds.has(s.capabilityId) &&  // must be a real capability
      !usedSet.has(s.capabilityId) &&             // must not already be in the workflow
      typeof s.reason === 'string' &&
      ['high', 'medium', 'low'].includes(s.priority)
    )
    .map(s => ({
      capabilityId: s.capabilityId,
      reason: s.reason.trim(),
      priority: s.priority,
    }))
    .slice(0, 5)

  // If Groq returned nothing valid, fall back to rule-based suggestions
  if (suggestions.length === 0) {
    return NextResponse.json({
      suggestions: getFallbackSuggestions(usedCapabilityIds),
      source: 'fallback',
    })
  }

  return NextResponse.json({
    suggestions,
    source: 'groq',
    context: {
      industry,
      businessName,
      nodeCount,
    },
  })
}

// ── Fallback: rule-based suggestions (mirrors AIRecommendations static logic) ──

function getFallbackSuggestions(usedIds: string[]): Suggestion[] {
  const used = new Set(usedIds)

  const candidates: Array<{ capabilityId: string; reason: string; priority: 'high' | 'medium' | 'low' }> = [
    { capabilityId: 'trigger_new_lead', reason: 'Every automation needs a trigger to start', priority: 'high' },
    { capabilityId: 'score_hot_leads', reason: 'Score leads before taking action — 73% higher conversion', priority: 'high' },
    { capabilityId: 'ai_classify_intent', reason: 'AI determines what the lead wants and routes them correctly', priority: 'high' },
    { capabilityId: 'start_email_campaign', reason: 'Hot leads convert 4x better with immediate follow-up', priority: 'medium' },
    { capabilityId: 'send_sms', reason: 'SMS gets 98% open rate — pair with email for best results', priority: 'medium' },
    { capabilityId: 'book_appointment', reason: 'Convert engaged leads into booked appointments', priority: 'medium' },
    { capabilityId: 'send_reminder', reason: 'Reminders reduce no-shows by 40%', priority: 'medium' },
    { capabilityId: 'send_review_request', reason: 'Ask for reviews while the experience is fresh', priority: 'low' },
    { capabilityId: 'track_payment', reason: 'Follow up on unpaid invoices automatically', priority: 'low' },
    { capabilityId: 'daily_summary', reason: "Get a morning digest of your automation's performance", priority: 'low' },
  ]

  return candidates
    .filter(c => !used.has(c.capabilityId))
    .slice(0, 5)
}
