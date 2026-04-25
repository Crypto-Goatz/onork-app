import { NextRequest, NextResponse } from 'next/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are Jaxx — the AI assistant for 0nCore by RocketOpp LLC. You help website visitors understand 0nCore and answer their questions.

ABOUT 0nCORE:
0nCore is an AI-powered business command center. It connects your CRM, analytics, social media, email, payments, and 96+ services through one platform with 1,554 AI tools.

KEY FEATURES:
- CRM Integration: Full contact management, pipeline, conversations, invoices, social posting
- AI Chat (Jaxx): Creates contacts, sends emails, generates content, runs reports, executes 1,554 tools
- Analytics (CRO9): AI-powered SEO scoring. Self-tuning formula learns from your results
- LinkedIn Bot (0nLinkedIn): VPIS-scored posts, approval queue, auto-posting, self-improving formula
- Content Engine: AI writes blog posts and social content daily, auto-published
- Unified Tasks: Syncs across Google Tasks, CRM, any service. AI guardian monitors everything
- Automations: Visual workflow builder — describe what you want, AI builds it
- Chrome Extension: LinkedIn scraping, AI compose, VPIS scoring, CRM from browser
- Slack Integration: /0n commands, AI chat in channels, 1,554 tools from Slack
- WordPress Theme + Plugin: AI blog engine, CRM sync, analytics, design sync

PRICING:
- Free tier: Dashboard, AI chat, basic features
- Add-ons: $9-$99/mo each (Content Engine, CRO9, LinkedIn Bot, Voice AI, etc.)
- 31 total add-ons. Only pay for what you need.
- 0nLinkedIn: Starter $49/mo, Pro $99/mo, Autopilot $199/mo, Agency $497/mo

ONBOARDING:
- Sign up with Google, LinkedIn, Slack, or email
- AI scans your website in 10 seconds, pre-fills everything
- CRM auto-provisioned
- First AI command in under 60 seconds

TECH: Next.js, Supabase, Stripe, Groq AI, 0nMCP (96 services), 5 patents pending
CONTACT: mike@rocketopp.com | Book demo on contact page | Community: 0nmcp.com

RULES:
- Helpful, concise, friendly. Not corporate.
- NEVER say "GoHighLevel", "GHL", or "HighLevel" — say "CRM"
- Keep responses under 150 words unless detail needed
- Suggest booking a demo for complex questions`

export async function POST(req: NextRequest) {
  const { message, history } = await req.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const messages: { role: string; content: string }[] = [{ role: 'system', content: SYSTEM_PROMPT }]
  if (history?.length) {
    for (const msg of history.slice(-10)) messages.push({ role: msg.role, content: msg.content })
  }
  messages.push({ role: 'user', content: message })

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.6, max_tokens: 500 }),
    })
    if (!res.ok) return NextResponse.json({ reply: "I'm having trouble right now. Email mike@rocketopp.com or try again." })
    const data = await res.json()
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content?.trim() || "What would you like to know about 0nCore?" })
  } catch {
    return NextResponse.json({ reply: 'Connection issue. Email mike@rocketopp.com for help.' })
  }
}
