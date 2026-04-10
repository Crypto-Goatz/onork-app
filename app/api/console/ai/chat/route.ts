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

  const { message, history = [] } = await req.json()
  if (!message) return Response.json({ error: 'message required' }, { status: 400 })

  // Load ALL K-Layer content for this user
  const { data: kContent } = await supabase
    .from('kb_content_queue')
    .select('layer, content')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('layer')

  // Build layer map
  const layers: Record<string, Record<string, unknown>> = {}
  for (const row of kContent || []) {
    if (row.layer && row.content) {
      layers[row.layer] = row.content as Record<string, unknown>
    }
  }

  // Get user tier
  const { data: tierData } = await supabase
    .from('user_tiers')
    .select('tier_name')
    .eq('user_id', user.id)
    .single()

  const systemPrompt = buildSystemPrompt(
    layers,
    user.email || '',
    tierData?.tier_name || 'lobby',
  )

  // Count active K-layers for response metadata
  const activeKLayers = Object.keys(layers)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
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
  })
}
