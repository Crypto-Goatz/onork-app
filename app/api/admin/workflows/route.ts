import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function verifyAdmin(): Promise<{ ok: boolean; error?: string }> {
  const serverClient = await createClient()
  const { data: { session } } = await serverClient.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = getAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { ok: false, error: 'Not admin' }
  return { ok: true }
}

async function crmFetch(path: string, method = 'GET', body?: unknown) {
  const pit = process.env.CRM_PIT
  if (!pit) throw new Error('CRM_PIT not configured')

  const res = await fetch(`${CRM_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${pit}`,
      'Content-Type': 'application/json',
      Version: CRM_VERSION,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

// LinkedIn Comment Bot — generates AI comments for LinkedIn posts
async function linkedinCommentBot(input: { topics?: string[]; postContent?: string }) {
  const topics = input.topics || ['AI orchestration', 'MCP tools', 'workflow automation', 'API integration']
  const postContent = input.postContent || ''

  const commentStyles = ['insightful', 'supportive', 'curious']
  const comments: { style: string; comment: string; topic: string }[] = []

  for (const style of commentStyles) {
    const topic = topics[Math.floor(Math.random() * topics.length)]
    let comment = ''

    if (style === 'insightful') {
      const insights = [
        `This resonates deeply. At 0nMCP, we've seen ${topic} transform how teams operate — what used to take hours now happens in seconds with the right orchestration layer.`,
        `Great perspective on ${topic}. The real unlock is when you combine this with universal API orchestration — connecting 54+ services through a single interface changes the game entirely.`,
        `Spot on. We built 0nMCP specifically because ${topic} was too fragmented. One config file, 1,171 tools, zero context-switching. That's the future.`,
        `${postContent ? 'Building on this — ' : ''}The ${topic} space is moving fast. What I find most exciting is how AI-native tools are making complex integrations accessible to non-technical teams.`,
      ]
      comment = insights[Math.floor(Math.random() * insights.length)]
    } else if (style === 'supportive') {
      const supportive = [
        `Love this take on ${topic}. More founders need to hear this. Sharing with my network.`,
        `This is exactly what the ${topic} community needs right now. Well said.`,
        `Couldn't agree more. ${topic} is underrated and this post nails why. Following for more.`,
        `Yes! ${topic} is having its moment. Excited to see more thought leaders talking about this.`,
      ]
      comment = supportive[Math.floor(Math.random() * supportive.length)]
    } else {
      const curious = [
        `Interesting angle on ${topic}. How do you see this evolving over the next 12 months? I'm particularly curious about the intersection with AI agents.`,
        `Great point. Have you explored how ${topic} plays with MCP (Model Context Protocol)? We've found some fascinating patterns there.`,
        `This raises a good question — what's the biggest bottleneck you're seeing in ${topic} right now? Would love to compare notes.`,
        `Thought-provoking. Do you think ${topic} will eventually be fully automated, or will there always be a human-in-the-loop component?`,
      ]
      comment = curious[Math.floor(Math.random() * curious.length)]
    }

    comments.push({ style, comment, topic })
  }

  return {
    action: 'linkedin_comment_bot',
    status: 'completed',
    generated_at: new Date().toISOString(),
    post_context: postContent || 'General engagement',
    comments,
    instructions: 'Copy preferred comment and post via LinkedIn or social0n extension',
  }
}

// Lead Nurture Sequence — fetches contacts and generates follow-ups
async function leadNurtureSequence() {
  const locationId = process.env.CRM_LOCATION_ID
  if (!locationId) throw new Error('CRM_LOCATION_ID not configured')

  // Fetch contacts with specific tags
  let contacts: { id: string; firstName?: string; lastName?: string; email?: string; tags?: string[]; dateAdded?: string; lastActivity?: string }[] = []

  try {
    const res = await crmFetch(`/contacts/?locationId=${locationId}&limit=100`)
    if (res.ok) {
      const data = await res.json()
      contacts = (data.contacts || []).filter((c: { tags?: string[] }) => {
        const tags = c.tags || []
        return tags.some((t: string) =>
          t.toLowerCase().includes('needs-onboarding') ||
          t.toLowerCase().includes('free-tier') ||
          t.toLowerCase().includes('trial') ||
          t.toLowerCase().includes('new')
        )
      })
    }
  } catch {
    // If CRM fails, return empty with error context
  }

  // If no tagged contacts, get most recent contacts as candidates
  if (contacts.length === 0) {
    try {
      const res = await crmFetch(`/contacts/?locationId=${locationId}&limit=20&sortBy=date_added&order=desc`)
      if (res.ok) {
        const data = await res.json()
        contacts = (data.contacts || []).slice(0, 10)
      }
    } catch {
      // Continue with empty
    }
  }

  const messages = contacts.map(contact => {
    const name = contact.firstName || 'there'
    const templates = [
      {
        subject: `Quick question, ${name}`,
        body: `Hi ${name},\n\nI noticed you signed up recently and wanted to check in. Have you had a chance to explore the 0nMCP tools yet?\n\nIf you need help getting started, I'd love to jump on a quick 15-minute call. We can get you from zero to automated in one session.\n\nBest,\nMike @ RocketOpp`,
        type: 'check-in',
      },
      {
        subject: `${name}, your automation setup is waiting`,
        body: `Hey ${name},\n\nJust a friendly nudge — you have access to 1,171+ automation tools through 0nMCP, but it looks like you haven't set up your first workflow yet.\n\nHere's the fastest way to get started:\n1. Connect your first service (takes 30 seconds)\n2. Describe what you want to automate\n3. Let AI build the workflow for you\n\nReply to this email and I'll personally help you set it up.\n\nMike`,
        type: 'activation',
      },
      {
        subject: `Unlock the full power of 0nMCP, ${name}`,
        body: `Hi ${name},\n\nWanted to share something exciting — we just shipped v2.5.0 with CRM MCP Server, AI Employee capabilities, and auto-provisioning.\n\nThat means your CRM can now:\n- Answer customer questions automatically\n- Route leads to the right pipeline\n- Trigger follow-ups based on behavior\n\nAll without writing a single line of code.\n\nWant me to set this up for your account? Just reply "yes" and I'll handle everything.\n\nMike @ RocketOpp`,
        type: 'feature-highlight',
      },
    ]

    const template = templates[Math.floor(Math.random() * templates.length)]

    return {
      contact_id: contact.id,
      contact_name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
      contact_email: contact.email || 'No email',
      tags: contact.tags || [],
      message: template,
    }
  })

  return {
    action: 'lead_nurture_sequence',
    status: 'completed',
    generated_at: new Date().toISOString(),
    total_contacts_found: contacts.length,
    messages,
    instructions: 'Review messages, then send via CRM email (not external services)',
  }
}

// Content Pipeline — generates content ideas and drafts
async function contentPipeline(input: { topic?: string }) {
  const baseTopic = input.topic || '0nMCP ecosystem'

  const blogIdeas = [
    {
      title: `How ${baseTopic} Is Replacing Traditional Integration Platforms`,
      angle: 'comparison',
      outline: ['The old way: Zapier/Make/n8n limitations', 'The 0nMCP approach: describe outcomes, not workflows', 'Real examples with 54 services', 'Cost comparison at scale'],
      estimated_words: 1800,
    },
    {
      title: `From Zero to 1,171 Tools: The Architecture Behind ${baseTopic}`,
      angle: 'technical deep-dive',
      outline: ['Service catalog design', 'Data-driven tool factory pattern', 'Three-level execution model', 'Rate limiting and webhook verification'],
      estimated_words: 2200,
    },
    {
      title: `Why MCP (Model Context Protocol) Changes Everything for ${baseTopic}`,
      angle: 'thought-leadership',
      outline: ['What MCP is and why it matters', 'How 0nMCP implements MCP natively', 'Real-world use cases', 'The future of AI orchestration'],
      estimated_words: 1500,
    },
  ]

  const linkedinPosts = [
    {
      hook: `I replaced 6 SaaS tools with a single config file.`,
      body: `Here's what happened:\n\nWe were paying $847/month across Zapier, Make, and various API middleware.\n\nThen we switched to 0nMCP — one npm package, 1,171 tools, 54 services.\n\nThe result?\n- 90% cost reduction\n- 10x faster execution\n- Zero vendor lock-in\n\nThe secret? Stop building workflows. Start describing outcomes.\n\nThe AI figures out the rest.`,
      cta: 'Comment "0n" and I\'ll show you how to set it up.',
      hashtags: ['#AIAutomation', '#MCP', '#DevTools', '#SaaS', '#0nMCP'],
    },
    {
      hook: `Most "AI automation" tools are just glorified if/then statements.`,
      body: `Hot take incoming.\n\nZapier = drag and drop if/then\nMake = visual if/then\nn8n = self-hosted if/then\n\n0nMCP = "Connect my Stripe to my CRM and send a Slack message when a payment fails, with the customer's last 3 orders attached."\n\nThat's it. One sentence. Done.\n\nThe difference between automation and orchestration is intelligence.\n\nAI orchestration understands context, handles edge cases, and adapts in real-time.`,
      cta: 'Agree or disagree? Let me know below.',
      hashtags: ['#AIOrchestration', '#Automation', '#MCP', '#0nMCP', '#TechLeadership'],
    },
    {
      hook: `We open-sourced 1,171 tools. Here's why.`,
      body: `Last month we published 0nMCP on npm.\n\n1,171 tools across 54 services. MIT licensed. Free forever.\n\nWhy give it away?\n\nBecause the value isn't in the tools — it's in the orchestration.\n\nAnyone can build an API wrapper.\n\nThe magic is connecting them intelligently.\n\nPipeline > Assembly Line > Radial Burst.\n\nThree execution levels. Patent pending.\n\nThe open core builds trust. The orchestration builds business.`,
      cta: 'npm install 0nmcp — try it in 30 seconds.',
      hashtags: ['#OpenSource', '#npm', '#DevTools', '#0nMCP', '#AITools'],
    },
  ]

  return {
    action: 'content_pipeline',
    status: 'completed',
    generated_at: new Date().toISOString(),
    topic: baseTopic,
    blog_ideas: blogIdeas,
    linkedin_posts: linkedinPosts,
    instructions: 'Review, edit for voice/tone, then publish',
  }
}

// CRM Health Check — audits CRM data quality
async function crmHealthCheck() {
  const locationId = process.env.CRM_LOCATION_ID
  if (!locationId) throw new Error('CRM_LOCATION_ID not configured')

  const report: {
    contact_count: number
    pipeline_count: number
    pipeline_value: number
    opportunity_count: number
    conversation_count: number
    stale_contacts: number
    contacts_without_email: number
    health_score: number
    issues: string[]
    recommendations: string[]
  } = {
    contact_count: 0,
    pipeline_count: 0,
    pipeline_value: 0,
    opportunity_count: 0,
    conversation_count: 0,
    stale_contacts: 0,
    contacts_without_email: 0,
    health_score: 100,
    issues: [],
    recommendations: [],
  }

  // Fetch contacts
  try {
    const res = await crmFetch(`/contacts/?locationId=${locationId}&limit=100`)
    if (res.ok) {
      const data = await res.json()
      const contacts = data.contacts || []
      report.contact_count = contacts.length

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      for (const c of contacts) {
        if (!c.email) report.contacts_without_email++
        const lastActivity = c.lastActivity || c.dateUpdated || c.dateAdded
        if (lastActivity && new Date(lastActivity) < thirtyDaysAgo) {
          report.stale_contacts++
        }
      }

      if (report.contacts_without_email > contacts.length * 0.2) {
        report.issues.push(`${report.contacts_without_email} contacts missing email addresses (${Math.round(report.contacts_without_email / contacts.length * 100)}%)`)
        report.health_score -= 15
      }

      if (report.stale_contacts > contacts.length * 0.3) {
        report.issues.push(`${report.stale_contacts} stale contacts (no activity in 30+ days)`)
        report.health_score -= 10
        report.recommendations.push('Run a re-engagement campaign for stale contacts')
      }
    }
  } catch {
    report.issues.push('Failed to fetch contacts from CRM')
    report.health_score -= 20
  }

  // Fetch pipelines
  try {
    const res = await crmFetch(`/opportunities/pipelines?locationId=${locationId}`)
    if (res.ok) {
      const data = await res.json()
      const pipelines = data.pipelines || []
      report.pipeline_count = pipelines.length

      for (const pipeline of pipelines) {
        try {
          const oppsRes = await crmFetch(
            `/opportunities/search?locationId=${locationId}&pipeline_id=${pipeline.id}`
          )
          if (oppsRes.ok) {
            const oppsData = await oppsRes.json()
            const opps = oppsData.opportunities || []
            report.opportunity_count += opps.length
            for (const opp of opps) {
              report.pipeline_value += Number(opp.monetaryValue || 0)
            }
          }
        } catch {
          // Skip pipeline fetch errors
        }
      }

      if (report.pipeline_count === 0) {
        report.issues.push('No pipelines configured')
        report.health_score -= 15
        report.recommendations.push('Create at least one sales pipeline')
      }

      if (report.opportunity_count === 0 && report.pipeline_count > 0) {
        report.issues.push('Pipelines exist but no opportunities')
        report.health_score -= 10
        report.recommendations.push('Start adding leads to your pipeline')
      }
    }
  } catch {
    report.issues.push('Failed to fetch pipelines from CRM')
    report.health_score -= 15
  }

  // Fetch conversations
  try {
    const res = await crmFetch(`/conversations/search?locationId=${locationId}&limit=50`)
    if (res.ok) {
      const data = await res.json()
      report.conversation_count = (data.conversations || []).length
    }
  } catch {
    report.issues.push('Failed to fetch conversations from CRM')
    report.health_score -= 10
  }

  if (report.issues.length === 0) {
    report.recommendations.push('CRM is in great shape! Keep up the engagement.')
  }

  report.health_score = Math.max(0, Math.min(100, report.health_score))

  return {
    action: 'crm_health_check',
    status: 'completed',
    generated_at: new Date().toISOString(),
    report,
  }
}

// Training Batch — triggers AI training feed
async function trainingBatch(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin
    const res = await fetch(`${origin}/api/training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'feed' }),
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        action: 'training_batch',
        status: 'failed',
        error: `Training API returned ${res.status}: ${text}`,
      }
    }

    const data = await res.json()
    return {
      action: 'training_batch',
      status: 'completed',
      generated_at: new Date().toISOString(),
      result: data,
      sources_ingested: data.ingested || data.count || 0,
    }
  } catch (err) {
    return {
      action: 'training_batch',
      status: 'failed',
      error: (err as Error).message,
    }
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 })

  try {
    const body = await request.json()
    const { action, input = {} } = body

    let result: unknown

    switch (action) {
      case 'linkedin_comment_bot':
        result = await linkedinCommentBot(input)
        break
      case 'lead_nurture_sequence':
        result = await leadNurtureSequence()
        break
      case 'content_pipeline':
        result = await contentPipeline(input)
        break
      case 'crm_health_check':
        result = await crmHealthCheck()
        break
      case 'training_batch':
        result = await trainingBatch(request)
        break
      default:
        return NextResponse.json({ error: `Unknown workflow action: ${action}` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
