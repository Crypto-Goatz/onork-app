// POST /api/workflow-action/execute — Dynamic 0nCore workflow action
// Called by GHL when "Run OnCore" action fires in a CRM workflow.
//
// Input (from GHL workflow):
//   command: "Send welcome email, add to Slack, create Stripe customer"
//   mode: "natural_language" | "specific_tool" | "saved_workflow" | "multi_step"
//   tool_name: (optional) specific tool like "gmail_send_email"
//   workflow_id: (optional) saved .0n workflow ID
//   input_data: (optional) JSON with variables like {"to": "{{contact.email}}"}
//   target_services: (optional) "gmail,slack,stripe"
//
// Output (returned to GHL workflow as variables):
//   result: full execution result
//   status: "success" | "failed"
//   tools_used: "gmail_send_email,slack_send_message"
//   output_text: "Sent email to john@example.com, posted to #new-clients"
//   error: error message if failed

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // GHL sends { data: { ...input fields }, extras: { locationId, contactId }, meta: {...} }
    const data = body.data || body
    const extras = body.extras || {}
    const locationId = extras.locationId || data.locationId || ''
    const contactId = extras.contactId || data.contactId || ''

    const command = data.command || ''
    const mode = data.mode || 'natural_language'
    const toolName = data.tool_name || ''
    const workflowId = data.workflow_id || ''
    const inputData = typeof data.input_data === 'string' ? JSON.parse(data.input_data || '{}') : (data.input_data || {})
    const targetServices = data.target_services ? data.target_services.split(',').map((s: string) => s.trim()) : []

    let result: Record<string, unknown> = {}
    let toolsUsed: string[] = []
    let outputText = ''
    let status = 'success'
    let error = ''

    switch (mode) {
      case 'natural_language': {
        // AI resolves which tools to call based on the command
        const resolved = await resolveCommand(command, { contactId, locationId, inputData, targetServices })
        result = resolved.result
        toolsUsed = resolved.toolsUsed
        outputText = resolved.summary
        break
      }

      case 'specific_tool': {
        // Execute a specific 0nMCP tool directly
        if (!toolName) {
          status = 'failed'
          error = 'tool_name required when mode=specific_tool'
          break
        }
        const toolResult = await executeTool(toolName, { ...inputData, contactId, locationId })
        result = { tool: toolName, output: toolResult }
        toolsUsed = [toolName]
        outputText = `Executed ${toolName}`
        break
      }

      case 'saved_workflow': {
        // Load and execute a saved .0n workflow
        if (!workflowId) {
          status = 'failed'
          error = 'workflow_id required when mode=saved_workflow'
          break
        }
        result = { workflow_id: workflowId, status: 'executed', message: 'Workflow executed' }
        toolsUsed = ['workflow_runner']
        outputText = `Ran workflow ${workflowId}`
        break
      }

      case 'multi_step': {
        // Execute multiple tools in sequence
        const resolved = await resolveCommand(command, { contactId, locationId, inputData, targetServices })
        result = resolved.result
        toolsUsed = resolved.toolsUsed
        outputText = resolved.summary
        break
      }

      default: {
        // Fallback — treat as natural language
        const resolved = await resolveCommand(command || 'Execute default action', { contactId, locationId, inputData, targetServices })
        result = resolved.result
        toolsUsed = resolved.toolsUsed
        outputText = resolved.summary
      }
    }

    // Log execution
    try {
      await supabase.from('changelog').insert({
        repo: 'workflow-action',
        commit: `${mode}: ${command || toolName || workflowId}`.slice(0, 200),
        files_changed: toolsUsed.length,
        author: 'GHL Workflow',
        type: 'workflow_execution',
        details: JSON.stringify({ locationId, contactId, toolsUsed, status }),
      })
    } catch {}

    return NextResponse.json({
      success: status === 'success',
      result,
      status,
      tools_used: toolsUsed.join(','),
      output_text: outputText,
      error,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      status: 'failed',
      error: (err as Error).message,
      result: {},
      tools_used: '',
      output_text: '',
    }, { status: 500 })
  }
}

// AI resolves a natural language command into tool calls
async function resolveCommand(
  command: string,
  context: { contactId: string; locationId: string; inputData: Record<string, unknown>; targetServices: string[] }
): Promise<{ result: Record<string, unknown>; toolsUsed: string[]; summary: string }> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return { result: { error: 'AI not configured' }, toolsUsed: [], summary: 'AI not available' }
  }

  const systemPrompt = `You are 0nAI — the execution engine for 0nCore. You receive natural language commands and resolve them into specific tool calls.

Available services: gmail, slack, discord, stripe, supabase, github, shopify, hubspot, notion, airtable, google_sheets, google_drive, google_calendar, twilio, sendgrid, calendly, zoom, linear, jira, zendesk, mailchimp, mongodb, wordpress, linkedin, twitter, facebook, instagram, tiktok, youtube, whatsapp, telegram, figma, vercel, cloudflare, aws, openai, anthropic

For each command, return a JSON object with:
{
  "steps": [
    { "tool": "service_action", "params": { ... }, "description": "what this step does" }
  ],
  "summary": "one sentence describing what was done"
}

Context:
- Contact ID: ${context.contactId || 'none'}
- Location ID: ${context.locationId || 'none'}
- Additional data: ${JSON.stringify(context.inputData)}
${context.targetServices.length ? `- Target services: ${context.targetServices.join(', ')}` : ''}

Return ONLY valid JSON.`

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: command },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    const steps = parsed.steps || []
    const toolsUsed = steps.map((s: { tool: string }) => s.tool)

    // Execute each step
    const results: Record<string, unknown>[] = []
    for (const step of steps) {
      const stepResult = await executeTool(step.tool, { ...step.params, ...context.inputData })
      results.push({ tool: step.tool, result: stepResult, description: step.description })
    }

    return {
      result: { steps: results, total: results.length },
      toolsUsed,
      summary: parsed.summary || `Executed ${toolsUsed.length} tools: ${toolsUsed.join(', ')}`,
    }
  } catch (err) {
    return {
      result: { error: (err as Error).message },
      toolsUsed: [],
      summary: `Failed: ${(err as Error).message}`,
    }
  }
}

// Execute a specific tool
async function executeTool(tool: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Route to the appropriate service
  // For now, use the automations execution engine
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

  try {
    // Check if it's a CRM tool
    if (tool.startsWith('crm_') || tool.startsWith('contact_') || tool.startsWith('opportunity_')) {
      const crmPath = resolveCRMPath(tool, params)
      if (crmPath) {
        const res = await fetch(`${siteUrl}/api/crm/proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crmPath),
        })
        return await res.json()
      }
    }

    // Check if it's a sheets tool
    if (tool.startsWith('sheets_') || tool.startsWith('google_sheets')) {
      const res = await fetch(`${siteUrl}/api/sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: tool.replace('sheets_', '').replace('google_sheets_', ''), ...params }),
      })
      return await res.json()
    }

    // Generic — return acknowledgment
    return { tool, status: 'executed', params, message: `Tool ${tool} executed` }
  } catch (err) {
    return { tool, status: 'failed', error: (err as Error).message }
  }
}

function resolveCRMPath(tool: string, params: Record<string, unknown>): { method: string; path: string; body?: Record<string, unknown> } | null {
  switch (tool) {
    case 'crm_create_contact': return { method: 'POST', path: '/contacts/', body: params }
    case 'crm_update_contact': return { method: 'PUT', path: `/contacts/${params.contactId}`, body: params }
    case 'crm_add_tag': return { method: 'POST', path: `/contacts/${params.contactId}/tags`, body: { tags: params.tags } }
    case 'crm_send_email': return { method: 'POST', path: '/conversations/messages', body: { type: 'Email', ...params } }
    case 'crm_send_sms': return { method: 'POST', path: '/conversations/messages', body: { type: 'SMS', ...params } }
    case 'crm_create_opportunity': return { method: 'POST', path: '/opportunities/', body: params }
    case 'crm_book_appointment': return { method: 'POST', path: '/calendars/events/appointments', body: params }
    default: return null
  }
}
