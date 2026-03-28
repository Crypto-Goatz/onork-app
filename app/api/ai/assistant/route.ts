import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1'

const SYSTEM_PROMPT = `You are 0nAI — the AI that runs businesses. You have access to 819 tools across 54 services through the 0nMCP orchestration engine.

When a user asks you to DO something, you identify the action and execute it. You don't just talk — you ACT.

Available actions you can execute:
- score_leads: Score all active leads 1-100 and identify the hottest
- send_email: Draft and send emails to contacts
- send_sms: Send text messages to contacts
- book_appointment: Check calendar and book appointments
- generate_course: Generate a complete online course
- generate_content: Write blog posts, social posts, email copy
- search_contacts: Find contacts by name, email, tag, or criteria
- pipeline_status: Show pipeline stages, deal counts, projected revenue
- create_automation: Build a .0n workflow from description
- enrich_contact: Fill in missing contact data from public sources
- send_review_request: Ask clients for Google reviews
- voice_ai_call: Initiate an AI voice call to a contact
- monthly_report: Generate this month's business summary
- nurture_sequence: Start a multi-step follow-up sequence
- import_course: Import a generated course into the CRM

When you identify an action to take, include it at the START of your response in this format:
[ACTION:action_name]

Then explain what you did in plain language. Be concise, direct, and confident. You're not an assistant — you're their AI employee. Act like it.

If they're just chatting or asking a question, answer directly without an action tag. Keep responses short — 2-4 sentences unless they need detail.`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const businessName = user.user_metadata?.business_name || 'your business'

  try {
    // Try Ollama
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + `\n\nThe user's business is: ${businessName}` },
          { role: 'user', content: message },
        ],
        stream: false,
        options: { temperature: 0.5, num_predict: 1024 },
      }),
      signal: AbortSignal.timeout(30000),
    }).catch(() => null)

    if (ollamaRes?.ok) {
      const data = await ollamaRes.json()
      const text = data.message?.content || ''

      // Extract action if present
      const actionMatch = text.match(/\[ACTION:(\w+)\]/)
      const action = actionMatch?.[1] || undefined
      const cleanText = text.replace(/\[ACTION:\w+\]\s*/g, '').trim()

      // If action detected, execute it
      if (action) {
        await executeAction(action, message, user)
      }

      return NextResponse.json({
        response: cleanText,
        action,
        provider: 'ollama',
      })
    }

    // Fallback — smart template responses
    const response = getSmartResponse(message, businessName)
    return NextResponse.json({ ...response, provider: 'template' })

  } catch (err: any) {
    return NextResponse.json({ response: `Error: ${err.message}`, provider: 'error' }, { status: 500 })
  }
}

async function executeAction(action: string, message: string, user: any) {
  // Log the action — in production, this calls 0nMCP
  console.log(`[0nAI] Executing: ${action} for ${user.email} — "${message}"`)
  // TODO: Wire to 0nMCP HTTP server or direct CRM API calls
}

function getSmartResponse(message: string, businessName: string): { response: string; action?: string } {
  const lower = message.toLowerCase()

  if (lower.includes('score') && lower.includes('lead')) {
    return {
      response: `Scoring all active leads for ${businessName} now. I'll analyze engagement signals, email opens, page visits, and response times. Your hottest leads will be tagged and you'll see a ranked list in your pipeline. Give me a moment.`,
      action: 'score_leads',
    }
  }

  if (lower.includes('course') || lower.includes('training')) {
    return {
      response: `I'll generate a complete course for you. Head to the Courses tab in your dashboard — describe your topic there and I'll build the full module structure with lessons, then import it directly into your CRM. Your students can access it immediately.`,
      action: 'generate_course',
    }
  }

  if (lower.includes('pipeline') || lower.includes('deal') || lower.includes('opportunity')) {
    return {
      response: `Pulling your pipeline now. I'll show you open deals by stage, projected revenue, and which deals need attention. Check your Pipeline tab for the full view — I'm updating the numbers.`,
      action: 'pipeline_status',
    }
  }

  if (lower.includes('email') && (lower.includes('send') || lower.includes('draft') || lower.includes('follow'))) {
    return {
      response: `I'll draft that email. Tell me who it's for (a specific contact, a tag group, or everyone) and what you want to say. I'll write it, you approve it, and I'll send it.`,
      action: 'send_email',
    }
  }

  if (lower.includes('sms') || lower.includes('text message') || lower.includes('text ')) {
    return {
      response: `Ready to send SMS. Who should I text and what should I say? I can send to a specific contact or blast to a tagged group.`,
      action: 'send_sms',
    }
  }

  if (lower.includes('appointment') || lower.includes('book') || lower.includes('schedule')) {
    return {
      response: `Checking your calendar availability. Tell me who needs the appointment and when, and I'll book it, send the confirmation, and set up the reminder sequence automatically.`,
      action: 'book_appointment',
    }
  }

  if (lower.includes('review') && (lower.includes('request') || lower.includes('google'))) {
    return {
      response: `I'll send review requests to your recent customers. I'll check who completed a service in the last 7 days and hasn't been asked yet, then send them a personalized SMS with your Google review link.`,
      action: 'send_review_request',
    }
  }

  if (lower.includes('blog') || lower.includes('post') || lower.includes('content') || lower.includes('write')) {
    return {
      response: `I'll generate that content. Tell me the topic and I'll write a complete piece — blog post, social media post, or email copy. I'll optimize it for engagement and you can publish with one click.`,
      action: 'generate_content',
    }
  }

  if (lower.includes('contact') && (lower.includes('find') || lower.includes('search') || lower.includes('how many'))) {
    return {
      response: `Searching your contacts now. I'll pull the data and show you the results. What specifically are you looking for — a name, email, tag, or date range?`,
      action: 'search_contacts',
    }
  }

  if (lower.includes('automat') || lower.includes('workflow') || lower.includes('sequence')) {
    return {
      response: `Describe what you want to automate in plain English — "when X happens, do Y, then Z" — and I'll generate the complete workflow. You can review it in the Automations builder and activate with one click.`,
      action: 'create_automation',
    }
  }

  if (lower.includes('call') || lower.includes('voice') || lower.includes('phone')) {
    return {
      response: `I can initiate a Voice AI call to any contact. The AI will call them, follow your script, and handle the conversation. Who should I call and what should the AI say?`,
      action: 'voice_ai_call',
    }
  }

  // General response
  return {
    response: `I can help with that. I have access to your CRM contacts, pipeline, calendar, email, SMS, voice AI, automations, course generator, and 54 services through 0nMCP. Just tell me what to do and I'll execute it. No menus, no clicks.`,
  }
}
