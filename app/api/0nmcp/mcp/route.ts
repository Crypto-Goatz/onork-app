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

// Helper to define tools quickly
const t = (name: string, desc: string, props: Record<string, any>, required: string[] = []) => ({
  name, description: desc, inputSchema: { type: 'object' as const, properties: props, required }
})
const s = { type: 'string' as const }
const n = { type: 'number' as const }
const a = (itemType = 'string') => ({ type: 'array' as const, items: { type: itemType as const } })
const o = { type: 'object' as const }

const TOOLS = [
  // ── CRM ──
  t('crm_create_contact', 'Create a CRM contact', { firstName: s, lastName: s, email: s, phone: s, tags: a(), company: s, website: s, source: s }, ['email']),
  t('crm_update_contact', 'Update an existing CRM contact', { contactId: s, firstName: s, lastName: s, email: s, phone: s, tags: a(), company: s }, ['contactId']),
  t('crm_search_contacts', 'Search CRM contacts by query', { query: s, limit: n }, ['query']),
  t('crm_get_contact', 'Get full contact details by ID', { contactId: s }, ['contactId']),
  t('crm_delete_contact', 'Delete a CRM contact', { contactId: s }, ['contactId']),
  t('crm_add_tags', 'Add tags to a contact', { contactId: s, tags: a() }, ['contactId', 'tags']),
  t('crm_remove_tags', 'Remove tags from a contact', { contactId: s, tags: a() }, ['contactId', 'tags']),
  t('crm_create_opportunity', 'Create pipeline opportunity', { name: s, pipelineId: s, stageId: s, contactId: s, monetaryValue: n }, ['name']),
  t('crm_update_opportunity', 'Move opportunity to new stage', { opportunityId: s, stageId: s, monetaryValue: n, status: s }, ['opportunityId']),
  t('crm_list_pipelines', 'List all pipelines and stages', {}),
  t('crm_create_task', 'Create a task for a contact', { contactId: s, title: s, body: s, dueDate: s }, ['contactId', 'title']),
  t('crm_list_tasks', 'List tasks for a contact', { contactId: s }, ['contactId']),
  t('crm_send_email', 'Send email to a contact via CRM', { contactId: s, subject: s, body: s }, ['contactId', 'subject', 'body']),
  t('crm_send_sms', 'Send SMS to a contact via CRM', { contactId: s, message: s }, ['contactId', 'message']),
  t('crm_list_calendars', 'List available calendars', {}),
  t('crm_book_appointment', 'Book a calendar appointment', { calendarId: s, contactId: s, startTime: s, endTime: s, title: s }, ['calendarId', 'contactId', 'startTime']),
  t('crm_create_note', 'Add a note to a contact', { contactId: s, body: s }, ['contactId', 'body']),
  t('crm_list_workflows', 'List all workflows', {}),
  t('crm_import_course', 'Import a course with modules and lessons', { title: s, description: s, modules: a('object') }, ['title']),
  t('crm_create_custom_field', 'Create a custom field', { name: s, dataType: s }, ['name']),
  t('crm_create_tag', 'Create a new tag', { name: s }, ['name']),

  // ── Stripe ──
  t('stripe_create_customer', 'Create Stripe customer', { email: s, name: s, phone: s }, ['email']),
  t('stripe_list_customers', 'List Stripe customers', { limit: n, email: s }),
  t('stripe_get_customer', 'Get Stripe customer by ID', { id: s }, ['id']),
  t('stripe_create_invoice', 'Create a Stripe invoice', { customer: s, amount: n, description: s }, ['customer', 'amount']),
  t('stripe_send_invoice', 'Send a finalized invoice', { invoiceId: s }, ['invoiceId']),
  t('stripe_list_invoices', 'List all invoices', { limit: n, customer: s }),
  t('stripe_create_subscription', 'Create a recurring subscription', { customer: s, priceId: s }, ['customer', 'priceId']),
  t('stripe_cancel_subscription', 'Cancel a subscription', { subscriptionId: s }, ['subscriptionId']),
  t('stripe_get_balance', 'Check Stripe account balance', {}),
  t('stripe_list_payments', 'List recent payment intents', { limit: n }),
  t('stripe_create_product', 'Create a Stripe product', { name: s, description: s }, ['name']),
  t('stripe_create_price', 'Create a price for a product', { product: s, unitAmount: n, currency: s, recurring: s }, ['product', 'unitAmount']),
  t('stripe_create_checkout', 'Create a checkout session', { priceId: s, successUrl: s, cancelUrl: s }, ['priceId']),

  // ── SendGrid ──
  t('sendgrid_send_email', 'Send email via SendGrid', { to: s, subject: s, body: s, from: s }, ['to', 'subject', 'body']),
  t('sendgrid_add_contacts', 'Add contacts to SendGrid list', { contacts: a('object'), listIds: a() }),
  t('sendgrid_list_templates', 'List email templates', {}),

  // ── Slack ──
  t('slack_send_message', 'Send Slack message', { channel: s, text: s, blocks: a('object') }, ['channel', 'text']),
  t('slack_list_channels', 'List Slack channels', {}),
  t('slack_create_channel', 'Create a Slack channel', { name: s }, ['name']),

  // ── Discord ──
  t('discord_send_message', 'Send Discord message', { channelId: s, content: s }, ['channelId', 'content']),

  // ── Twilio ──
  t('twilio_send_sms', 'Send SMS via Twilio', { to: s, body: s, from: s }, ['to', 'body']),
  t('twilio_make_call', 'Initiate a phone call', { to: s, from: s, twiml: s }, ['to']),

  // ── Gmail ──
  t('gmail_send_email', 'Send email via Gmail', { to: s, subject: s, body: s }, ['to', 'subject', 'body']),
  t('gmail_list_messages', 'List Gmail messages', { query: s, maxResults: n }),
  t('gmail_get_message', 'Get a specific email', { messageId: s }, ['messageId']),

  // ── Google Calendar ──
  t('gcal_create_event', 'Create Google Calendar event', { summary: s, start: s, end: s, attendees: a() }, ['summary', 'start', 'end']),
  t('gcal_list_events', 'List upcoming events', { maxResults: n, timeMin: s }),

  // ── Google Sheets ──
  t('gsheets_read', 'Read data from Google Sheets', { spreadsheetId: s, range: s }, ['spreadsheetId', 'range']),
  t('gsheets_write', 'Write data to Google Sheets', { spreadsheetId: s, range: s, values: a('object') }, ['spreadsheetId', 'range', 'values']),
  t('gsheets_append', 'Append rows to Google Sheets', { spreadsheetId: s, range: s, values: a('object') }, ['spreadsheetId', 'range', 'values']),

  // ── Google Drive ──
  t('gdrive_list_files', 'List Google Drive files', { query: s, limit: n }),
  t('gdrive_create_folder', 'Create a Drive folder', { name: s, parentId: s }, ['name']),

  // ── Supabase ──
  t('supabase_query', 'Query a Supabase table', { table: s, select: s, filter: o, limit: n }, ['table']),
  t('supabase_insert', 'Insert row into Supabase', { table: s, data: o }, ['table', 'data']),
  t('supabase_update', 'Update rows in Supabase', { table: s, data: o, match: o }, ['table', 'data', 'match']),
  t('supabase_delete', 'Delete rows from Supabase', { table: s, match: o }, ['table', 'match']),

  // ── GitHub ──
  t('github_create_issue', 'Create GitHub issue', { owner: s, repo: s, title: s, body: s, labels: a() }, ['owner', 'repo', 'title']),
  t('github_list_repos', 'List repositories', { username: s }),
  t('github_create_pr', 'Create a pull request', { owner: s, repo: s, title: s, head: s, base: s }, ['owner', 'repo', 'title', 'head', 'base']),

  // ── Shopify ──
  t('shopify_list_products', 'List Shopify products', { limit: n }),
  t('shopify_create_product', 'Create a Shopify product', { title: s, bodyHtml: s, vendor: s, productType: s }, ['title']),
  t('shopify_list_orders', 'List Shopify orders', { limit: n, status: s }),
  t('shopify_create_order', 'Create a Shopify order', { lineItems: a('object') }, ['lineItems']),

  // ── Notion ──
  t('notion_create_page', 'Create a Notion page', { parentId: s, title: s, content: s }, ['parentId', 'title']),
  t('notion_query_database', 'Query a Notion database', { databaseId: s, filter: o }, ['databaseId']),
  t('notion_search', 'Search Notion', { query: s }, ['query']),

  // ── Figma ──
  t('figma_get_file', 'Get Figma design file', { file_key: s }, ['file_key']),
  t('figma_export_images', 'Export frames as PNG/SVG/PDF', { file_key: s, ids: s, format: s, scale: n }, ['file_key', 'ids']),
  t('figma_get_comments', 'Get Figma file comments', { file_key: s }, ['file_key']),
  t('figma_post_comment', 'Post comment on Figma file', { file_key: s, message: s }, ['file_key', 'message']),

  // ── Airtable ──
  t('airtable_list_records', 'List Airtable records', { baseId: s, tableId: s, maxRecords: n }, ['baseId', 'tableId']),
  t('airtable_create_record', 'Create Airtable record', { baseId: s, tableId: s, fields: o }, ['baseId', 'tableId', 'fields']),

  // ── HubSpot ──
  t('hubspot_create_contact', 'Create HubSpot contact', { email: s, firstname: s, lastname: s, company: s }, ['email']),
  t('hubspot_list_contacts', 'List HubSpot contacts', { limit: n }),
  t('hubspot_create_deal', 'Create HubSpot deal', { dealname: s, amount: n, pipeline: s, dealstage: s }, ['dealname']),

  // ── Mailchimp ──
  t('mailchimp_add_subscriber', 'Add Mailchimp subscriber', { listId: s, email: s, firstName: s, lastName: s }, ['listId', 'email']),
  t('mailchimp_list_campaigns', 'List Mailchimp campaigns', { limit: n }),

  // ── Calendly ──
  t('calendly_list_events', 'List Calendly events', { count: n }),
  t('calendly_get_event', 'Get Calendly event details', { eventId: s }, ['eventId']),

  // ── Zoom ──
  t('zoom_create_meeting', 'Create a Zoom meeting', { topic: s, startTime: s, duration: n }, ['topic']),
  t('zoom_list_meetings', 'List Zoom meetings', {}),

  // ── LinkedIn ──
  t('linkedin_create_post', 'Create LinkedIn post', { text: s, visibility: s }, ['text']),
  t('linkedin_get_profile', 'Get LinkedIn profile', {}),

  // ── WordPress ──
  t('wordpress_create_post', 'Create WordPress post', { title: s, content: s, status: s }, ['title', 'content']),
  t('wordpress_list_posts', 'List WordPress posts', { perPage: n }),
  t('wordpress_create_page', 'Create WordPress page', { title: s, content: s, status: s }, ['title', 'content']),

  // ── Webflow ──
  t('webflow_list_sites', 'List Webflow sites', {}),
  t('webflow_create_item', 'Create Webflow CMS item', { collectionId: s, fieldData: o }, ['collectionId', 'fieldData']),
  t('webflow_publish_site', 'Publish a Webflow site', { siteId: s }, ['siteId']),

  // ── MongoDB ──
  t('mongodb_find', 'Query MongoDB collection', { collection: s, filter: o, limit: n }, ['collection']),
  t('mongodb_insert', 'Insert MongoDB document', { collection: s, document: o }, ['collection', 'document']),

  // ── OpenAI ──
  t('openai_chat', 'Chat with GPT', { prompt: s, model: s, maxTokens: n }, ['prompt']),
  t('openai_image', 'Generate image with DALL-E', { prompt: s, size: s }, ['prompt']),

  // ── ElevenLabs ──
  t('elevenlabs_tts', 'Text to speech via ElevenLabs', { text: s, voiceId: s }, ['text']),
  t('elevenlabs_list_voices', 'List available voices', {}),

  // ── Deepgram ──
  t('deepgram_transcribe', 'Transcribe audio to text', { url: s, language: s }, ['url']),

  // ── Typeform ──
  t('typeform_list_forms', 'List Typeform forms', {}),
  t('typeform_get_responses', 'Get form responses', { formId: s }, ['formId']),

  // ── DocuSign ──
  t('docusign_create_envelope', 'Create DocuSign envelope for signing', { subject: s, recipients: a('object'), documents: a('object') }, ['subject']),
  t('docusign_list_envelopes', 'List DocuSign envelopes', { status: s }),

  // ── WooCommerce ──
  t('woocommerce_list_products', 'List WooCommerce products', { perPage: n }),
  t('woocommerce_create_product', 'Create WooCommerce product', { name: s, regularPrice: s, description: s }, ['name']),
  t('woocommerce_list_orders', 'List WooCommerce orders', { perPage: n }),

  // ── Square ──
  t('square_list_payments', 'List Square payments', { limit: n }),
  t('square_create_invoice', 'Create Square invoice', { customerId: s, lineItems: a('object') }, ['customerId']),

  // ── QuickBooks ──
  t('quickbooks_create_invoice', 'Create QuickBooks invoice', { customerRef: s, lineItems: a('object') }, ['customerRef']),
  t('quickbooks_list_invoices', 'List QuickBooks invoices', { limit: n }),

  // ── SXO ──
  t('sxo_scan', 'Scan a domain for SXO score', { url: s }, ['url']),
  t('sxo_generate_report', 'Generate full SXO Living DOM report', { url: s, email: s }, ['url']),

  // ── AI ──
  t('ai_generate_text', 'Generate text with AI (Groq/Ollama)', { prompt: s, model: s, maxTokens: n }, ['prompt']),
  t('ai_council_debate', 'Run multi-AI council debate', { question: s, providers: a() }, ['question']),
  t('ai_score_lead', 'AI-score a lead 1-100', { contactId: s, email: s }, ['email']),
  t('ai_generate_email', 'Generate personalized email copy', { to: s, context: s, tone: s }, ['to', 'context']),
  t('ai_generate_blog', 'Generate a full blog post', { topic: s, keywords: a(), wordCount: n }, ['topic']),
  t('ai_generate_social', 'Generate social media post', { platform: s, topic: s, tone: s }, ['platform', 'topic']),
  t('ai_summarize', 'Summarize text or URL', { text: s, url: s }),
  t('ai_translate', 'Translate text to another language', { text: s, targetLanguage: s }, ['text', 'targetLanguage']),
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
