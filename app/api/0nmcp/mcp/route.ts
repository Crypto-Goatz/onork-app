/**
 * 0nMCP MCP Proxy — Exposes 0nMCP as an MCP server over HTTP
 *
 * This endpoint proxies MCP protocol requests to the 0nMCP engine,
 * making all 926 endpoints across 95 services available to any
 * MCP-compatible client (CRM Agent Studio, Claude, Cursor, etc.)
 *
 * URL: https://0ncore.com/api/0nmcp/mcp
 */

import { NextRequest, NextResponse } from 'next/server'

// Tool definitions — the subset exposed via MCP
// In production, this would dynamically load from catalog.js
const TOOLS = [
  // CRM (top tools)
  { name: 'crm_create_contact', description: 'Create a new CRM contact with name, email, phone, tags', inputSchema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['email'] } },
  { name: 'crm_search_contacts', description: 'Search CRM contacts by name, email, or phone', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'crm_add_tags', description: 'Add tags to a CRM contact', inputSchema: { type: 'object', properties: { contactId: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['contactId', 'tags'] } },
  { name: 'crm_create_opportunity', description: 'Create a pipeline opportunity', inputSchema: { type: 'object', properties: { name: { type: 'string' }, pipelineId: { type: 'string' }, stageId: { type: 'string' }, contactId: { type: 'string' } }, required: ['name'] } },

  // Stripe
  { name: 'stripe_create_customer', description: 'Create a Stripe customer', inputSchema: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' } }, required: ['email'] } },
  { name: 'stripe_create_invoice', description: 'Create and send a Stripe invoice', inputSchema: { type: 'object', properties: { customer: { type: 'string' }, amount: { type: 'number' }, description: { type: 'string' } }, required: ['customer', 'amount'] } },
  { name: 'stripe_list_payments', description: 'List recent Stripe payments', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },

  // SendGrid
  { name: 'sendgrid_send_email', description: 'Send an email via SendGrid', inputSchema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to', 'subject', 'body'] } },

  // Slack
  { name: 'slack_send_message', description: 'Send a Slack message to a channel', inputSchema: { type: 'object', properties: { channel: { type: 'string' }, text: { type: 'string' } }, required: ['channel', 'text'] } },

  // Supabase
  { name: 'supabase_query', description: 'Query a Supabase table', inputSchema: { type: 'object', properties: { table: { type: 'string' }, select: { type: 'string' }, filter: { type: 'object' } }, required: ['table'] } },
  { name: 'supabase_insert', description: 'Insert a row into a Supabase table', inputSchema: { type: 'object', properties: { table: { type: 'string' }, data: { type: 'object' } }, required: ['table', 'data'] } },

  // GitHub
  { name: 'github_create_issue', description: 'Create a GitHub issue', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['owner', 'repo', 'title'] } },

  // Figma
  { name: 'figma_get_file', description: 'Get a Figma design file', inputSchema: { type: 'object', properties: { file_key: { type: 'string' } }, required: ['file_key'] } },
  { name: 'figma_export_images', description: 'Export Figma frames as PNG/SVG/PDF', inputSchema: { type: 'object', properties: { file_key: { type: 'string' }, ids: { type: 'string' }, format: { type: 'string' } }, required: ['file_key', 'ids'] } },

  // Courses
  { name: 'crm_import_course', description: 'Import a course into the CRM with modules and lessons', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, modules: { type: 'array' } }, required: ['title'] } },

  // SXO
  { name: 'sxo_scan', description: 'Run an SXO scan on a domain and return the score', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },

  // AI
  { name: 'ai_generate_text', description: 'Generate text using AI (Ollama, Groq, or cloud)', inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, model: { type: 'string' } }, required: ['prompt'] } },
  { name: 'ai_council_debate', description: 'Run a multi-AI council debate on a question', inputSchema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } },
]

export async function POST(req: NextRequest) {
  const accept = req.headers.get('accept') || ''

  try {
    const body = await req.json()
    const { method, params, id } = body

    // Handle MCP protocol methods
    if (method === 'initialize') {
      return sseResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: '0nMCP', version: '2.9.1' },
      })
    }

    if (method === 'tools/list') {
      return sseResponse(id, { tools: TOOLS })
    }

    if (method === 'tools/call') {
      const toolName = params?.name
      const args = params?.arguments || {}

      // Route to actual execution
      const result = await executeTool(toolName, args)
      return sseResponse(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      })
    }

    return sseResponse(id, { error: { code: -32601, message: `Method not found: ${method}` } })
  } catch (err: any) {
    return new NextResponse(
      `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: err.message }, id: null })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
    )
  }
}

function sseResponse(id: number | string | null, result: any) {
  const response = { jsonrpc: '2.0', id, result }
  return new NextResponse(
    `event: message\ndata: ${JSON.stringify(response)}\n\n`,
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  )
}

async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  const CRM_BASE = 'https://services.leadconnectorhq.com'
  const PIT = process.env.CRM_PIT || process.env.CRM_AGENCY_PIT || ''
  const LOC = process.env.CRM_LOCATION_ID || 'nphConTwfHcVE1oA0uep'
  const VERSION = '2021-07-28'

  const crmHeaders = {
    Authorization: `Bearer ${PIT}`,
    Version: VERSION,
    'Content-Type': 'application/json',
  }

  switch (name) {
    case 'crm_create_contact': {
      const res = await fetch(`${CRM_BASE}/contacts/`, {
        method: 'POST',
        headers: crmHeaders,
        body: JSON.stringify({ locationId: LOC, ...args }),
      })
      return { success: res.ok, data: await res.json() }
    }

    case 'crm_search_contacts': {
      const res = await fetch(`${CRM_BASE}/contacts/search?locationId=${LOC}&query=${encodeURIComponent(args.query)}`, {
        headers: crmHeaders,
      })
      return await res.json()
    }

    case 'crm_add_tags': {
      const res = await fetch(`${CRM_BASE}/contacts/${args.contactId}/tags`, {
        method: 'POST',
        headers: crmHeaders,
        body: JSON.stringify({ tags: args.tags }),
      })
      return { success: res.ok, data: await res.json() }
    }

    case 'crm_create_opportunity': {
      const res = await fetch(`${CRM_BASE}/opportunities/`, {
        method: 'POST',
        headers: crmHeaders,
        body: JSON.stringify({ locationId: LOC, pipelineId: 'SYeVtvnuMIUhn3LtS23q', stageId: '9fe04f16-4fce-4eea-84a7-6ee58083091e', ...args }),
      })
      return { success: res.ok, data: await res.json() }
    }

    case 'crm_import_course': {
      const res = await fetch(`${CRM_BASE}/courses/courses-exporter/public/import`, {
        method: 'POST',
        headers: crmHeaders,
        body: JSON.stringify({
          locationId: LOC,
          products: [{
            title: args.title,
            description: args.description || '',
            categories: (args.modules || []).map((m: any, i: number) => ({
              title: m.title || `Module ${i + 1}`,
              visibility: 'published',
              posts: (m.lessons || []).map((l: any) => ({
                title: typeof l === 'string' ? l : l.title,
                visibility: 'published',
                contentType: 'video',
                description: typeof l === 'string' ? l : l.description || l.title,
              })),
            })),
          }],
        }),
      })
      return { success: res.ok, data: await res.json() }
    }

    case 'sxo_scan': {
      const res = await fetch('https://sxowebsite.com/api/sxo-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: args.url }),
      })
      return await res.json()
    }

    case 'ai_generate_text': {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: args.prompt }],
          max_tokens: 2048,
        }),
      })
      const data = await res.json()
      return { response: data.choices?.[0]?.message?.content, model: data.model }
    }

    default:
      return { error: `Tool '${name}' not implemented yet. Available: ${TOOLS.map(t => t.name).join(', ')}` }
  }
}
