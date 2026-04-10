import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history = [] } = await req.json()
  if (!message) return Response.json({ error: 'message required' }, { status: 400 })

  // Load K-Layer context
  const { data: kContent } = await supabase
    .from('kb_content_queue')
    .select('k_layer, content')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('k_layer')

  const k1 = kContent?.find(k => k.k_layer === 'K1')?.content as Record<string, string> | undefined
  const k6 = kContent?.find(k => k.k_layer === 'K6')?.content as Record<string, unknown> | undefined

  const integrations = k6?.integrations as Array<{ name: string }> | undefined

  const systemPrompt = `You are the 0nCore AI for ${k1?.business_name || 'this business'}.
${k1?.what_we_do ? `What we do: ${k1.what_we_do}` : ''}
${k1?.brand_tone ? `Tone: ${k1.brand_tone}` : ''}
${integrations?.length ? `Connected tools: ${integrations.map(i => i.name).join(', ')}` : ''}
Rules: Never say "GHL" — always say "CRM". Answer directly. No preamble.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [...history.slice(-20), { role: 'user', content: message }],
    }),
  })

  const data = await response.json()

  if (data.error) {
    return Response.json({ error: data.error.message || 'AI error' }, { status: 500 })
  }

  return Response.json({ reply: data.content?.[0]?.text || '' })
}
