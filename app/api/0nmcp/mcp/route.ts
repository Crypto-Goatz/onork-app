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
const a = (itemType: string = 'string') => ({ type: 'array' as const, items: { type: itemType } })
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
  const LOC = process.env.CRM_LOCATION_ID || ''
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

    // ── CRM Extended ──
    case 'crm_update_contact': {
      const { contactId, ...updateData } = args
      const res = await fetch(`${CRM_BASE}/contacts/${contactId}`, { method: 'PUT', headers: crmHeaders, body: JSON.stringify(updateData) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_get_contact': {
      const res = await fetch(`${CRM_BASE}/contacts/${args.contactId}`, { headers: crmHeaders })
      return await res.json()
    }
    case 'crm_delete_contact': {
      const res = await fetch(`${CRM_BASE}/contacts/${args.contactId}`, { method: 'DELETE', headers: crmHeaders })
      return { success: res.ok }
    }
    case 'crm_remove_tags': {
      const res = await fetch(`${CRM_BASE}/contacts/${args.contactId}/tags`, { method: 'DELETE', headers: crmHeaders, body: JSON.stringify({ tags: args.tags }) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_update_opportunity': {
      const { opportunityId, ...oppData } = args
      const res = await fetch(`${CRM_BASE}/opportunities/${opportunityId}`, { method: 'PUT', headers: crmHeaders, body: JSON.stringify(oppData) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_list_pipelines': {
      const res = await fetch(`${CRM_BASE}/opportunities/pipelines?locationId=${LOC}`, { headers: crmHeaders })
      return await res.json()
    }
    case 'crm_create_task': {
      const res = await fetch(`${CRM_BASE}/contacts/${args.contactId}/tasks`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ title: args.title, body: args.body, dueDate: args.dueDate }) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_list_tasks': {
      const res = await fetch(`${CRM_BASE}/contacts/${args.contactId}/tasks`, { headers: crmHeaders })
      return await res.json()
    }
    case 'crm_send_email': {
      const res = await fetch(`${CRM_BASE}/conversations/messages`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ type: 'Email', contactId: args.contactId, subject: args.subject, body: args.body }) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_send_sms': {
      const res = await fetch(`${CRM_BASE}/conversations/messages`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ type: 'SMS', contactId: args.contactId, body: args.message }) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_list_calendars': {
      const res = await fetch(`${CRM_BASE}/calendars/?locationId=${LOC}`, { headers: crmHeaders })
      return await res.json()
    }
    case 'crm_book_appointment': {
      const res = await fetch(`${CRM_BASE}/calendars/events/appointments`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ calendarId: args.calendarId, locationId: LOC, contactId: args.contactId, startTime: args.startTime, endTime: args.endTime || args.startTime, title: args.title || 'Appointment' }) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_create_note': {
      const res = await fetch(`${CRM_BASE}/contacts/${args.contactId}/notes`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ body: args.body }) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_list_workflows': {
      const res = await fetch(`${CRM_BASE}/workflows/?locationId=${LOC}`, { headers: crmHeaders })
      return await res.json()
    }
    case 'crm_create_custom_field': {
      const res = await fetch(`${CRM_BASE}/locations/${LOC}/customFields`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ name: args.name, dataType: args.dataType || 'TEXT' }) })
      return { success: res.ok, data: await res.json() }
    }
    case 'crm_create_tag': {
      const res = await fetch(`${CRM_BASE}/locations/${LOC}/tags`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ name: args.name }) })
      return { success: res.ok, data: await res.json() }
    }

    // ── Stripe Extended ──
    case 'stripe_create_customer': {
      const res = await fetch('https://api.stripe.com/v1/customers', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: args.email, name: args.name || '' }).toString() })
      return await res.json()
    }
    case 'stripe_list_customers': {
      const res = await fetch(`https://api.stripe.com/v1/customers?limit=${args.limit || 10}${args.email ? '&email=' + args.email : ''}`, { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } })
      return await res.json()
    }
    case 'stripe_get_customer': {
      const res = await fetch(`https://api.stripe.com/v1/customers/${args.id}`, { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } })
      return await res.json()
    }
    case 'stripe_create_invoice': {
      const res = await fetch('https://api.stripe.com/v1/invoices', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ customer: args.customer, 'auto_advance': 'true' }).toString() })
      return await res.json()
    }
    case 'stripe_send_invoice': {
      const res = await fetch(`https://api.stripe.com/v1/invoices/${args.invoiceId}/send`, { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' } })
      return await res.json()
    }
    case 'stripe_list_invoices': {
      const res = await fetch(`https://api.stripe.com/v1/invoices?limit=${args.limit || 10}`, { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } })
      return await res.json()
    }
    case 'stripe_create_subscription': {
      const res = await fetch('https://api.stripe.com/v1/subscriptions', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ customer: args.customer, 'items[0][price]': args.priceId }).toString() })
      return await res.json()
    }
    case 'stripe_cancel_subscription': {
      const res = await fetch(`https://api.stripe.com/v1/subscriptions/${args.subscriptionId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } })
      return await res.json()
    }
    case 'stripe_get_balance': {
      const res = await fetch('https://api.stripe.com/v1/balance', { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } })
      return await res.json()
    }
    case 'stripe_list_payments': {
      const res = await fetch(`https://api.stripe.com/v1/payment_intents?limit=${args.limit || 10}`, { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } })
      return await res.json()
    }
    case 'stripe_create_product': {
      const res = await fetch('https://api.stripe.com/v1/products', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ name: args.name, description: args.description || '' }).toString() })
      return await res.json()
    }
    case 'stripe_create_price': {
      const res = await fetch('https://api.stripe.com/v1/prices', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ product: args.product, unit_amount: String(args.unitAmount), currency: args.currency || 'usd' }).toString() })
      return await res.json()
    }
    case 'stripe_create_checkout': {
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ 'line_items[0][price]': args.priceId, 'line_items[0][quantity]': '1', mode: 'payment', success_url: args.successUrl || 'https://0ncore.com/thank-you', cancel_url: args.cancelUrl || 'https://0ncore.com' }).toString() })
      return await res.json()
    }

    // ── Slack ──
    case 'slack_send_message': {
      const res = await fetch('https://slack.com/api/chat.postMessage', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: args.channel, text: args.text }) })
      return await res.json()
    }
    case 'slack_list_channels': {
      const res = await fetch('https://slack.com/api/conversations.list', { headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` } })
      return await res.json()
    }

    // ── AI Extended ──
    case 'ai_council_debate': {
      return { message: 'Council debate requires the 0nAI server. Use command.0nmcp.com/api/ai/council', tool: name }
    }
    case 'ai_score_lead': {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: 'You are a lead scoring AI. Score this lead 1-100 based on the data provided. Return ONLY a JSON object: {"score": N, "label": "Hot/Warm/Cold", "reasoning": "brief reason", "nextAction": "recommended action"}' }, { role: 'user', content: `Score this lead: ${JSON.stringify(args)}` }], max_tokens: 200 }) })
      const data = await groqRes.json()
      try { return JSON.parse(data.choices?.[0]?.message?.content || '{}') } catch { return { response: data.choices?.[0]?.message?.content } }
    }
    case 'ai_generate_email': {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: `Write a ${args.tone || 'professional'} email. Return ONLY the email text, no meta-commentary.` }, { role: 'user', content: `To: ${args.to}. Context: ${args.context}` }], max_tokens: 500 }) })
      const data = await groqRes.json()
      return { email: data.choices?.[0]?.message?.content }
    }
    case 'ai_generate_blog': {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: 'Write a complete blog post in markdown format. Include H2 headings, bullet points, and a conclusion.' }, { role: 'user', content: `Topic: ${args.topic}. Keywords: ${(args.keywords || []).join(', ')}. Target length: ${args.wordCount || 1000} words.` }], max_tokens: 2048 }) })
      const data = await groqRes.json()
      return { blog: data.choices?.[0]?.message?.content }
    }
    case 'ai_generate_social': {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: `Write a ${args.platform} post. Match the platform style and character limits. Include relevant hashtags.` }, { role: 'user', content: `Topic: ${args.topic}. Tone: ${args.tone || 'engaging'}.` }], max_tokens: 300 }) })
      const data = await groqRes.json()
      return { post: data.choices?.[0]?.message?.content }
    }
    case 'ai_summarize': {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: 'Summarize the following concisely in 3-5 sentences.' }, { role: 'user', content: args.text || args.url || '' }], max_tokens: 300 }) })
      const data = await groqRes.json()
      return { summary: data.choices?.[0]?.message?.content }
    }
    case 'ai_translate': {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: `Translate the following to ${args.targetLanguage}. Return ONLY the translation.` }, { role: 'user', content: args.text }], max_tokens: 1000 }) })
      const data = await groqRes.json()
      return { translation: data.choices?.[0]?.message?.content }
    }

    // ── SXO Extended ──
    case 'sxo_generate_report': {
      // Trigger the SXO scan and create CRM contact
      const scanRes = await fetch('https://sxowebsite.com/api/sxo-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: args.url }) })
      const scanData = await scanRes.json()
      if (args.email) {
        await fetch(`${CRM_BASE}/contacts/`, { method: 'POST', headers: crmHeaders, body: JSON.stringify({ locationId: LOC, email: args.email, tags: ['sxo-scan'], customFields: [{ key: 'sxo_score', value: String(scanData.overallScore || 0) }, { key: 'sxo_domain', value: args.url }] }) })
      }
      return { score: scanData.overallScore, grade: scanData.grade, report: scanData, contactCreated: !!args.email }
    }

    // ── Supabase ──
    case 'supabase_query': {
      const sb = await import('@supabase/supabase-js')
      const client = sb.createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
      let q = client.from(args.table).select(args.select || '*')
      if (args.limit) q = q.limit(args.limit)
      const { data, error } = await q
      return error ? { error: error.message } : { data }
    }
    case 'supabase_insert': {
      const sb = await import('@supabase/supabase-js')
      const client = sb.createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
      const { data, error } = await client.from(args.table).insert(args.data).select()
      return error ? { error: error.message } : { data }
    }
    case 'supabase_update': {
      const sb = await import('@supabase/supabase-js')
      const client = sb.createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
      let q = client.from(args.table).update(args.data)
      if (args.match) for (const [k, v] of Object.entries(args.match)) q = q.eq(k, v as string)
      const { data, error } = await q.select()
      return error ? { error: error.message } : { data }
    }
    case 'supabase_delete': {
      const sb = await import('@supabase/supabase-js')
      const client = sb.createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
      let q = client.from(args.table).delete()
      if (args.match) for (const [k, v] of Object.entries(args.match)) q = q.eq(k, v as string)
      const { data, error } = await q
      return error ? { error: error.message } : { success: true }
    }

    // ── GitHub ──
    case 'github_create_issue': {
      const res = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/issues`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': '0nMCP' }, body: JSON.stringify({ title: args.title, body: args.body, labels: args.labels }) })
      return await res.json()
    }
    case 'github_list_repos': {
      const res = await fetch(`https://api.github.com/users/${args.username || 'rocketopp'}/repos?per_page=30`, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'User-Agent': '0nMCP' } })
      return await res.json()
    }

    // ── OpenAI ──
    case 'openai_chat': {
      const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: args.model || 'gpt-4o-mini', messages: [{ role: 'user', content: args.prompt }], max_tokens: args.maxTokens || 1000 }) })
      const d = await res.json(); return { response: d.choices?.[0]?.message?.content, model: d.model }
    }
    case 'openai_image': {
      const res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: args.prompt, n: 1, size: args.size || '1024x1024' }) })
      return await res.json()
    }

    // ── ElevenLabs ──
    case 'elevenlabs_tts': {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${args.voiceId || '21m00Tcm4TlvDq8ikWAM'}`, { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: args.text, model_id: 'eleven_monolingual_v1' }) })
      return { success: res.ok, contentType: res.headers.get('content-type'), status: res.status }
    }
    case 'elevenlabs_list_voices': {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '' } })
      return await res.json()
    }

    // ── Deepgram ──
    case 'deepgram_transcribe': {
      const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', { method: 'POST', headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: args.url }) })
      return await res.json()
    }

    // ── Notion ──
    case 'notion_search': {
      const res = await fetch('https://api.notion.com/v1/search', { method: 'POST', headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }, body: JSON.stringify({ query: args.query }) })
      return await res.json()
    }
    case 'notion_create_page': {
      const res = await fetch('https://api.notion.com/v1/pages', { method: 'POST', headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }, body: JSON.stringify({ parent: { database_id: args.parentId }, properties: { title: { title: [{ text: { content: args.title } }] } } }) })
      return await res.json()
    }

    // ── Figma ──
    case 'figma_get_file': {
      const res = await fetch(`https://api.figma.com/v1/files/${args.file_key}`, { headers: { 'X-Figma-Token': process.env.FIGMA_TOKEN || '' } })
      return await res.json()
    }
    case 'figma_export_images': {
      const res = await fetch(`https://api.figma.com/v1/images/${args.file_key}?ids=${args.ids}&format=${args.format || 'png'}&scale=${args.scale || 2}`, { headers: { 'X-Figma-Token': process.env.FIGMA_TOKEN || '' } })
      return await res.json()
    }

    // ── HubSpot ──
    case 'hubspot_create_contact': {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', { method: 'POST', headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: { email: args.email, firstname: args.firstname, lastname: args.lastname, company: args.company } }) })
      return await res.json()
    }
    case 'hubspot_list_contacts': {
      const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=${args.limit || 10}`, { headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}` } })
      return await res.json()
    }
    case 'hubspot_create_deal': {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals', { method: 'POST', headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: { dealname: args.dealname, amount: args.amount, pipeline: args.pipeline || 'default', dealstage: args.dealstage || 'appointmentscheduled' } }) })
      return await res.json()
    }

    // ── Shopify ──
    case 'shopify_list_products': {
      const res = await fetch(`https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-10/products.json?limit=${args.limit || 10}`, { headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '' } })
      return await res.json()
    }
    case 'shopify_create_product': {
      const res = await fetch(`https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-10/products.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '', 'Content-Type': 'application/json' }, body: JSON.stringify({ product: { title: args.title, body_html: args.bodyHtml, vendor: args.vendor, product_type: args.productType } }) })
      return await res.json()
    }

    // ── WordPress ──
    case 'wordpress_create_post': {
      const wpAuth = Buffer.from(`${process.env.WORDPRESS_USER}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')
      const res = await fetch(`https://${process.env.WORDPRESS_SITE}/wp-json/wp/v2/posts`, { method: 'POST', headers: { Authorization: `Basic ${wpAuth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: args.title, content: args.content, status: args.status || 'draft' }) })
      return await res.json()
    }
    case 'wordpress_list_posts': {
      const wpAuth = Buffer.from(`${process.env.WORDPRESS_USER}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')
      const res = await fetch(`https://${process.env.WORDPRESS_SITE}/wp-json/wp/v2/posts?per_page=${args.perPage || 10}`, { headers: { Authorization: `Basic ${wpAuth}` } })
      return await res.json()
    }

    // ── Mailchimp ──
    case 'mailchimp_add_subscriber': {
      const dc = (process.env.MAILCHIMP_API_KEY || '').split('-').pop()
      const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${args.listId}/members`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.MAILCHIMP_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email_address: args.email, status: 'subscribed', merge_fields: { FNAME: args.firstName || '', LNAME: args.lastName || '' } }) })
      return await res.json()
    }

    // ── Zoom ──
    case 'zoom_create_meeting': {
      const res = await fetch('https://api.zoom.us/v2/users/me/meetings', { method: 'POST', headers: { Authorization: `Bearer ${process.env.ZOOM_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: args.topic, type: 2, start_time: args.startTime, duration: args.duration || 30 }) })
      return await res.json()
    }

    // ── Webflow ──
    case 'webflow_list_sites': {
      const res = await fetch('https://api.webflow.com/v2/sites', { headers: { Authorization: `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}` } })
      return await res.json()
    }
    case 'webflow_create_item': {
      const res = await fetch(`https://api.webflow.com/v2/collections/${args.collectionId}/items`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fieldData: args.fieldData }) })
      return await res.json()
    }
    case 'webflow_publish_site': {
      const res = await fetch(`https://api.webflow.com/v2/sites/${args.siteId}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ domains: [] }) })
      return await res.json()
    }

    // ── Generic handler for services needing API keys not yet configured ──
    default: {
      // Check if it's a known tool pattern we can route
      const [service, action] = name.split('_', 2)
      const keyMap: Record<string, string> = {
        sendgrid: 'SENDGRID_API_KEY', slack: 'SLACK_BOT_TOKEN', discord: 'DISCORD_BOT_TOKEN',
        twilio: 'TWILIO_AUTH_TOKEN', github: 'GITHUB_TOKEN', shopify: 'SHOPIFY_ACCESS_TOKEN',
        notion: 'NOTION_API_KEY', figma: 'FIGMA_TOKEN', hubspot: 'HUBSPOT_ACCESS_TOKEN',
        mailchimp: 'MAILCHIMP_API_KEY', zoom: 'ZOOM_ACCESS_TOKEN', linkedin: 'LINKEDIN_ACCESS_TOKEN',
        wordpress: 'WORDPRESS_APP_PASSWORD', webflow: 'WEBFLOW_ACCESS_TOKEN', mongodb: 'MONGODB_API_KEY',
        airtable: 'AIRTABLE_API_KEY', calendly: 'CALENDLY_ACCESS_TOKEN', typeform: 'TYPEFORM_ACCESS_TOKEN',
        docusign: 'DOCUSIGN_ACCESS_TOKEN', woocommerce: 'WOOCOMMERCE_KEY', square: 'SQUARE_ACCESS_TOKEN',
        quickbooks: 'QUICKBOOKS_ACCESS_TOKEN', elevenlabs: 'ELEVENLABS_API_KEY', deepgram: 'DEEPGRAM_API_KEY',
      }

      const envKey = keyMap[service]
      if (envKey && !process.env[envKey]) {
        return { error: `${service} not configured. Set ${envKey} environment variable to enable ${name}.`, tool: name, service, needsKey: envKey }
      }

      return { error: `Tool '${name}' execution not yet implemented. Service: ${service}, Action: ${action || name}`, tool: name }
    }
  }
}
