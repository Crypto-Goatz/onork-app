import { createClient } from '@/lib/supabase/server'

// K-Layer definitions
// K1: Brand Voice — business_name, what_we_do, brand_tone, tagline, values
// K2: Audience — icp, pain_points, language, objections
// K3: Products — offerings, pricing, differentiators, case_studies
// K4: Intelligence — market_trends, competitor_intel, signals
// K5: Playbooks — sales_process, email_templates, scripts, sops
// K6: Integrations — connected_services, api_keys_status, automations
// K7: Memory — past_conversations, learned_preferences, corrections

function buildSystemPrompt(
  layers: Record<string, Record<string, unknown>>,
  userEmail: string,
  tierName: string,
): string {
  const k1 = layers['K1'] || {}
  const k2 = layers['K2'] || {}
  const k3 = layers['K3'] || {}
  const k4 = layers['K4'] || {}
  const k5 = layers['K5'] || {}
  const k6 = layers['K6'] || {}
  const k7 = layers['K7'] || {}

  const sections: string[] = []

  // Identity
  sections.push(`You are the 0nCore AI assistant for ${k1.business_name || 'this business'}.`)
  sections.push(`User: ${userEmail} | Tier: ${tierName}`)

  // K1 — Brand Voice
  if (k1.business_name) {
    const parts = [`Business: ${k1.business_name}`]
    if (k1.what_we_do) parts.push(`What we do: ${k1.what_we_do}`)
    if (k1.brand_tone) parts.push(`Tone: ${k1.brand_tone} — match this in all responses`)
    if (k1.tagline) parts.push(`Tagline: ${k1.tagline}`)
    if (k1.values) parts.push(`Values: ${k1.values}`)
    sections.push(`\n[K1 BRAND VOICE]\n${parts.join('\n')}`)
  }

  // K2 — Audience
  if (k2.icp || k2.pain_points) {
    const parts: string[] = []
    if (k2.icp) parts.push(`ICP: ${k2.icp}`)
    if (k2.pain_points) parts.push(`Pain points: ${Array.isArray(k2.pain_points) ? (k2.pain_points as string[]).join(', ') : k2.pain_points}`)
    if (k2.language) parts.push(`Language style: ${k2.language}`)
    if (k2.objections) parts.push(`Common objections: ${Array.isArray(k2.objections) ? (k2.objections as string[]).join(', ') : k2.objections}`)
    sections.push(`\n[K2 AUDIENCE]\n${parts.join('\n')}`)
  }

  // K3 — Products
  if (k3.offerings || k3.pricing) {
    const parts: string[] = []
    if (k3.offerings) parts.push(`Offerings: ${Array.isArray(k3.offerings) ? (k3.offerings as string[]).join(', ') : k3.offerings}`)
    if (k3.pricing) parts.push(`Pricing: ${k3.pricing}`)
    if (k3.differentiators) parts.push(`Differentiators: ${Array.isArray(k3.differentiators) ? (k3.differentiators as string[]).join(', ') : k3.differentiators}`)
    sections.push(`\n[K3 PRODUCTS]\n${parts.join('\n')}`)
  }

  // K4 — Intelligence
  if (k4.market_trends || k4.competitor_intel) {
    const parts: string[] = []
    if (k4.market_trends) parts.push(`Market trends: ${k4.market_trends}`)
    if (k4.competitor_intel) parts.push(`Competitor intel: ${k4.competitor_intel}`)
    sections.push(`\n[K4 INTELLIGENCE]\n${parts.join('\n')}`)
  }

  // K5 — Playbooks
  if (k5.sales_process || k5.sops) {
    const parts: string[] = []
    if (k5.sales_process) parts.push(`Sales process: ${k5.sales_process}`)
    if (k5.sops) parts.push(`SOPs: ${k5.sops}`)
    sections.push(`\n[K5 PLAYBOOKS]\n${parts.join('\n')}`)
  }

  // K6 — Integrations
  const integrations = k6.connected_services as Array<{ name: string }> | undefined
  if (integrations?.length) {
    sections.push(`\n[K6 INTEGRATIONS]\nConnected: ${integrations.map(i => i.name).join(', ')}`)
  }

  // K7 — Memory
  if (k7.learned_preferences || k7.corrections) {
    const parts: string[] = []
    if (k7.learned_preferences) parts.push(`Preferences: ${k7.learned_preferences}`)
    if (k7.corrections) parts.push(`Corrections: ${k7.corrections}`)
    sections.push(`\n[K7 MEMORY]\n${parts.join('\n')}`)
  }

  // Rules
  sections.push(`\n[RULES]
- Never say "GHL", "Go High Level", or "HighLevel" — always say "CRM"
- Answer directly. No preamble. No filler.
- Match the brand tone from K1 in every response
- When giving advice, reference the user's specific business context
- If you don't have enough context in the K-layers, ask the user to fill it in
- You can help with: content writing, email drafts, strategy, CRM tasks, analytics, brainstorming
- Be concise but thorough. Prefer actionable outputs over explanations.`)

  return sections.join('\n')
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history = [], crewId } = await req.json()
  if (!message) return Response.json({ error: 'message required' }, { status: 400 })

  // If a crew is specified, load its config for layer filtering
  let crewConfig: { name: string; role: string; description: string; k_layers: string[]; tools: string[] } | null = null
  if (crewId) {
    const { data: crew } = await supabase
      .from('crews')
      .select('name, role, description, k_layers, tools')
      .eq('id', crewId)
      .eq('user_id', user.id)
      .single()
    crewConfig = crew
  }

  // Load K-Layer content — filtered by crew's assigned layers if applicable
  const { data: kContent } = await supabase
    .from('kb_content_queue')
    .select('layer, content')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('layer')

  // Build layer map — filter to crew's assigned layers if applicable
  const layers: Record<string, Record<string, unknown>> = {}
  for (const row of kContent || []) {
    if (row.layer && row.content) {
      // If crew has specific layers, only include those
      if (crewConfig?.k_layers && crewConfig.k_layers.length > 0) {
        if (crewConfig.k_layers.includes(row.layer)) {
          layers[row.layer] = row.content as Record<string, unknown>
        }
      } else {
        layers[row.layer] = row.content as Record<string, unknown>
      }
    }
  }

  // Get user tier
  const { data: tierData } = await supabase
    .from('user_tiers')
    .select('tier_name')
    .eq('user_id', user.id)
    .single()

  let systemPrompt = buildSystemPrompt(
    layers,
    user.email || '',
    tierData?.tier_name || 'lobby',
  )

  // Add crew-specific context to the system prompt
  if (crewConfig) {
    const crewContext = `\n[CREW IDENTITY]
You are "${crewConfig.name}" — ${crewConfig.description}
Role: ${crewConfig.role}
Available tools: ${crewConfig.tools?.join(', ') || 'general'}
Active K-Layers: ${crewConfig.k_layers?.join(', ') || 'K1'}

IMPORTANT: You are a SPECIALIZED agent. Stay focused on your role.
- ${crewConfig.role === 'social' ? 'Focus on social media strategy, content creation, scheduling, ads, and engagement. You can create posts, analyze performance, and manage campaigns.' : ''}
- ${crewConfig.role === 'design' ? 'Focus on brand design, visual assets, presentations, and brand consistency. You can create designs, review brand guidelines, and generate visual content.' : ''}
- ${crewConfig.role === 'intelligence' ? 'Focus on research, market analysis, competitor intel, trends, and data-driven insights. You find what others miss.' : ''}
- ${crewConfig.role === 'sales' ? 'Focus on pipeline management, lead scoring, outreach sequences, follow-ups, and closing deals. You move revenue forward.' : ''}
- ${crewConfig.role === 'communication' ? 'Focus on message delivery, Slack communications, email campaigns, SMS, notifications. You make sure the right message reaches the right person at the right time.' : ''}
- ${crewConfig.role === 'development' ? 'Focus on code, WordPress, plugins, deployments, database queries, and infrastructure. You build and ship.' : ''}
- ${crewConfig.role === 'general' ? 'You are the master AI. You can do anything. Route to specialized crews when appropriate.' : ''}

When the user asks you to DO something (not just answer), describe the exact steps you would take and which tools you would use. Be specific and actionable.`

    systemPrompt = crewContext + '\n\n' + systemPrompt
  }

  // Count active K-layers for response metadata
  const activeKLayers = Object.keys(layers)
  const hasKLayers = activeKLayers.length > 0

  // Route: K-layers exist → Anthropic (full context). No K-layers → Groq (fast fallback).
  if (hasKLayers && process.env.ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [...history.slice(-20), { role: 'user', content: message }],
      }),
    })

    const data = await response.json()
    if (data.error) {
      return Response.json({ error: data.error.message || 'AI error' }, { status: 500 })
    }

    return Response.json({
      reply: data.content?.[0]?.text || '',
      kLayers: activeKLayers,
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
    })
  }

  // Fallback: Groq (no K-layers or no Anthropic key)
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS?.split(',')[0]
  if (!groqKey) {
    return Response.json({ error: 'No AI provider configured' }, { status: 500 })
  }

  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: groqMessages,
    }),
  })

  const groqData = await groqResponse.json()
  if (groqData.error) {
    return Response.json({ error: groqData.error.message || 'Groq error' }, { status: 500 })
  }

  return Response.json({
    reply: groqData.choices?.[0]?.message?.content || '',
    kLayers: activeKLayers,
    model: 'llama-3.3-70b-versatile',
    provider: 'groq',
  })
}
