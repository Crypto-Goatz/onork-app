/**
 * POST /api/conversation-ai/respond
 *
 * Webhook receiver for the CRM Conversation AI module. CRM posts inbound
 * messages here; we run them through Jaxx and post the reply back through
 * the CRM Conversations API.
 *
 * Pipeline:
 *   1. HMAC verify (CRM_MARKETPLACE_SHARED_SECRET)
 *   2. Parse + only process direction:inbound
 *   3. Load per-location config; bail if disabled or business-hours-locked
 *   4. Rate-limit (per-location daily + per-contact hourly)
 *   5. Resolve identities (actor = location owner, subject = the contact)
 *   6. Compute baseline trust + check active IKY challenge
 *   7. If user has pending IKY → score answer, gate accordingly
 *   8. Build system prompt + emit only the tools the config opted into
 *   9. Groq tool-call (llama-3.3-70b-versatile)
 *  10. If mutating tool requested + no prior confirmation → render plan instead
 *  11. Run reply through disclosure scrubber (fail-closed)
 *  12. Post reply back via CRM /conversations/messages
 *  13. Log everything; write training pair
 *
 * Always returns 200 to CRM (never trigger their retry storm) — failures
 * are surfaced via logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { crmPost } from '@/lib/crm'
import {
  verifyMarketplaceHmac,
  resolveIdentities,
  checkRateLimit,
  loadConfig,
} from '@/lib/jaxx/security'
import { scrubResponse } from '@/lib/jaxx/disclosure'
import { computeBaselineTrust, getActiveChallenge, scoreAnswer, issueChallenge, shouldChallenge } from '@/lib/jaxx/iky'
import { buildSystemPrompt, type PromptContext } from '@/lib/jaxx/prompt'
import { completion, type GroqMessage } from '@/lib/jaxx/groq'
import {
  getEnabledAutomationTools,
  isMutating,
  dispatchAutomationTool,
} from '@/lib/jaxx/tools/automation'
import {
  getEnabledCommerceTools,
  isCommerceMutating,
  dispatchCommerceTool,
  describeCommercePlan,
} from '@/lib/jaxx/tools/commerce'
import { recordPair } from '@/lib/jaxx/learning'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface InboundPayload {
  locationId?: string
  contactId?: string
  conversationId?: string
  messageId?: string
  messageBody?: string
  body?: string // some CRM events use 'body' instead
  direction?: string
  type?: string // 'SMS' | 'Email' | 'Live Chat'
  messageType?: string
  contactName?: string
  contactEmail?: string
}

function ok() {
  return NextResponse.json({ ok: true })
}

function classify(message: string): 'public_info' | 'account_info' | 'sensitive' | 'internal_probe' {
  const m = message.toLowerCase()
  // Internal probes — auto-trigger IKY
  if (/(ghl|gohighlevel|highlevel|leadconnector|github|repo|architect|database|supabase|api key|secret|env var)/.test(m)) {
    return 'internal_probe'
  }
  if (/(delete|disable|deactivate|cancel|run\s+now|activate|schedule|pay|charge|refund)/.test(m)) {
    return 'sensitive'
  }
  if (/(my|me|i)\b.*(account|plan|automation|workflow|connection|location|contacts|opportunity|invoice|tag|task)/.test(m)) {
    return 'account_info'
  }
  return 'public_info'
}

function detectConfirmation(message: string): boolean {
  const m = message.trim().toLowerCase()
  return /^(yes|y|go|do it|run it|confirm|ok|okay|proceed|approve|sounds good|yep|yeah)\b/.test(m)
}

export async function POST(req: NextRequest) {
  const startMs = Date.now()
  // Always 200 to CRM regardless of internal outcome
  let logId: string | null = null

  try {
    // ── 1. HMAC verify ──────────────────────────────────────────────
    const rawBody = await req.text()
    const signature =
      req.headers.get('x-wh-signature') ||
      req.headers.get('x-signature') ||
      req.headers.get('x-hub-signature-256') ||
      null

    if (!verifyMarketplaceHmac({ rawBody, signature })) {
      console.warn('[conversation-ai] HMAC verify failed')
      return ok() // Don't leak whether the secret is right
    }

    // ── 2. Parse + filter ───────────────────────────────────────────
    let payload: InboundPayload
    try {
      payload = JSON.parse(rawBody) as InboundPayload
    } catch {
      return ok()
    }

    const direction = (payload.direction || '').toLowerCase()
    if (direction && direction !== 'inbound') return ok()

    const locationId = payload.locationId
    const contactId = payload.contactId ?? null
    const conversationId = payload.conversationId ?? `crm:${locationId}:${contactId ?? 'unknown'}`
    const messageBody = (payload.messageBody || payload.body || '').trim()
    const channelType = (payload.type || 'SMS').trim()

    if (!locationId || !messageBody) return ok()

    // ── 3. Config ───────────────────────────────────────────────────
    const config = await loadConfig(locationId)
    if (!config.enabled) return ok()

    // Business hours gate
    if (config.business_hours_only) {
      // Simple UTC-vs-local check; precise tz handling can come later
      const now = new Date()
      const hour = now.getUTCHours()
      // Crude: assume tz offset already baked in; full impl uses Intl
      const startH = parseInt(config.business_hours_start.split(':')[0])
      const endH = parseInt(config.business_hours_end.split(':')[0])
      if (hour < startH || hour >= endH) return ok()
    }

    // Excluded tags — checked after we have contact context
    // ── 4. Rate limit ───────────────────────────────────────────────
    const rl = await checkRateLimit({
      locationId,
      contactId,
      dailyCap: config.daily_message_cap,
      hourlyCap: config.per_contact_hourly_cap,
    })
    if (!rl.allowed) {
      await admin().from('conversation_ai_logs').insert({
        location_id: locationId,
        conversation_id: conversationId,
        contact_id: contactId,
        surface: 'crm_inbound',
        inbound_message: messageBody,
        status: 'rate_limited',
        error: rl.reason ?? null,
      })
      return ok()
    }

    // ── 5. Identities ───────────────────────────────────────────────
    const ids = await resolveIdentities({
      locationId,
      contactId,
      contactSnapshot: {
        name: payload.contactName,
        email: payload.contactEmail,
        tags: [], // TODO: fetch contact tags via CRM if needed
      },
    })

    // ── 6. Trust + IKY ──────────────────────────────────────────────
    // For CRM inbound, we don't have IP/UA on the inbound message itself.
    // Trust starts at 0 if subject is not the verified location owner.
    const trust = computeBaselineTrust({
      surface: 'crm_inbound',
      hasLinkedUser: !!ids.subject.linkedUserId,
      isLocationOwner: ids.subject.linkedUserId === ids.actor.userId,
    })

    // If there's an active IKY challenge, treat this message as the answer
    const activeCh = await getActiveChallenge(conversationId)
    let trustAfterIky = trust
    let ikyOutcome: 'unlocked' | 'failed' | 'pending' | null = null
    if (activeCh) {
      const result = await scoreAnswer({ conversationId, answer: messageBody })
      trustAfterIky = Math.max(0, Math.min(100, trust + result.trustDelta))
      ikyOutcome = result.passed ? 'unlocked' : result.locked ? 'failed' : 'pending'

      if (result.locked) {
        await postReply({
          locationId,
          contactId,
          conversationId,
          channelType,
          message:
            "I'm not able to continue this conversation — too many failed verification attempts. The account owner has been notified.",
        })
        await admin().from('conversation_ai_logs').insert({
          location_id: locationId,
          conversation_id: conversationId,
          contact_id: contactId,
          actor_user_id: ids.actor.userId,
          surface: 'crm_inbound',
          trust_score: 0,
          iky_triggered: true,
          iky_outcome: 'failed',
          inbound_message: messageBody,
          ai_response: '[IKY locked]',
          status: 'iky_locked',
        })
        return ok()
      }

      if (!result.passed) {
        // Still pending — restate the question
        await postReply({
          locationId,
          contactId,
          conversationId,
          channelType,
          message: `That's not quite right. ${activeCh.question}`,
        })
        await admin().from('conversation_ai_logs').insert({
          location_id: locationId,
          conversation_id: conversationId,
          contact_id: contactId,
          actor_user_id: ids.actor.userId,
          surface: 'crm_inbound',
          trust_score: trustAfterIky,
          iky_triggered: true,
          iky_outcome: 'pending',
          iky_challenge_id: activeCh.id,
          inbound_message: messageBody,
          ai_response: activeCh.question,
          status: 'ok',
        })
        return ok()
      }
      // passed — continue with elevated trust
    }

    // Decide whether THIS message needs a fresh IKY (after challenge resolution above)
    const askType = classify(messageBody)
    if (!activeCh && shouldChallenge(trustAfterIky, askType)) {
      // Only issue if we have a real user to challenge against
      if (ids.subject.linkedUserId) {
        const ch = await issueChallenge({
          conversationId,
          locationId,
          userId: ids.subject.linkedUserId,
        })
        if (ch) {
          await postReply({
            locationId,
            contactId,
            conversationId,
            channelType,
            message: `Quick verification — ${ch.question}`,
          })
          await admin().from('conversation_ai_logs').insert({
            location_id: locationId,
            conversation_id: conversationId,
            contact_id: contactId,
            actor_user_id: ids.actor.userId,
            surface: 'crm_inbound',
            trust_score: trustAfterIky,
            iky_triggered: true,
            iky_outcome: 'pending',
            iky_challenge_id: ch.id,
            inbound_message: messageBody,
            ai_response: ch.question,
            status: 'ok',
          })
          return ok()
        }
      }
      // No data to challenge against → respond with public-info only
    }

    // ── 7. Build context + system prompt ────────────────────────────
    const promptCtx = await buildPromptContext({
      ids,
      config,
      trust: trustAfterIky,
      hasActiveChallenge: false,
      pendingChallengeQuestion: undefined,
    })

    const systemPrompt = buildSystemPrompt(promptCtx, config.system_prompt_override)

    // ── 8. Tools (capability-gated) ─────────────────────────────────
    const tools = [
      ...getEnabledAutomationTools(config),
      ...getEnabledCommerceTools(config),
    ]

    // Pull last few turns of conversation as context (best-effort)
    const messages = await loadRecentTurns(conversationId, 6, messageBody)

    // ── 9. Call Groq ────────────────────────────────────────────────
    const result = await completion({
      systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      toolChoice: tools.length > 0 ? 'auto' : 'none',
    })

    let replyContent = result.content ?? ''
    let toolResults: Array<{ name: string; result: unknown }> = []
    let requiredConfirmation = false
    let confirmationReceived = false

    // ── 10. Handle tool calls ───────────────────────────────────────
    if (result.toolCalls.length > 0) {
      const userConfirmed = detectConfirmation(messageBody)

      for (const tc of result.toolCalls) {
        let parsedArgs: Record<string, unknown> = {}
        try {
          parsedArgs = JSON.parse(tc.function.arguments)
        } catch {
          continue
        }

        const isAutomation = tc.function.name.startsWith('automation_')
        const isCommerce = tc.function.name.startsWith('commerce_')
        const mutating =
          (isAutomation && isMutating(tc.function.name)) ||
          (isCommerce && isCommerceMutating(tc.function.name))

        if (mutating && !config.auto_execute && !userConfirmed) {
          // Render the plan + ask for confirmation
          requiredConfirmation = true
          const summary = isCommerce
            ? describeCommercePlan(tc.function.name, parsedArgs)
            : describePlan(tc.function.name, parsedArgs)
          replyContent = `${summary}\n\nReply 'yes' to run this, or tell me what to change.`
          toolResults.push({ name: tc.function.name, result: { plan: summary } })
          break // only one plan per turn
        }

        // Authorized to dispatch
        const dispatch = isCommerce
          ? await dispatchCommerceTool({
              toolName: tc.function.name,
              arguments: parsedArgs,
              baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com',
              authedFetcher: makeAuthedFetcher(ids.actor.userId),
            })
          : await dispatchAutomationTool({
              toolName: tc.function.name,
              arguments: parsedArgs,
              baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com',
              authedFetcher: makeAuthedFetcher(ids.actor.userId),
            })
        toolResults.push({ name: tc.function.name, result: dispatch.data })
        confirmationReceived = userConfirmed

        // Roll the tool result into the reply by re-prompting Groq with the result
        if (dispatch.ok) {
          const followup = await completion({
            systemPrompt,
            messages: [
              ...messages,
              { role: 'assistant', content: null, tool_calls: [tc] },
              { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(dispatch.data) },
            ],
            // No tools on the followup — we want a final natural-language reply
          })
          replyContent = followup.content ?? replyContent
        } else {
          replyContent = `That didn't work — ${describeError(dispatch.data)}`
        }
      }
    }

    if (!replyContent.trim()) {
      replyContent = "I'm here. What would you like to know?"
    }

    // ── 11. Disclosure scrubber ─────────────────────────────────────
    const scrub = scrubResponse(replyContent)
    const sentMessage = scrub.cleaned

    // ── 12. Post reply via CRM ──────────────────────────────────────
    const postOk = await postReply({
      locationId,
      contactId,
      conversationId,
      channelType,
      message: sentMessage,
    })

    // ── 13. Log + training pair ─────────────────────────────────────
    const { data: logRow } = await admin()
      .from('conversation_ai_logs')
      .insert({
        location_id: locationId,
        conversation_id: conversationId,
        contact_id: contactId,
        actor_user_id: ids.actor.userId,
        surface: 'crm_inbound',
        trust_score: trustAfterIky,
        iky_triggered: !!activeCh,
        iky_outcome: ikyOutcome,
        inbound_message: messageBody,
        ai_response: replyContent,
        ai_response_redacted: sentMessage,
        disclosure_violations: scrub.violations,
        tool_calls: result.toolCalls,
        tool_results: toolResults,
        required_confirmation: requiredConfirmation,
        confirmation_received: confirmationReceived,
        model: result.model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        latency_ms: Date.now() - startMs,
        status: postOk ? 'ok' : 'error',
        error: postOk ? null : 'crm_post_failed',
      })
      .select('id')
      .single()

    logId = logRow?.id ?? null

    if (logId) {
      await recordPair({
        logId,
        surface: 'crm_inbound',
        input: messageBody, // already user-supplied; learning pipeline will redact context separately
        contextSnapshot: {
          trust: trustAfterIky,
          tools_offered: tools.map((t) => t.function.name),
          required_confirmation: requiredConfirmation,
        },
        response: sentMessage,
        toolCalls: toolResults as unknown as Array<Record<string, unknown>>,
        modelUsed: result.model,
        disclosureViolation: scrub.blockedEntirely,
      })
    }

    return ok()
  } catch (err) {
    console.error('[conversation-ai] handler error:', err)
    return ok() // never trigger CRM retry storm
  }
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

async function buildPromptContext(args: {
  ids: Awaited<ReturnType<typeof resolveIdentities>>
  config: Awaited<ReturnType<typeof loadConfig>>
  trust: number
  hasActiveChallenge: boolean
  pendingChallengeQuestion: string | undefined
}): Promise<PromptContext> {
  const { ids, config, trust, hasActiveChallenge, pendingChallengeQuestion } = args
  const isVerifiedOwner = !!ids.subject.linkedUserId && ids.subject.linkedUserId === ids.actor.userId

  let account: PromptContext['account']
  if (isVerifiedOwner && ids.actor.userId) {
    const sb = admin()
    const [autoCount, services, apps] = await Promise.all([
      sb.from('user_workflows').select('id', { count: 'exact', head: true }).eq('user_id', ids.actor.userId).eq('status', 'active'),
      sb.from('connected_services').select('service_name').eq('user_id', ids.actor.userId).limit(20),
      sb.from('user_addons').select('addon_id').eq('user_id', ids.actor.userId).eq('status', 'active').limit(20),
    ])

    account = {
      activeAutomations: autoCount.count ?? 0,
      connectedServices: (services.data ?? []).map((s: { service_name: string }) => s.service_name).filter(Boolean),
      installedApps: (apps.data ?? []).map((a: { addon_id: string }) => a.addon_id).filter(Boolean),
    }
  }

  return {
    persona: {
      name: config.bot_name || 'Jaxx',
      tone: config.bot_tone || 'casual',
    },
    subject: {
      name: ids.subject.name,
      email: ids.subject.email,
      isVerifiedOwner,
    },
    actor: {
      plan: ids.actor.plan,
      locationConnected: !!ids.actor.locationId,
    },
    account,
    trustScore: trust,
    hasActiveChallenge,
    pendingChallengeQuestion,
    capabilities: {
      knowledge: config.allowed_actions.includes('knowledge'),
      automation: {
        generate: config.automation_can_generate,
        test: config.automation_can_test,
        activate: config.automation_can_activate,
        run: config.automation_can_run,
      },
      commerce: {
        browse: config.commerce_can_browse,
        checkout: config.commerce_can_checkout,
        download: config.commerce_can_download,
      },
    },
  }
}

async function loadRecentTurns(conversationId: string, n: number, latestUserMessage: string): Promise<GroqMessage[]> {
  const { data } = await admin()
    .from('conversation_ai_logs')
    .select('inbound_message, ai_response_redacted')
    .eq('conversation_id', conversationId)
    .order('responded_at', { ascending: false })
    .limit(n)

  const turns: GroqMessage[] = []
  if (data) {
    // Reverse so earliest first
    for (const row of [...data].reverse()) {
      if (row.inbound_message) turns.push({ role: 'user', content: row.inbound_message })
      if (row.ai_response_redacted) turns.push({ role: 'assistant', content: row.ai_response_redacted })
    }
  }
  turns.push({ role: 'user', content: latestUserMessage })
  return turns
}

async function postReply(args: {
  locationId: string
  contactId: string | null
  conversationId: string | null
  channelType: string // 'SMS' | 'Email' | 'Live Chat'
  message: string
}): Promise<boolean> {
  if (!args.contactId) return false
  try {
    const body: Record<string, unknown> = {
      type: args.channelType,
      contactId: args.contactId,
      message: args.message,
    }
    if (args.conversationId && !args.conversationId.startsWith('crm:')) {
      body.conversationId = args.conversationId
    }
    const res = await crmPost('/conversations/messages', args.locationId, body)
    return res.ok
  } catch (err) {
    console.error('[conversation-ai] postReply failed:', err)
    return false
  }
}

function describePlan(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'automation_activate':
      return `Plan: save and activate workflow "${(args.workflow as { name?: string })?.name ?? 'untitled'}"${args.cron_schedule ? ` on schedule ${args.cron_schedule}` : ''}.`
    case 'automation_run':
      return `Plan: run workflow ${args.workflow_id}.`
    case 'automation_disable':
      return `Plan: disable workflow ${args.workflow_id}.`
    default:
      return `Plan: ${toolName} with ${JSON.stringify(args)}`
  }
}

function describeError(data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: unknown }).error)
  }
  return 'something went wrong, want me to try again?'
}

// Trust the actor — for now, dispatch tools server-side using the service-role
// admin context. The /api/automations/* endpoints validate the actor again via
// Supabase session, so we'd need an internal-call shim. For L1, when called
// from within our own server, we use a service-role fetch with an X-Internal
// header that the targets honor as actor=userId.
function makeAuthedFetcher(actorUserId: string | null) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers)
    if (actorUserId) {
      headers.set('x-internal-actor', actorUserId)
      headers.set('x-internal-secret', process.env.INTERNAL_DISPATCH_SECRET || '')
    }
    return fetch(url, { ...init, headers })
  }
}
