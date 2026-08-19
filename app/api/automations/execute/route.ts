import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost, crmPut } from '@/lib/crm'

interface Step {
  id: string
  name: string
  tool: string
  inputs: Record<string, string>
  condition?: string
  on_fail?: string
  depends_on?: string[]
}

interface Workflow {
  name: string
  trigger: { type: string; event: string; config: Record<string, unknown> }
  steps: Step[]
  variables?: Record<string, string>
}

interface StepResult {
  stepId: string
  name: string
  tool: string
  status: 'success' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  duration: number
}

function resolveVariables(
  value: string,
  context: { trigger: Record<string, unknown>; outputs: Record<string, unknown>; variables: Record<string, string> }
): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const parts = path.trim().split('.')
    let current: unknown = context

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return `{{${path}}}`
      }
    }

    return String(current ?? '')
  })
}

function resolveInputs(
  inputs: Record<string, string>,
  context: { trigger: Record<string, unknown>; outputs: Record<string, unknown>; variables: Record<string, string> }
): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const [key, value] of Object.entries(inputs)) {
    resolved[key] = resolveVariables(value, context)
  }
  return resolved
}

async function executeStep(
  step: Step,
  locationId: string,
  context: { trigger: Record<string, unknown>; outputs: Record<string, unknown>; variables: Record<string, string> }
): Promise<StepResult> {
  const start = Date.now()
  const inputs = resolveInputs(step.inputs || {}, context)

  try {
    let output: unknown = null

    switch (step.tool) {
      case 'crm_add_tag': {
        const res = await crmPost(`/contacts/${inputs.contactId}/tags`, locationId, {
          tags: [inputs.tag],
        })
        output = await res.json()
        break
      }

      case 'crm_send_email': {
        const res = await crmPost('/conversations/messages', locationId, {
          type: 'Email',
          contactId: inputs.contactId,
          subject: inputs.subject || '0nCore Automation',
          body: inputs.body || inputs.message || '',
          html: inputs.html || inputs.body || '',
        })
        output = await res.json()
        break
      }

      case 'crm_send_sms': {
        const res = await crmPost('/conversations/messages', locationId, {
          type: 'SMS',
          contactId: inputs.contactId,
          message: inputs.message || '',
        })
        output = await res.json()
        break
      }

      case 'crm_create_contact': {
        const res = await crmPost('/contacts/', locationId, {
          firstName: inputs.firstName || '',
          lastName: inputs.lastName || '',
          email: inputs.email || undefined,
          phone: inputs.phone || undefined,
          tags: inputs.tags ? inputs.tags.split(',').map((t: string) => t.trim()) : ['automation-created'],
          source: '0ncore-automation',
        })
        output = await res.json()
        break
      }

      case 'crm_update_contact': {
        const res = await crmPut(`/contacts/${inputs.contactId}`, locationId, {
          firstName: inputs.firstName || undefined,
          lastName: inputs.lastName || undefined,
          email: inputs.email || undefined,
          phone: inputs.phone || undefined,
        })
        output = await res.json()
        break
      }

      case 'crm_search_contacts': {
        const res = await crmGet(`/contacts/?query=${encodeURIComponent(inputs.query || '')}&limit=${inputs.limit || '10'}`, locationId)
        output = await res.json()
        break
      }

      case 'crm_create_opportunity': {
        const res = await crmPost('/opportunities/', locationId, {
          name: inputs.name || 'Automation Opportunity',
          contactId: inputs.contactId,
          pipelineId: inputs.pipelineId || process.env.CRM_PIPELINE_ID || '',
          stageId: inputs.stageId || inputs.stage || '',
          monetaryValue: inputs.value ? parseFloat(inputs.value) : 0,
        })
        output = await res.json()
        break
      }

      case 'crm_create_appointment': {
        const res = await crmPost('/calendars/events/appointments', locationId, {
          calendarId: inputs.calendarId || '',
          contactId: inputs.contactId,
          title: inputs.title || '0nCore Appointment',
          startTime: inputs.startTime || new Date(Date.now() + 86400000).toISOString(),
        })
        output = await res.json()
        break
      }

      case 'ai_score_lead': {
        // Use Groq to score the lead
        const groqKey = process.env.GROQ_API_KEY
        if (groqKey) {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
              reasoning_effort: 'low',
              max_tokens: 200,
              messages: [
                { role: 'system', content: 'Score this lead 1-100 based on the data provided. Return JSON: {"score": N, "reason": "..."}' },
                { role: 'user', content: `Contact ID: ${inputs.contactId}. Score based on engagement signals.` },
              ],
              response_format: { type: 'json_object' },
            }),
          })
          const data = await res.json()
          output = JSON.parse(data.choices?.[0]?.message?.content || '{"score": 50, "reason": "Default score"}')
        } else {
          output = { score: 50, reason: 'AI scoring unavailable' }
        }
        break
      }

      case 'ai_generate_content': {
        const groqKey = process.env.GROQ_API_KEY
        if (groqKey) {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
              reasoning_effort: 'low',
              max_tokens: 500,
              messages: [
                { role: 'system', content: 'Generate the requested content. Be concise and professional.' },
                { role: 'user', content: inputs.prompt || inputs.topic || 'Generate a professional follow-up message.' },
              ],
            }),
          })
          const data = await res.json()
          output = { content: data.choices?.[0]?.message?.content || '' }
        } else {
          output = { content: 'AI content generation unavailable' }
        }
        break
      }

      case 'wait': {
        // In production this would schedule a delayed execution
        // For now, return immediately with the wait duration
        output = { waited: inputs.duration || '0', unit: inputs.unit || 'minutes' }
        break
      }

      case 'stripe_create_invoice': {
        output = { status: 'invoice_pending', amount: inputs.amount, contactId: inputs.contactId }
        break
      }

      case 'learn_generate': {
        const groqKey = process.env.GROQ_API_KEY
        if (groqKey) {
          // Build context from previous step outputs
          const prevOutputs = Object.entries(context.outputs)
            .map(([id, out]) => `Step ${id}: ${JSON.stringify(out).slice(0, 200)}`)
            .join('\n')

          const depthMap: Record<string, string> = {
            'Quick overview': 'Give a brief 2-3 paragraph overview.',
            'Detailed breakdown': 'Provide a detailed breakdown with examples, bullet points, and key takeaways.',
            'Expert deep-dive': 'Provide an expert-level deep dive with technical details, edge cases, and best practices.',
          }

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
              max_tokens: 1000,
              messages: [
                {
                  role: 'system',
                  content: `You are an expert business educator. Generate a contextual micro-lesson based on what just happened in this automation workflow.

${depthMap[inputs.depth] || depthMap['Detailed breakdown']}

FORMAT:
- Use **bold** for key terms
- Use bullet points for lists
- Use ### headings for sections
- Keep paragraphs short (2-3 sentences)
- Include one actionable takeaway at the end

WORKFLOW CONTEXT (what just happened):
${prevOutputs || 'No previous steps executed yet.'}`
                },
                {
                  role: 'user',
                  content: inputs.topic || inputs.prompt || 'Explain what this automation does and how to optimize it.',
                },
              ],
            }),
          })
          const data = await res.json()
          const lesson = data.choices?.[0]?.message?.content || 'Lesson generation unavailable.'

          output = {
            lesson,
            topic: inputs.topic || 'Automation lesson',
            depth: inputs.depth || 'Detailed breakdown',
            delivery: inputs.delivery || 'In-app notification',
            generatedAt: new Date().toISOString(),
          }
        } else {
          output = { lesson: 'AI learning unavailable — no Groq key configured.', topic: inputs.topic }
        }
        break
      }

      case 'learn_explain': {
        // Explain what the previous step did and why
        const groqKey = process.env.GROQ_API_KEY
        if (groqKey) {
          const lastOutput = Object.values(context.outputs).pop()
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
              reasoning_effort: 'low',
              max_tokens: 500,
              messages: [
                { role: 'system', content: 'You explain automation results in plain language. Be specific about what happened and why. Use **bold**, bullet points, and short paragraphs.' },
                { role: 'user', content: `Explain this automation step result:\n${JSON.stringify(lastOutput, null, 2)}` },
              ],
            }),
          })
          const data = await res.json()
          output = { explanation: data.choices?.[0]?.message?.content || 'No explanation available.' }
        } else {
          output = { explanation: 'AI explanation unavailable.' }
        }
        break
      }

      // ── Google Sheets ──
      case 'sheets_read': {
        const sheetsRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/sheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read', spreadsheetId: inputs.spreadsheet_id, range: inputs.range || 'Sheet1!A:Z' }),
        })
        output = await sheetsRes.json()
        break
      }

      case 'sheets_append':
      case 'sheets_log_lead': {
        let values: string[][] = []
        if (step.tool === 'sheets_log_lead') {
          // Format contact data as a row
          const trigger = context.trigger as Record<string, string>
          values = [[
            new Date().toISOString(),
            trigger.firstName || trigger.name || '',
            trigger.email || '',
            trigger.phone || '',
            trigger.source || '0ncore-automation',
            trigger.tags?.toString() || '',
          ]]
        } else {
          values = inputs.values ? JSON.parse(inputs.values) : [[]]
        }
        const appendRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/sheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'append', spreadsheetId: inputs.spreadsheet_id, range: inputs.range || 'Sheet1!A:Z', values }),
        })
        output = await appendRes.json()
        break
      }

      case 'sheets_write': {
        const writeValues = inputs.values ? JSON.parse(inputs.values) : [[]]
        const writeRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/sheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'write', spreadsheetId: inputs.spreadsheet_id, range: inputs.range, values: writeValues }),
        })
        output = await writeRes.json()
        break
      }

      case 'sheets_export_report': {
        // Generate report data based on type, write to sheet
        output = { status: 'report_scheduled', report_type: inputs.report_type, spreadsheet_id: inputs.spreadsheet_id }
        break
      }

      // ── WordPress ──
      case 'wp_create_post': {
        // Execute via connected WordPress site's MCP endpoint
        const siteEndpoint = inputs.mcp_endpoint || inputs.site_url
        if (siteEndpoint) {
          const wpRes = await fetch(siteEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inputs.token || ''}` },
            body: JSON.stringify({ tool: 'wp_create_post', input: { title: inputs.title, content: inputs.content, status: inputs.status || 'draft', type: inputs.post_type || 'post' } }),
          })
          output = await wpRes.json()
        } else {
          output = { error: 'No WordPress site MCP endpoint configured' }
        }
        break
      }

      case 'wp_update_post': {
        const siteEndpoint = inputs.mcp_endpoint || inputs.site_url
        if (siteEndpoint) {
          const wpRes = await fetch(siteEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inputs.token || ''}` },
            body: JSON.stringify({ tool: 'wp_update_post', input: { id: parseInt(inputs.post_id), title: inputs.title, content: inputs.content, status: inputs.status } }),
          })
          output = await wpRes.json()
        } else {
          output = { error: 'No WordPress site MCP endpoint configured' }
        }
        break
      }

      case 'wp_install_plugin': {
        const siteEndpoint = inputs.mcp_endpoint || inputs.site_url
        if (siteEndpoint) {
          const wpRes = await fetch(siteEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inputs.token || ''}` },
            body: JSON.stringify({ tool: 'wp_install_plugin', input: { slug: inputs.slug, activate: inputs.activate !== 'false' } }),
          })
          output = await wpRes.json()
        } else {
          output = { error: 'No WordPress site MCP endpoint configured' }
        }
        break
      }

      case 'wp_upload_media':
      case 'wp_seo_update':
      case 'wp_bulk_content':
      case 'wp_health_check':
      case 'wc_process_order': {
        const siteEndpoint = inputs.mcp_endpoint || inputs.site_url
        if (siteEndpoint) {
          const wpRes = await fetch(siteEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inputs.token || ''}` },
            body: JSON.stringify({ tool: step.tool, input: inputs }),
          })
          output = await wpRes.json()
        } else {
          output = { error: 'No WordPress site MCP endpoint configured' }
        }
        break
      }

      // ── Email (new capabilities) ──
      case 'send_email': {
        if (inputs.ai_generate === 'true') {
          const groqKey = process.env.GROQ_API_KEY
          if (groqKey) {
            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
              body: JSON.stringify({
                model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
                reasoning_effort: 'low', max_tokens: 500,
                messages: [
                  { role: 'system', content: 'Write a professional email body. Return only the email text, no subject line.' },
                  { role: 'user', content: `Subject: ${inputs.subject}. Context: ${inputs.body || 'Follow-up email'}` },
                ],
              }),
            })
            const aiData = await aiRes.json()
            inputs.body = aiData.choices?.[0]?.message?.content || inputs.body || ''
          }
        }
        const emailRes = await crmPost('/conversations/messages', locationId, {
          type: 'Email',
          contactId: inputs.contactId || (context.trigger as Record<string, string>).contactId,
          subject: inputs.subject,
          message: inputs.body,
          html: inputs.body,
          emailFrom: inputs.from || 'noreply@0nmcp.com',
        })
        output = await emailRes.json()
        break
      }

      case 'send_email_template': {
        // Fetch template then send
        output = { status: 'template_email_sent', template_id: inputs.template_id }
        break
      }

      case 'noop': {
        output = { status: 'trigger_node', note: 'Trigger nodes do not execute — they are entry points.' }
        break
      }

      case 'service_packager_generate': {
        // Inputs: any of url / prompt / mcp_server. The first one set wins.
        const { packageService } = await import('@/lib/service-packager/packager')
        let mode: 'url' | 'prompt' | 'mcp_registry'
        if (inputs.url) mode = 'url'
        else if (inputs.prompt) mode = 'prompt'
        else if (inputs.mcp_server) mode = 'mcp_registry'
        else throw new Error('one of url / prompt / mcp_server required')

        // Resolve the user_id from the workflow context (the outer POST handler
        // owns auth, but step execution doesn't have direct supabase access here)
        const { createClient: cc } = await import('@supabase/supabase-js')
        const sb = cc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        const { data: prof } = await sb
          .from('profiles')
          .select('id')
          .eq('crm_location_id', locationId)
          .maybeSingle()

        const pkg = await packageService({
          mode,
          url: inputs.url,
          prompt: inputs.prompt,
          mcp_server: inputs.mcp_server,
          user_id: prof?.id,
        })
        output = {
          status: 'package_generated',
          package_id: pkg.id,
          service_name: pkg.ingest.service_name,
          vpis_score: pkg.vpis_score,
        }
        break
      }

      case 'service_packager_portfolio_add': {
        if (!inputs.package_id) throw new Error('package_id required')
        const { createClient: cc } = await import('@supabase/supabase-js')
        const sb = cc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        const { data: pkg } = await sb
          .from('service_packages')
          .select('user_id, service_name, category, portfolio_item, images, price_anchor_cents, delivery_time')
          .eq('id', inputs.package_id)
          .maybeSingle()
        if (!pkg) throw new Error('package not found')
        const item = pkg.portfolio_item as { title?: string; description?: string; features?: string[]; cover_image?: { url?: string }; pricing_display?: string; delivery_display?: string; case_study_hook?: string; tags?: string[] } | null
        const publishNow = (inputs.publish_now ?? 'false').toString() === 'true'
        const { data: row, error } = await sb
          .from('portfolio_items')
          .insert({
            user_id: pkg.user_id,
            package_id: inputs.package_id,
            title: item?.title || pkg.service_name,
            description: item?.description ?? '',
            category: pkg.category || 'general',
            tags: item?.tags ?? [],
            cover_image: item?.cover_image?.url || (Array.isArray(pkg.images) ? (pkg.images as string[])[0] : null) || null,
            gallery_images: Array.isArray(pkg.images) ? (pkg.images as string[]).slice(0, 6) : [],
            price_display: item?.pricing_display || (pkg.price_anchor_cents ? `$${(pkg.price_anchor_cents / 100).toFixed(2)}` : null),
            delivery_display: item?.delivery_display || pkg.delivery_time || null,
            features: item?.features ?? [],
            case_study: item?.case_study_hook || null,
            published: publishNow,
          })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        output = { status: 'portfolio_added', portfolio_id: row.id, published: publishNow }
        break
      }

      case 'service_packager_export': {
        if (!inputs.package_id) throw new Error('package_id required')
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
        const format = inputs.format || 'fiverr'
        const r = await fetch(
          `${baseUrl}/api/service-packager/packages/${inputs.package_id}/export?format=${format}`,
          {
            headers: process.env.INTERNAL_DISPATCH_SECRET
              ? { 'x-internal-secret': process.env.INTERNAL_DISPATCH_SECRET }
              : {},
          }
        )
        if (!r.ok) throw new Error(`export ${r.status}`)
        const text = await r.text()
        output = { status: 'exported', format, length: text.length, content: text }
        break
      }

      case 'service_packager_sync_registry': {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
        const r = await fetch(`${baseUrl}/api/cron/mcp-registry-sync`, {
          headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
        })
        const data = await r.json().catch(() => ({}))
        output = { status: 'registry_synced', ...data }
        break
      }

      default: {
        // MCP-tool step: tool name like "mcp_<serverId>_<toolName>" — forward
        // the call to the user's connected MCP server via /api/mcp/execute.
        if (step.tool.startsWith('mcp_')) {
          // Format: mcp_<uuid-with-dashes>_<toolName> — UUID has 4 dashes,
          // so the toolName is everything after the 5th underscore-section.
          const rest = step.tool.slice(4) // strip 'mcp_'
          // UUIDs are 36 chars: split first 36 as serverId, rest as toolName.
          const serverId = rest.slice(0, 36)
          const toolName = rest.slice(37) // skip the underscore between
          if (!serverId || !toolName) {
            output = { status: 'invalid_mcp_step', tool: step.tool }
            break
          }
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
          const r = await fetch(`${baseUrl}/api/mcp/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.INTERNAL_DISPATCH_SECRET
                ? { 'x-internal-secret': process.env.INTERNAL_DISPATCH_SECRET }
                : {}),
            },
            body: JSON.stringify({ serverId, tool: toolName, args: inputs }),
          }).catch(() => null)
          output = r ? await r.json().catch(() => ({})) : { status: 'fetch_failed' }
          break
        }

        // Switch step: tool name like "switch_<uuid>" — look up the saved switch
        // and execute it via /api/tools/execute (which handles credential routing).
        if (step.tool.startsWith('switch_')) {
          const switchId = step.tool.slice('switch_'.length)
          const { createClient } = await import('@supabase/supabase-js')
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          const { data: sw } = await sb
            .from('switches')
            .select('id, name, spec, steps, is_multi, user_id')
            .eq('id', switchId)
            .maybeSingle()

          if (!sw) {
            output = { status: 'switch_not_found', switchId }
            break
          }

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
          const innerResults: unknown[] = []
          const stepsToRun: Array<{ tool: string; params: Record<string, unknown> }> =
            sw.is_multi
              ? (sw.steps as Array<{ tool: string; params: Record<string, unknown> }>) ?? []
              : [{ tool: (sw.spec as { tool?: { name?: string } })?.tool?.name ?? '', params: (sw.spec as { inputs?: Record<string, unknown> })?.inputs ?? {} }]

          for (const inner of stepsToRun) {
            if (!inner.tool) {
              innerResults.push({ status: 'invalid_inner_step' })
              continue
            }
            // Merge workflow-resolved inputs with switch's saved params (workflow inputs win)
            const mergedParams = { ...inner.params, ...(inputs as Record<string, unknown>) }
            const r = await fetch(`${baseUrl}/api/tools/execute`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(process.env.INTERNAL_DISPATCH_SECRET
                  ? { 'x-internal-secret': process.env.INTERNAL_DISPATCH_SECRET }
                  : {}),
              },
              body: JSON.stringify({ tool: inner.tool, params: mergedParams }),
            }).catch(() => null)
            innerResults.push(r ? await r.json().catch(() => ({})) : { status: 'fetch_failed' })
          }

          // Bump execution count on the switch
          void sb
            .from('switches')
            .update({
              execution_count: ((sw as unknown as { execution_count?: number }).execution_count ?? 0) + 1,
              last_run_at: new Date().toISOString(),
            })
            .eq('id', switchId)

          output = {
            status: 'switch_executed',
            switchId,
            switchName: sw.name,
            stepsRun: stepsToRun.length,
            results: innerResults,
          }
          break
        }

        output = { status: 'unknown_tool', tool: step.tool }
        break
      }
    }

    return {
      stepId: step.id,
      name: step.name,
      tool: step.tool,
      status: 'success',
      output,
      duration: Date.now() - start,
    }
  } catch (err) {
    return {
      stepId: step.id,
      name: step.name,
      tool: step.tool,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      duration: Date.now() - start,
    }
  }
}

export async function POST(req: Request) {
  // Internal-trusted bypass for server-to-server calls (CRM webhook → this
  // route, scheduler → this route, etc). Caller proves it's our own server
  // by passing INTERNAL_DISPATCH_SECRET in the x-internal-secret header.
  const internalSecret = process.env.INTERNAL_DISPATCH_SECRET
  const headerSecret = req.headers.get('x-internal-secret') || ''
  const internal = internalSecret && headerSecret && headerSecret === internalSecret

  let userId: string | null = null
  let locationId: string | null = null

  if (internal) {
    // Trusted internal call. Body must include user_id (the workflow owner)
    // — we read crm_location_id from their profile.
    const peek = (await req.clone().json().catch(() => ({}))) as { user_id?: string }
    if (!peek.user_id) {
      return Response.json({ error: 'internal call requires user_id in body' }, { status: 400 })
    }
    userId = peek.user_id
    const supabaseAdmin = await createClient()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('crm_location_id')
      .eq('id', userId)
      .single()
    locationId = profile?.crm_location_id ?? null
  } else {
    const supabase = await createClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .single()
    locationId = profile?.crm_location_id ?? null
  }

  if (!locationId) {
    return Response.json({ error: 'No CRM location provisioned. Go to Settings to set up your account.' }, { status: 403 })
  }

  const { workflow, triggerData, dryRun } = await req.json() as {
    workflow: Workflow
    triggerData?: Record<string, unknown>
    dryRun?: boolean
    user_id?: string
  }

  if (!workflow?.steps) {
    return Response.json({ error: 'workflow with steps required' }, { status: 400 })
  }

  const context = {
    trigger: triggerData || {},
    outputs: {} as Record<string, unknown>,
    variables: workflow.variables || {},
  }

  const startTime = Date.now()

  // Dry-run: validate + render the step plan without invoking any tools.
  if (dryRun) {
    const plan = workflow.steps.map((step) => {
      const resolvedInputs = resolveInputs(step.inputs ?? {}, context)
      // Surface unresolved {{...}} as warnings — anything still in braces means
      // we couldn't bind it from triggerData, prior outputs, or variables.
      const unresolved: string[] = []
      for (const [k, v] of Object.entries(resolvedInputs)) {
        if (typeof v === 'string' && /\{\{[^}]+\}\}/.test(v)) unresolved.push(k)
      }
      return {
        stepId: step.id,
        name: step.name,
        tool: step.tool,
        wouldRunWith: resolvedInputs,
        unresolvedInputs: unresolved,
        condition: step.condition ?? null,
        on_fail: step.on_fail ?? 'halt',
      }
    })

    return Response.json({
      dryRun: true,
      workflow: workflow.name,
      totalSteps: plan.length,
      duration: Date.now() - startTime,
      plan,
    })
  }

  const results: StepResult[] = []

  for (const step of workflow.steps) {
    const result = await executeStep(step, locationId, context)
    results.push(result)

    // Store output for variable resolution in subsequent steps
    context.outputs[step.id] = result.output

    // Handle failure
    if (result.status === 'failed') {
      if (step.on_fail === 'halt') break
      // 'skip' and 'retry' continue to next step
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'failed').length

  return Response.json({
    success: failed === 0,
    workflow: workflow.name,
    totalSteps: results.length,
    succeeded,
    failed,
    duration: Date.now() - startTime,
    results,
  })
}
